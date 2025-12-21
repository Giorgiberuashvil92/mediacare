import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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
      // Include patient contact information from populated patientId
      patientEmail: patient?.email,
      patientPhone: patient?.phone,
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

    const skip = (page - 1) * limit;

    // Build filter
    const filter: FilterQuery<UserDocument> = {
      role: 'doctor',
    };

    switch (status) {
      case DoctorStatusFilter.PENDING:
        filter.approvalStatus = ApprovalStatus.PENDING;
        filter.isActive = false;
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

    // Get doctors
    const [doctors, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    // Format doctors
    const formattedDoctors = doctors.map((doctor) => ({
      id: (doctor._id as string).toString(),
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      specialization: doctor.specialization,
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
      isTopRated: doctor.isTopRated || false,
    }));

    return {
      success: true,
      data: {
        doctors: formattedDoctors,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
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

    // If not including pending, only return approved and active doctors
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

    // Get availability for next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const availability = await this.availabilityModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        isAvailable: true,
      })
      .lean();

    // Get booked appointments for this doctor in the same date range
    const bookedAppointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        appointmentDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['pending', 'confirmed', 'blocked'] },
      })
      .select('appointmentDate appointmentTime')
      .lean();

    // Create a map of booked time slots by date
    const bookedSlotsByDate: { [key: string]: Set<string> } = {};
    console.log(
      '🏥 getDoctorById - bookedAppointments:',
      JSON.stringify(bookedAppointments, null, 2),
    );

    bookedAppointments.forEach((apt) => {
      // Convert appointmentDate to local date string (YYYY-MM-DD)
      // This ensures it matches the availability date format
      const aptDate = new Date(apt.appointmentDate);
      const year = aptDate.getFullYear();
      const month = String(aptDate.getMonth() + 1).padStart(2, '0');
      const day = String(aptDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (!bookedSlotsByDate[dateStr]) {
        bookedSlotsByDate[dateStr] = new Set();
      }
      if (apt.appointmentTime) {
        // Normalize appointmentTime to HH:MM format (remove seconds if present)
        const normalizedTime = apt.appointmentTime
          .split(':')
          .slice(0, 2)
          .join(':');
        bookedSlotsByDate[dateStr].add(normalizedTime);
      }
    });

    console.log(
      '🏥 getDoctorById - bookedSlotsByDate:',
      JSON.stringify(
        Object.fromEntries(
          Object.entries(bookedSlotsByDate).map(([key, value]) => [
            key,
            Array.from(value),
          ]),
        ),
        null,
        2,
      ),
    );

    // Format availability and remove booked time slots
    const dayNames = [
      'კვირა',
      'ორშაბათი',
      'სამშაბათი',
      'ოთხშაბათი',
      'ხუთშაბათი',
      'პარასკევი',
      'შაბათი',
    ];

    // Group availability by date and type
    const availabilityByDate: Record<
      string,
      { videoSlots: string[]; homeVisitSlots: string[] }
    > = {};

    availability.forEach((avail) => {
      const date = new Date(avail.date);
      const dateStr = date.toISOString().split('T')[0];
      if (!availabilityByDate[dateStr]) {
        availabilityByDate[dateStr] = {
          videoSlots: [],
          homeVisitSlots: [],
        };
      }
      const target =
        avail.type === 'home-visit'
          ? availabilityByDate[dateStr].homeVisitSlots
          : availabilityByDate[dateStr].videoSlots;

      (avail.timeSlots || []).forEach((slot: string) => {
        if (!target.includes(slot)) {
          target.push(slot);
        }
      });
    });

    const formattedAvailability = Object.entries(availabilityByDate).map(
      ([dateStr, slots]) => {
        const date = new Date(dateStr);
        const bookedSlots = bookedSlotsByDate[dateStr] || new Set();
        const allTimeSlots = [...slots.videoSlots, ...slots.homeVisitSlots];
        const availableTimeSlots = allTimeSlots.filter(
          (slot) => !bookedSlots.has(slot),
        );

        return {
          date: dateStr,
          dayOfWeek: dayNames[date.getDay()],
          timeSlots: allTimeSlots,
          videoSlots: slots.videoSlots,
          homeVisitSlots: slots.homeVisitSlots,
          bookedSlots: Array.from(bookedSlots),
          isAvailable: availableTimeSlots.length > 0,
        };
      },
    );

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
      rangeStart = new Date();
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 30);
      rangeEnd.setHours(23, 59, 59, 999);
    }

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
    const bookedAppointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        appointmentDate: { $gte: rangeStart, $lte: rangeEnd },
        status: { $ne: 'cancelled' },
      })
      .select('appointmentDate appointmentTime status')
      .lean();

    // 5) დავაგენერიროთ bookedSlotsByDate (YYYY-MM-DD -> Set<HH:mm>)
    const bookedSlotsByDate: { [key: string]: Set<string> } = {};

    console.log('📅 [getDoctorAvailability] Processing booked appointments:', {
      count: bookedAppointments.length,
      appointments: bookedAppointments.map((apt) => ({
        id: (apt as any)._id?.toString(),
        storedDate: apt.appointmentDate,
        time: apt.appointmentTime,
        status: apt.status,
      })),
    });

    bookedAppointments.forEach((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      const year = aptDate.getFullYear();
      const month = String(aptDate.getMonth() + 1).padStart(2, '0');
      const day = String(aptDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      console.log('📅 [getDoctorAvailability] Appointment date parsing:', {
        appointmentId: (apt as any)._id?.toString(),
        storedDate: apt.appointmentDate,
        isoString: aptDate.toISOString(),
        localDateStr: dateStr,
        utcDateStr: `${aptDate.getUTCFullYear()}-${String(aptDate.getUTCMonth() + 1).padStart(2, '0')}-${String(aptDate.getUTCDate()).padStart(2, '0')}`,
        time: apt.appointmentTime,
      });

      if (!bookedSlotsByDate[dateStr]) {
        bookedSlotsByDate[dateStr] = new Set();
      }

      if (apt.appointmentTime) {
        const normalizedTime = apt.appointmentTime
          .split(':')
          .slice(0, 2)
          .join(':');
        bookedSlotsByDate[dateStr].add(normalizedTime);
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

    const result = Object.entries(availabilityByDateType)
      .map(([key, value]) => {
        const [dateStr] = key.split('|');
        const { date, type, slots } = value;

        const bookedSet = bookedSlotsByDate[dateStr] || new Set<string>();
        const allTimeSlots: string[] = Array.from(slots).sort();

        // Combine available slots with booked slots to show all slots that should be displayed
        // This ensures booked slots are visible even if they're not in the doctor's availability
        const allSlotsToShow = Array.from(
          new Set([...allTimeSlots, ...Array.from(bookedSet)]),
        ).sort();

        // თუ არც availability-ს აქვს სლოტები და არც დაჯავშნილია რამე -> ასეთი დღე არ გვაინტერესებს
        if (allTimeSlots.length === 0 && bookedSet.size === 0) {
          return null;
        }

        const availableTimeSlots = allTimeSlots.filter(
          (slot: string) => !bookedSet.has(slot),
        );

        return {
          date: dateStr,
          dayOfWeek: dayNames[date.getDay()],
          timeSlots: allSlotsToShow, // Show all slots (available + booked) so booked slots are visible
          bookedSlots: Array.from(bookedSet),
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
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundException('Invalid doctor ID format');
    }

    // Verify user is a doctor
    const doctor = await this.userModel.findOne({
      _id: new mongoose.Types.ObjectId(doctorId),
      role: 'doctor',
    });

    if (!doctor) {
      throw new UnauthorizedException('Only doctors can update availability');
    }

    console.log(
      '🏥 updateAvailability - incoming DTO:',
      JSON.stringify(updateAvailabilityDto, null, 2),
    );

    // Check minWorkingDaysRequired constraint BEFORE making changes
    const minWorkingDaysRequired = (doctor as any).minWorkingDaysRequired || 0;
    if (minWorkingDaysRequired > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twoWeeksLater = new Date(today);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
      twoWeeksLater.setHours(23, 59, 59, 999);

      // Get current availability dates in next 2 weeks
      const currentAvailabilities = await this.availabilityModel.find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: { $gte: today, $lte: twoWeeksLater },
        timeSlots: { $exists: true, $ne: [] },
      });

      // Create a set of dates that will have availability after the update
      const dateSet = new Set<string>();

      // Add existing dates (as date strings for comparison)
      for (const avail of currentAvailabilities) {
        const dateStr = new Date(avail.date).toISOString().split('T')[0];
        dateSet.add(dateStr);
      }

      // Process incoming changes to simulate the result
      for (const slot of updateAvailabilityDto.availability) {
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);

        // Only consider dates within the 2-week window
        if (slotDate >= today && slotDate <= twoWeeksLater) {
          const dateStr = slotDate.toISOString().split('T')[0];

          if (!slot.timeSlots || slot.timeSlots.length === 0) {
            // This date is being removed - check if there's another type for this date
            const otherType = slot.type === 'video' ? 'home-visit' : 'video';
            const hasOtherType = currentAvailabilities.some(
              (a) =>
                new Date(a.date).toISOString().split('T')[0] === dateStr &&
                a.type === otherType,
            );
            if (!hasOtherType) {
              dateSet.delete(dateStr);
            }
          } else {
            // This date will have availability
            dateSet.add(dateStr);
          }
        }
      }

      const projectedCount = dateSet.size;

      if (projectedCount < minWorkingDaysRequired) {
        throw new BadRequestException(
          `მომავალი 2 კვირის განმავლობაში მინიმუმ ${minWorkingDaysRequired} დღე უნდა გქონდეთ გრაფიკი. ამ ცვლილების შემდეგ დარჩებოდა ${projectedCount} დღე. გთხოვთ არ გააუქმოთ სამუშაო დღეები ან დაამატოთ მეტი.`,
        );
      }
    }

    // Now actually perform the updates
    const results = [];

    for (const slot of updateAvailabilityDto.availability) {
      // Normalize incoming date string (YYYY-MM-DD) to start of day
      const rawDate = new Date(slot.date);
      const startOfDay = new Date(rawDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      // ჯერ წავშალოთ ამ ექიმის, ამ ტიპის და ამ კალენდარული დღის ყველა ძველი availability,
      // რომ დუბლირებული დღეები აღარ დაგვიგროვდეს ბაზაში.
      await this.availabilityModel.deleteMany({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        type: slot.type,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      // თუ ამ დღისთვის საერთოდ აღარ გვაქვს სლოტები -> უბრალოდ ვშლით და ახალს აღარ ვქმნით.
      // ამით "გაუქმებული" დღე საერთოდ ქრება ბაზიდან.
      if (!slot.timeSlots || slot.timeSlots.length === 0) {
        continue;
      }

      // Check for conflicting time slots with other types (video vs home-visit)
      const otherType = slot.type === 'video' ? 'home-visit' : 'video';
      const otherAvailability = await this.availabilityModel.findOne({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        type: otherType,
      });

      if (otherAvailability && otherAvailability.timeSlots?.length) {
        const conflicts = slot.timeSlots.filter((t) =>
          otherAvailability.timeSlots.includes(t),
        );
        if (conflicts.length > 0) {
          throw new BadRequestException(
            `Conflicting time slots with ${otherType} availability: ${conflicts.join(
              ', ',
            )}`,
          );
        }
      }

      // ახალი availability დოკუმენტის შექმნა ამ დღეზე (უკვე წაშლილია ძველი ამ დღისთვის და ტიპისთვის)
      const availability = await this.availabilityModel.create({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        date: startOfDay,
        timeSlots: slot.timeSlots,
        isAvailable: slot.isAvailable,
        type: slot.type,
      });

      results.push(availability);
    }

    return {
      success: true,
      message: 'Availability updated successfully',
      data: {
        updated: results.length,
      },
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
          }
        : 'No appointments',
    );

    const formattedAppointments = appointments.map((apt: any) => {
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
          address: patient.address?.street
            ? `${patient.address.street}, ${patient.address.city || ''}`.trim()
            : patient.address || '',
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

    return {
      success: true,
      data: patients,
    };
  }
}
