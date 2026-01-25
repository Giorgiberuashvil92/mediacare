import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationPriority,
  NotificationType,
} from '../schemas/notification.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../schemas/refresh-token.schema';
import {
  ApprovalStatus,
  User,
  UserDocument,
  UserRole,
} from '../schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PhoneVerificationService } from './phone-verification.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: mongoose.Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private phoneVerificationService: PhoneVerificationService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {
    // Verify NotificationsService is injected
    if (!this.notificationsService) {
      console.error('❌ NotificationsService is not injected!');
    } else {
      console.log('✅ NotificationsService is successfully injected');
    }
  }

  async register(registerDto: RegisterDto) {
    console.log('📥 [AuthService] Register request received:', {
      email: registerDto.email,
      role: registerDto.role,
      name: registerDto.name,
      phone: registerDto.phone,
      hasPhone: !!registerDto.phone,
      phoneLength: registerDto.phone?.length,
      idNumber: registerDto.idNumber,
      dateOfBirth: registerDto.dateOfBirth,
      gender: registerDto.gender,
      profileImage: registerDto.profileImage ? 'provided' : 'not provided',
      address: registerDto.address,
      identificationDocument: registerDto.identificationDocument
        ? 'provided'
        : 'not provided',
      specialization: registerDto.specialization,
      licenseDocument: registerDto.licenseDocument
        ? 'provided'
        : 'not provided',
      degrees: registerDto.degrees,
      experience: registerDto.experience,
      about: registerDto.about,
      location: registerDto.location,
    });

    const {
      email,
      password,
      role,
      dateOfBirth,
      minWorkingDaysRequired,
      phone,
      ...userData
    } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Phone verification temporarily disabled
    // TODO: Re-enable phone verification when SMS service is fully configured
    // if (phone) {
    //   const isVerified = await this.phoneVerificationService.isPhoneVerified(phone);
    //   if (!isVerified) {
    //     throw new BadRequestException(
    //       'Phone number must be verified before registration. Please verify your phone number first.',
    //     );
    //   }

    //   // Check if phone is already registered
    //   const existingPhoneUser = await this.userModel.findOne({ phone });
    //   if (existingPhoneUser) {
    //     throw new ConflictException('User with this phone number already exists');
    //   }
    // } else {
    //   throw new BadRequestException('Phone number is required');
    // }

    // Phone is required for all users (doctors and patients)
    if (!phone || !phone.trim()) {
      throw new BadRequestException('Phone number is required');
    }

    console.log('📞 [AuthService] Phone validation:', {
      phone,
      phoneTrimmed: phone.trim(),
      role,
      phoneLength: phone.trim().length,
    });

    // Check if phone is already registered (without verification requirement)
    const existingPhoneUser = await this.userModel.findOne({
      phone: phone.trim(),
    });
    if (existingPhoneUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Validate profile image for doctors
    if (role === UserRole.DOCTOR && !registerDto.profileImage) {
      throw new BadRequestException('Profile image is required for doctors');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const isDoctor = role === UserRole.DOCTOR;

    // Convert dateOfBirth string to Date if provided
    const dateOfBirthDate = dateOfBirth ? new Date(dateOfBirth) : undefined;

    // Prepare user data
    const userDataToSave: any = {
      ...userData,
      email,
      password: hashedPassword,
      role,
      phone: phone?.trim(), // Save phone number
      dateOfBirth: dateOfBirthDate,
      minWorkingDaysRequired: minWorkingDaysRequired || 0,
      isActive: isDoctor ? false : true,
      approvalStatus: isDoctor
        ? ApprovalStatus.PENDING
        : ApprovalStatus.APPROVED,
    };

    // Add address if provided (as string)
    if (registerDto.address) {
      userDataToSave.address = registerDto.address.trim();
    }

    // Add identification document if provided (for patients and doctors)
    if (registerDto.identificationDocument) {
      userDataToSave.identificationDocument =
        registerDto.identificationDocument;
    }

    console.log('💾 [AuthService] User data to save:', {
      email: userDataToSave.email,
      role: userDataToSave.role,
      name: userDataToSave.name,
      phone: userDataToSave.phone,
      phoneLength: userDataToSave.phone?.length,
      idNumber: userDataToSave.idNumber,
      dateOfBirth: userDataToSave.dateOfBirth,
      gender: userDataToSave.gender,
      isActive: userDataToSave.isActive,
      approvalStatus: userDataToSave.approvalStatus,
      hasPassword: !!userDataToSave.password,
      passwordLength: userDataToSave.password?.length,
      address: userDataToSave.address,
      identificationDocument: userDataToSave.identificationDocument
        ? 'provided'
        : 'not provided',
      specialization: userDataToSave.specialization,
      licenseDocument: userDataToSave.licenseDocument
        ? 'provided'
        : 'not provided',
      degrees: userDataToSave.degrees,
      experience: userDataToSave.experience,
      about: userDataToSave.about,
      location: userDataToSave.location,
      profileImage: userDataToSave.profileImage ? 'provided' : 'not provided',
    });

    const user = new this.userModel(userDataToSave);

    const savedUser = await user.save();

    console.log('✅ [AuthService] User saved successfully:', {
      userId: (savedUser._id as string).toString(),
      email: savedUser.email,
      role: savedUser.role,
      name: savedUser.name,
      phone: savedUser.phone,
      phoneLength: savedUser.phone?.length,
      isActive: savedUser.isActive,
      approvalStatus: savedUser.approvalStatus,
    });

    // Create notification for admin users
    try {
      // Check if NotificationsService is available
      if (!this.notificationsService) {
        console.error('❌ NotificationsService is null or undefined!');
        throw new Error('NotificationsService is not available');
      }

      const roleLabel = role === UserRole.DOCTOR ? 'ექიმი' : 'პაციენტი';
      console.log('🔔 Creating notification for user registration:', {
        userId: (savedUser._id as string).toString(),
        userName: savedUser.name,
        userEmail: savedUser.email,
        role: savedUser.role,
        notificationsServiceExists: !!this.notificationsService,
      });

      const notification = await this.notificationsService.createNotification({
        type: NotificationType.USER_REGISTERED,
        title: `ახალი ${roleLabel} დარეგისტრირდა`,
        message: `${savedUser.name} (${savedUser.email}) დარეგისტრირდა როგორც ${roleLabel}`,
        priority: NotificationPriority.HIGH,
        userId: (savedUser._id as string).toString(),
        targetUserId: null, // null means it's a system-wide notification for all admins
        metadata: {
          userId: (savedUser._id as string).toString(),
          userName: savedUser.name,
          userEmail: savedUser.email,
          userRole: savedUser.role,
          userPhone: savedUser.phone,
          registrationDate: new Date(),
        },
      });

      console.log('✅ Notification created successfully:', {
        notificationId: notification._id,
        title: notification.title,
        targetUserId: notification.targetUserId,
      });
    } catch (error) {
      // Don't fail registration if notification creation fails
      console.error('❌ Failed to create notification:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name,
        errorString: String(error),
      });
      // Log full error object
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      (savedUser._id as string).toString(),
    );

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: (savedUser._id as string).toString(),
          role: savedUser.role,
          name: savedUser.name,
          email: savedUser.email,
          phone: savedUser.phone,
          isVerified: savedUser.isVerified,
          approvalStatus: savedUser.approvalStatus,
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens((user._id as string).toString());

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: (user._id as string).toString(),
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isVerified: user.isVerified,
          approvalStatus: user.approvalStatus,
          isActive: user.isActive,
          doctorStatus: user.doctorStatus,
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // DEV ONLY: Generate token for admin without password
  async getDevAdminToken() {
    const admin = await this.userModel.findOne({
      email: 'admin@medicare.com',
      role: UserRole.ADMIN,
    });

    if (!admin) {
      throw new UnauthorizedException('Admin user not found');
    }

    const tokens = await this.generateTokens((admin._id as string).toString());

    return {
      success: true,
      message: 'DEV: Admin token generated',
      data: {
        user: {
          id: (admin._id as string).toString(),
          role: admin.role,
          name: admin.name,
          email: admin.email,
        },
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    // Find refresh token
    const tokenDoc = await this.refreshTokenModel
      .findOne({
        token: refreshToken,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .populate('userId');

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = tokenDoc.userId as unknown as string;

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    // Revoke old refresh token
    await this.refreshTokenModel.findByIdAndUpdate(tokenDoc._id, {
      revokedAt: new Date(),
    });

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async logout(refreshToken: string) {
    // Revoke refresh token
    await this.refreshTokenModel.findOneAndUpdate(
      { token: refreshToken },
      { revokedAt: new Date() },
    );

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Save refresh token to database
    const refreshTokenDoc = new this.refreshTokenModel({
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await refreshTokenDoc.save();

    return {
      accessToken,
      refreshToken,
    };
  }
}
