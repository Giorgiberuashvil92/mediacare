import { JwtService } from '@nestjs/jwt';
import * as mongoose from 'mongoose';
import { MisAuthService } from '../integrations/mis-auth.service';
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
    private misAuthService;
    private notificationsService;
    constructor(userModel: mongoose.Model<UserDocument>, refreshTokenModel: mongoose.Model<RefreshTokenDocument>, jwtService: JwtService, phoneVerificationService: PhoneVerificationService, misAuthService: MisAuthService, notificationsService: NotificationsService);
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
                misPersonId: string;
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
                idNumber: string;
                isVerified: boolean;
                approvalStatus: ApprovalStatus;
                isActive: boolean;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            };
        };
    } | {
        success: boolean;
        message: string;
        requiresUserSelection: boolean;
        requiresOTP: boolean;
        data: {
            users: {
                id: string;
                role: UserRole;
                name: string;
                email: string;
                phone: string;
                idNumber: string;
                approvalStatus: ApprovalStatus;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            }[];
            user?: undefined;
            token?: undefined;
            refreshToken?: undefined;
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
                idNumber: string;
                isVerified: boolean;
                approvalStatus: ApprovalStatus;
                isActive: boolean;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            };
            token: string;
            refreshToken: string;
            users?: undefined;
        };
        requiresUserSelection?: undefined;
    }>;
    verifyLoginOTP(email: string, verificationCode: string, userId?: string): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                role: UserRole;
                name: string;
                email: string;
                phone: string;
                idNumber: string;
                isVerified: boolean;
                approvalStatus: ApprovalStatus;
                isActive: boolean;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    private buildAuthUser;
    private buildSelectableLoginUser;
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
    private resolveUserIdFromRefreshTokenDoc;
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
