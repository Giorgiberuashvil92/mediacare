import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import mongoose, { FilterQuery, Model } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from 'src/appointments/schemas/appointment.schema';
import {
  Availability,
  AvailabilityDocument,
} from '../doctors/schemas/availability.schema';
import {
  ApprovalStatus,
  User,
  UserDocument,
  UserRole,
} from '../schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async getUsers(query: GetUsersDto) {
    const { page = 1, limit = 10, role, search } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: FilterQuery<UserDocument> = {};

    if (role) {
      filter.role = role as UserRole;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Get users
    const users = await this.userModel
      .find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await this.userModel.countDocuments(filter);

    // Format users
    const formattedUsers = users.map((user) => {
      // Handle MongoDB ObjectId conversion
      let idString = '';
      if (user._id) {
        if (typeof user._id === 'object' && 'toString' in user._id) {
          idString = (user._id as { toString(): string }).toString();
        } else {
          idString = String(user._id);
        }
      }
      return {
        id: idString,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        profileImage: user.profileImage,
        identificationDocument: user.identificationDocument,
        isVerified: user.isVerified || false,
        isActive: user.isActive !== undefined ? user.isActive : true,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Doctor specific fields
        ...(user.role === UserRole.DOCTOR && {
          specialization: user.specialization,
          degrees: user.degrees,
          experience: user.experience,
          consultationFee: user.consultationFee,
          followUpFee: user.followUpFee,
          about: user.about,
          location: user.location,
          rating: user.rating || 0,
          reviewCount: user.reviewCount || 0,
          licenseDocument: user.licenseDocument,
        }),
      };
    });

    return {
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getStats() {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      activeDoctors,
      pendingDoctors,
      approvedDoctors,
      rejectedDoctors,
      inactiveDoctors,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: UserRole.PATIENT }),
      this.userModel.countDocuments({ role: UserRole.DOCTOR }),
      this.userModel.countDocuments({
        role: UserRole.DOCTOR,
        isActive: true,
        approvalStatus: ApprovalStatus.APPROVED,
      }),
      this.userModel.countDocuments({
        role: UserRole.DOCTOR,
        approvalStatus: ApprovalStatus.PENDING,
      }),
      this.userModel.countDocuments({
        role: UserRole.DOCTOR,
        approvalStatus: ApprovalStatus.APPROVED,
      }),
      this.userModel.countDocuments({
        role: UserRole.DOCTOR,
        approvalStatus: ApprovalStatus.REJECTED,
      }),
      this.userModel.countDocuments({
        role: UserRole.DOCTOR,
        isActive: false,
      }),
    ]);

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRegistrations = await this.userModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get verified users count
    const verifiedUsers = await this.userModel.countDocuments({
      isVerified: true,
    });

    return {
      success: true,
      data: {
        overview: {
          totalUsers,
          totalPatients,
          totalDoctors,
          verifiedUsers,
          recentRegistrations,
        },
        doctors: {
          total: totalDoctors,
          active: activeDoctors,
          pending: pendingDoctors,
          approved: approvedDoctors,
          rejected: rejectedDoctors,
          inactive: inactiveDoctors,
        },
      },
    };
  }

  async createSuperAdmin() {
    const adminEmail = 'admin@medicare.com';
    const adminPassword = 'Admin123!';

    // Check if admin already exists
    const existingAdmin = await this.userModel.findOne({
      email: adminEmail,
      role: UserRole.ADMIN,
    });

    if (existingAdmin) {
      return {
        success: true,
        message: 'Super admin already exists',
        data: {
          email: adminEmail,
          password: adminPassword,
        },
      };
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = new this.userModel({
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
      approvalStatus: ApprovalStatus.APPROVED,
    });

    await admin.save();

    return {
      success: true,
      message: 'Super admin created successfully',
      data: {
        email: adminEmail,
        password: adminPassword,
        note: 'Please change the password after first login',
      },
    };
  }

  async getAppointments(query: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
  }) {
    const { page = 1, limit = 10, status, paymentStatus } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: FilterQuery<AppointmentDocument> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    // Get appointments with populated patient and doctor data
    const appointments = await this.appointmentModel
      .find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email specialization')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await this.appointmentModel.countDocuments(filter);

    // Format appointments
    const formattedAppointments = appointments.map((appointment: any) => {
      // Handle MongoDB ObjectId conversion
      let idString = '';
      if (appointment._id) {
        if (
          typeof appointment._id === 'object' &&
          'toString' in appointment._id
        ) {
          idString = (appointment._id as { toString(): string }).toString();
        } else {
          idString = String(appointment._id);
        }
      }

      // Format appointmentDate to local date string (YYYY-MM-DD) to match admin panel display
      const formatAppointmentDate = (date: any): string => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      return {
        id: idString,
        appointmentNumber: appointment.appointmentNumber,
        patientName: appointment.patientId?.name || 'უცნობი პაციენტი',
        patientEmail: appointment.patientId?.email,
        doctorName: appointment.doctorId?.name || 'უცნობი ექიმი',
        doctorSpecialization: appointment.doctorId?.specialization,
        appointmentDate: formatAppointmentDate(appointment.appointmentDate),
        appointmentTime: appointment.appointmentTime,
        type: appointment.type,
        status: appointment.status,
        consultationFee:
          appointment.consultationFee || appointment.totalAmount || 0,
        paymentStatus: appointment.paymentStatus,
        symptoms: appointment.patientDetails?.problem || appointment.symptoms,
        diagnosis: appointment.diagnosis,
        laboratoryTests: appointment.laboratoryTests || [],
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
      };
    });

    return {
      success: true,
      data: {
        appointments: formattedAppointments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async updateAppointmentStatus(appointmentId: string, status: string) {
    const appointment = await this.appointmentModel.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true },
    );

    if (!appointment) {
      throw new Error('ჯავშანი არ მოიძებნა');
    }

    return {
      success: true,
      message: 'ჯავშნის სტატუსი წარმატებით განახლდა',
      data: appointment,
    };
  }

  async updateDoctorApproval(
    doctorId: string,
    approvalStatus: ApprovalStatus,
    isActive?: boolean,
  ) {
    const updateData: any = { approvalStatus };

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // When doctor is approved by admin, set status to awaiting_schedule
    // They will move to 'active' only after selecting a schedule
    if (approvalStatus === ApprovalStatus.APPROVED) {
      updateData.doctorStatus = 'awaiting_schedule';
    } else if (approvalStatus === ApprovalStatus.REJECTED) {
      updateData.doctorStatus = null;
    }

    const doctor = await this.userModel.findByIdAndUpdate(
      doctorId,
      updateData,
      { new: true },
    );

    if (!doctor) {
      throw new Error('ექიმი არ მოიძებნა');
    }

    return {
      success: true,
      message: `ექიმის სტატუსი წარმატებით განახლდა: ${approvalStatus}`,
      data: doctor,
    };
  }

  async updateDoctorAvailability(
    doctorId: string,
    availability: Array<{
      date: string;
      timeSlots: string[];
      isAvailable: boolean;
      type: 'video' | 'home-visit';
    }>,
  ) {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new BadRequestException('Invalid doctor ID format');
    }

    const doctor = await this.userModel
      .findOne({
        _id: new mongoose.Types.ObjectId(doctorId),
        role: 'doctor',
      })
      .lean();

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (
      (doctor as any).approvalStatus !== ApprovalStatus.APPROVED ||
      !(doctor as any).isActive
    ) {
      throw new BadRequestException(
        'გრაფიკის დაყენება მხოლოდ „აქტიური“ სტატუსის მქონე ექიმებისთვის შესაძლებელია. გთხოვთ ჯერ დაამტკიცოთ ექიმი და მანიჭოთ „აქტიური“ სტატუსი.',
      );
    }

    const results = [];

    for (const slot of availability) {
      const date = new Date(slot.date);
      date.setHours(0, 0, 0, 0);

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

      results.push(availabilityDoc);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureAvailability = await this.availabilityModel.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      date: { $gte: today },
      timeSlots: { $exists: true, $ne: [] },
    });

    await this.userModel.findByIdAndUpdate(doctorId, {
      doctorStatus: futureAvailability ? 'active' : 'awaiting_schedule',
    });

    return {
      success: true,
      message: 'ხელმისაწვდომობა წარმატებით განახლდა',
      data: results,
    };
  }

  // Get user by ID
  async getUserById(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Format user
    let idString = '';
    if (user._id) {
      if (typeof user._id === 'object' && 'toString' in user._id) {
        idString = (user._id as { toString(): string }).toString();
      } else {
        idString = String(user._id);
      }
    }

    return {
      success: true,
      data: {
        id: idString,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        profileImage: user.profileImage,
        isVerified: user.isVerified || false,
        isActive: user.isActive !== undefined ? user.isActive : true,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Doctor specific fields
        ...(user.role === UserRole.DOCTOR && {
          specialization: user.specialization,
          degrees: user.degrees,
          experience: user.experience,
          consultationFee: user.consultationFee,
          followUpFee: user.followUpFee,
          about: user.about,
          location: user.location,
          rating: user.rating || 0,
          reviewCount: user.reviewCount || 0,
          licenseDocument: user.licenseDocument,
        }),
      },
    };
  }

  // Create new user
  async createUser(createUserDto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Check if phone already exists
    if (createUserDto.phone) {
      const existingPhoneUser = await this.userModel.findOne({
        phone: createUserDto.phone,
      });

      if (existingPhoneUser) {
        throw new BadRequestException('Phone number already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Prepare user data
    const isPatient = createUserDto.role === UserRole.PATIENT;
    const userData: any = {
      role: createUserDto.role,
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      phone: createUserDto.phone,
      gender: createUserDto.gender,
      isActive: isPatient ? (createUserDto.isActive ?? true) : true,
      isVerified: false,
      approvalStatus:
        createUserDto.role === UserRole.DOCTOR
          ? ApprovalStatus.PENDING
          : ApprovalStatus.APPROVED,
    };

    if (createUserDto.dateOfBirth) {
      userData.dateOfBirth = new Date(createUserDto.dateOfBirth);
    }

    // Add doctor-specific fields
    if (createUserDto.role === UserRole.DOCTOR) {
      userData.specialization = createUserDto.specialization;
      userData.degrees = createUserDto.degrees;
      userData.experience = createUserDto.experience;
      userData.consultationFee = createUserDto.consultationFee;
      userData.followUpFee = createUserDto.followUpFee;
      userData.about = createUserDto.about;
      userData.location = createUserDto.location;
    }

    const newUser = await this.userModel.create(userData);

    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: (newUser._id as mongoose.Types.ObjectId).toString(),
        role: newUser.role,
        name: newUser.name,
        email: newUser.email,
      },
    };
  }

  // Update user
  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email,
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (updateUserDto.name) updateData.name = updateUserDto.name;
    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.phone !== undefined)
      updateData.phone = updateUserDto.phone;
    if (updateUserDto.gender) updateData.gender = updateUserDto.gender;
    if (updateUserDto.profileImage)
      updateData.profileImage = updateUserDto.profileImage;
    if (updateUserDto.isVerified !== undefined)
      updateData.isVerified = updateUserDto.isVerified;
    if (updateUserDto.isActive !== undefined)
      updateData.isActive = updateUserDto.isActive;
    if (updateUserDto.approvalStatus)
      updateData.approvalStatus = updateUserDto.approvalStatus;

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    }

    // Update doctor-specific fields
    if (user.role === UserRole.DOCTOR) {
      if (updateUserDto.specialization !== undefined)
        updateData.specialization = updateUserDto.specialization;
      if (updateUserDto.degrees !== undefined)
        updateData.degrees = updateUserDto.degrees;
      if (updateUserDto.experience !== undefined)
        updateData.experience = updateUserDto.experience;
      if (updateUserDto.consultationFee !== undefined)
        updateData.consultationFee = updateUserDto.consultationFee;
      if (updateUserDto.followUpFee !== undefined)
        updateData.followUpFee = updateUserDto.followUpFee;
      if (updateUserDto.about !== undefined)
        updateData.about = updateUserDto.about;
      if (updateUserDto.location !== undefined)
        updateData.location = updateUserDto.location;
      // minWorkingDaysRequired - minimum working days doctor must have in next 2 weeks
      if (updateUserDto.minWorkingDaysRequired !== undefined) {
        updateData.minWorkingDaysRequired =
          updateUserDto.minWorkingDaysRequired;
      }
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password')
      .lean();

    return {
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser?._id
          ? (updatedUser._id as mongoose.Types.ObjectId).toString()
          : undefined,
        role: updatedUser?.role,
        name: updatedUser?.name,
        email: updatedUser?.email,
      },
    };
  }

  // Delete user (soft delete by setting isActive to false)
  async deleteUser(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete: set isActive to false
    await this.userModel.findByIdAndUpdate(userId, {
      isActive: false,
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  // Hard delete user (permanently remove from database)
  async hardDeleteUser(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has appointments
    const appointmentCount = await this.appointmentModel.countDocuments({
      $or: [
        { doctorId: new mongoose.Types.ObjectId(userId) },
        { patientId: new mongoose.Types.ObjectId(userId) },
      ],
    });

    if (appointmentCount > 0) {
      throw new BadRequestException(
        'Cannot delete user with existing appointments. Please deactivate instead.',
      );
    }

    // Delete user's availability if doctor
    if (user.role === UserRole.DOCTOR) {
      await this.availabilityModel.deleteMany({
        doctorId: new mongoose.Types.ObjectId(userId),
      });
    }

    // Hard delete
    await this.userModel.findByIdAndDelete(userId);

    return {
      success: true,
      message: 'User permanently deleted',
    };
  }
}
