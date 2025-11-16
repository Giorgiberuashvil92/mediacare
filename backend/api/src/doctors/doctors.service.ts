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
import { DoctorStatusFilter, GetDoctorsDto } from './dto/get-doctors.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
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
  ) {}

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
        date: { $gte: startDate, $lte: endDate },
        isAvailable: true,
      })
      .lean();

    // Get booked appointments for this doctor in the same date range
    const bookedAppointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        appointmentDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['pending', 'confirmed', 'blocked'] }, // Include blocked appointments
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
      const dateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
      if (!bookedSlotsByDate[dateStr]) {
        bookedSlotsByDate[dateStr] = new Set();
      }
      if (apt.appointmentTime) {
        bookedSlotsByDate[dateStr].add(apt.appointmentTime);
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
    const formattedAvailability = availability.map((avail) => {
      const date = new Date(avail.date);
      const dateStr = date.toISOString().split('T')[0];
      const bookedSlots = bookedSlotsByDate[dateStr] || new Set();

      // Keep all time slots, don't filter out booked ones
      const allTimeSlots = avail.timeSlots || [];
      const availableTimeSlots = allTimeSlots.filter(
        (slot: string) => !bookedSlots.has(slot),
      );

      return {
        date: dateStr,
        dayOfWeek: dayNames[date.getDay()],
        timeSlots: allTimeSlots, // ყველა time slot (available + booked)
        bookedSlots: Array.from(bookedSlots),
        isAvailable: availableTimeSlots.length > 0,
      };
    });

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

  async getDoctorAvailability(
    doctorId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Validate ObjectId format
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

    const filter: FilterQuery<AvailabilityDocument> = {
      doctorId: new mongoose.Types.ObjectId(doctorId),
    };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      // Default to next 30 days
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      filter.date = { $gte: start, $lte: end };
    }

    const availability = await this.availabilityModel.find(filter).lean();

    // Get booked appointments for this doctor in the same date range
    const dateFilter: Record<string, any> = {};
    if (startDate && endDate) {
      dateFilter.appointmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      dateFilter.appointmentDate = { $gte: start, $lte: end };
    }

    const bookedAppointments = await this.appointmentModel
      .find({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        ...dateFilter,
        status: { $ne: 'cancelled' }, // Exclude cancelled appointments
      })
      .select('appointmentDate appointmentTime')
      .lean();

    // Create a map of booked time slots by date
    const bookedSlotsByDate: { [key: string]: Set<string> } = {};
    bookedAppointments.forEach((apt) => {
      const dateStr = new Date(apt.appointmentDate).toISOString().split('T')[0];
      if (!bookedSlotsByDate[dateStr]) {
        bookedSlotsByDate[dateStr] = new Set();
      }
      if (apt.appointmentTime) {
        bookedSlotsByDate[dateStr].add(apt.appointmentTime);
      }
    });

    // Format availability with Georgian day names and remove booked time slots
    const dayNames = [
      'კვირა',
      'ორშაბათი',
      'სამშაბათი',
      'ოთხშაბათი',
      'ხუთშაბათი',
      'პარასკევი',
      'შაბათი',
    ];

    return {
      success: true,
      data: availability.map((avail) => {
        const date = new Date(avail.date);
        const dateStr = date.toISOString().split('T')[0];
        const bookedSlots = bookedSlotsByDate[dateStr] || new Set();

        // Filter out booked time slots
        const availableTimeSlots = (avail.timeSlots || []).filter(
          (slot: string) => !bookedSlots.has(slot),
        );

        return {
          date: dateStr,
          dayOfWeek: dayNames[date.getDay()],
          timeSlots: availableTimeSlots,
          isAvailable: availableTimeSlots.length > 0,
        };
      }),
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

    const results = [];

    for (const slot of updateAvailabilityDto.availability) {
      const date = new Date(slot.date);
      date.setHours(0, 0, 0, 0);

      const availability = await this.availabilityModel.findOneAndUpdate(
        {
          doctorId: new mongoose.Types.ObjectId(doctorId),
          date,
        },
        {
          doctorId: new mongoose.Types.ObjectId(doctorId),
          date,
          timeSlots: slot.timeSlots,
          isAvailable: slot.isAvailable,
        },
        { upsert: true, new: true },
      );

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

    // Format appointments for frontend

    const formattedAppointments = appointments.map((apt: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const patient = apt.patientId;
      // Calculate patient age
      let patientAge = 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (patient?.dateOfBirth) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
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

      // Map appointment status to frontend format
      const statusMap: { [key: string]: string } = {
        pending: 'scheduled',
        confirmed: 'scheduled',
        completed: 'completed',
        cancelled: 'cancelled',
      };

      // Determine consultation type based on appointment data
      const getConsultationType = () => {
        if (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          apt.notes?.toLowerCase().includes('emergency') ||
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          apt.patientDetails?.problem?.toLowerCase().includes('emergency')
        ) {
          return 'emergency';
        }

        if (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          apt.notes?.toLowerCase().includes('followup') ||
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          apt.notes?.toLowerCase().includes('follow-up')
        ) {
          return 'followup';
        }
        return 'consultation';
      };

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        id: apt._id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        patientName:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          patient?.name || apt.patientDetails?.name || 'უცნობი პაციენტი',

        patientAge:
          patientAge ||
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (apt.patientDetails?.dateOfBirth
            ? new Date().getFullYear() -
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
              new Date(apt.patientDetails.dateOfBirth).getFullYear()
            : 0),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        date: apt.appointmentDate.toISOString().split('T')[0],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        time: apt.appointmentTime,

        type: getConsultationType(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        status: statusMap[apt.status] || apt.status,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        fee: apt.consultationFee || apt.totalAmount || 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        isPaid: apt.paymentStatus === 'paid',

        diagnosis:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          apt.status === 'completed' ? 'დიაგნოზი დასრულებულია' : undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        symptoms:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          apt.patientDetails?.problem || apt.notes || '',
      };
    });

    console.log(
      '👨‍⚕️ DoctorsService.getDashboardAppointments - formatted appointments:',
      formattedAppointments.length,
    );

    return {
      success: true,
      data: formattedAppointments,
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

    // Get today's availability (using Georgia date for matching)
    const todayAvailability = await this.availabilityModel
      .findOne({
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

    // Get all available slots from availability
    const allAvailableSlots = todayAvailability?.timeSlots || [];

    // Get booked slots from appointments

    const bookedSlots = todayAppointments.map(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      (apt: any) => apt.appointmentTime,
    );

    // Filter out booked slots to get truly available slots
    const availableSlots = allAvailableSlots.filter(
      (slot) => !bookedSlots.includes(slot),
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
        type: 'consultation',
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
      availableSlots,
      totalSlots: allAvailableSlots.length,
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
