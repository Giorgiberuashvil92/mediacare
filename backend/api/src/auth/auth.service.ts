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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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

    // Check if phone is verified (must be verified within last 30 minutes)
    // This ensures that the user has completed OTP verification before registration
    const isPhoneVerified = await this.phoneVerificationService.isPhoneVerified(
      phone.trim(),
    );

    if (!isPhoneVerified) {
      console.log('❌ [AuthService] Phone not verified before registration:', {
        phone: phone.trim(),
        role,
      });
      throw new BadRequestException(
        'Phone number must be verified before registration. Please verify your phone number first.',
      );
    }

    // Verify OTP code
    if (!registerDto.verificationCode || !registerDto.verificationCode.trim()) {
      throw new BadRequestException('Verification code is required');
    }

    console.log('🔐 [AuthService] Verifying OTP:', {
      phone: phone.trim(),
      hasCode: !!registerDto.verificationCode,
      codeLength: registerDto.verificationCode.trim().length,
    });

    const verificationResult = await this.phoneVerificationService.verifyCode(
      phone.trim(),
      registerDto.verificationCode.trim(),
    );

    if (!verificationResult.verified) {
      throw new BadRequestException(
        verificationResult.message || 'Invalid verification code',
      );
    }

    console.log('✅ [AuthService] OTP verified successfully:', {
      phone: phone.trim(),
      verified: verificationResult.verified,
    });

    const [existingUser, existingPhoneUser, existingIdNumberUser] =
      await Promise.all([
        this.userModel.findOne({ email, role }),
        this.userModel.findOne({ phone: phone.trim(), role }),
        this.userModel.findOne({
          idNumber: registerDto.idNumber.trim(),
          role,
        }),
      ]);

    // Build error messages for all fields if they exist (only for same role)
    const errors: string[] = [];
    if (existingUser) {
      errors.push(
        `${role === UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this email already exists`,
      );
    }
    if (existingPhoneUser) {
      errors.push(
        `${role === UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this phone number already exists`,
      );
    }
    if (existingIdNumberUser) {
      errors.push(
        `${role === UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this personal ID number already exists`,
      );
    }

    // If there are any errors, throw them
    if (errors.length > 0) {
      // Prioritize errors: phone > idNumber > email
      if (errors.some((e) => e.includes('phone number'))) {
        throw new ConflictException(
          `${role === UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this phone number already exists`,
        );
      }
      if (errors.some((e) => e.includes('personal ID number'))) {
        throw new ConflictException(
          `${role === UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this personal ID number already exists`,
        );
      }
      // Otherwise throw the first error (email)
      throw new ConflictException(errors[0]);
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

    // Add Identomat verification images if provided
    if (registerDto.identomatFaceImage) {
      userDataToSave.identomatFaceImage = registerDto.identomatFaceImage;
    }
    if (registerDto.identomatDocumentFrontImage) {
      userDataToSave.identomatDocumentFrontImage =
        registerDto.identomatDocumentFrontImage;
    }
    if (registerDto.identomatDocumentBackImage) {
      userDataToSave.identomatDocumentBackImage =
        registerDto.identomatDocumentBackImage;
    }
    if (registerDto.identomatFullData) {
      userDataToSave.identomatFullData = registerDto.identomatFullData;
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

    console.log('🔐 [AuthService] Login request received:', {
      email,
      hasPassword: !!password,
    });

    const user = await this.userModel.findOne({ email });
    if (!user) {
      console.log('❌ [AuthService] User not found for email:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ [AuthService] Invalid password for email:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      console.log('❌ [AuthService] Account is deactivated for email:', email);
      throw new UnauthorizedException('Account is deactivated');
    }

    console.log('✅ [AuthService] User found and password valid:', {
      userId: (user._id as string).toString(),
      email: user.email,
      phone: user.phone,
      hasPhone: !!(user.phone && user.phone.trim()),
    });

    // Check if phone is verified (must be verified within last 30 minutes)
    // Only check if user has a phone number
    if (user.phone && user.phone.trim()) {
      const isPhoneVerified =
        await this.phoneVerificationService.isPhoneVerified(user.phone.trim());

      console.log('📱 [AuthService] Phone verification check:', {
        phone: user.phone.trim(),
        isPhoneVerified,
      });

      if (!isPhoneVerified) {
        // Don't send OTP automatically - frontend will handle it via OTPModal
        // This prevents duplicate OTP sends and code invalidation issues
        console.log(
          '📱 [AuthService] OTP verification required for login, frontend will send code:',
          user.phone.trim(),
        );

        const response = {
          success: true,
          message: 'OTP verification required',
          requiresOTP: true,
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
            // No token yet - will be provided after OTP verification
          },
        };

        console.log(
          '📤 [AuthService] Returning login response (OTP required):',
          {
            requiresOTP: response.requiresOTP,
            hasUser: !!response.data.user,
            userPhone: response.data.user.phone,
            hasToken: false,
          },
        );

        return response;
      }
    } else {
      // User doesn't have a phone number - this shouldn't happen for new registrations
      // but might happen for old users. Log it and allow login without OTP.
      console.warn(
        '⚠️ [AuthService] User has no phone number, allowing login without OTP:',
        {
          userId: (user._id as string).toString(),
          email: user.email,
        },
      );
    }

    // Phone is verified, generate tokens
    const tokens = await this.generateTokens((user._id as string).toString());

    return {
      success: true,
      message: 'Login successful',
      requiresOTP: false,
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

  /**
   * Verify OTP and complete login
   */
  async verifyLoginOTP(email: string, verificationCode: string) {
    console.log('🔐 [AuthService] verifyLoginOTP called:', {
      email,
      verificationCodeLength: verificationCode.length,
      verificationCode: verificationCode.replace(/\d/g, '*'), // Mask code for security
    });

    const user = await this.userModel.findOne({ email });
    if (!user) {
      console.log('❌ [AuthService] User not found for email:', email);
      throw new UnauthorizedException('User not found');
    }

    if (!user.phone || !user.phone.trim()) {
      console.log('❌ [AuthService] Phone number not found for user:', {
        email,
        userId: (user._id as string).toString(),
      });
      throw new BadRequestException('Phone number not found for this user');
    }

    console.log('📱 [AuthService] Verifying OTP for user:', {
      email,
      phone: user.phone.trim(),
      userId: (user._id as string).toString(),
    });

    // Verify OTP code
    const verificationResult = await this.phoneVerificationService.verifyCode(
      user.phone.trim(),
      verificationCode.trim(),
    );

    console.log('✅ [AuthService] OTP verification result:', {
      verified: verificationResult.verified,
      success: verificationResult.success,
      message: verificationResult.message,
    });

    if (!verificationResult.verified) {
      console.log('❌ [AuthService] OTP verification failed:', {
        email,
        phone: user.phone.trim(),
        message: verificationResult.message,
      });
      throw new BadRequestException(
        verificationResult.message || 'Invalid verification code',
      );
    }

    // Generate tokens after successful OTP verification
    const tokens = await this.generateTokens((user._id as string).toString());

    const response = {
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

    console.log('📤 [AuthService] Returning verifyLoginOTP response:', {
      success: response.success,
      hasUser: !!response.data.user,
      hasToken: !!response.data.token,
      hasRefreshToken: !!response.data.refreshToken,
    });

    return response;
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

    const tokens = await this.generateDevTokens(
      (admin._id as string).toString(),
    );

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

  // DEV ONLY: Generate tokens with longer expiration for dev/admin use
  private async generateDevTokens(userId: string) {
    const payload = { sub: userId };

    // Dev tokens last 7 days instead of 24 hours
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Save refresh token to database
    const refreshTokenDoc = new this.refreshTokenModel({
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await refreshTokenDoc.save();

    return {
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { phone } = forgotPasswordDto;

    console.log('🔐 [AuthService] Forgot password request received:', {
      phone,
    });

    // Normalize phone number
    const cleanPhone = phone
      .replace(/\s+/g, '')
      .replace(/^\+995/, '')
      .replace(/^0/, '');

    const user = await this.userModel.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: `+995${cleanPhone}` },
        { phone: `0${cleanPhone}` },
      ],
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      console.log(
        '⚠️ [AuthService] User not found for phone (not revealing):',
        cleanPhone,
      );
      return {
        success: true,
        message:
          'თუ ტელეფონის ნომერი არსებობს, ვერიფიკაციის კოდი გაიგზავნა SMS-ით',
      };
    }

    // Send OTP code via SMS using phone verification service
    try {
      await this.phoneVerificationService.sendVerificationCode(phone);

      console.log('✅ [AuthService] Password reset OTP sent successfully:', {
        phone: cleanPhone,
        userId: (user._id as string).toString(),
      });

      return {
        success: true,
        message:
          'თუ ტელეფონის ნომერი არსებობს, ვერიფიკაციის კოდი გაიგზავნა SMS-ით',
      };
    } catch (error) {
      console.error(
        '❌ [AuthService] Failed to send password reset OTP:',
        error,
      );
      throw new BadRequestException('ვერ მოხერხდა კოდის გაგზავნა');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { phone, newPassword } = resetPasswordDto;

    console.log('🔐 [AuthService] Reset password request received:', {
      phone,
    });

    // Normalize phone number
    const cleanPhone = phone
      .replace(/\s+/g, '')
      .replace(/^\+995/, '')
      .replace(/^0/, '');

    const user = await this.userModel.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: `+995${cleanPhone}` },
        { phone: `0${cleanPhone}` },
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number');
    }

    // Verify that phone is verified (must be verified within last 30 minutes)
    // This ensures that the user has completed OTP verification before resetting password
    const isPhoneVerified =
      await this.phoneVerificationService.isPhoneVerified(phone);

    if (!isPhoneVerified) {
      throw new UnauthorizedException(
        'ტელეფონის ნომერი არ არის დადასტურებული. გთხოვთ დაუბრუნდეთ და გაიაროთ ვერიფიკაცია',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ [AuthService] Password reset successful:', {
      phone: cleanPhone,
      userId: (user._id as string).toString(),
    });

    return {
      success: true,
      message: 'პაროლი წარმატებით შეიცვალა',
    };
  }
}
