import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';
import mongoose from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Availability } from '../doctors/schemas/availability.schema';
import { User, UserRole } from '../schemas/user.schema';
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
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: mongoose.Model<AppointmentDocument>,
    @InjectModel(User.name)
    private userModel: mongoose.Model<any>,
    @InjectModel(Availability.name)
    private availabilityModel: mongoose.Model<any>,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    setInterval(() => {
      void this.cleanupExpiredBlocks();
    }, 60000);
  }

  private ensurePatientOwner(patientId: string, apt: AppointmentDocument) {
    if (apt.patientId.toString() !== patientId.toString()) {
      throw new UnauthorizedException('Not allowed for this appointment');
    }
  }

  private ensureDoctorOrPatient(userId: string, apt: AppointmentDocument) {
    const isOwner =
      apt.patientId.toString() === userId.toString() ||
      apt.doctorId.toString() === userId.toString();
    if (!isOwner) {
      throw new Error('Not allowed for this appointment');
    }
  }

  async addDocument(
    patientId: string,
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

    this.ensurePatientOwner(patientId, appointment);

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

      return { success: true, data: doc };
    } catch (error) {
      console.error('❌ addDocument - Cloudinary upload error:', error);
      throw new BadRequestException('დოკუმენტის ატვირთვა ვერ მოხერხდა');
    }
  }

  async getDocuments(userId: string, appointmentId: string) {
    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensureDoctorOrPatient(userId, appointment);

    return {
      success: true,
      data: appointment.documents || [],
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

    // Build full appointment DateTime and enforce 2 hour lead time
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

    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    // ონლაინის შემთხვევაში: 2 საათით ადრე
    // ბინაზე ვიზიტისას: 12 საათით ადრე
    const requiredHours =
      createAppointmentDto.type === AppointmentType.VIDEO ? 2 : 12;
    const requiredMs = requiredHours * 60 * 60 * 1000;

    if (appointmentDateTime.getTime() - now.getTime() < requiredMs) {
      throw new BadRequestException(
        `ჯავშნის გაკეთება შესაძლებელია მინიმუმ ${requiredHours} საათით ადრე`,
      );
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
      status: AppointmentStatus.PENDING,
      consultationFee: createAppointmentDto.consultationFee,
      totalAmount: createAppointmentDto.totalAmount,
      paymentMethod: createAppointmentDto.paymentMethod,
      paymentStatus:
        createAppointmentDto.paymentStatus || PaymentStatus.PENDING,
      patientDetails: createAppointmentDto.patientDetails,
      documents: createAppointmentDto.documents || [],
      notes: createAppointmentDto.notes,
      visitAddress: createAppointmentDto.visitAddress,
    });

    await appointment.save();

    // Note: We don't remove time slots from availability anymore.
    // Instead, we track booked slots dynamically by querying appointments.

    return {
      success: true,
      data: appointment,
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

    return {
      success: true,
      data: appointments,
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

    return {
      success: true,
      data: appointment,
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

    // Build full appointment DateTime and enforce 2 hour lead time
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    // Check if new appointment time is in the past
    if (appointmentDateTime.getTime() < now.getTime()) {
      throw new BadRequestException(
        'ახალი თარიღი და დრო არ შეიძლება იყოს წარსულში',
      );
    }

    if (appointmentDateTime.getTime() - now.getTime() < twoHoursInMs) {
      throw new BadRequestException(
        'ჯავშნის გადაჯავშნა შესაძლებელია მინიმუმ 2 საათით ადრე',
      );
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

    // Update appointment status to cancelled
    appointment.status = AppointmentStatus.CANCELLED;
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
    newDate: string,
    newTime: string,
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

    // Parse and validate date
    const appointmentDate = new Date(newDate + 'T00:00:00.000Z');
    if (isNaN(appointmentDate.getTime())) {
      throw new BadRequestException('Invalid appointment date');
    }

    const normalizedDate = appointmentDate;
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

    // Create reschedule request
    appointment.rescheduleRequest = {
      requestedBy: isDoctor ? 'doctor' : 'patient',
      requestedDate: normalizedDate,
      requestedTime: newTime,
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

  async approveReschedule(userId: string, appointmentId: string) {
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

    // Update appointment date and time
    appointment.appointmentDate = appointment.rescheduleRequest.requestedDate!;
    appointment.appointmentTime = appointment.rescheduleRequest.requestedTime!;
    appointment.rescheduleRequest.status = 'approved';
    appointment.rescheduleRequest.respondedAt = new Date();
    appointment.rescheduleRequest.respondedBy = isDoctor ? 'doctor' : 'patient';

    await appointment.save();

    return {
      success: true,
      message: 'გადაჯავშნა დამტკიცდა',
      data: appointment,
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
    // Allowed statuses: confirmed, in-progress, completed
    const allowedStatuses = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.COMPLETED,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        'ლაბორატორიული კვლევები მხოლოდ დადასტურებულ, მიმდინარე ან დასრულებულ ჯავშნებზე შეიძლება დაინიშნოს',
      );
    }

    // Initialize laboratoryTests array if it doesn't exist
    if (!appointment.laboratoryTests) {
      appointment.laboratoryTests = [];
    }

    // Add new tests
    const newTests = tests.map((test) => ({
      productId: test.productId,
      productName: test.productName,
      clinicId: test.clinicId,
      clinicName: test.clinicName,
      assignedAt: new Date(),
      booked: false,
    }));

    appointment.laboratoryTests.push(...newTests);
    await appointment.save();

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

    const allowedStatuses = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.COMPLETED,
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new BadRequestException(
        'ინსტრუმენტული კვლევები მხოლოდ დადასტურებულ, მიმდინარე ან დასრულებულ ჯავშნებზე შეიძლება დაინიშნოს',
      );
    }

    if (!appointment.instrumentalTests) {
      appointment.instrumentalTests = [];
    }

    const newTests = tests.map((test) => ({
      productId: test.productId,
      productName: test.productName,
      notes: test.notes,
      assignedAt: new Date(),
    }));

    appointment.instrumentalTests.push(...newTests);
    await appointment.save();

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
    const appointment = await this.appointmentModel.findById(
      new mongoose.Types.ObjectId(appointmentId),
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId.toString() !== userId.toString()) {
      throw new UnauthorizedException(
        'Only patient can mark home visit as completed',
      );
    }

    if (appointment.type !== AppointmentType.HOME_VISIT) {
      throw new BadRequestException('This endpoint is only for home visits');
    }

    // Check if already completed
    if (appointment.homeVisitCompletedAt) {
      throw new BadRequestException('Home visit already marked as completed');
    }

    // Mark as completed and set subStatus to conducted
    appointment.homeVisitCompletedAt = new Date();
    appointment.subStatus = AppointmentSubStatus.CONDUCTED;
    appointment.status = AppointmentStatus.CONFIRMED; // Keep as confirmed, subStatus shows it's conducted

    await appointment.save();

    return {
      success: true,
      message: 'Home visit marked as completed',
      data: appointment,
    };
  }
}
