import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { PhoneVerificationService } from './phone-verification.service';
export declare class AuthController {
    private readonly authService;
    private readonly phoneVerificationService;
    constructor(authService: AuthService, phoneVerificationService: PhoneVerificationService);
    register(registerDto: RegisterDto): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                role: import("../schemas/user.schema").UserRole;
                name: string;
                email: string;
                phone: string;
                isVerified: boolean;
                approvalStatus: import("../schemas/user.schema").ApprovalStatus;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                role: import("../schemas/user.schema").UserRole;
                name: string;
                email: string;
                phone: string;
                isVerified: boolean;
                approvalStatus: import("../schemas/user.schema").ApprovalStatus;
                isActive: true;
                doctorStatus: import("../schemas/user.schema").DoctorStatus;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
        success: boolean;
        message: string;
        data: {
            token: string;
            refreshToken: string;
        };
    }>;
    logout(refreshTokenDto: RefreshTokenDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getDevToken(): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                role: import("../schemas/user.schema").UserRole;
                name: string;
                email: string;
            };
            token: string;
            refreshToken: string;
        };
    }>;
    sendVerificationCode(dto: SendVerificationCodeDto): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyPhone(dto: VerifyPhoneDto): Promise<{
        success: boolean;
        message: string;
        verified: boolean;
    }>;
}
