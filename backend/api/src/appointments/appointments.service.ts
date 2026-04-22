import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import mongoose from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Availability } from '../doctors/schemas/availability.schema';
import { misAttachGeneratedServiceId } from '../integrations/mis-appointment-generate.sync';
import { MisAuthService } from '../integrations/mis-auth.service';
import {
  misHisForm100FirstIndex,
  misHisPrintFormsIncludeForm100,
} from '../integrations/mis-form100-his-detect';
import { User, UserRole } from '../schemas/user.schema';
import { appointmentHasForm100ReadyForCompletion } from './appointment-form100-ready.util';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
  AppointmentSubStatus,
  AppointmentType,
  PaymentStatus,
} from './schemas/appointment.schema';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: mongoose.Model<AppointmentDocument>,
    @InjectModel(User.name)
    private userModel: mongoose.Model<any>,
    @InjectModel(Availability.name)
    private availabilityModel: mongoose.Model<any>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly misAuthService: MisAuthService,
  ) {
    setInterval(() => {
      void this.cleanupExpiredBlocks();
    }, 60000);
  }

  /**
   * populate-ის შემდეგ patientId/doctorId შეიძლება იყოს დოკუმენტი {_id,...} — არა მხოლოდ ObjectId.
   * `.toString()` ობიექტზე იძლევა `[object Object]`-ს და ავტორიზაცია ყოველთვის ვარდება.
   */
  private appointmentUserRefId(ref: unknown): string {
    if (ref == null) return '';
    if (ref instanceof mongoose.Types.ObjectId) {
      return ref.toHexString();
    }
    if (typeof ref === 'string') return ref;
    if (typeof ref === 'object' && ref !== null && '_id' in ref) {
      return this.appointmentUserRefId((ref as { _id: unknown })._id);
    }
    return '';
  }

  private ensurePatientOwner(patientId: string, apt: AppointmentDocument) {
    if (this.appointmentUserRefId(apt.patientId) !== patientId.toString()) {
      throw new UnauthorizedException('Not allowed for this appointment');
    }
  }

  private ensureDoctorOrPatient(userId: string, apt: AppointmentDocument) {
    const uid = userId.toString();
    const isOwner =
      this.appointmentUserRefId(apt.patientId) === uid ||
      this.appointmentUserRefId(apt.doctorId) === uid;
    if (!isOwner) {
      throw new UnauthorizedException('Not allowed for this appointment');
    }
  }

  /**
   * HIS/MIS ველები პასუხის JSON-ში.
   * `misPrintForms*` Mongo-ში აღარ ინახება — ყოველთვის null (HIS მხოლოდ GET mis-print-forms-ით).
   */
  private withExplicitMisFields(
    doc: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      ...doc,
      misGeneratedServiceId: doc.misGeneratedServiceId ?? null,
      misPrintFormsByService: null,
      misPrintFormsFetchedAt: null,
    };
  }

  /** MIS ფორმების ტელი სერვერზე — მოკლე შინაარსი (არა სრული JSON). */
  private summarizeMisPrintFormsForLog(body: unknown): Record<string, unknown> {
    if (body == null) {
      return { present: false };
    }
    if (Array.isArray(body)) {
      return {
        present: true,
        kind: 'array',
        length: body.length,
        firstItemKeys:
          body[0] != null && typeof body[0] === 'object'
            ? Object.keys(body[0] as object).slice(0, 15)
            : [],
      };
    }
    if (typeof body === 'object') {
      const keys = Object.keys(body);
      let jsonLen = 0;
      try {
        jsonLen = JSON.stringify(body).length;
      } catch {
        jsonLen = -1;
      }
      return {
        present: true,
        kind: 'object',
        keyCount: keys.length,
        keysSample: keys.slice(0, 20),
        approxJsonChars: jsonLen,
      };
    }
    return { present: true, kind: typeof body };
  }

  private logAppointmentResponseMis(
    context: string,
    appointmentId: string,
    data: Record<string, unknown>,
  ) {
    this.logger.log(
      JSON.stringify({
        tag: 'appointment-response-mis',
        context,
        appointmentId,
        misGeneratedServiceId: data.misGeneratedServiceId ?? null,
        misPrintFormsFetchedAt: data.misPrintFormsFetchedAt ?? null,
        misPrintFormsByServiceSummary: this.summarizeMisPrintFormsForLog(
          data.misPrintFormsByService,
        ),
      }),
    );
  }

  private async findAppointmentByIdOrNumber(
    appointmentIdOrNumber: string,
  ): Promise<AppointmentDocument | null> {
    let appointment: AppointmentDocument | null = null;
    if (mongoose.Types.ObjectId.isValid(appointmentIdOrNumber)) {
      appointment = await this.appointmentModel.findById(
        new mongoose.Types.ObjectId(appointmentIdOrNumber),
      );
    }

    if (!appointment) {
      appointment = await this.appointmentModel.findOne({
        appointmentNumber: appointmentIdOrNumber,
      });
    }
    return appointment;
  }

  private getFormsArrayFromMisBody(body: unknown): unknown[] {
    if (Array.isArray(body)) {
      return body;
    }
    if (!body || typeof body !== 'object') {
      return [];
    }

    const obj = body as Record<string, unknown>;
    for (const key of [
      'value',
      'Value',
      'data',
      'Data',
      'forms',
      'Forms',
      'items',
      'Items',
      'result',
      'Result',
    ]) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  }

  private getStringByKeys(
    obj: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  private getPdfSourceFromForm(form: unknown): {
    url: string | null;
    base64: string | null;
    fileName: string | null;
  } {
    if (!form || typeof form !== 'object') {
      return { url: null, base64: null, fileName: null };
    }

    const obj = form as Record<string, unknown>;
    const url = this.getStringByKeys(obj, [
      'pdfUrl',
      'PdfUrl',
      'pdfURL',
      'PdfURL',
      'url',
      'Url',
      'fileUrl',
      'FileUrl',
      'downloadUrl',
      'DownloadUrl',
      'link',
      'Link',
    ]);
    const base64 = this.getStringByKeys(obj, [
      'pdfBase64',
      'PdfBase64',
      'base64',
      'Base64',
      'contentBase64',
      'ContentBase64',
      'fileContent',
      'FileContent',
      'content',
      'Content',
      'raw',
      'Raw',
    ]);
    const fileName = this.getStringByKeys(obj, [
      'fileName',
      'FileName',
      'name',
      'Name',
      'title',
      'Title',
    ]);

    return { url, base64, fileName };
  }

  private decodeBase64Pdf(value: string): Buffer {
    const trimmed = value.trim();
    const commaIdx = trimmed.indexOf(',');
    const payload =
      trimmed.startsWith('data:') && commaIdx > -1
        ? trimmed.slice(commaIdx + 1)
        : trimmed;

    const buf = Buffer.from(payload, 'base64');
    if (buf.length === 0) {
      throw new BadRequestException('MIS form-ის PDF base64 ცარიელია.');
    }
    return buf;
  }

  async addDocument(
    userId: string,
    appointmentId: string,
    file: Express.Multer.File,
  ) {
    console.log('📄 addDocument - Received file:', {
      hasFile: !!file,
      fileName: file?.originalname,
      fileSize: file?.size,
      fileMimetype: file?.mimetype,
      hasBuffer: !!file?.buffer,
      bufferLength: file?.buffer?.length,
    });

    if (!file) {
      throw new BadRequestException('ფაილი აუცილებელია');
    }

    if (!file.buffer) {
      console.error('❌ addDocument - File buffer is missing');
      throw new BadRequestException('ფაილის ბუფერი არ არის ხელმისაწვდომი');
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('ფაილის ტიპი არასწორია');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('ფაილი უნდა იყოს 5MB-მდე');
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensureDoctorOrPatient(userId, appointment);

    try {
      const upload = await this.cloudinaryService.uploadBuffer(
        file.buffer,
        { folder: 'mediacare/appointment-docs' },
        file.mimetype,
        file.originalname,
      );

      const doc = {
        url: upload.secure_url,
        publicId: upload.public_id,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      };

      if (!appointment.documents) {
        appointment.documents = [];
      }
      appointment.documents.push(doc);
      appointment.markModified('documents');
      await appointment.save();

      console.log('📄 addDocument - Saved to DB:', {
        appointmentId,
        documentsCount: appointment.documents.length,
        docName: doc.name,
      });
      return { success: true, data: doc };
    } catch (error) {
      console.error('❌ addDocument - Cloudinary upload error:', error);
      throw new BadRequestException('დოკუმენტის ატვირთვა ვერ მოხერხდა');
    }
  }

  async getDocuments(userId: string, appointmentId: string) {
    let appointment = await this.appointmentModel.findById(appointmentId);
    if (
      !appointment &&
      mongoose.Types.ObjectId.isValid(appointmentId) === false
    ) {
      appointment = await this.appointmentModel.findOne({
        appointmentNumber: appointmentId,
      });
    }
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensureDoctorOrPatient(userId, appointment);

    const documents = appointment.documents || [];
    console.log('📄 getDocuments - Returning:', {
      appointmentId,
      count: documents.length,
    });
    return {
      success: true,
      data: documents,
    };
  }

  async createAppointment(
    patientId: string,
    createAppointmentDto: CreateAppointmentDto,
  ) {
    // Validate doctor exists
    if (!mongoose.Types.ObjectId.isValid(createAppointmentDto.doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    const doctor = await this.userModel.findById(
      new mongoose.Types.ObjectId(createAppointmentDto.doctorId),
    );

    if (!doctor || doctor.role !== UserRole.DOCTOR) {
      throw new NotFoundException('Doctor not found');
    }

    // Validate patient exists (patientId is the logged-in user who is creating the appointment)
    // If patientDetails are provided, it means they're booking for someone else,
    // but patientId should still be the logged-in user's ID
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID format');
    }

    const patient = await this.userModel.findById(
      new mongoose.Types.ObjectId(patientId),
    );

    // The logged-in user should exist (they're creating the appointment)
    // They don't necessarily need to be a patient role, but we'll check anyway
    if (!patient) {
      throw new NotFoundException('User not found');
    }

    const misPersonId =
      typeof patient.misPersonId === 'string' ? patient.misPersonId.trim() : '';
    if (!misPersonId) {
      throw new BadRequestException(
        'HIS პაციენტის ID აკლია — ჯავშანი შეუძლებელია. დარწმუნდით, რომ პროფილი HIS-თან არის დასინქრონებული.',
      );
    }

    const doctorPersonalId =
      typeof doctor.idNumber === 'string' ? doctor.idNumber.trim() : '';
    if (!doctorPersonalId) {
      throw new BadRequestException(
        'ექიმს არ აქვს პირადი ნომერი — ჯავშანი შეუძლებელია (MIS DoctorPersonalID).',
      );
    }

    // If patientDetails are provided and different from logged-in user,
    // it means booking for someone else, but patientId remains the logged-in user
    // This allows tracking who created the appointment

    // Parse appointment date and normalize to start of day (00:00:00)
    // This matches how availability dates are stored in the database
    const appointmentDate = new Date(createAppointmentDto.appointmentDate);
    if (isNaN(appointmentDate.getTime())) {
      throw new BadRequestException('Invalid appointment date');
    }

    // Normalize date to start of day (00:00:00) to match availability storage format
    const normalizedDate = new Date(appointmentDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // Build full appointment DateTime (ვიდეო: მინ. შეზღუდვა არაა; ბინაზე: 2 სთ — ზემოთ)
    const [hoursStr, minutesStr] = (
      createAppointmentDto.appointmentTime || ''
    ).split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid appointment time');
    }

    // ბინაზე: პაციენტი მინიმუმ 2 საათით ადრე უნდა დაჯავშნოს (ლოკალური კალენდარი + დრო)
    const dateOnly = String(createAppointmentDto.appointmentDate)
      .trim()
      .split('T')[0];
    const calParts = dateOnly.split('-').map(Number);
    if (calParts.length !== 3 || calParts.some((n) => Number.isNaN(n))) {
      throw new BadRequestException('Invalid appointment date');
    }
    const [calY, calM, calD] = calParts;
    const appointmentStartLocal = new Date(
      calY,
      calM - 1,
      calD,
      hours,
      minutes,
      0,
      0,
    );
    const HOME_VISIT_MIN_LEAD_MS = 2 * 60 * 60 * 1000;
    if (createAppointmentDto.type === AppointmentType.HOME_VISIT) {
      if (
        appointmentStartLocal.getTime() - Date.now() <
        HOME_VISIT_MIN_LEAD_MS
      ) {
        throw new BadRequestException(
          'ბინაზე ვიზიტის ჯავშანი შესაძლებელია მინიმუმ 2 საათით ადრე.',
        );
      }
    }

    // Check doctor's availability for the specific appointment type (video/home-visit)
    // Use date range query to handle timezone differences (same approach as scheduleFollowUpAppointmentByPatient)
    const startOfDay = new Date(normalizedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const availabilityQuery = {
      doctorId: new mongoose.Types.ObjectId(createAppointmentDto.doctorId),
      date: { $gte: startOfDay, $lte: endOfDay },
      type: createAppointmentDto.type, // Check availability for specific type
      isAvailable: true,
    };

    console.log('🔍 createAppointment - Availability query:', {
      doctorId: createAppointmentDto.doctorId,
      dateRange: {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
      },
      type: createAppointmentDto.type,
      appointmentDate: createAppointmentDto.appointmentDate,
      normalizedDate: normalizedDate.toISOString(),
    });

    const availability =
      await this.availabilityModel.findOne(availabilityQuery);

    if (!availability) {
      const typeLabel =
        createAppointmentDto.type === AppointmentType.VIDEO
          ? 'ვიდეო კონსულტაციის'
          : 'ბინაზე ვიზიტის';
      throw new BadRequestException(
        `ექიმი არ არის ხელმისაწვდომი ამ თარიღზე ${typeLabel} ტიპის ჯავშნისთვის`,
      );
    }

    // Also check if availability has time slots
    if (!availability.timeSlots || availability.timeSlots.length === 0) {
      const typeLabel =
        createAppointmentDto.type === AppointmentType.VIDEO
          ? 'ვიდეო კონსულტაციის'
          : 'ბინაზე ვიზიტის';
      throw new BadRequestException(
        `ექიმი არ არის ხელმისაწვდომი ამ თარიღზე ${typeLabel} ტიპის ჯავშნისთვის`,
      );
    }

    // Check if the time slot is already booked
    const existingAppointment = await this.appointmentModel.findOne({
      doctorId: new mongoose.Types.ObjectId(createAppointmentDto.doctorId),
      appointmentDate: normalizedDate,
      appointmentTime: createAppointmentDto.appointmentTime,
      type: createAppointmentDto.type,
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    });

    if (existingAppointment) {
      throw new BadRequestException('Selected time slot is already booked');
    }

    // Generate appointment number
    const appointmentNumber = await this.generateAppointmentNumber();

    // Create appointment
    // Use normalized date for appointmentDate as well
    const appointment = new this.appointmentModel({
      appointmentNumber,
      doctorId: new mongoose.Types.ObjectId(createAppointmentDto.doctorId),
      patientId: new mongoose.Types.ObjectId(patientId),
      appointmentDate: normalizedDate,
      appointmentTime: createAppointmentDto.appointmentTime,
      type: createAppointmentDto.type, // Include appointment type (video/home-visit)
      ...(createAppointmentDto.isFollowUp === true ? { isFollowUp: true } : {}),
      status: AppointmentStatus.PENDING,
      consultationFee: createAppointmentDto.consultationFee,
      totalAmount: createAppointmentDto.totalAmount,
      paymentMethod: createAppointmentDto.paymentMethod,
      paymentStatus:
        createAppointmentDto.paymentStatus || PaymentStatus.PENDING,
      paymentOrderId: createAppointmentDto.paymentOrderId,
      patientDetails: createAppointmentDto.patientDetails,
      documents: createAppointmentDto.documents || [],
      notes: createAppointmentDto.notes,
      visitAddress: createAppointmentDto.visitAddress,
    });

    await appointment.save();

    await misAttachGeneratedServiceId(
      this.misAuthService,
      this.appointmentModel,
      appointment,
      {
        misPersonId,
        doctorPersonalId,
        serviceDateIso: appointmentStartLocal.toISOString(),
      },
      this.logger,
    );

    // Note: We don't remove time slots from availability anymore.
    // Instead, we track booked slots dynamically by querying appointments.

    const createdPayload = this.withExplicitMisFields(
      appointment.toObject() as unknown as Record<string, unknown>,
    );
    this.logAppointmentResponseMis(
      'createAppointment',
      (appointment._id as mongoose.Types.ObjectId).toString(),
      createdPayload,
    );

    return {
      success: true,
      data: createdPayload,
    };
  }

  // დროებით time slot-ის დაბლოკვა (5 წუთით)
  async blockTimeSlot(
    patientId: string,
    doctorId: string,
    date: string,
    time: string,
  ) {
    console.log('🔒 Blocking time slot:', { patientId, doctorId, date, time });

    // Normalize date
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Check if slot is already blocked or booked
    const existingAppointment = await this.appointmentModel.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: normalizedDate,
      appointmentTime: time,
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    });

    if (existingAppointment) {
      throw new BadRequestException('Time slot is already booked');
    }

    // Create a temporary "blocked" appointment that expires in 5 minutes
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);

    const tempAppointment = new this.appointmentModel({
      appointmentNumber: `TEMP-${Date.now()}`,
      doctorId: new mongoose.Types.ObjectId(doctorId),
      patientId: new mongoose.Types.ObjectId(patientId),
      appointmentDate: normalizedDate,
      appointmentTime: time,
      status: AppointmentStatus.BLOCKED, // Temporary blocking status
      consultationFee: 0,
      totalAmount: 0,
      paymentMethod: 'pending',
      paymentStatus: PaymentStatus.PENDING,
      patientDetails: { name: 'Temporary Block' },
      expiresAt: expirationTime, // Custom field for expiration
    });

    await tempAppointment.save();

    console.log('✅ Time slot blocked temporarily for 5 minutes');

    return {
      success: true,
      message: 'Time slot blocked temporarily for 5 minutes',
      expiresAt: expirationTime,
    };
  }

  // Clean up expired blocked appointments
  private async cleanupExpiredBlocks() {
    try {
      const conn = mongoose.connection;
      if (!conn || conn.readyState !== 1) {
        return; // 1 = connected
      }

      const now = new Date();
      const result = await this.appointmentModel.deleteMany({
        status: AppointmentStatus.BLOCKED,
        expiresAt: { $lt: now },
      });

      if (result.deletedCount > 0) {
        console.log(
          `🧹 Cleaned up ${result.deletedCount} expired blocked appointments`,
        );
      }
    } catch (error) {
      // Only log if it's not a connection error to avoid spam
      if (
        error instanceof Error &&
        !error.message.includes('ENOTFOUND') &&
        !error.message.includes('MongoServerSelectionError')
      ) {
        console.error('Error cleaning up expired blocks:', error);
      }
    }
  }

  private async generateAppointmentNumber(): Promise<string> {
    const prefix = 'APT';
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const appointmentNumber = `${prefix}${year}${randomNum}`;

    // Check if it already exists
    const existing = await this.appointmentModel.findOne({
      appointmentNumber,
    });

    if (existing) {
      // Recursively generate a new one if collision
      return this.generateAppointmentNumber();
    }

    return appointmentNumber;
  }

  async getAppointmentsByPatient(patientId: string) {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      throw new BadRequestException('Invalid patient ID format');
    }

    const appointments = await this.appointmentModel
      .find({
        patientId: new mongoose.Types.ObjectId(patientId),
      })
      .populate('doctorId', '_id name specialization profileImage')
      .sort({ appointmentDate: -1 })
      .lean();

    // type უცვლელი (video | home-visit); განმეორებითობა ცალკე ველით isFollowUp
    const data = (appointments as any[]).map((apt) => ({
      ...apt,
      ...(apt.isFollowUp === true ? { isFollowUp: true } : {}),
    }));

    return {
      success: true,
      data,
    };
  }

  async getAppointmentsByDoctor(doctorId: string) {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    const appointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
      })
      .populate('patientId', 'name email phone')
      .sort({ appointmentDate: -1 })
      .lean();

    return {
      success: true,
      data: appointments,
    };
  }

  /**
   * HIS GetFormsByServiceID — მხოლოდ წაკითხვა; Mongo-ში ფორმები აღარ ინახება.
   */
  private async fetchMisPrintFormsBodyFromHis(
    serviceId: string,
  ): Promise<{ ok: boolean; body: unknown | null }> {
    const r = await this.misAuthService.getFormsByServiceId(serviceId);
    if (r.success && r.body != null) {
      return { ok: true, body: r.body };
    }
    return { ok: false, body: null };
  }

  /** ლოგი: HIS პასუხის სრული სტრუქტურა, `templateData` — სიგრძე + ნაწყვეტები (არა მთელი HTML). */
  private misPrintFormsPayloadForLog(body: unknown): string {
    try {
      return JSON.stringify(
        body,
        (key, value) => {
          if (key === 'templateData' && typeof value === 'string') {
            const s = value;
            return {
              _htmlChars: s.length,
              _htmlStart: s.slice(0, 500),
              ...(s.length > 900 ? { _htmlEnd: s.slice(-400) } : {}),
            };
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- JSON.stringify replacer
          return value;
        },
        2,
      );
    } catch {
      return '[misPrintFormsPayloadForLog: error]';
    }
  }

  /** HIS HTML ფრაგმენტში უსაფრთხო ჩასმა */
  private escapeMisHtmlFragment(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** ჯავშნიდან პაციენტის სახელი (patientDetails ან დაკავშირებული User). */
  private getPatientDisplayNameForMis(
    appointment: AppointmentDocument,
  ): string {
    const pd = appointment.patientDetails;
    const fromDetails = [pd?.name?.trim(), pd?.lastName?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fromDetails) return fromDetails;
    const pop = appointment.patientId as unknown as { name?: string };
    if (pop && typeof pop === 'object' && typeof pop.name === 'string') {
      return pop.name.trim();
    }
    return '';
  }

  private getDoctorLineForMis(appointment: AppointmentDocument): string {
    const d = appointment.doctorId as unknown as {
      name?: string;
      specialization?: string;
    };
    if (!d || typeof d !== 'object') return '';
    const name = typeof d.name === 'string' ? d.name.trim() : '';
    const spec =
      typeof d.specialization === 'string' ? d.specialization.trim() : '';
    return [name, spec].filter(Boolean).join(', ');
  }

  /**
   * HIS ხშირად ტოვებს ცარიელს პაციენტის/ექიმის ველებში — ვავსებთ ჯავშნის მონაცემებით (არა Mongo-ში შენახვა).
   */
  private enrichMisPrintFormsBodyFromAppointment(
    appointment: AppointmentDocument,
    body: unknown,
  ): unknown {
    if (!Array.isArray(body)) {
      return body;
    }
    const patientName = this.getPatientDisplayNameForMis(appointment);
    const personalId = appointment.patientDetails?.personalId?.trim() ?? '';
    const doctorLine = this.getDoctorLineForMis(appointment);

    return body.map((row) => {
      if (!row || typeof row !== 'object') return row;
      const o = row as Record<string, unknown>;
      const td = o.templateData;
      if (typeof td !== 'string' || td.length === 0) return row;
      let html = td;
      if (patientName) {
        const safe = this.escapeMisHtmlFragment(patientName);
        html = html.replace(
          /(<strong>პაციენტი:<\/strong>)(\s+)(<strong[^>]*>[^<]*ასაკი:)/i,
          `$1 ${safe} $3`,
        );
      }
      if (personalId) {
        const safeId = this.escapeMisHtmlFragment(personalId);
        html = html.replace(
          /(პირადი ნომერი:<\/strong>)(\s+)(<strong>)/i,
          `$1 ${safeId} $3`,
        );
      }
      if (doctorLine) {
        const safeDoc = this.escapeMisHtmlFragment(doctorLine);
        html = html.replace(
          /(ექიმის სახელი და გვარი, სპეციალობა:)(\s*,)/i,
          `$1 ${safeDoc}$2`,
        );
      }
      return { ...o, templateData: html };
    });
  }

  /**
   * უკუთავსობა: ადრე Mongo-ში ინახებოდა; ახლა ფორმები მხოლოდ GET /appointments/:id/mis-print-forms-ით იტვირთება HIS-იდან.
   */
  async syncMisPrintFormsForPatient(patientId: string) {
    const appointments = await this.appointmentModel.find({
      patientId: new mongoose.Types.ObjectId(patientId),
      misGeneratedServiceId: { $exists: true, $nin: [null, ''] },
    });

    return {
      success: true,
      data: {
        processed: appointments.length,
        saved: 0,
        message:
          'HIS ბეჭდვის ფორმები Mongo-ში აღარ ინახება — გამოიყენეთ ჯავშნის GET .../mis-print-forms.',
      },
    };
  }

  async getMisPrintFormsForAppointment(
    userId: string,
    appointmentId: string,
    _refetch: boolean,
  ) {
    let appointment = await this.findAppointmentByIdOrNumber(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    appointment = await this.appointmentModel
      .findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization');
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensureDoctorOrPatient(userId, appointment);

    const sid = appointment.misGeneratedServiceId?.trim();

    if (!sid) {
      const hisAt = appointment.misForm100AvailableAt;
      const idx = appointment.misForm100PrintFormIndex;
      return {
        success: true,
        data: {
          misGeneratedServiceId: appointment.misGeneratedServiceId ?? null,
          misPrintFormsByService: null,
          misPrintFormsFetchedAt: null,
          misForm100AvailableAt: hisAt ? new Date(hisAt).toISOString() : null,
          misForm100PrintFormIndex:
            typeof idx === 'number' && Number.isInteger(idx) ? idx : null,
        },
      };
    }

    const { ok, body } = await this.fetchMisPrintFormsBodyFromHis(sid);
    if (!ok || body == null) {
      const hisAt = appointment.misForm100AvailableAt;
      const storedIdx = appointment.misForm100PrintFormIndex;
      if (
        hisAt != null &&
        typeof storedIdx === 'number' &&
        Number.isInteger(storedIdx) &&
        storedIdx >= 0
      ) {
        return {
          success: true,
          data: {
            misGeneratedServiceId: sid,
            misPrintFormsByService: null,
            misPrintFormsFetchedAt: null,
            misForm100AvailableAt: new Date(hisAt).toISOString(),
            misForm100PrintFormIndex: storedIdx,
            misHisfetchDegraded: true,
          },
        };
      }
      throw new BadRequestException(
        'HIS PrintForm/GetFormsByServiceID ვერ მოხერხდა.',
      );
    }

    this.logger.log(
      `HIS GetFormsByServiceID RAW appointment=${appointmentId} serviceId=${sid} kind=${Array.isArray(body) ? `array[len=${body.length}]` : typeof body}\n${this.misPrintFormsPayloadForLog(body)}`,
    );

    const enriched = this.enrichMisPrintFormsBodyFromAppointment(
      appointment,
      body,
    );

    this.logger.log(
      `HIS mis-print-forms ENRICHED → API appointment=${appointmentId} serviceId=${sid}\n${this.misPrintFormsPayloadForLog(enriched)}`,
    );

    const hasHisForm100 = misHisPrintFormsIncludeForm100(enriched);
    const form100Idx = hasHisForm100 ? misHisForm100FirstIndex(enriched) : null;
    const markedAt = new Date();
    await this.appointmentModel.updateOne(
      { _id: appointment._id },
      {
        $set: {
          misForm100AvailableAt: hasHisForm100 ? markedAt : null,
          misForm100PrintFormIndex:
            hasHisForm100 && form100Idx != null ? form100Idx : null,
        },
      },
    );

    return {
      success: true,
      data: {
        misGeneratedServiceId: sid,
        misPrintFormsByService: enriched,
        misPrintFormsFetchedAt: markedAt.toISOString(),
        misForm100AvailableAt: hasHisForm100 ? markedAt.toISOString() : null,
        misForm100PrintFormIndex:
          hasHisForm100 && form100Idx != null ? form100Idx : null,
      },
    };
  }

  async getMisPrintFormPdfForAppointment(
    userId: string,
    appointmentId: string,
    formIndex: number,
    _refetch: boolean,
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    if (!Number.isInteger(formIndex) || formIndex < 0) {
      throw new BadRequestException(
        'ფორმის ინდექსი უნდა იყოს 0 ან მეტი მთელი რიცხვი.',
      );
    }

    let appointment = await this.findAppointmentByIdOrNumber(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    appointment = await this.appointmentModel
      .findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization');
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    this.ensureDoctorOrPatient(userId, appointment);

    const sid = appointment.misGeneratedServiceId?.trim();
    if (!sid) {
      throw new BadRequestException(
        'ამ ჯავშანზე HIS სერვისის ID არ არის — ფორმები ხელმიუწვდომელია.',
      );
    }

    const { ok, body } = await this.fetchMisPrintFormsBodyFromHis(sid);
    if (!ok || body == null) {
      throw new BadRequestException(
        'HIS PrintForm/GetFormsByServiceID ვერ მოხერხდა.',
      );
    }

    const enriched = this.enrichMisPrintFormsBodyFromAppointment(
      appointment,
      body,
    );

    const forms = this.getFormsArrayFromMisBody(enriched);
    if (forms.length === 0) {
      throw new BadRequestException('ამ ჯავშანზე HIS ფორმები ცარიელია.');
    }
    if (formIndex >= forms.length) {
      throw new BadRequestException(
        `ფორმის ინდექსი მიუწვდომელია: მაქს=${forms.length - 1}`,
      );
    }

    const selectedForm = forms[formIndex];
    const source = this.getPdfSourceFromForm(selectedForm);

    const fallbackFileName = `appointment-${(appointment._id as mongoose.Types.ObjectId).toString()}-mis-form-${formIndex + 1}.pdf`;
    if (source.url) {
      const downloaded = await this.misAuthService.downloadBinaryFromMis(
        source.url,
      );
      if (!downloaded.success || !downloaded.buffer) {
        throw new BadRequestException(
          'MIS form PDF ჩამოტვირთვა ვერ მოხერხდა მოცემული URL-იდან.',
        );
      }
      return {
        buffer: downloaded.buffer,
        contentType: downloaded.contentType || 'application/pdf',
        fileName: downloaded.fileName || source.fileName || fallbackFileName,
      };
    }

    if (source.base64) {
      return {
        buffer: this.decodeBase64Pdf(source.base64),
        contentType: 'application/pdf',
        fileName: source.fileName || fallbackFileName,
      };
    }

    throw new BadRequestException(
      'ფორმაში PDF წყარო ვერ მოიძებნა (არც URL და არც base64).',
    );
  }

  async getAppointmentById(appointmentId: string) {
    let appointment;

    // Check if it's a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(appointmentId)) {
      appointment = await this.appointmentModel
        .findById(new mongoose.Types.ObjectId(appointmentId))
        .populate('doctorId', '_id name specialization profileImage')
        .populate('patientId', 'name email phone')
        .lean();
    } else {
      // If not ObjectId, try to find by appointmentNumber
      appointment = await this.appointmentModel
        .findOne({ appointmentNumber: appointmentId })
        .populate('doctorId', '_id name specialization profileImage')
        .populate('patientId', 'name email phone')
        .lean();
    }

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const byIdPayload = this.withExplicitMisFields(
      appointment as unknown as Record<string, unknown>,
    );
    const rawId = (appointment as { _id?: mongoose.Types.ObjectId })._id;
    const idForLog = rawId != null ? rawId.toString() : appointmentId;
    this.logAppointmentResponseMis('getAppointmentById', idForLog, byIdPayload);

    return {
      success: true,
      data: byIdPayload,
    };
  }

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
  ) {
    // Find appointment
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if appointment can be rescheduled (not completed or cancelled)
    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot reschedule completed or cancelled appointment',
      );
    }

    // Parse and validate date - use UTC midnight to match availability dates
    // newDate is in YYYY-MM-DD format (e.g., "2025-12-20")
    const appointmentDate = new Date(newDate + 'T00:00:00.000Z');

    console.log('🗓️ [Reschedule] Date parsing:', {
      inputNewDate: newDate,
      parsedDate: appointmentDate.toISOString(),
      localDateStr: `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`,
      utcDateStr: `${appointmentDate.getUTCFullYear()}-${String(appointmentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getUTCDate()).padStart(2, '0')}`,
    });

    if (isNaN(appointmentDate.getTime())) {
      throw new BadRequestException('Invalid appointment date');
    }

    // normalizedDate is already at UTC midnight from the parsing above
    const normalizedDate = appointmentDate;

    // Create date range for MongoDB query (start and end of day in UTC)
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Validate time format
    const [hoursStr, minutesStr] = (newTime || '').split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('Invalid appointment time');
    }

    // Build new and original appointment datetime
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const origDate = new Date(appointment.appointmentDate);
    const [origH, origM] = (appointment.appointmentTime || '00:00')

      .split(':')
      .map(Number) as [number, number];
    origDate.setHours(origH, origM || 0, 0, 0);
    const originalPast = origDate.getTime() < now.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const twelveHoursMs = 12 * 60 * 60 * 1000;

    // New time must be in the future
    if (appointmentDateTime.getTime() < now.getTime()) {
      throw new BadRequestException(
        'ახალი თარიღი და დრო არ შეიძლება იყოს წარსულში',
      );
    }

    // ონლაინი: ჯერ არ მოსულ დროზე როცა უნდა მაშინ; გასულ დროზე მაქს 2 საათის განმავლობაში
    // ბინა: კონსულტაციის დადგომამდე არაუგვიანეს 12 საათისა (ანუ ახალი დრო მინ. 12 სთ შემდეგ)
    if (appointment.type === AppointmentType.VIDEO) {
      if (originalPast) {
        const allowedUntil = origDate.getTime() + twoHoursMs;
        if (now.getTime() > allowedUntil) {
          throw new BadRequestException(
            'ონლაინის გადაჯავშნა გასული კონსულტაციის შემდეგ შესაძლებელია მაქსიმუმ 2 საათის განმავლობაში.',
          );
        }
      }
    } else {
      // home-visit: გადაჯავშნა მხოლოდ კონსულტაციის დადგომამდე არაუგვიანეს 12 საათისა
      if (originalPast) {
        throw new BadRequestException(
          'ბინაზე ვიზიტის გადაჯავშნა შეუძლებელია კონსულტაციის დროის გასვლის შემდეგ.',
        );
      }
      if (appointmentDateTime.getTime() - now.getTime() < twelveHoursMs) {
        throw new BadRequestException(
          'ბინაზე ვიზიტის გადაჯავშნა შესაძლებელია კონსულტაციის დადგომამდე არაუგვიანეს 12 საათისა.',
        );
      }
    }

    // Check doctor's availability for the specific appointment type
    // Use date range query to handle timezone issues
    const availability = await this.availabilityModel.findOne({
      doctorId: appointment.doctorId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      type: appointment.type,
      isAvailable: true,
    });

    // Debug logging
    console.log('Reschedule availability check:', {
      doctorId: appointment.doctorId.toString(),
      date: normalizedDate.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      type: appointment.type,
      found: !!availability,
      availabilityTimeSlots: availability?.timeSlots,
    });

    if (!availability) {
      const typeLabel =
        appointment.type === AppointmentType.VIDEO
          ? 'ვიდეო კონსულტაციის'
          : 'ბინაზე ვიზიტის';
      throw new BadRequestException(
        `ექიმი არ არის ხელმისაწვდომი ამ თარიღზე ${typeLabel} ტიპის ჯავშნისთვის`,
      );
    }

    // Check if the selected time slot is in the availability timeSlots
    if (!availability.timeSlots || !availability.timeSlots.includes(newTime)) {
      const typeLabel =
        appointment.type === AppointmentType.VIDEO
          ? 'ვიდეო კონსულტაციის'
          : 'ბინაზე ვიზიტის';
      throw new BadRequestException(
        `არჩეული დრო (${newTime}) არ არის ხელმისაწვდომი ამ თარიღზე ${typeLabel} ტიპის ჯავშნისთვის`,
      );
    }

    // Check if the new time slot is already booked
    const existingAppointment = await this.appointmentModel.findOne({
      doctorId: appointment.doctorId,
      appointmentDate: normalizedDate,
      appointmentTime: newTime,
      type: appointment.type,
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      _id: { $ne: new mongoose.Types.ObjectId(appointmentId) },
    });

    if (existingAppointment) {
      throw new BadRequestException('Selected time slot is already booked');
    }

    // Update appointment - ONLY date and time, keep status unchanged
    const previousStatus = appointment.status;
    appointment.appointmentDate = normalizedDate;
    appointment.appointmentTime = newTime;
    // Explicitly ensure status is not changed
    appointment.status = previousStatus;
    await appointment.save();

    console.log('Appointment rescheduled:', {
      appointmentId: (appointment._id as any).toString(),
      previousDate: appointment.appointmentDate,
      previousTime: appointment.appointmentTime,
      newDate: normalizedDate,
      newTime: newTime,
      status: appointment.status, // Should remain unchanged
    });

    return {
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment,
    };
  }

  async cancelAppointment(patientId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if patient owns the appointment
    if (appointment.patientId.toString() !== patientId.toString()) {
      throw new UnauthorizedException(
        'Not authorized to cancel this appointment',
      );
    }

    // Check if appointment can be cancelled (not completed or already cancelled)
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed appointment');
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    // Update appointment status to cancelled and record when
    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancelledAt = new Date();
    await appointment.save();

    // Note: The time slot will automatically become available again because
    // getDoctorAvailability() filters out cancelled appointments (status: { $ne: 'cancelled' })
    // So the slot will be freed up in the doctor's schedule automatically

    return {
      success: true,
      message: 'ჯავშანი წარმატებით გაუქმდა',
      data: appointment,
    };
  }

  async requestReschedule(
    userId: string,
    appointmentId: string,
    newDate?: string,
    newTime?: string,
    reason?: string,
  ) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if user is doctor or patient
    const isDoctor = appointment.doctorId.toString() === userId.toString();
    const isPatient = appointment.patientId.toString() === userId.toString();

    if (!isDoctor && !isPatient) {
      throw new UnauthorizedException(
        'Not authorized to request reschedule for this appointment',
      );
    }

    // Check if appointment can be rescheduled
    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot reschedule completed or cancelled appointment',
      );
    }

    // Check if there's already a pending reschedule request
    if (
      appointment.rescheduleRequest &&
      appointment.rescheduleRequest.status === 'pending'
    ) {
      throw new BadRequestException(
        'There is already a pending reschedule request for this appointment',
      );
    }

    // განმეორებითი ვიზიტის გადაჯავშნა პაციენტს არ უნდა ჰქონდეს
    if (isPatient && appointment.followUp?.appointmentId) {
      throw new BadRequestException(
        'განმეორებითი ვიზიტის გადაჯავშნა შეუძლებელია.',
      );
    }

    // If patient is requesting, date and time are required
    if (isPatient && (!newDate || !newTime)) {
      throw new BadRequestException(
        'Patient must specify new date and time for reschedule request',
      );
    }

    // If doctor is requesting, date and time are optional
    let normalizedDate: Date | undefined;
    let normalizedTime: string | undefined;

    if (newDate && newTime) {
      // Parse and validate date
      const appointmentDate = new Date(newDate + 'T00:00:00.000Z');
      if (isNaN(appointmentDate.getTime())) {
        throw new BadRequestException('Invalid appointment date');
      }

      normalizedDate = appointmentDate;
      const startOfDay = new Date(normalizedDate);
      const endOfDay = new Date(normalizedDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Validate time format
      const [hoursStr, minutesStr] = (newTime || '').split(':');
      const hours = Number(hoursStr);
      const minutes = Number(minutesStr);

      if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        throw new BadRequestException('Invalid appointment time');
      }

      // Build full appointment DateTime
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      if (appointmentDateTime.getTime() < now.getTime()) {
        throw new BadRequestException(
          'ახალი თარიღი და დრო არ შეიძლება იყოს წარსულში',
        );
      }

      const origDateReq = new Date(appointment.appointmentDate);
      const [origHReq, origMReq] = (appointment.appointmentTime || '00:00')
        .split(':')
        .map(Number);
      origDateReq.setHours(origHReq, origMReq || 0, 0, 0);
      const originalPastReq = origDateReq.getTime() < now.getTime();
      const twoHoursMsReq = 2 * 60 * 60 * 1000;
      const twelveHoursMsReq = 12 * 60 * 60 * 1000;

      if (appointment.type === AppointmentType.VIDEO) {
        if (
          originalPastReq &&
          now.getTime() > origDateReq.getTime() + twoHoursMsReq
        ) {
          throw new BadRequestException(
            'ონლაინის გადაჯავშნა გასული კონსულტაციის შემდეგ შესაძლებელია მაქსიმუმ 2 საათის განმავლობაში.',
          );
        }
      } else {
        if (originalPastReq) {
          throw new BadRequestException(
            'ბინაზე ვიზიტის გადაჯავშნა შეუძლებელია კონსულტაციის დროის გასვლის შემდეგ.',
          );
        }
        if (appointmentDateTime.getTime() - now.getTime() < twelveHoursMsReq) {
          throw new BadRequestException(
            'ბინაზე ვიზიტის გადაჯავშნა შესაძლებელია კონსულტაციის დადგომამდე არაუგვიანეს 12 საათისა.',
          );
        }
      }

      normalizedTime = newTime;

      // Check doctor's availability
      let availability = await this.availabilityModel.findOne({
        doctorId: appointment.doctorId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        type: appointment.type,
        isAvailable: true,
      });

      // If doctor doesn't have this time in schedule, add it
      if (!availability) {
        // Create new availability entry
        availability = await this.availabilityModel.create({
          doctorId: appointment.doctorId,
          date: normalizedDate,
          type: appointment.type,
          isAvailable: true,
          timeSlots: [newTime],
        });
      } else if (
        !availability.timeSlots ||
        !availability.timeSlots.includes(newTime)
      ) {
        // Add time slot if it doesn't exist
        if (!availability.timeSlots) {
          availability.timeSlots = [];
        }
        availability.timeSlots.push(newTime);
        availability.timeSlots.sort();
        await availability.save();
      }

      // Check if the new time slot is already booked
      const existingAppointment = await this.appointmentModel.findOne({
        doctorId: appointment.doctorId,
        appointmentDate: normalizedDate,
        appointmentTime: newTime,
        type: appointment.type,
        status: {
          $in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
        _id: { $ne: new mongoose.Types.ObjectId(appointmentId) },
      });

      if (existingAppointment) {
        throw new BadRequestException('Selected time slot is already booked');
      }
    }

    // Create reschedule request
    appointment.rescheduleRequest = {
      requestedBy: isDoctor ? 'doctor' : 'patient',
      requestedDate: normalizedDate,
      requestedTime: normalizedTime,
      reason: reason,
      status: 'pending',
      requestedAt: new Date(),
    };

    await appointment.save();

    return {
      success: true,
      message: 'გადაჯავშნის მოთხოვნა გაიგზავნა',
      data: appointment,
    };
  }

  async approveReschedule(
    userId: string,
    appointmentId: string,
    newDate?: string,
    newTime?: string,
  ) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (!appointment.rescheduleRequest) {
      throw new BadRequestException('No reschedule request found');
    }

    if (appointment.rescheduleRequest.status !== 'pending') {
      throw new BadRequestException('Reschedule request is not pending');
    }

    // Check if user is the other party (not the one who requested)
    const isDoctor = appointment.doctorId.toString() === userId.toString();
    const isPatient = appointment.patientId.toString() === userId.toString();

    if (!isDoctor && !isPatient) {
      throw new UnauthorizedException(
        'Not authorized to approve this reschedule request',
      );
    }

    // Check if user is trying to approve their own request
    if (
      (isDoctor && appointment.rescheduleRequest.requestedBy === 'doctor') ||
      (isPatient && appointment.rescheduleRequest.requestedBy === 'patient')
    ) {
      throw new BadRequestException(
        'Cannot approve your own reschedule request',
      );
    }

    // Determine the new date and time
    let finalDate: Date;
    let finalTime: string;

    // If doctor requested without date/time, patient must provide it
    if (
      !appointment.rescheduleRequest.requestedDate ||
      !appointment.rescheduleRequest.requestedTime
    ) {
      if (!newDate || !newTime) {
        throw new BadRequestException(
          'New date and time are required when doctor requested reschedule without specifying date/time',
        );
      }

      // Parse and validate date
      const appointmentDate = new Date(newDate + 'T00:00:00.000Z');
      if (isNaN(appointmentDate.getTime())) {
        throw new BadRequestException('Invalid appointment date');
      }

      finalDate = appointmentDate;

      // Validate time format
      const [hoursStr, minutesStr] = (newTime || '').split(':');
      const hours = Number(hoursStr);
      const minutes = Number(minutesStr);

      if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        throw new BadRequestException('Invalid appointment time');
      }

      finalTime = newTime;

      // Build full appointment DateTime
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      if (appointmentDateTime.getTime() < now.getTime()) {
        throw new BadRequestException(
          'ახალი თარიღი და დრო არ შეიძლება იყოს წარსულში',
        );
      }

      // Check doctor's availability
      const startOfDay = new Date(finalDate);
      const endOfDay = new Date(finalDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      let availability = await this.availabilityModel.findOne({
        doctorId: appointment.doctorId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        type: appointment.type,
        isAvailable: true,
      });

      // If doctor doesn't have this time in schedule, add it
      if (!availability) {
        // Create new availability entry
        availability = await this.availabilityModel.create({
          doctorId: appointment.doctorId,
          date: finalDate,
          type: appointment.type,
          isAvailable: true,
          timeSlots: [newTime],
        });
      } else if (
        !availability.timeSlots ||
        !availability.timeSlots.includes(newTime)
      ) {
        // Add time slot if it doesn't exist
        if (!availability.timeSlots) {
          availability.timeSlots = [];
        }
        availability.timeSlots.push(newTime);
        availability.timeSlots.sort();
        await availability.save();
      }

      // Check if the new time slot is already booked
      const existingAppointment = await this.appointmentModel.findOne({
        doctorId: appointment.doctorId,
        appointmentDate: finalDate,
        appointmentTime: newTime,
        type: appointment.type,
        status: {
          $in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
        _id: { $ne: new mongoose.Types.ObjectId(appointmentId) },
      });

      if (existingAppointment) {
        throw new BadRequestException('Selected time slot is already booked');
      }
    } else {
      // Use the requested date and time
      finalDate = appointment.rescheduleRequest.requestedDate;
      finalTime = appointment.rescheduleRequest.requestedTime!;
    }

    // Update appointment date and time
    appointment.appointmentDate = finalDate;
    appointment.appointmentTime = finalTime;
    appointment.rescheduleRequest.status = 'approved';
    appointment.rescheduleRequest.respondedAt = new Date();
    appointment.rescheduleRequest.respondedBy = isDoctor ? 'doctor' : 'patient';

    await appointment.save();

    // პასუხში ახალი თარიღი/დრო — იგივე დოკუმენტის ინსტანცია ზოგჯერ სერილიზაციაში ძველს აჩვენებს
    const fresh = await this.appointmentModel
      .findById(new mongoose.Types.ObjectId(appointmentId))
      .lean();

    return {
      success: true,
      message: 'გადაჯავშნა დამტკიცდა',
      data: fresh ?? appointment.toObject(),
    };
  }

  async rejectReschedule(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (!appointment.rescheduleRequest) {
      throw new BadRequestException('No reschedule request found');
    }

    if (appointment.rescheduleRequest.status !== 'pending') {
      throw new BadRequestException('Reschedule request is not pending');
    }

    // Check if user is the other party
    const isDoctor = appointment.doctorId.toString() === userId.toString();
    const isPatient = appointment.patientId.toString() === userId.toString();

    if (!isDoctor && !isPatient) {
      throw new UnauthorizedException(
        'Not authorized to reject this reschedule request',
      );
    }

    // Check if user is trying to reject their own request
    if (
      (isDoctor && appointment.rescheduleRequest.requestedBy === 'doctor') ||
      (isPatient && appointment.rescheduleRequest.requestedBy === 'patient')
    ) {
      throw new BadRequestException(
        'Cannot reject your own reschedule request',
      );
    }

    // Mark request as rejected
    appointment.rescheduleRequest.status = 'rejected';
    appointment.rescheduleRequest.respondedAt = new Date();
    appointment.rescheduleRequest.respondedBy = isDoctor ? 'doctor' : 'patient';

    await appointment.save();

    return {
      success: true,
      message: 'გადაჯავშნის მოთხოვნა უარყოფილია',
      data: appointment,
    };
  }

  // Helper function to calculate working days (excluding weekends)
  private calculateWorkingDays(startDate: Date, days: number): Date {
    const currentDate = new Date(startDate);
    let workingDaysAdded = 0;

    while (workingDaysAdded < days) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysAdded++;
      }
    }

    return currentDate;
  }

  // Check if follow-up is allowed (10 working days passed and not already used)
  async checkFollowUpEligibility(appointmentId: string, patientId: string) {
    const appointment = await this.appointmentModel.findOne({
      _id: new mongoose.Types.ObjectId(appointmentId),
      patientId: new mongoose.Types.ObjectId(patientId),
      status: AppointmentStatus.COMPLETED,
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found or not completed');
    }

    // Check if follow-up already exists
    if (appointment.followUp?.appointmentId) {
      const existingFollowUp = await this.appointmentModel.findById(
        appointment.followUp.appointmentId,
      );
      if (existingFollowUp) {
        console.log('განმეორებითი ვიზიტი უკვე დაჯავშნილია ამ კონსულტაციისთვის');
      }
    }

    // Calculate 10 working days from appointment date
    // Follow-up is available ONLY within 10 working days from the appointment
    const appointmentDate = new Date(appointment.appointmentDate);
    appointmentDate.setHours(0, 0, 0, 0);
    const tenWorkingDaysLater = this.calculateWorkingDays(appointmentDate, 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if 10 working days have passed - if yes, follow-up is no longer available
    if (today.getTime() > tenWorkingDaysLater.getTime()) {
      const daysPassed = Math.ceil(
        (today.getTime() - tenWorkingDaysLater.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      throw new BadRequestException(
        `განმეორებითი ვიზიტისთვის გაქვს 10 სამუშაო დღე პირველადი ვიზიტიდან. 10 სამუშაო დღე უკვე გავიდა (${daysPassed} დღე წინ)`,
      );
    }

    return {
      success: true,
      eligible: true,
      originalAppointment: appointment,
    };
  }

  async scheduleFollowUpAppointmentByPatient(
    patientId: string,
    appointmentId: string,
    dto: {
      date: string;
      time: string;
      type?: 'video' | 'home-visit';
      visitAddress?: string;
      reason?: string;
    },
  ) {
    // Check eligibility first
    const eligibilityCheck = await this.checkFollowUpEligibility(
      appointmentId,
      patientId,
    );
    const originalAppointment = eligibilityCheck.originalAppointment;

    const patientForMis = await this.userModel.findById(
      new mongoose.Types.ObjectId(patientId),
    );
    if (!patientForMis) {
      throw new NotFoundException('User not found');
    }
    const followUpMisPersonId =
      typeof patientForMis.misPersonId === 'string'
        ? patientForMis.misPersonId.trim()
        : '';
    if (!followUpMisPersonId) {
      throw new BadRequestException(
        'HIS პაციენტის ID აკლია — განმეორებითი ვიზიტი შეუძლებელია.',
      );
    }
    const doctorForMis = await this.userModel.findById(
      originalAppointment.doctorId,
    );
    if (!doctorForMis || doctorForMis.role !== UserRole.DOCTOR) {
      throw new NotFoundException('Doctor not found');
    }
    const followUpDoctorPersonalId =
      typeof doctorForMis.idNumber === 'string'
        ? doctorForMis.idNumber.trim()
        : '';
    if (!followUpDoctorPersonalId) {
      throw new BadRequestException(
        'ექიმს არ აქვს პირადი ნომერი — განმეორებითი ვიზიტი შეუძლებელია.',
      );
    }

    if (!dto.date || !dto.time) {
      throw new BadRequestException('Follow-up date and time are required');
    }

    // Normalize date to UTC start of day for consistent comparison
    const normalizedDate = new Date(dto.date);
    if (Number.isNaN(normalizedDate.getTime())) {
      throw new BadRequestException('Invalid follow-up date');
    }
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const followUpDateTime = new Date(`${dto.date}T${dto.time}`);
    if (Number.isNaN(followUpDateTime.getTime())) {
      throw new BadRequestException('Invalid follow-up time');
    }

    // Determine appointment type (default to original appointment type or 'video')
    const appointmentType =
      dto.type || originalAppointment.type || AppointmentType.VIDEO;

    // Validate visit address for home-visit type
    if (
      appointmentType === AppointmentType.HOME_VISIT &&
      !dto.visitAddress?.trim()
    ) {
      throw new BadRequestException(
        'Visit address is required for home-visit appointments',
      );
    }

    if (appointmentType === AppointmentType.HOME_VISIT) {
      const ds = String(dto.date).split('T')[0];
      const dp = ds.split('-').map(Number);
      if (dp.length === 3 && !dp.some((n) => Number.isNaN(n))) {
        const [fy, fm, fd] = dp;
        const [th, tmi] = dto.time.split(':').map(Number);
        const startLocal = new Date(fy, fm - 1, fd, th, tmi || 0, 0, 0);
        const HOME_VISIT_MIN_LEAD_MS = 2 * 60 * 60 * 1000;
        if (startLocal.getTime() - Date.now() < HOME_VISIT_MIN_LEAD_MS) {
          throw new BadRequestException(
            'ბინაზე ვიზიტის ჯავშანი შესაძლებელია მინიმუმ 2 საათით ადრე.',
          );
        }
      }
    }

    // Check doctor's availability for the selected type and time slot
    // Use date range query to handle timezone differences
    const startOfDay = new Date(normalizedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const availabilityQuery = {
      doctorId: originalAppointment.doctorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: appointmentType,
      isAvailable: true,
    };

    console.log(
      '🔍 scheduleFollowUpAppointmentByPatient - Availability query:',
      {
        doctorId: originalAppointment.doctorId.toString(),
        dateRange: {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString(),
        },
        type: appointmentType,
        dtoDate: dto.date,
        normalizedDate: normalizedDate.toISOString(),
      },
    );

    const availability =
      await this.availabilityModel.findOne(availabilityQuery);

    console.log(
      '🔍 scheduleFollowUpAppointmentByPatient - Availability found:',
      {
        found: !!availability,
        availabilityDate: availability?.date,
        availabilityTimeSlots: availability?.timeSlots,
      },
    );

    if (!availability) {
      const typeLabel =
        appointmentType === AppointmentType.VIDEO
          ? 'ვიდეო კონსულტაციის'
          : 'ბინაზე ვიზიტის';
      throw new BadRequestException(
        `ექიმი არ არის ხელმისაწვდომი ამ თარიღზე ${typeLabel} ტიპის განმეორებითი ვიზიტისთვის`,
      );
    }

    const timeSlots = availability.timeSlots;
    if (!timeSlots || !timeSlots.includes(dto.time)) {
      throw new BadRequestException(
        'არჩეული დრო არ არის ხელმისაწვდომი ექიმის განრიგში',
      );
    }

    // Check if the time slot is already booked
    const existingAppointment = await this.appointmentModel.findOne({
      doctorId: originalAppointment.doctorId,
      appointmentDate: normalizedDate,
      appointmentTime: dto.time,
      type: appointmentType,
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    });

    if (existingAppointment) {
      throw new BadRequestException('არჩეული დრო უკვე დაკავებულია');
    }

    const appointmentNumber = await this.generateAppointmentNumber();

    // Create follow-up appointment with FREE consultation fee (follow-up is free)
    const followUpAppointment = new this.appointmentModel({
      appointmentNumber,
      doctorId: originalAppointment.doctorId,
      patientId: new mongoose.Types.ObjectId(patientId),
      appointmentDate: normalizedDate,
      appointmentTime: dto.time,
      type: appointmentType,
      isFollowUp: true,
      visitAddress:
        appointmentType === AppointmentType.HOME_VISIT
          ? dto.visitAddress?.trim()
          : undefined,
      status: AppointmentStatus.CONFIRMED,
      consultationFee: 0, // Follow-up is free
      totalAmount: 0, // Follow-up is free
      paymentMethod: originalAppointment.paymentMethod,
      paymentStatus: PaymentStatus.PAID, // Mark as paid since it's free
      patientDetails: originalAppointment.patientDetails,
      notes:
        dto.reason ||
        `განმეორებითი ვიზიტი appointment ${originalAppointment.appointmentNumber}-ისთვის`,
    });

    await followUpAppointment.save();

    await misAttachGeneratedServiceId(
      this.misAuthService,
      this.appointmentModel,
      followUpAppointment,
      {
        misPersonId: followUpMisPersonId,
        doctorPersonalId: followUpDoctorPersonalId,
        serviceDateIso: followUpDateTime.toISOString(),
      },
      this.logger,
    );

    await followUpAppointment.populate(
      'patientId',
      'name dateOfBirth gender email phone',
    );
    await followUpAppointment.populate(
      'doctorId',
      'name specialization profileImage',
    );

    // Update original appointment with follow-up reference
    originalAppointment.followUp = {
      required: true,
      date: followUpDateTime,
      reason: dto.reason,
      appointmentId: followUpAppointment._id as mongoose.Types.ObjectId,
    };

    await originalAppointment.save();

    return {
      success: true,
      message: 'განმეორებითი ვიზიტი წარმატებით დაჯავშნა',
      data: followUpAppointment,
    };
  }

  async assignLaboratoryTests(
    doctorId: string,
    appointmentId: string,
    tests: Array<{
      productId: string;
      productName: string;
      clinicId?: string;
      clinicName?: string;
    }>,
  ) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== doctorId.toString()) {
      throw new UnauthorizedException(
        'Not authorized to assign tests to this appointment',
      );
    }

    // Check if appointment is in a valid status for lab test assignment
    // Allow all statuses except CANCELLED
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        'ლაბორატორიული კვლევები გაუქმებულ ჯავშნებზე ვერ დაინიშნება',
      );
    }

    const existingList = appointment.laboratoryTests || [];
    console.log('[assignLaboratoryTests] appointmentId:', appointmentId);
    console.log('[assignLaboratoryTests] request tests (count):', tests.length);
    console.log(
      '[assignLaboratoryTests] request tests:',
      JSON.stringify(tests, null, 2),
    );
    console.log(
      '[assignLaboratoryTests] existing in DB (count):',
      existingList.length,
    );
    console.log(
      '[assignLaboratoryTests] existing in DB:',
      JSON.stringify(existingList, null, 2),
    );

    // Replace list (რედაქტირებისას არ უნდა დუბლირდებოდეს: ჩანაცვლება, არა push)
    const existingMap = new Map(existingList.map((t) => [t.productId, t]));
    const newTests = tests.map((test) => {
      const existing = existingMap.get(test.productId);
      if (existing) {
        return {
          ...existing,
          productName: test.productName,
        };
      }
      return {
        productId: test.productId,
        productName: test.productName,
        clinicId: test.clinicId,
        clinicName: test.clinicName,
        assignedAt: new Date(),
        booked: false,
      };
    });
    console.log(
      '[assignLaboratoryTests] newTests after merge (count):',
      newTests.length,
    );
    console.log(
      '[assignLaboratoryTests] newTests after merge:',
      JSON.stringify(newTests, null, 2),
    );

    appointment.laboratoryTests = newTests;
    await appointment.save();

    const savedList = appointment.laboratoryTests || [];
    console.log('[assignLaboratoryTests] saved (count):', savedList.length);
    console.log(
      '[assignLaboratoryTests] saved:',
      JSON.stringify(savedList, null, 2),
    );

    return {
      success: true,
      message: 'ლაბორატორიული კვლევები წარმატებით დაემატა',
      data: appointment,
    };
  }

  async assignInstrumentalTests(
    doctorId: string,
    appointmentId: string,
    tests: Array<{
      productId: string;
      productName: string;
      notes?: string;
    }>,
  ) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId.toString() !== doctorId.toString()) {
      throw new UnauthorizedException(
        'Not authorized to assign tests to this appointment',
      );
    }

    // Allow all statuses except CANCELLED
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        'ინსტრუმენტული კვლევები გაუქმებულ ჯავშნებზე ვერ დაინიშნება',
      );
    }

    const existingInstrumentalList = appointment.instrumentalTests || [];
    console.log('[assignInstrumentalTests] appointmentId:', appointmentId);
    console.log(
      '[assignInstrumentalTests] request tests (count):',
      tests.length,
    );
    console.log(
      '[assignInstrumentalTests] request tests:',
      JSON.stringify(tests, null, 2),
    );
    console.log(
      '[assignInstrumentalTests] existing in DB (count):',
      existingInstrumentalList.length,
    );
    console.log(
      '[assignInstrumentalTests] existing in DB:',
      JSON.stringify(existingInstrumentalList, null, 2),
    );

    // Replace list (რედაქტირებისას არ უნდა დუბლირდებოდეს: ჩანაცვლება, არა push)
    const existingInstrumentalMap = new Map(
      existingInstrumentalList.map((t) => [t.productId, t]),
    );
    const newInstrumentalTests = tests.map((test) => {
      const existing = existingInstrumentalMap.get(test.productId);
      if (existing) {
        return {
          ...existing,
          productName: test.productName,
          notes: test.notes,
        };
      }
      return {
        productId: test.productId,
        productName: test.productName,
        notes: test.notes,
        assignedAt: new Date(),
      };
    });
    console.log(
      '[assignInstrumentalTests] newTests after merge (count):',
      newInstrumentalTests.length,
    );
    console.log(
      '[assignInstrumentalTests] newTests after merge:',
      JSON.stringify(newInstrumentalTests, null, 2),
    );

    appointment.instrumentalTests = newInstrumentalTests;
    await appointment.save();

    const savedInstrumental = appointment.instrumentalTests || [];
    console.log(
      '[assignInstrumentalTests] saved (count):',
      savedInstrumental.length,
    );
    console.log(
      '[assignInstrumentalTests] saved:',
      JSON.stringify(savedInstrumental, null, 2),
    );

    return {
      success: true,
      message: 'ინსტრუმენტული კვლევები წარმატებით დაემატა',
      data: appointment,
    };
  }

  async bookLaboratoryTest(
    patientId: string,
    appointmentId: string,
    data: {
      productId: string;
      clinicId: string;
      clinicName: string;
    },
  ) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if patient owns this appointment
    if (appointment.patientId.toString() !== patientId.toString()) {
      throw new UnauthorizedException(
        'Not authorized to book tests for this appointment',
      );
    }

    // Check if appointment is completed
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Laboratory tests can only be booked for completed appointments',
      );
    }

    // Find the laboratory test
    if (
      !appointment.laboratoryTests ||
      appointment.laboratoryTests.length === 0
    ) {
      throw new NotFoundException(
        'No laboratory tests found for this appointment',
      );
    }

    const testIndex = appointment.laboratoryTests.findIndex(
      (test) => test.productId === data.productId && !test.booked,
    );

    if (testIndex === -1) {
      throw new NotFoundException(
        'Laboratory test not found or already booked',
      );
    }

    // Update the test with clinic and mark as booked
    appointment.laboratoryTests[testIndex].clinicId = data.clinicId;
    appointment.laboratoryTests[testIndex].clinicName = data.clinicName;
    appointment.laboratoryTests[testIndex].booked = true;

    await appointment.save();

    return {
      success: true,
      message: 'ლაბორატორიული კვლევა წარმატებით დაჯავშნა',
      data: appointment,
    };
  }

  async bookInstrumentalTest(
    patientId: string,
    appointmentId: string,
    data: {
      productId: string;
      clinicId: string;
      clinicName: string;
    },
  ) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if patient owns this appointment
    if (appointment.patientId.toString() !== patientId.toString()) {
      throw new UnauthorizedException(
        'Not authorized to book tests for this appointment',
      );
    }

    // Check if appointment is completed
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Instrumental tests can only be booked for completed appointments',
      );
    }

    // Find the instrumental test
    if (
      !appointment.instrumentalTests ||
      appointment.instrumentalTests.length === 0
    ) {
      throw new NotFoundException(
        'No instrumental tests found for this appointment',
      );
    }

    const testIndex = appointment.instrumentalTests.findIndex(
      (test) => test.productId === data.productId && !test.booked,
    );

    if (testIndex === -1) {
      throw new NotFoundException(
        'Instrumental test not found or already booked',
      );
    }

    // Update the test with clinic and mark as booked
    appointment.instrumentalTests[testIndex].clinicId = data.clinicId;
    appointment.instrumentalTests[testIndex].clinicName = data.clinicName;
    appointment.instrumentalTests[testIndex].booked = true;

    await appointment.save();

    return {
      success: true,
      message: 'ინსტრუმენტული კვლევა წარმატებით დაჯავშნა',
      data: appointment,
    };
  }

  async uploadLaboratoryTestResult(
    patientId: string,
    appointmentId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('ფაილი აუცილებელია');
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('ფაილის ტიპი არასწორია');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('ფაილი უნდა იყოს 10MB-მდე');
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensurePatientOwner(patientId, appointment);

    if (
      !appointment.laboratoryTests ||
      appointment.laboratoryTests.length === 0
    ) {
      throw new NotFoundException(
        'No laboratory tests found for this appointment',
      );
    }

    const testIndex = appointment.laboratoryTests.findIndex(
      (test) => test.productId.toString() === productId,
    );

    if (testIndex === -1) {
      throw new NotFoundException('Laboratory test not found');
    }

    // Upload file to Cloudinary
    const upload = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      { folder: 'mediacare/laboratory-results' },
      file.mimetype,
      file.originalname,
    );

    const resultFile = {
      url: upload.secure_url,
      publicId: upload.public_id,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };

    // Update the test with result file
    appointment.laboratoryTests[testIndex].resultFile = resultFile as any;
    await appointment.save();

    return {
      success: true,
      message: 'ლაბორატორიული კვლევის შედეგი წარმატებით ატვირთა',
      data: resultFile,
    };
  }

  async uploadInstrumentalTestResult(
    patientId: string,
    appointmentId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('ფაილი აუცილებელია');
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('ფაილის ტიპი არასწორია');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('ფაილი უნდა იყოს 10MB-მდე');
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensurePatientOwner(patientId, appointment);

    if (
      !appointment.instrumentalTests ||
      appointment.instrumentalTests.length === 0
    ) {
      throw new NotFoundException(
        'No instrumental tests found for this appointment',
      );
    }

    const testIndex = appointment.instrumentalTests.findIndex(
      (test) => test.productId.toString() === productId,
    );

    if (testIndex === -1) {
      throw new NotFoundException('Instrumental test not found');
    }

    // Upload file to Cloudinary
    const upload = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      { folder: 'mediacare/instrumental-results' },
      file.mimetype,
      file.originalname,
    );

    const resultFile = {
      url: upload.secure_url,
      publicId: upload.public_id,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };

    // Update the test with result file
    appointment.instrumentalTests[testIndex].resultFile = resultFile as any;
    await appointment.save();

    return {
      success: true,
      message: 'ინსტრუმენტული კვლევის შედეგი წარმატებით ატვირთა',
      data: resultFile,
    };
  }

  /**
   * Upload external lab result (for tests done outside the app)
   */
  async uploadExternalLabResult(
    patientId: string,
    appointmentId: string,
    file: Express.Multer.File,
    testName?: string,
  ) {
    console.log('📤 uploadExternalLabResult called:', {
      patientId,
      appointmentId,
      testName,
      hasFile: !!file,
      fileName: file?.originalname,
      fileSize: file?.size,
      fileMimeType: file?.mimetype,
      hasBuffer: !!file?.buffer,
      bufferLength: file?.buffer?.length,
    });

    if (!file) {
      throw new BadRequestException('ფაილი აუცილებელია');
    }

    if (!file.buffer || file.buffer.length === 0) {
      console.error('❌ File buffer is empty!');
      throw new BadRequestException('ფაილი ცარიელია');
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('ფაილის ტიპი არასწორია');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('ფაილი უნდა იყოს 10MB-მდე');
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensurePatientOwner(patientId, appointment);

    // Upload file to Cloudinary
    console.log('📤 Uploading to Cloudinary...');
    const upload = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      { folder: 'mediacare/external-lab-results' },
      file.mimetype,
      file.originalname,
    );
    console.log('✅ Cloudinary upload result:', upload?.secure_url);

    const doc = {
      url: upload.secure_url,
      publicId: upload.public_id,
      name: testName || file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      isExternalLabResult: true, // Flag to identify external lab results
    };

    if (!appointment.documents) {
      appointment.documents = [];
    }
    appointment.documents.push(doc as any);
    appointment.markModified('documents');
    await appointment.save();

    return {
      success: true,
      message: 'გარე ლაბორატორიული კვლევის შედეგი წარმატებით ატვირთა',
      data: doc,
    };
  }

  /**
   * Generate Agora RTC token for video call
   * @param userId - User ID requesting the token
   * @param appointmentId - Appointment ID
   * @returns Agora token, channel name, and app ID
   */
  async generateAgoraToken(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verify user is part of this appointment (doctor or patient)
    const isDoctor = appointment.doctorId.toString() === userId;
    const isPatient = appointment.patientId.toString() === userId;

    if (!isDoctor && !isPatient) {
      throw new UnauthorizedException(
        'You are not authorized to access this appointment video call',
      );
    }

    // Get Agora configuration from environment variables
    // Fallback to hardcoded values for development (should be removed in production)
    const appId =
      process.env.AGORA_APP_ID || '3f485e4bf3bd4b4ea9bac7375d33785a';
    const appCertificate =
      process.env.AGORA_APP_CERTIFICATE || '93a0c913f5aa4fdfb599e6172686fa9c';

    if (!appId || !appCertificate) {
      throw new BadRequestException(
        'Agora configuration missing. Please configure AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables.',
      );
    }

    // Channel name based on appointment ID
    const channelName = `appointment-${appointmentId}`;

    // UID - can be 0 for auto-assigned or use user ID converted to number
    // Using timestamp-based UID to avoid conflicts
    const uid = isDoctor ? 1 : 2; // Simple: doctor = 1, patient = 2

    // Token expiration time (24 hours)
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + 3600 * 24;

    // Role: Publisher for both doctor and patient (can publish video/audio)
    const role = RtcRole.PUBLISHER;

    // Build token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      expirationTimeInSeconds,
    );

    return {
      success: true,
      data: {
        token,
        channelName,
        appId,
        uid,
        expirationTime: expirationTimeInSeconds,
      },
    };
  }

  // Join video call - track when patient or doctor joins
  async joinCall(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isDoctor = appointment.doctorId.toString() === userId.toString();
    const isPatient = appointment.patientId.toString() === userId.toString();

    if (!isDoctor && !isPatient) {
      throw new UnauthorizedException('Not authorized for this appointment');
    }

    // Update join time based on role
    if (isDoctor && !appointment.doctorJoinedAt) {
      appointment.doctorJoinedAt = new Date();
    } else if (isPatient && !appointment.patientJoinedAt) {
      appointment.patientJoinedAt = new Date();
    }

    await appointment.save();

    return {
      success: true,
      message: 'Join time recorded',
      data: appointment,
    };
  }

  // Complete video consultation - called by doctor after both parties leave
  async completeConsultation(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctorId.toString() !== userId.toString()) {
      throw new UnauthorizedException('Only doctor can complete consultation');
    }

    if (appointment.type !== AppointmentType.VIDEO) {
      throw new BadRequestException(
        'This endpoint is only for video consultations',
      );
    }

    // Check if both parties joined
    if (!appointment.patientJoinedAt || !appointment.doctorJoinedAt) {
      throw new BadRequestException(
        'Both parties must join before completing consultation',
      );
    }

    // Check if already completed
    if (appointment.completedAt) {
      throw new BadRequestException('Consultation already completed');
    }

    if (!appointmentHasForm100ReadyForCompletion(appointment)) {
      throw new BadRequestException(
        'ფორმა IV–100 უნდა ჩანდეს HIS mis-print-forms-ზე (აპში ჩაიტვირთეთ ჯავშნის HIS ფორმები), სანამ ვიდეო კონსულტაციას დაასრულებთ. ატვირთული PDF არ ითვლება.',
      );
    }

    // Mark as completed and set subStatus to conducted
    appointment.completedAt = new Date();
    appointment.subStatus = AppointmentSubStatus.CONDUCTED;
    appointment.status = AppointmentStatus.CONFIRMED; // Keep as confirmed, subStatus shows it's conducted

    await appointment.save();

    return {
      success: true,
      message: 'Consultation marked as conducted',
      data: appointment,
    };
  }

  // Complete home visit - called by patient
  async completeHomeVisit(userId: string, appointmentId: string) {
    console.log('🏠 [completeHomeVisit] Called with:', {
      userId,
      appointmentId,
    });

    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      console.error(
        '🏠 [completeHomeVisit] Appointment not found:',
        appointmentId,
      );
      throw new NotFoundException('Appointment not found');
    }

    console.log('🏠 [completeHomeVisit] Appointment found:', {
      id: (appointment._id as mongoose.Types.ObjectId).toString(),
      type: appointment.type,
      patientId: appointment.patientId.toString(),
      userId,
      homeVisitCompletedAt: appointment.homeVisitCompletedAt,
    });

    if (appointment.patientId.toString() !== userId.toString()) {
      console.error('🏠 [completeHomeVisit] Unauthorized - not patient:', {
        appointmentPatientId: appointment.patientId.toString(),
        userId,
      });
      throw new UnauthorizedException(
        'Only patient can mark home visit as completed',
      );
    }

    if (appointment.type !== AppointmentType.HOME_VISIT) {
      console.error('🏠 [completeHomeVisit] Not a home visit:', {
        type: appointment.type,
        expected: AppointmentType.HOME_VISIT,
      });
      throw new BadRequestException('This endpoint is only for home visits');
    }

    // Check if already marked by patient - if yes, just return success (informational only)
    if (appointment.homeVisitCompletedAt) {
      console.log(
        '🏠 [completeHomeVisit] Already marked as completed, returning success (informational)',
      );
      return {
        success: true,
        message:
          'Home visit was already marked as completed by patient (informational)',
        data: appointment,
      };
    }

    // Only set timestamp - informational only, doesn't change status
    // This is just to notify admin panel that patient marked it as completed
    appointment.homeVisitCompletedAt = new Date();
    // Don't change status or subStatus - this is just informational

    await appointment.save();

    console.log(
      '🏠 [completeHomeVisit] Successfully marked as completed (informational)',
    );

    return {
      success: true,
      message: 'Home visit completion marked by patient (informational)',
      data: appointment,
    };
  }
}
