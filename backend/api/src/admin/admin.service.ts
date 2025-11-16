import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FilterQuery, Model } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from 'src/appointments/schemas/appointment.schema';
import {
  ApprovalStatus,
  User,
  UserDocument,
  UserRole,
} from '../schemas/user.schema';
import { GetUsersDto } from './dto/get-users.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
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
    const { page = 1, limit = 10, status, paymentStatus, search } = query;
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

      return {
        id: idString,
        patientName: appointment.patientId?.name || 'უცნობი პაციენტი',
        patientEmail: appointment.patientId?.email,
        doctorName: appointment.doctorId?.name || 'უცნობი ექიმი',
        doctorSpecialization: appointment.doctorId?.specialization,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        status: appointment.status,
        consultationFee:
          appointment.consultationFee || appointment.totalAmount || 0,
        paymentStatus: appointment.paymentStatus,
        symptoms: appointment.patientDetails?.problem || appointment.symptoms,
        diagnosis: appointment.diagnosis,
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
}
