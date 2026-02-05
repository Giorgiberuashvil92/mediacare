import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
  AppointmentStatus,
  AppointmentType,
  PaymentStatus,
} from '../appointments/schemas/appointment.schema';
import {
  ApprovalStatus,
  DoctorStatus,
  User,
  UserDocument,
  UserRole,
} from '../schemas/user.schema';
import {
  Specialization,
  SpecializationDocument,
} from '../specializations/schemas/specialization.schema';
import { UploadService } from '../upload/upload.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { DoctorStatusFilter, GetDoctorsDto } from './dto/get-doctors.dto';
import { UpdateDoctorAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { UpdateForm100Dto } from './dto/update-form100.dto';
import {
  Availability,
  AvailabilityDocument,
} from './schemas/availability.schema';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: mongoose.Model<AvailabilityDocument>,
    @InjectModel(Specialization.name)
    private specializationModel: mongoose.Model<SpecializationDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: mongoose.Model<AppointmentDocument>,
    private readonly uploadService: UploadService,
  ) {}

  private async generateAppointmentNumber(): Promise<string> {
    const prefix = 'APT';
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const appointmentNumber = `${prefix}${year}${randomNum}`;

    const exists = await this.appointmentModel.findOne({
      appointmentNumber,
    });

    if (exists) {
      return this.generateAppointmentNumber();
    }

    return appointmentNumber;
  }

  private formatDashboardAppointment(apt: any) {
    const patient = apt.patientId;

    let patientAge = 0;
    if (patient?.dateOfBirth) {
      const birthDate = new Date(patient.dateOfBirth);
      const today = new Date();
      patientAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        patientAge--;
      }
    }

    const statusMap: { [key: string]: string } = {
      pending: 'scheduled',
      confirmed: 'scheduled',
      'in-progress': 'in-progress',
      completed: 'completed',
      cancelled: 'cancelled',
    };

    const consultationSummary = apt.consultationSummary || {};
    const followUp = apt.followUp || { required: false };

    return {
      id: apt._id ? apt._id.toString() : apt.id,
      patientName:
        patient?.name || apt.patientDetails?.name || 'უცნობი პაციენტი',
      patientAge:
        patientAge ||
        (apt.patientDetails?.dateOfBirth
          ? new Date().getFullYear() -
            new Date(apt.patientDetails.dateOfBirth).getFullYear()
          : 0),
      date: apt.appointmentDate
        ? (() => {
            const date = new Date(apt.appointmentDate);
            // Use local methods to match admin panel display (which uses toLocaleDateString)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            console.log('📅 formatDashboardAppointment - Date formatting:', {
              original: apt.appointmentDate,
              dateObject: date.toISOString(),
              formatted: formattedDate,
              localYear: year,
              localMonth: month,
              localDay: day,
              utcYear: date.getUTCFullYear(),
              utcMonth: String(date.getUTCMonth() + 1).padStart(2, '0'),
              utcDay: String(date.getUTCDate()).padStart(2, '0'),
            });
            return formattedDate;
          })()
        : '',
      time: apt.appointmentTime,
      type: apt.type === 'home-visit' ? 'home-visit' : 'video', // Use actual appointment type (video or home-visit)
      status: statusMap[apt.status] || apt.status,
      fee: apt.consultationFee || apt.totalAmount || 0,
      isPaid: apt.paymentStatus === 'paid',
      diagnosis: consultationSummary.diagnosis,
      symptoms:
        consultationSummary.symptoms ||
        apt.patientDetails?.problem ||
        apt.notes ||
        '',
      consultationSummary: Object.keys(consultationSummary).length
        ? {
            diagnosis: consultationSummary.diagnosis,
            symptoms: consultationSummary.symptoms,
            medications: consultationSummary.medications,
            notes: consultationSummary.notes,
            vitals: consultationSummary.vitals || {},
          }
        : undefined,
      followUp: followUp.required
        ? {
            required: true,
            date: followUp.date
              ? new Date(followUp.date).toISOString()
              : undefined,
            reason: followUp.reason,
          }
        : { required: false },
      // მიეცეს ექიმს სრულად დანიშნული/შესრულებული ლაბორატორიული კვლევები, მათ შორის ატვირთული შედეგიც
      laboratoryTests: Array.isArray(apt.laboratoryTests)
        ? apt.laboratoryTests
        : [],
      form100: apt.form100
        ? {
            id: apt.form100.id,
            issueDate: apt.form100.issueDate
              ? new Date(apt.form100.issueDate).toISOString()
              : undefined,
            validUntil: apt.form100.validUntil
              ? new Date(apt.form100.validUntil).toISOString()
              : undefined,
            reason: apt.form100.reason,
            diagnosis: apt.form100.diagnosis,
            recommendations: apt.form100.recommendations,
            pdfUrl: apt.form100.pdfUrl,
            fileName: apt.form100.fileName,
          }
        : undefined,
      // Include full patient details for doctor to see (for Form 100 generation)
      patientDetails: apt.patientDetails
        ? {
            name: apt.patientDetails.name,
            lastName: apt.patientDetails.lastName,
            dateOfBirth: apt.patientDetails.dateOfBirth,
            gender: apt.patientDetails.gender,
            personalId: apt.patientDetails.personalId,
            address: apt.patientDetails.address,
            problem: apt.patientDetails.problem,
          }
        : undefined,
      patientEmail: patient?.email,
      patientPhone: patient?.phone,
      createdAt: apt.createdAt
        ? new Date(apt.createdAt).toISOString()
        : undefined,
      rescheduleRequest: apt.rescheduleRequest
        ? {
            requestedBy: apt.rescheduleRequest.requestedBy,
            requestedDate: apt.rescheduleRequest.requestedDate
              ? new Date(apt.rescheduleRequest.requestedDate).toISOString()
              : undefined,
            requestedTime: apt.rescheduleRequest.requestedTime,
            reason: apt.rescheduleRequest.reason,
            status: apt.rescheduleRequest.status,
            requestedAt: apt.rescheduleRequest.requestedAt
              ? new Date(apt.rescheduleRequest.requestedAt).toISOString()
              : undefined,
            respondedAt: apt.rescheduleRequest.respondedAt
              ? new Date(apt.rescheduleRequest.respondedAt).toISOString()
              : undefined,
            respondedBy: apt.rescheduleRequest.respondedBy,
          }
        : undefined,
    };
  }

  async getAllDoctors(query: GetDoctorsDto) {
    const {
      specialization,
      location,
      rating,
      search,
      symptom,
      page = 1,
      limit = 10,
      status = DoctorStatusFilter.APPROVED,
    } = query;

    console.log('🔍 [DoctorsService] getAllDoctors called with:', {
      status,
      statusType: typeof status,
      statusValue: status,
      queryKeys: Object.keys(query),
      fullQuery: query,
    });

    const skip = (page - 1) * limit;

    // Build filter
    const filter: FilterQuery<UserDocument> = {
      role: 'doctor',
    };

    switch (status) {
      case DoctorStatusFilter.PENDING:
        filter.approvalStatus = ApprovalStatus.PENDING;
        // Don't filter by isActive for pending - pending doctors can have any isActive status
        console.log('📋 [DoctorsService] Filter for PENDING:', filter);
        break;
      case DoctorStatusFilter.AWAITING_SCHEDULE:
        filter.approvalStatus = ApprovalStatus.APPROVED;
        filter.doctorStatus = 'awaiting_schedule';
        break;
      case DoctorStatusFilter.REJECTED:
        filter.approvalStatus = ApprovalStatus.REJECTED;
        break;
      case DoctorStatusFilter.ALL:
        break;
      case DoctorStatusFilter.APPROVED:
      default:
        filter.approvalStatus = ApprovalStatus.APPROVED;
        filter.isActive = true;
        // IMPORTANT: Only show doctors with 'active' doctorStatus to patients
        // Doctors with 'awaiting_schedule' are approved but hidden until they set a schedule
        filter.doctorStatus = 'active';
        break;
    }

    // If symptom is provided, find specializations that contain this symptom
    if (symptom) {
      // NestJS automatically decodes query parameters, so symptom is already decoded
      const symptomTrimmed = symptom.trim();

      // MongoDB automatically searches in array fields with $regex
      const specializationsWithSymptom = await this.specializationModel
        .find({
          symptoms: { $regex: symptomTrimmed, $options: 'i' },
          isActive: true,
        })
        .select('name')
        .lean();

      const specializationNames = specializationsWithSymptom.map(
        (spec) => spec.name,
      );

      if (specializationNames.length > 0) {
        filter.specialization = { $in: specializationNames };
      } else {
        // If no specialization has this symptom, return empty result
        return {
          success: true,
          data: {
            doctors: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        };
      }
    } else if (specialization) {
      filter.specialization = { $regex: specialization, $options: 'i' };
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (rating !== undefined) {
      filter.rating = { $gte: rating };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
      ];
    }

    console.log(
      '🔎 [DoctorsService] MongoDB filter:',
      JSON.stringify(filter, null, 2),
    );
    const doctors = await this.userModel
      .find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(
      '📊 [DoctorsService] Found doctors:',
      doctors.length,
      doctors.map((d) => ({
        id: d._id,
        name: d.name,
        approvalStatus: (d as any).approvalStatus,
        isActive: (d as any).isActive,
      })),
    );

    // Filter doctors who have availability (at least one available time slot in the future)
    // BUT: Don't filter by availability for pending/rejected doctors - they might not have availability set up yet
    let availableDoctors = doctors;

    if (
      status === DoctorStatusFilter.APPROVED ||
      status === DoctorStatusFilter.ALL
    ) {
      // Only filter by availability for approved doctors or when showing all
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all doctor IDs
      const doctorIds = doctors.map((doctor) => (doctor._id as any).toString());

      // Find all doctors who have availability in the future
      // First, find availability records that match our criteria
      const availabilityRecords = await this.availabilityModel
        .find({
          doctorId: {
            $in: doctorIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          date: { $gte: today },
          isAvailable: true,
          timeSlots: { $exists: true, $ne: [] },
        })
        .select('doctorId timeSlots')
        .lean();

      // Filter to only include records with non-empty timeSlots array
      const doctorsWithAvailability = availabilityRecords
        .filter(
          (record) =>
            record.timeSlots &&
            Array.isArray(record.timeSlots) &&
            record.timeSlots.length > 0,
        )
        .map((record) => record.doctorId);

      // Convert to string array for comparison
      const availableDoctorIds = new Set(
        doctorsWithAvailability.map((id) => id.toString()),
      );

      // Filter doctors to only include those with availability
      availableDoctors = doctors.filter((doctor) =>
        availableDoctorIds.has((doctor._id as any).toString()),
      );
    }

    console.log(
      '👥 [DoctorsService] Available doctors after filtering:',
      availableDoctors.length,
    );

    // Format doctors
    const formattedDoctors = availableDoctors.map((doctor) => ({
      id: (doctor._id as string).toString(),
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      idNumber: doctor.idNumber,
      specialization: (doctor as any).specialization,
      rating: doctor.rating || 0,
      reviewCount: doctor.reviewCount || 0,
      isActive: doctor.isActive,
      profileImage: doctor.profileImage,
      degrees: doctor.degrees,
      location: doctor.location,
      patients: '100+', // This could be calculated from appointments
      experience: doctor.experience,
      about: doctor.about,
      dateOfBirth: doctor.dateOfBirth,
      gender: doctor.gender,
      licenseDocument: doctor.licenseDocument,
      workingHours: '09:00 - 18:00', // This could be from availability
      approvalStatus: doctor.approvalStatus,
      doctorStatus: (doctor as any).doctorStatus,
      isTopRated: doctor.isTopRated || false,
    }));

    // Get total count (without availability filter for pending/rejected/awaiting_schedule)
    let totalCount = formattedDoctors.length;
    if (
      status === DoctorStatusFilter.APPROVED ||
      status === DoctorStatusFilter.ALL
    ) {
      // For approved/all, total is already filtered by availability
      totalCount = formattedDoctors.length;
    } else {
      // For pending/rejected/awaiting_schedule, get total count from database
      const totalDoctors = await this.userModel.countDocuments(filter);
      totalCount = totalDoctors;
    }

    console.log('✅ [DoctorsService] Returning:', {
      doctorsCount: formattedDoctors.length,
      totalCount,
      status,
      filter: JSON.stringify(filter, null, 2),
    });

    return {
      success: true,
      data: {
        doctors: formattedDoctors,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    };
  }

  async getDoctorById(doctorId: string, includePending: boolean = false) {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundException('Invalid doctor ID format');
    }

    const filter: FilterQuery<UserDocument> = {
      _id: new mongoose.Types.ObjectId(doctorId),
      role: UserRole.DOCTOR,
    };

    if (!includePending) {
      filter.approvalStatus = ApprovalStatus.APPROVED;
      filter.isActive = true;
    }

    const doctor = await this.userModel
      .findOne(filter)
      .select('-password')
      .lean();

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Get availability using getDoctorAvailability for consistency
    // პაციენტისთვის: forPatient=true, რომ მხოლოდ available slots ჩანდეს
    const availabilityResponse = await this.getDoctorAvailability(
      doctorId,
      undefined,
      undefined,
      undefined,
      true, // forPatient=true
    );

    const formattedAvailability = availabilityResponse.data || [];

    const reviews: any[] = [];

    console.log(
      '🏥 getDoctorById - formattedAvailability:',
      JSON.stringify(formattedAvailability, null, 2),
    );

    return {
      success: true,
      data: {
        id: (doctor._id as string).toString(),
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        idNumber: doctor.idNumber,
        specialization: doctor.specialization,
        rating: doctor.rating || 0,
        reviewCount: doctor.reviewCount || 0,
        isActive: doctor.isActive,
        profileImage: doctor.profileImage,
        degrees: doctor.degrees,
        location: doctor.location,
        patients: '100+',
        experience: doctor.experience,
        consultationFee: doctor.consultationFee,
        followUpFee: doctor.followUpFee,
        about: doctor.about,
        dateOfBirth: doctor.dateOfBirth,
        gender: doctor.gender,
        licenseDocument: doctor.licenseDocument,
        workingHours: '09:00 - 18:00',
        availability: formattedAvailability,
        reviews,
        approvalStatus: doctor.approvalStatus,
        isTopRated: doctor.isTopRated || false,
      },
    };
  }

  /**
   * ხელახლა დაწერილი availability ლოგიკა სპეციალურად მობაილისთვის.
   *
   * აბრუნებს ზუსტად იმ ფორმატს, რასაც front იყენებს:
   * - date: 'YYYY-MM-DD'
   * - dayOfWeek: ქართულის დღე
   * - timeSlots: string[] (ექიმის სქედული, დაჯავშნილსაც შეიცავს)
   * - bookedSlots: string[] (დაჯავშნილი საათები იმავე ფორმატში)
   * - isAvailable: არის თუ არა ამ დღეს მაინც 1 თავისუფალი სლოტი
   * - type: 'video' | 'home-visit'
   */
  async getDoctorAvailability(
    doctorId: string,
    startDate?: string,
    endDate?: string,
    type?: 'video' | 'home-visit',
    forPatient: boolean = false,
  ) {
    // 1) ვალიდაცია
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundException('Invalid doctor ID format');
    }

    const doctor = await this.userModel.findOne({
      _id: new mongoose.Types.ObjectId(doctorId),
      role: 'doctor',
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // 2) თარიღების დიაპაზონი (default: დღეს + 30 დღე)
    let rangeStart: Date;
    let rangeEnd: Date;

    if (startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(endDate);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      // დიაპაზონი: წარსული 7 დღე + მომავალი 30 დღე (რომ ჩანდეს დაჯავშნილი appointments-ებიც)
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - 7); // წარსული 7 დღე
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date();
      rangeEnd.setDate(rangeEnd.getDate() + 30); // მომავალი 30 დღე
      rangeEnd.setHours(23, 59, 59, 999);
    }

    console.log('📅 [getDoctorAvailability] Date range:', {
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      rangeStartLocal: rangeStart.toLocaleString(),
      rangeEndLocal: rangeEnd.toLocaleString(),
      startDate,
      endDate,
      forPatient,
    });

    // 3) ამ დიაპაზონში ექიმის availability ამოვიღოთ
    const availabilityFilter: FilterQuery<AvailabilityDocument> = {
      doctorId: new mongoose.Types.ObjectId(doctorId),
      date: { $gte: rangeStart, $lte: rangeEnd },
    };

    if (type) {
      availabilityFilter.type = type;
    }

    const availabilityDocs = await this.availabilityModel
      .find(availabilityFilter)
      .lean();

    // 4) ამავე დიაპაზონში დაჯავშნილი ვიზიტები ამოვიღოთ
    const bookedAppointmentsQuery = {
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: { $gte: rangeStart, $lte: rangeEnd },
      status: { $ne: 'cancelled' },
    };

    console.log('📅 [getDoctorAvailability] Querying booked appointments:', {
      query: {
        doctorId: doctorId,
        appointmentDate: {
          $gte: rangeStart.toISOString(),
          $lte: rangeEnd.toISOString(),
        },
        status: { $ne: 'cancelled' },
      },
    });

    const bookedAppointments = await this.appointmentModel
      .find(bookedAppointmentsQuery)
      .select('appointmentDate appointmentTime status type')
      .lean();

    console.log('📅 [getDoctorAvailability] Found booked appointments:', {
      count: bookedAppointments.length,
      appointments: bookedAppointments.map((apt) => ({
        id: (apt as any)._id?.toString(),
        storedDate: apt.appointmentDate,
        storedDateISO:
          apt.appointmentDate instanceof Date
            ? apt.appointmentDate.toISOString()
            : new Date(apt.appointmentDate).toISOString(),
        time: apt.appointmentTime,
        status: apt.status,
        type: apt.type,
      })),
    });

    // 5) დავაგენერიროთ bookedSlotsByDate (YYYY-MM-DD-type -> Set<HH:mm>)
    const bookedSlotsByDate: { [key: string]: Set<string> } = {};

    bookedAppointments.forEach((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      const year = aptDate.getFullYear();
      const month = String(aptDate.getMonth() + 1).padStart(2, '0');
      const day = String(aptDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      // დავრწმუნდეთ, რომ type არის 'video' ან 'home-visit'
      const aptType = apt.type === 'home-visit' ? 'home-visit' : 'video';
      const dateTypeKey = `${dateStr}-${aptType}`;

      console.log('📅 [getDoctorAvailability] Appointment date parsing:', {
        appointmentId: (apt as any)._id?.toString(),
        storedDate: apt.appointmentDate,
        isoString: aptDate.toISOString(),
        localDateStr: dateStr,
        utcDateStr: `${aptDate.getUTCFullYear()}-${String(aptDate.getUTCMonth() + 1).padStart(2, '0')}-${String(aptDate.getUTCDate()).padStart(2, '0')}`,
        time: apt.appointmentTime,
        type: aptType,
        dateTypeKey,
      });

      if (!bookedSlotsByDate[dateTypeKey]) {
        bookedSlotsByDate[dateTypeKey] = new Set();
      }

      if (apt.appointmentTime) {
        const normalizedTime = apt.appointmentTime
          .split(':')
          .slice(0, 2)
          .join(':');
        bookedSlotsByDate[dateTypeKey].add(normalizedTime);
      }
    });

    console.log(
      '📅 [getDoctorAvailability] Final bookedSlotsByDate:',
      Object.fromEntries(
        Object.entries(bookedSlotsByDate).map(([k, v]) => [k, Array.from(v)]),
      ),
    );

    // 6) ქართული დღეების სახელები
    const dayNames = [
      'კვირა',
      'ორშაბათი',
      'სამშაბათი',
      'ოთხშაბათი',
      'ხუთშაბათი',
      'პარასკევი',
      'შაბათი',
    ];

    // 7) availabilityDocs -> frontend-ისთვის საჭირო ფორმატი
    // დავაგრუპოთ ჩანაწერები ერთი დღის და ერთი ტიპის ჭრილში,
    // რომ ერთი და იმავე თარიღზე დუპლიკატები აღარ მოვიდეს.

    const availabilityByDateType: Record<
      string,
      { date: Date; type: 'video' | 'home-visit'; slots: Set<string> }
    > = {};

    availabilityDocs.forEach((avail) => {
      const date = new Date(avail.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const typeKey: 'video' | 'home-visit' = (avail.type as any) ?? 'video';
      const key = `${dateStr}|${typeKey}`;

      console.log('📅 [getDoctorAvailability] Availability date parsing:', {
        storedDate: avail.date,
        isoString: date.toISOString(),
        localDateStr: dateStr,
        utcDateStr: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
        type: typeKey,
      });

      if (!availabilityByDateType[key]) {
        availabilityByDateType[key] = {
          date,
          type: typeKey,
          slots: new Set<string>(),
        };
      }

      (avail.timeSlots || []).forEach((slot: string) => {
        availabilityByDateType[key].slots.add(slot);
      });
    });

    // 🔒 დაჯავშნილი დღეების დამატება, თუნდაც არ იყოს availability record
    // ექიმისთვის საჭიროა ვნახოთ დაჯავშნილი დღეები, თუნდაც არ იყოს timeSlots
    Object.keys(bookedSlotsByDate).forEach((dateTypeKey) => {
      // dateTypeKey არის "YYYY-MM-DD-type" ფორმატში (მაგ: "2026-02-06-video" ან "2026-02-06-home-visit")
      // უნდა გავყოთ ბოლო dash-ის მიხედვით, რადგან type შეიძლება იყოს "home-visit" (ორი სიტყვა)
      const lastDashIndex = dateTypeKey.lastIndexOf('-');
      const dateStr = dateTypeKey.substring(0, lastDashIndex); // "2026-02-06"
      const typeKey = dateTypeKey.substring(lastDashIndex + 1); // "video" ან "home-visit"
      const type = typeKey === 'home-visit' ? 'home-visit' : 'video';
      const key = `${dateStr}|${type}`;

      console.log(`🔍 [getDoctorAvailability] Parsing booked dateTypeKey:`, {
        dateTypeKey,
        dateStr,
        typeKey,
        type,
        key,
      });

      // თუ ეს დღე უკვე არ არის availabilityByDateType-ში, დავამატოთ
      if (!availabilityByDateType[key]) {
        // დავპარსოთ თარიღი
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        availabilityByDateType[key] = {
          date,
          type: type,
          slots: new Set<string>(), // ცარიელი slots, რადგან availability record არ არის
        };

        console.log(
          `🔒 [getDoctorAvailability] Added booked-only date: ${dateTypeKey}`,
          {
            dateStr,
            type,
            bookedSlots: Array.from(bookedSlotsByDate[dateTypeKey]),
          },
        );
      }
    });

    const result = Object.entries(availabilityByDateType)
      .map(([key, value]) => {
        const [dateStr] = key.split('|');
        const { date, type, slots } = value;

        // დავრწმუნდეთ, რომ type არის 'video' ან 'home-visit'
        const typeKey = type === 'home-visit' ? 'home-visit' : 'video';
        const dateTypeKey = `${dateStr}-${typeKey}`;

        // მხოლოდ ამ type-ის booked slots (bookedSlots-ში ჩანს მხოლოდ შესაბამისი type-ის)
        const bookedSetForThisType =
          bookedSlotsByDate[dateTypeKey] || new Set<string>();

        // ორივე type-ის appointments გავითვალისწინოთ available slots-ისთვის,
        // რადგან ექიმი არ შეუძლია ერთდროულად იყოს ორ ადგილას
        const otherTypeKey = typeKey === 'video' ? 'home-visit' : 'video';
        const otherDateTypeKey = `${dateStr}-${otherTypeKey}`;
        const bookedSetForOtherType =
          bookedSlotsByDate[otherDateTypeKey] || new Set<string>();

        // გავაერთიანოთ ორივე type-ის booked slots available slots-ისთვის
        const bookedSetForAvailable = new Set([
          ...bookedSetForThisType,
          ...bookedSetForOtherType,
        ]);

        const allTimeSlots: string[] = Array.from(slots).sort();

        console.log(`🔍 [getDoctorAvailability] Processing ${dateTypeKey}:`, {
          dateStr,
          type,
          typeKey,
          dateTypeKey,
          bookedSlotsForThisType: Array.from(bookedSetForThisType),
          bookedSlotsForOtherType: Array.from(bookedSetForOtherType),
          bookedSlotsForAvailable: Array.from(bookedSetForAvailable),
          availableSlots: allTimeSlots,
        });

        // თუ არც availability-ს აქვს სლოტები და არც დაჯავშნილია რამე -> ასეთი დღე არ გვაინტერესებს
        if (allTimeSlots.length === 0 && bookedSetForThisType.size === 0) {
          return null;
        }

        // Available slots: მხოლოდ ის slots, რომლებიც არ არის დაჯავშნილი (ორივე type-ისთვის)
        const availableTimeSlots = allTimeSlots.filter(
          (slot: string) => !bookedSetForAvailable.has(slot),
        );

        // პაციენტისთვის: თუ available slots არ არის, ეს დღე არ უნდა ჩანდეს
        if (forPatient && availableTimeSlots.length === 0) {
          return null;
        }

        // Combine available slots with booked slots to show all slots that should be displayed
        // ექიმისთვის: მხოლოდ available slots (დაჯავშნილი არ ჩანს გრაფიკში, არც disabled-ად)
        // პაციენტისთვის: მხოლოდ available slots (დაჯავშნილი არ ჩანს, მხოლოდ თავისუფალი დრო)
        // bookedSlots-ში მხოლოდ ამ type-ის booked slots (პაციენტისთვის არ გამოიყენება, მაგრამ დავტოვოთ)
        const allSlotsToShow = availableTimeSlots; // ორივესთვის მხოლოდ available slots

        return {
          date: dateStr,
          dayOfWeek: dayNames[date.getDay()],
          timeSlots: allSlotsToShow,
          bookedSlots: Array.from(bookedSetForThisType), // მხოლოდ ამ type-ის booked slots
          isAvailable: availableTimeSlots.length > 0,
          type,
        };
      })
      .filter((x): x is any => x !== null);

    console.log(
      '🏥 getDoctorAvailability - Returning result for mobile:',
      JSON.stringify(result, null, 2),
    );

    return {
      success: true,
      data: result,
    };
  }

  async updateAvailability(
    doctorId: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    console.log('📥 [DoctorsService] updateAvailability called');
    console.log('📥 [DoctorsService] doctorId:', doctorId);
    console.log(
      '📥 [DoctorsService] Received DTO:',
      JSON.stringify(updateAvailabilityDto, null, 2),
    );
    console.log(
      '📥 [DoctorsService] availability array length:',
      updateAvailabilityDto.availability?.length,
    );

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    const doctor = await this.userModel.findOne({
      _id: new mongoose.Types.ObjectId(doctorId),
      role: UserRole.DOCTOR,
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    console.log('📥 [DoctorsService] Doctor found:', {
      id: (doctor as any)._id?.toString(),
      name: (doctor as any).name,
      approvalStatus: (doctor as any).approvalStatus,
      isActive: (doctor as any).isActive,
      doctorStatus: (doctor as any).doctorStatus,
    });

    // Allow schedule selection for approved doctors, regardless of doctorStatus
    // Doctors with 'awaiting_schedule' status should be able to select their schedule
    // Doctors with 'active' status can also update their schedule
    if ((doctor as any).approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        'გრაფიკის დაყენება შესაძლებელია მხოლოდ დამტკიცებული ექიმებისთვის.',
      );
    }

    // Note: We removed the isActive check because doctors with 'awaiting_schedule' status
    // should be able to select their schedule even if isActive is false
    // The doctorStatus will be updated to 'active' automatically after they set a schedule

    const results: AvailabilityDocument[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Track which date+type combinations are being updated
    const updatedDateTypes = new Set<string>();

    for (const slot of updateAvailabilityDto.availability) {
      console.log(
        '📥 [DoctorsService] Processing slot:',
        JSON.stringify(slot, null, 2),
      );
      const date = new Date(slot.date);
      date.setHours(0, 0, 0, 0);
      const dateTypeKey = `${date.toISOString()}_${slot.type}`;
      updatedDateTypes.add(dateTypeKey);

      // Check if the same time slots are already added for the other appointment type
      const otherType = slot.type === 'video' ? 'home-visit' : 'video';
      const existingAvailability = await this.availabilityModel.findOne({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date,
        type: otherType,
        isAvailable: true,
      });

      if (existingAvailability && existingAvailability.timeSlots?.length > 0) {
        // Check for overlapping time slots
        const overlappingSlots = slot.timeSlots.filter((timeSlot) =>
          existingAvailability.timeSlots.includes(timeSlot),
        );

        if (overlappingSlots.length > 0) {
          throw new BadRequestException(
            `დროები ${overlappingSlots.join(', ')} უკვე დამატებულია ${otherType === 'video' ? 'ვიდეო კონსულტაციაზე' : 'სახლზე მისვლაზე'}. იგივე დროები ვერ დაამატებთ სხვადასხვა ტიპის კონსულტაციაზე.`,
          );
        }
      }

      // If timeSlots is empty, delete the availability instead of updating
      if (!slot.timeSlots || slot.timeSlots.length === 0) {
        await this.availabilityModel.deleteOne({
          doctorId: new mongoose.Types.ObjectId(doctorId),
          date,
          type: slot.type,
        });
        console.log(
          `🗑️ [DoctorsService] Deleted availability for ${date.toISOString()}, type: ${slot.type}`,
        );
        continue;
      }

      const availabilityDoc = await this.availabilityModel.findOneAndUpdate(
        {
          doctorId: new mongoose.Types.ObjectId(doctorId),
          date,
          type: slot.type,
        },
        {
          doctorId: new mongoose.Types.ObjectId(doctorId),
          date,
          timeSlots: slot.timeSlots,
          isAvailable: slot.isAvailable,
          type: slot.type,
        },
        { upsert: true, new: true },
      );

      console.log('📥 [DoctorsService] Saved availability:', {
        date: date.toISOString(),
        type: slot.type,
        timeSlots: slot.timeSlots,
        isAvailable: slot.isAvailable,
        docId: (availabilityDoc as any)._id?.toString(),
      });

      results.push(availabilityDoc);
    }

    // Delete availability entries that are not in the request (for future dates only)
    // This handles the case when doctor removes a day from their schedule
    const allExistingAvailability = await this.availabilityModel.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      date: { $gte: today },
    });

    let deletedCount = 0;
    for (const existing of allExistingAvailability) {
      const existingDate = new Date(existing.date);
      existingDate.setHours(0, 0, 0, 0);
      const dateTypeKey = `${existingDate.toISOString()}_${existing.type}`;

      if (!updatedDateTypes.has(dateTypeKey)) {
        await this.availabilityModel.deleteOne({
          _id: existing._id,
        });
        deletedCount++;
        console.log(
          `🗑️ [DoctorsService] Deleted availability not in request: ${existingDate.toISOString()}, type: ${existing.type}`,
        );
      }
    }

    if (deletedCount > 0) {
      console.log(
        `🗑️ [DoctorsService] Deleted ${deletedCount} availability entries that were not in the request`,
      );
    }

    const futureAvailability = await this.availabilityModel.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      date: { $gte: today },
      timeSlots: { $exists: true, $ne: [] },
    });

    const newDoctorStatus = futureAvailability
      ? DoctorStatus.ACTIVE
      : DoctorStatus.AWAITING_SCHEDULE;

    console.log('📥 [DoctorsService] Updating doctor status:', {
      hasFutureAvailability: !!futureAvailability,
      newStatus: newDoctorStatus,
      futureAvailabilityDate: futureAvailability?.date,
    });

    await this.userModel.findByIdAndUpdate(doctorId, {
      doctorStatus: newDoctorStatus,
    });

    console.log(
      '✅ [DoctorsService] updateAvailability completed successfully',
    );
    console.log('✅ [DoctorsService] Results count:', results.length);

    return {
      success: true,
      message: 'ხელმისაწვდომობა წარმატებით განახლდა',
      data: results,
    };
  }

  async updateDoctor(doctorId: string, updateDoctorDto: UpdateDoctorDto) {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundException('Invalid doctor ID format');
    }

    const doctor = await this.userModel.findById(doctorId);

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException('User is not a doctor');
    }

    // Check if email is already taken by another user
    if (updateDoctorDto.email && updateDoctorDto.email !== doctor.email) {
      const existingUser = await this.userModel.findOne({
        email: updateDoctorDto.email,
        _id: { $ne: new mongoose.Types.ObjectId(doctorId) },
      });
      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Update fields
    if (updateDoctorDto.name !== undefined) {
      doctor.name = updateDoctorDto.name;
    }
    if (updateDoctorDto.email !== undefined) {
      doctor.email = updateDoctorDto.email;
    }
    if (updateDoctorDto.phone !== undefined) {
      doctor.phone = updateDoctorDto.phone;
    }
    if (updateDoctorDto.idNumber !== undefined) {
      doctor.idNumber = updateDoctorDto.idNumber;
    }
    if (updateDoctorDto.specialization !== undefined) {
      doctor.specialization = updateDoctorDto.specialization;
    }
    if (updateDoctorDto.degrees !== undefined) {
      doctor.degrees = updateDoctorDto.degrees;
    }
    if (updateDoctorDto.experience !== undefined) {
      doctor.experience = updateDoctorDto.experience;
    }
    if (updateDoctorDto.consultationFee !== undefined) {
      doctor.consultationFee = updateDoctorDto.consultationFee;
    }
    if (updateDoctorDto.followUpFee !== undefined) {
      doctor.followUpFee = updateDoctorDto.followUpFee;
    }
    if (updateDoctorDto.about !== undefined) {
      doctor.about = updateDoctorDto.about;
    }
    if (updateDoctorDto.location !== undefined) {
      doctor.location = updateDoctorDto.location;
    }
    if (updateDoctorDto.approvalStatus !== undefined) {
      doctor.approvalStatus = updateDoctorDto.approvalStatus;
    }
    if (updateDoctorDto.isActive !== undefined) {
      doctor.isActive = updateDoctorDto.isActive;
    }
    if (updateDoctorDto.gender !== undefined) {
      doctor.gender = updateDoctorDto.gender;
    }
    if (updateDoctorDto.isTopRated !== undefined) {
      doctor.isTopRated = updateDoctorDto.isTopRated;
    }
    if (updateDoctorDto.minWorkingDaysRequired !== undefined) {
      (doctor as any).minWorkingDaysRequired =
        updateDoctorDto.minWorkingDaysRequired;
    }

    await doctor.save();

    return this.getDoctorById(doctorId, true);
  }

  async getDashboardStats(doctorId: string) {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundException('Invalid doctor ID format');
    }

    console.log('📊 DoctorsService.getDashboardStats - START');
    console.log('📊 DoctorsService.getDashboardStats - doctorId:', doctorId);

    const doctor = await this.userModel
      .findById(new mongoose.Types.ObjectId(doctorId))
      .lean();

    if (!doctor || doctor.role !== UserRole.DOCTOR) {
      throw new NotFoundException('Doctor not found');
    }

    // Get date ranges for calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const startOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get real appointments data
    const allAppointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
      })
      .populate('patientId', 'name email createdAt')
      .lean();

    console.log(
      '📊 DoctorsService.getDashboardStats - total appointments:',
      allAppointments.length,
    );

    // Calculate earnings from real appointments

    const paidAppointments = allAppointments.filter(
      (apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        apt.paymentStatus === 'paid',
    );

    const pendingAppointments = allAppointments.filter(
      (apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        apt.paymentStatus === 'pending',
    );

    const thisMonthAppointments = allAppointments.filter((apt: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= startOfMonth && aptDate <= endOfMonth;
    });

    const lastMonthAppointments = allAppointments.filter((apt: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= startOfLastMonth && aptDate <= endOfLastMonth;
    });

    const todayAppointments = allAppointments.filter((apt: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= today && aptDate <= todayEnd;
    });

    const thisWeekAppointments = allAppointments.filter((apt: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= startOfWeek && aptDate <= endOfWeek;
    });

    // Calculate real earnings
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const totalPaidEarnings = paidAppointments.reduce(
      (sum: number, apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        sum + (apt.totalAmount || apt.consultationFee || 0),
      0,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const totalPendingEarnings = pendingAppointments.reduce(
      (sum: number, apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        sum + (apt.totalAmount || apt.consultationFee || 0),
      0,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const thisMonthEarnings = thisMonthAppointments.reduce(
      (sum: number, apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        apt.paymentStatus === 'paid'
          ? sum + (apt.totalAmount || apt.consultationFee || 0)
          : sum,
      0,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastMonthEarnings = lastMonthAppointments.reduce(
      (sum: number, apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        apt.paymentStatus === 'paid'
          ? sum + (apt.totalAmount || apt.consultationFee || 0)
          : sum,
      0,
    );

    // Calculate appointment statistics

    const completedAppointments = allAppointments.filter(
      (apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        apt.status === 'completed',
    );

    const inProgressAppointments = allAppointments.filter(
      (apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        apt.status === 'confirmed' || apt.status === 'pending',
    );

    const cancelledAppointments = allAppointments.filter(
      (apt: any) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        apt.status === 'cancelled',
    );

    // Calculate unique patients

    const uniquePatientIds = new Set(
      allAppointments.map(
        (apt: any) =>
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          apt.patientId?._id?.toString() || apt.patientId?.toString(),
      ),
    );
    const totalPatients = uniquePatientIds.size;

    // Calculate new patients (first appointment this month)

    const newPatientsThisMonth = thisMonthAppointments.filter((apt: any) => {
      const patientId =
        apt.patientId?._id?.toString() || apt.patientId?.toString();

      const patientFirstAppointment = allAppointments

        .filter((a: any) => {
          const aPatientId =
            a.patientId?._id?.toString() || a.patientId?.toString();
          return aPatientId === patientId;
        })

        .sort(
          (a: any, b: any) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            new Date(a.appointmentDate).getTime() -
            new Date(b.appointmentDate).getTime(),
        )[0];

      if (!patientFirstAppointment) return false;

      const firstAppointmentDate = new Date(
        patientFirstAppointment.appointmentDate,
      );
      return (
        firstAppointmentDate >= startOfMonth &&
        firstAppointmentDate <= endOfMonth
      );
    });

    const returningPatients = totalPatients - newPatientsThisMonth.length;

    // Calculate video vs home-visit statistics
    const videoAppointments = allAppointments.filter(
      (apt: any) => apt.type === 'video',
    );
    const homeVisitAppointments = allAppointments.filter(
      (apt: any) => apt.type === 'home-visit',
    );

    const videoThisMonth = thisMonthAppointments.filter(
      (apt: any) => apt.type === 'video',
    );
    const homeVisitThisMonth = thisMonthAppointments.filter(
      (apt: any) => apt.type === 'home-visit',
    );

    const videoLastMonth = lastMonthAppointments.filter(
      (apt: any) => apt.type === 'video',
    );
    const homeVisitLastMonth = lastMonthAppointments.filter(
      (apt: any) => apt.type === 'home-visit',
    );

    const completedVideoAppointments = videoAppointments.filter(
      (apt: any) => apt.status === 'completed',
    );
    const completedHomeVisitAppointments = homeVisitAppointments.filter(
      (apt: any) => apt.status === 'completed',
    );

    // Real statistics based on appointments
    const stats = {
      earnings: {
        paid: Math.round(totalPaidEarnings),
        pending: Math.round(totalPendingEarnings),
        thisMonth: Math.round(thisMonthEarnings),
        lastMonth: Math.round(lastMonthEarnings),
      },
      appointments: {
        completed: completedAppointments.length,
        inProgress: inProgressAppointments.length,
        uncompleted: cancelledAppointments.length,
        total: allAppointments.length,
      },
      patients: {
        total: totalPatients,
        new: newPatientsThisMonth.length,
        returning: returningPatients,
      },
      visits: {
        today: todayAppointments.length,
        thisWeek: thisWeekAppointments.length,
        thisMonth: thisMonthAppointments.length,
        total: completedAppointments.length,
      },
      videoConsultations: {
        total: videoAppointments.length,
        completed: completedVideoAppointments.length,
        thisMonth: videoThisMonth.length,
        lastMonth: videoLastMonth.length,
      },
      homeVisits: {
        total: homeVisitAppointments.length,
        completed: completedHomeVisitAppointments.length,
        thisMonth: homeVisitThisMonth.length,
        lastMonth: homeVisitLastMonth.length,
      },
    };

    console.log(
      '📊 DoctorsService.getDashboardStats - calculated stats:',
      stats,
    );

    return {
      success: true,
      data: stats,
    };
  }

  async getDashboardAppointments(doctorId: string, limit: number = 10) {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundException('Invalid doctor ID format');
    }

    console.log('👨‍⚕️ DoctorsService.getDashboardAppointments - START');
    console.log(
      '👨‍⚕️ DoctorsService.getDashboardAppointments - doctorId:',
      doctorId,
      'limit:',
      limit,
    );

    // Get real appointments from database
    const appointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
      })
      .populate('patientId', 'name dateOfBirth gender email phone')
      .sort({ appointmentDate: -1, appointmentTime: 1 })
      .limit(limit)
      .lean();

    console.log(
      '👨‍⚕️ DoctorsService.getDashboardAppointments - found appointments:',
      appointments.length,
    );

    // First, find all follow-up appointment IDs (appointments that are referenced by other appointments' followUp.appointmentId)
    // This needs to be done BEFORE fetching the main appointments list to ensure we catch all follow-ups
    const allAppointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
      })
      .select('_id followUp')
      .lean();

    const followUpAppointmentIds = new Set<string>();
    for (const apt of allAppointments) {
      if (apt.followUp?.appointmentId) {
        const followUpId = apt.followUp.appointmentId.toString();
        const aptId = apt._id ? apt._id.toString() : String(apt._id);
        followUpAppointmentIds.add(followUpId);
        console.log(
          `🔗 Found follow-up appointment: ${followUpId} referenced by appointment ${aptId}`,
        );
      }
    }

    console.log(
      `📋 Total follow-up appointments found: ${followUpAppointmentIds.size}`,
      Array.from(followUpAppointmentIds),
    );

    console.log(
      '👨‍⚕️ DoctorsService.getDashboardAppointments - raw appointments sample:',
      appointments.length > 0
        ? {
            _id: appointments[0]._id,
            appointmentDate: appointments[0].appointmentDate,
            appointmentTime: appointments[0].appointmentTime,
            appointmentDateType: typeof appointments[0].appointmentDate,
            appointmentDateISO:
              appointments[0].appointmentDate instanceof Date
                ? appointments[0].appointmentDate.toISOString()
                : new Date(appointments[0].appointmentDate).toISOString(),
            hasRescheduleRequest: !!appointments[0].rescheduleRequest,
            rescheduleRequest: appointments[0].rescheduleRequest,
          }
        : 'No appointments',
    );

    // Log all appointments with rescheduleRequest
    const appointmentsWithReschedule = appointments.filter(
      (apt: any) => apt.rescheduleRequest,
    );
    console.log(
      `🔄 Found ${appointmentsWithReschedule.length} appointments with rescheduleRequest:`,
      appointmentsWithReschedule.map((apt: any) => ({
        _id: apt._id,
        rescheduleRequest: apt.rescheduleRequest,
      })),
    );

    const formattedAppointments = appointments.map((apt: any) => {
      // Log rescheduleRequest if exists
      if (apt.rescheduleRequest) {
        console.log(
          `🔄 Found rescheduleRequest for appointment ${apt._id}:`,
          JSON.stringify(apt.rescheduleRequest, null, 2),
        );
      }
      const formatted = this.formatDashboardAppointment(apt) as any;
      // Check if this appointment is a follow-up (referenced by another appointment's followUp.appointmentId)
      const aptId = apt._id ? apt._id.toString() : apt.id;
      const isFollowUp = followUpAppointmentIds.has(aptId);
      if (isFollowUp) {
        console.log(
          `✅ Marking appointment ${aptId} as followup (original type: ${apt.type})`,
        );
        // Store original type before changing to 'followup'
        formatted.originalType =
          apt.type === 'home-visit' ? 'home-visit' : 'video';
        formatted.type = 'followup';
      }
      // Log formatted rescheduleRequest
      if (formatted.rescheduleRequest) {
        console.log(
          `✅ Formatted rescheduleRequest for appointment ${aptId}:`,
          JSON.stringify(formatted.rescheduleRequest, null, 2),
        );
      }
      return formatted;
    });

    console.log(
      '👨‍⚕️ DoctorsService.getDashboardAppointments - formatted appointments:',
      formattedAppointments.length,
      formattedAppointments.length > 0
        ? {
            firstAppointment: {
              id: formattedAppointments[0].id,
              date: formattedAppointments[0].date,
              time: formattedAppointments[0].time,
              type: formattedAppointments[0].type,
            },
          }
        : 'No appointments',
    );

    return {
      success: true,
      data: formattedAppointments,
    };
  }

  async updateAppointmentByDoctor(
    doctorId: string,
    appointmentId: string,
    dto: UpdateDoctorAppointmentDto,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(doctorId) ||
      !mongoose.Types.ObjectId.isValid(appointmentId)
    ) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel
      .findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        doctorId: new mongoose.Types.ObjectId(doctorId),
      })
      .populate('patientId', 'name dateOfBirth gender email phone');

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (dto.status) {
      appointment.status = dto.status;
    }

    // Validation: თუ განმეორებითი ვიზიტი არ არის მონიშნული, დიაგნოზი სავალდებულოა
    const followUpRequired =
      dto.followUp?.required ?? appointment.followUp?.required ?? false;
    if (
      !followUpRequired &&
      dto.consultationSummary &&
      !dto.consultationSummary.diagnosis?.trim()
    ) {
      throw new BadRequestException(
        'დიაგნოზი სავალდებულოა, როდესაც განმეორებითი ვიზიტი არ არის მონიშნული',
      );
    }

    if (dto.consultationSummary) {
      const summary = dto.consultationSummary;
      appointment.consultationSummary = {
        ...(appointment.consultationSummary || {}),
        ...summary,
        vitals: {
          ...(appointment.consultationSummary?.vitals || {}),
          ...(summary.vitals || {}),
        },
      };

      if (summary.symptoms) {
        appointment.patientDetails = appointment.patientDetails || {};
        appointment.patientDetails.problem = summary.symptoms;
      }

      if (summary.notes) {
        appointment.notes = summary.notes;
      }
    }

    if (dto.followUp) {
      appointment.followUp = {
        required: dto.followUp.required,
        date: dto.followUp.date ? new Date(dto.followUp.date) : undefined,
        reason: dto.followUp.reason,
      };
    }

    await appointment.save();
    await appointment.populate(
      'patientId',
      'name dateOfBirth gender email phone',
    );

    return {
      success: true,
      data: this.formatDashboardAppointment(appointment),
    };
  }

  async scheduleFollowUpAppointmentByDoctor(
    doctorId: string,
    appointmentId: string,
    dto: CreateFollowUpDto,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(doctorId) ||
      !mongoose.Types.ObjectId.isValid(appointmentId)
    ) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel.findOne({
      _id: new mongoose.Types.ObjectId(appointmentId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (!appointment.patientId) {
      throw new BadRequestException('Appointment has no patient assigned');
    }

    if (!dto.date || !dto.time) {
      throw new BadRequestException('Follow-up date and time are required');
    }

    const normalizedDate = new Date(dto.date);
    if (Number.isNaN(normalizedDate.getTime())) {
      throw new BadRequestException('Invalid follow-up date');
    }
    normalizedDate.setHours(0, 0, 0, 0);

    const followUpDateTime = new Date(`${dto.date}T${dto.time}`);
    if (Number.isNaN(followUpDateTime.getTime())) {
      throw new BadRequestException('Invalid follow-up time');
    }

    // Determine appointment type (default to original appointment type or 'video')
    const appointmentType =
      dto.type || appointment.type || AppointmentType.VIDEO;

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
    const availability = await this.availabilityModel.findOne({
      doctorId: appointment.doctorId,
      date: normalizedDate,
      type: appointmentType,
      isAvailable: true,
    });

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
      doctorId: appointment.doctorId,
      appointmentDate: normalizedDate,
      appointmentTime: dto.time,
      type: appointmentType,
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    });

    if (existingAppointment) {
      throw new BadRequestException('არჩეული დრო უკვე დაკავებულია');
    }

    const appointmentNumber = await this.generateAppointmentNumber();

    const followUpAppointment = new this.appointmentModel({
      appointmentNumber,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      appointmentDate: normalizedDate,
      appointmentTime: dto.time,
      type: appointmentType,
      meetingLink:
        appointmentType === AppointmentType.VIDEO ? undefined : undefined, // Can be set later
      visitAddress:
        appointmentType === AppointmentType.HOME_VISIT
          ? dto.visitAddress?.trim()
          : undefined,
      status: AppointmentStatus.CONFIRMED,
      consultationFee: appointment.consultationFee,
      totalAmount: appointment.totalAmount,
      paymentMethod: appointment.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      patientDetails: appointment.patientDetails,
      notes:
        dto.notes ||
        dto.reason ||
        `Follow-up for appointment ${appointment.appointmentNumber}`,
    });

    await followUpAppointment.save();
    await followUpAppointment.populate(
      'patientId',
      'name dateOfBirth gender email phone',
    );

    appointment.followUp = {
      required: true,
      date: followUpDateTime,
      reason: dto.reason,
      appointmentId: followUpAppointment._id as mongoose.Types.ObjectId,
    };

    await appointment.save();

    const formattedFollowUp = this.formatDashboardAppointment(
      followUpAppointment,
    ) as any;
    // Mark as followup since this is a follow-up appointment
    // Store original type before changing to 'followup'
    formattedFollowUp.originalType =
      appointmentType === AppointmentType.HOME_VISIT ? 'home-visit' : 'video';
    formattedFollowUp.type = 'followup';

    return {
      success: true,
      data: formattedFollowUp,
    };
  }

  async updateForm100ByDoctor(
    doctorId: string,
    appointmentId: string,
    dto: UpdateForm100Dto,
    file?: Express.Multer.File,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(doctorId) ||
      !mongoose.Types.ObjectId.isValid(appointmentId)
    ) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel
      .findOne({
        _id: new mongoose.Types.ObjectId(appointmentId),
        doctorId: new mongoose.Types.ObjectId(doctorId),
      })
      .populate('patientId', 'name dateOfBirth gender email phone');

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    let pdfPath = appointment.form100?.pdfUrl;
    let fileName = appointment.form100?.fileName;

    if (file) {
      pdfPath = this.uploadService.saveFormDocument(file);
      fileName = file.originalname;
    }

    const existing = appointment.form100 || {
      id: `FORM-${appointment.appointmentNumber}`,
    };

    appointment.form100 = {
      ...existing,
      ...(dto.id ? { id: dto.id } : {}),
      issueDate: dto.issueDate ? new Date(dto.issueDate) : existing.issueDate,
      validUntil: dto.validUntil
        ? new Date(dto.validUntil)
        : existing.validUntil,
      reason: dto.reason ?? existing.reason,
      diagnosis: dto.diagnosis ?? existing.diagnosis,
      recommendations: dto.recommendations ?? existing.recommendations,
      pdfUrl: pdfPath || existing.pdfUrl,
      fileName: fileName || existing.fileName,
    };

    await appointment.save();
    await appointment.populate(
      'patientId',
      'name dateOfBirth gender email phone',
    );

    return {
      success: true,
      data: this.formatDashboardAppointment(appointment),
    };
  }

  async getDashboardSchedule(doctorId: string) {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundException('Invalid doctor ID format');
    }

    // Get today's date in Georgia timezone (UTC+4)
    const now = new Date();
    // Convert to Georgia timezone (UTC+4)
    const georgiaOffset = 4 * 60; // 4 hours in minutes
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const georgiaTime = new Date(utc + georgiaOffset * 60000);

    // Get today's date in Georgia timezone for display
    const todayGeorgia = new Date(georgiaTime);
    todayGeorgia.setHours(0, 0, 0, 0);

    // Convert back to UTC for MongoDB query (MongoDB stores dates in UTC)
    const todayUTC = new Date(todayGeorgia);
    todayUTC.setHours(todayUTC.getHours() - 4); // Subtract 4 hours to get UTC
    const todayEndUTC = new Date(todayUTC);
    todayEndUTC.setHours(23, 59, 59, 999);

    // Get today's availability for both types (using Georgia date for matching)
    const todayAvailabilityDocs = await this.availabilityModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: {
          $gte: new Date(
            todayGeorgia.getFullYear(),
            todayGeorgia.getMonth(),
            todayGeorgia.getDate(),
          ),
          $lt: new Date(
            todayGeorgia.getFullYear(),
            todayGeorgia.getMonth(),
            todayGeorgia.getDate() + 1,
          ),
        },
        isAvailable: true,
      })
      .lean();

    // Get today's appointments (using UTC dates for MongoDB query)
    const todayAppointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        appointmentDate: { $gte: todayUTC, $lte: todayEndUTC },
        status: { $ne: 'cancelled' },
      })
      .populate('patientId', 'name dateOfBirth gender')
      .sort({ appointmentTime: 1 })
      .lean();

    const videoAvailability = todayAvailabilityDocs.find(
      (a: any) => a.type === 'video',
    );
    const homeVisitAvailability = todayAvailabilityDocs.find(
      (a: any) => a.type === 'home-visit',
    );

    // Split appointments by type
    const videoAppointments = todayAppointments.filter(
      (apt: any) => apt.type === 'video',
    );
    const homeVisitAppointments = todayAppointments.filter(
      (apt: any) => apt.type === 'home-visit',
    );

    // Get all available slots from availability per type
    const videoAllSlots = videoAvailability?.timeSlots || [];
    const homeVisitAllSlots = homeVisitAvailability?.timeSlots || [];

    // Get booked slots from appointments per type
    const videoBookedSlots = videoAppointments.map(
      (apt: any) => apt.appointmentTime as string,
    );
    const homeVisitBookedSlots = homeVisitAppointments.map(
      (apt: any) => apt.appointmentTime as string,
    );

    // Filter out booked slots to get truly available slots
    const videoAvailableSlots = videoAllSlots.filter(
      (slot) => !videoBookedSlots.includes(slot),
    );
    const homeVisitAvailableSlots = homeVisitAllSlots.filter(
      (slot) => !homeVisitBookedSlots.includes(slot),
    );

    // Format consultations

    const consultations = todayAppointments.map((apt: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const patient = apt.patientId as UserDocument;
      let patientAge = 0;
      if (patient?.dateOfBirth) {
        const birthDate = new Date(patient.dateOfBirth);
        const today = new Date();
        patientAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          patientAge--;
        }
      }

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        id: apt._id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        time: apt.appointmentTime,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        patientName:
          patient?.name || apt.patientDetails?.name || 'უცნობი პაციენტი',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        patientAge: patientAge || apt.patientDetails?.age || 0,
        // Use real type from appointment (video / home-visit)
        type: apt.type || 'consultation',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        status: apt.status || 'scheduled',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        symptoms: apt.patientDetails?.problem || apt.notes || '',
      };
    });

    // Add day of week
    const dayNames = [
      'კვირა',
      'ორშაბათი',
      'სამშაბათი',
      'ოთხშაბათი',
      'ხუთშაბათი',
      'პარასკევი',
      'შაბათი',
    ];
    // Format date string in YYYY-MM-DD format using Georgia timezone
    const year = todayGeorgia.getFullYear();
    const month = String(todayGeorgia.getMonth() + 1).padStart(2, '0');
    const day = String(todayGeorgia.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const dayOfWeek = dayNames[todayGeorgia.getDay()];

    const todaySchedule = {
      date: todayStr,
      dayOfWeek,
      consultations,
      // Backwards-compatible aggregate info
      availableSlots: [...videoAvailableSlots, ...homeVisitAvailableSlots],
      totalSlots: videoAllSlots.length + homeVisitAllSlots.length,
      // Detailed per-type info
      video: {
        appointments: videoAppointments.length,
        allSlots: videoAllSlots,
        availableSlots: videoAvailableSlots,
      },
      homeVisit: {
        appointments: homeVisitAppointments.length,
        allSlots: homeVisitAllSlots,
        availableSlots: homeVisitAvailableSlots,
      },
    };

    return {
      success: true,
      data: todaySchedule,
    };
  }

  async getDoctorPatients(doctorId: string) {
    // Log for debugging
    console.log('👨‍⚕️ DoctorsService.getDoctorPatients - START');
    console.log(
      '👨‍⚕️ DoctorsService.getDoctorPatients - doctorId:',
      doctorId,
      'Type:',
      typeof doctorId,
      'Length:',
      doctorId?.length,
    );

    if (!doctorId) {
      throw new BadRequestException('Doctor ID is required');
    }

    // Normalize doctorId: trim whitespace and ensure it's a string
    const normalizedDoctorId = String(doctorId).trim();

    // Check if it's a valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(normalizedDoctorId)) {
      console.error(
        'Invalid doctor ID format:',
        normalizedDoctorId,
        'Length:',
        normalizedDoctorId?.length,
        'Original:',
        doctorId,
      );
      throw new BadRequestException(
        `Invalid doctor ID format: ${normalizedDoctorId}`,
      );
    }

    // Additional validation: check if doctorId is exactly 24 hex characters
    if (!/^[0-9a-fA-F]{24}$/.test(normalizedDoctorId)) {
      console.error(
        'Doctor ID format validation failed:',
        normalizedDoctorId,
        'Type:',
        typeof normalizedDoctorId,
        'Original:',
        doctorId,
      );
      throw new BadRequestException(
        `Invalid doctor ID format: ${normalizedDoctorId}`,
      );
    }

    // Get all appointments for this doctor
    const appointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(normalizedDoctorId),
        status: { $ne: 'cancelled' },
      })
      .populate(
        'patientId',
        'name email phone dateOfBirth gender address profileImage',
      )
      .select('patientId appointmentDate appointmentTime status patientDetails')
      .sort({ appointmentDate: -1 })
      .lean();

    // Group appointments by patient and calculate statistics
    const patientMap = new Map<string, any>();

    appointments.forEach((apt: any) => {
      const patient = apt.patientId as UserDocument;
      if (!patient || !patient._id) return;

      const patientId = patient._id.toString();

      if (!patientMap.has(patientId)) {
        // Calculate age from dateOfBirth
        let age = 0;
        if (patient.dateOfBirth) {
          const birthDate = new Date(patient.dateOfBirth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }
        }

        patientMap.set(patientId, {
          id: patientId,
          name: patient.name || apt.patientDetails?.name || 'უცნობი პაციენტი',
          age: age || apt.patientDetails?.age || 0,
          dateOfBirth:
            patient.dateOfBirth || apt.patientDetails?.dateOfBirth || undefined,
          gender: patient.gender || apt.patientDetails?.gender || 'male',
          phone: patient.phone || '',
          email: patient.email || '',
          address: patient.address || '',
          bloodType: 'უცნობი', // This would come from patient profile if available
          allergies: [], // This would come from patient profile if available
          chronicDiseases: [], // This would come from patient profile if available
          currentMedications: [], // This would come from patient profile if available
          lastVisit: '',
          nextAppointment: undefined,
          totalVisits: 0,
          emergencyContact: {
            name: '',
            phone: '',
            relation: '',
          },
          insuranceInfo: undefined,
          notes: '',
          registrationDate: apt.createdAt || new Date(),
          appointments: [],
        });
      }

      const patientData = patientMap.get(patientId);
      patientData.appointments.push({
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        status: apt.status,
      });
      patientData.totalVisits++;
    });

    // Calculate last visit and next appointment for each patient
    const patients = Array.from(patientMap.values()).map((patient) => {
      // Sort appointments by date
      patient.appointments.sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      // Get last visit
      if (patient.appointments.length > 0) {
        const lastAppt = patient.appointments[0];
        const lastVisitDate = new Date(lastAppt.date);
        const months = [
          'იანვარი',
          'თებერვალი',
          'მარტი',
          'აპრილი',
          'მაისი',
          'ივნისი',
          'ივლისი',
          'აგვისტო',
          'სექტემბერი',
          'ოქტომბერი',
          'ნოემბერი',
          'დეკემბერი',
        ];
        patient.lastVisit = `${lastVisitDate.getDate()} ${months[lastVisitDate.getMonth()]} ${lastVisitDate.getFullYear()}`;
      }

      // Get next appointment (scheduled appointments)
      const nextAppt = patient.appointments.find(
        (apt: any) => apt.status === 'pending' || apt.status === 'confirmed',
      );
      if (nextAppt) {
        const nextApptDate = new Date(nextAppt.date);
        const months = [
          'იანვარი',
          'თებერვალი',
          'მარტი',
          'აპრილი',
          'მაისი',
          'ივნისი',
          'ივლისი',
          'აგვისტო',
          'სექტემბერი',
          'ოქტომბერი',
          'ნოემბერი',
          'დეკემბერი',
        ];
        patient.nextAppointment = `${nextApptDate.getDate()} ${months[nextApptDate.getMonth()]} ${nextApptDate.getFullYear()}, ${nextAppt.time}`;
      }

      // Remove appointments array from response (not needed in frontend)
      delete patient.appointments;

      return patient;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all approved doctors with active status
    const activeDoctors = await this.userModel.find({
      role: UserRole.DOCTOR,
      approvalStatus: ApprovalStatus.APPROVED,
      doctorStatus: 'active',
    });

    console.log(
      `🔄 [Scheduler] Found ${activeDoctors.length} active doctors to check`,
    );

    for (const doctor of activeDoctors) {
      const futureAvailability = await this.availabilityModel.findOne({
        doctorId: doctor._id,
        date: { $gte: today },
        timeSlots: { $exists: true, $ne: [] },
      });

      if (!futureAvailability) {
        // No future availability → revert to awaiting_schedule
        await this.userModel.findByIdAndUpdate(doctor._id, {
          doctorStatus: 'awaiting_schedule',
        });
        console.log(
          `⚠️ [Scheduler] Doctor ${doctor.name} (${doctor._id}) reverted to AWAITING_SCHEDULE (no future availability)`,
        );
      }
    }

    // Also check doctors in awaiting_schedule who might have added availability
    const awaitingDoctors = await this.userModel.find({
      role: UserRole.DOCTOR,
      approvalStatus: ApprovalStatus.APPROVED,
      doctorStatus: 'awaiting_schedule',
    });

    console.log(
      `🔄 [Scheduler] Found ${awaitingDoctors.length} awaiting_schedule doctors to check`,
    );

    for (const doctor of awaitingDoctors) {
      const futureAvailability = await this.availabilityModel.findOne({
        doctorId: doctor._id,
        date: { $gte: today },
        timeSlots: { $exists: true, $ne: [] },
      });

      if (futureAvailability) {
        // Has future availability → set to active
        await this.userModel.findByIdAndUpdate(doctor._id, {
          doctorStatus: 'active',
        });
        console.log(
          `✅ [Scheduler] Doctor ${doctor.name} (${doctor._id}) set to ACTIVE (has future availability)`,
        );
      }
    }

    console.log('✅ [Scheduler] Doctor status check completed');
  }
  catch(error) {
    console.error('❌ [Scheduler] Error updating doctor statuses:', error);
  }
}
