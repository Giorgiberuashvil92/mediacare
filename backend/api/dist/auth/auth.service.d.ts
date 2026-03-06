import { JwtService } from '@nestjs/jwt';
import * as mongoose from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { RefreshTokenDocument } from '../schemas/refresh-token.schema';
import { ApprovalStatus, UserDocument, UserRole } from '../schemas/user.schema';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PhoneVerificationService } from './phone-verification.service';
export declare class AuthService {
    private userModel;
    private refreshTokenModel;
    private jwtService;
    private phoneVerificationService;
    private notificationsService;
    constructor(userModel: mongoose.Model<UserDocument>, refreshTokenModel: mongoose.Model<RefreshTokenDocument>, jwtService: JwtService, phoneVerificationService: PhoneVerificationService, notificationsService: NotificationsService);
    register(registerDto: RegisterDto): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                role: UserRole;
                name: string;
                email: string;
                phone: string;
                isVerified: boolean;
                approvalStatus: ApprovalStatus;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        success: boolean;
        message: string;
        requiresOTP: boolean;
        data: {
            user: {
                id: string;
                role: UserRole;
                name: string;
                email: string;
                phone: string;
                isVerified: boolean;
                approvalStatus: ApprovalStatus;
                isActive: true;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            };
        };
    } | {
        success: boolean;
        message: string;
        requiresOTP: boolean;
        data: {
            user: {
                id: string;
                role: UserRole;
                name: string;
                email: string;
                phone: string;
                isVerified: boolean;
                approvalStatus: ApprovalStatus;
                isActive: true;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    verifyLoginOTP(email: string, verificationCode: string): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                role: UserRole;
                name: string;
                email: string;
                phone: string;
                isVerified: boolean;
                approvalStatus: ApprovalStatus;
                isActive: boolean;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    getDevAdminToken(): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                role: UserRole;
                name: string;
                email: string;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    refreshToken(refreshToken: string): Promise<{
        success: boolean;
        message: string;
        data: {
            token: string;
            refreshToken: string;
        };
    }>;
    logout(refreshToken: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private generateTokens;
    private generateDevTokens;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
