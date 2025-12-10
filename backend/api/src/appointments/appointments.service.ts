import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Availability } from '../doctors/schemas/availability.schema';
import { User, UserRole } from '../schemas/user.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
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
    // Clean up expired blocked appointments every minute
    setInterval(() => {
      this.cleanupExpiredBlocks();
    }, 60000); // 1 minute
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

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('ფაილი უნდა იყოს 5MB-მდე');
    }

    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    this.ensurePatientOwner(patientId, appointment);

    const upload = await this.cloudinaryService.uploadBuffer(file.buffer, {
      folder: 'mediacare/appointment-docs',
      resource_type: 'auto',
    });

    const doc = {
      url: upload.secure_url,
      publicId: upload.public_id,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };

    appointment.documents = appointment.documents || [];
    appointment.documents.push(doc as any);
    await appointment.save();

    return { success: true, data: doc };
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
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    if (appointmentDateTime.getTime() - now.getTime() < twoHoursInMs) {
      throw new BadRequestException(
        'ჯავშნის გაკეთება შესაძლებელია მინიმუმ 2 საათით ადრე',
      );
    }

    // Check doctor's availability for the specific appointment type (video/home-visit)
    const availability = await this.availabilityModel.findOne({
      doctorId: new mongoose.Types.ObjectId(createAppointmentDto.doctorId),
      date: normalizedDate,
      type: createAppointmentDto.type, // Check availability for specific type
      isAvailable: true,
    });

    if (!availability) {
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
      console.error('Error cleaning up expired blocks:', error);
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
      .populate('doctorId', 'name specialization profileImage')
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
        .populate('doctorId', 'name specialization profileImage')
        .populate('patientId', 'name email phone')
        .lean();
    } else {
      // If not ObjectId, try to find by appointmentNumber
      appointment = await this.appointmentModel
        .findOne({ appointmentNumber: appointmentId })
        .populate('doctorId', 'name specialization profileImage')
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
}
