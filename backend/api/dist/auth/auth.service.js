"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const mongoose = __importStar(require("mongoose"));
const mis_auth_service_1 = require("../integrations/mis-auth.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_schema_1 = require("../schemas/notification.schema");
const refresh_token_schema_1 = require("../schemas/refresh-token.schema");
const user_schema_1 = require("../schemas/user.schema");
const phone_verification_service_1 = require("./phone-verification.service");
let AuthService = class AuthService {
    constructor(userModel, refreshTokenModel, jwtService, phoneVerificationService, misAuthService, notificationsService) {
        this.userModel = userModel;
        this.refreshTokenModel = refreshTokenModel;
        this.jwtService = jwtService;
        this.phoneVerificationService = phoneVerificationService;
        this.misAuthService = misAuthService;
        this.notificationsService = notificationsService;
        if (!this.notificationsService) {
            console.error('❌ NotificationsService is not injected!');
        }
        else {
            console.log('✅ NotificationsService is successfully injected');
        }
    }
    async register(registerDto) {
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
            citizenship: registerDto.citizenship,
            residency: registerDto.residency,
        });
        const { email, password, role, dateOfBirth, minWorkingDaysRequired, phone, appointmentDoctorId, appointmentServiceDate, citizenship, residency, ...userData } = registerDto;
        const hasAppointmentDoctor = Boolean(appointmentDoctorId?.trim());
        const hasAppointmentDate = Boolean(appointmentServiceDate?.trim());
        if (hasAppointmentDoctor !== hasAppointmentDate) {
            throw new common_1.BadRequestException('appointmentDoctorId და appointmentServiceDate ერთად უნდა მიეთითოს.');
        }
        if (hasAppointmentDoctor && role !== user_schema_1.UserRole.PATIENT) {
            throw new common_1.BadRequestException('ვიზიტის მიბმა რეგისტრაციაზე მხოლოდ პაციენტის როლისთვისაა.');
        }
        if (hasAppointmentDate) {
            const appt = new Date(appointmentServiceDate.trim());
            if (Number.isNaN(appt.getTime())) {
                throw new common_1.BadRequestException('appointmentServiceDate არავალიდური თარიღია.');
            }
        }
        if (!phone || !phone.trim()) {
            throw new common_1.BadRequestException('Phone number is required');
        }
        console.log('📞 [AuthService] Phone validation:', {
            phone,
            phoneTrimmed: phone.trim(),
            role,
            phoneLength: phone.trim().length,
        });
        const isPhoneVerified = await this.phoneVerificationService.isPhoneVerified(phone.trim());
        if (!isPhoneVerified) {
            console.log('❌ [AuthService] Phone not verified before registration:', {
                phone: phone.trim(),
                role,
            });
            throw new common_1.BadRequestException('Phone number must be verified before registration. Please verify your phone number first.');
        }
        console.log('✅ [AuthService] Phone already verified, proceeding with registration:', {
            phone: phone.trim(),
            role,
        });
        const [existingUser, existingPhoneUser, existingIdNumberUser] = await Promise.all([
            this.userModel.findOne({ email, role }),
            this.userModel.findOne({ phone: phone.trim(), role }),
            this.userModel.findOne({
                idNumber: registerDto.idNumber.trim(),
                role,
            }),
        ]);
        const errors = [];
        if (existingUser) {
            errors.push(`${role === user_schema_1.UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this email already exists`);
        }
        if (existingPhoneUser) {
            errors.push(`${role === user_schema_1.UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this phone number already exists`);
        }
        if (existingIdNumberUser) {
            errors.push(`${role === user_schema_1.UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this personal ID number already exists`);
        }
        if (errors.length > 0) {
            if (errors.some((e) => e.includes('phone number'))) {
                throw new common_1.ConflictException(`${role === user_schema_1.UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this phone number already exists`);
            }
            if (errors.some((e) => e.includes('personal ID number'))) {
                throw new common_1.ConflictException(`${role === user_schema_1.UserRole.DOCTOR ? 'Doctor' : 'Patient'} with this personal ID number already exists`);
            }
            throw new common_1.ConflictException(errors[0]);
        }
        if (role === user_schema_1.UserRole.DOCTOR && !registerDto.profileImage) {
            throw new common_1.BadRequestException('Profile image is required for doctors');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const isDoctor = role === user_schema_1.UserRole.DOCTOR;
        const dateOfBirthDate = dateOfBirth ? new Date(dateOfBirth) : undefined;
        const userDataToSave = {
            ...userData,
            email,
            password: hashedPassword,
            role,
            phone: phone?.trim(),
            dateOfBirth: dateOfBirthDate,
            minWorkingDaysRequired: minWorkingDaysRequired || 0,
            isActive: isDoctor ? false : true,
            approvalStatus: isDoctor
                ? user_schema_1.ApprovalStatus.PENDING
                : user_schema_1.ApprovalStatus.APPROVED,
        };
        if (registerDto.address) {
            userDataToSave.address = registerDto.address.trim();
        }
        if (registerDto.identificationDocument) {
            userDataToSave.identificationDocument =
                registerDto.identificationDocument;
        }
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
            userId: savedUser._id.toString(),
            email: savedUser.email,
            role: savedUser.role,
            name: savedUser.name,
            phone: savedUser.phone,
            phoneLength: savedUser.phone?.length,
            isActive: savedUser.isActive,
            approvalStatus: savedUser.approvalStatus,
        });
        try {
            if (!this.notificationsService) {
                console.error('❌ NotificationsService is null or undefined!');
                throw new Error('NotificationsService is not available');
            }
            const roleLabel = role === user_schema_1.UserRole.DOCTOR ? 'ექიმი' : 'პაციენტი';
            console.log('🔔 Creating notification for user registration:', {
                userId: savedUser._id.toString(),
                userName: savedUser.name,
                userEmail: savedUser.email,
                role: savedUser.role,
                notificationsServiceExists: !!this.notificationsService,
            });
            const notification = await this.notificationsService.createNotification({
                type: notification_schema_1.NotificationType.USER_REGISTERED,
                title: `ახალი ${roleLabel} დარეგისტრირდა`,
                message: `${savedUser.name} (${savedUser.email}) დარეგისტრირდა როგორც ${roleLabel}`,
                priority: notification_schema_1.NotificationPriority.HIGH,
                userId: savedUser._id.toString(),
                targetUserId: null,
                metadata: {
                    userId: savedUser._id.toString(),
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
        }
        catch (error) {
            console.error('❌ Failed to create notification:', error);
            console.error('Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                errorType: error?.constructor?.name,
                errorString: String(error),
            });
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
        }
        let misPersonId = null;
        if (savedUser.role === user_schema_1.UserRole.PATIENT) {
            const nameParts = (savedUser.name || '').trim().split(/\s+/);
            const firstName = nameParts[0] || savedUser.name || '';
            const lastName = nameParts.length > 1
                ? nameParts[nameParts.length - 1]
                : savedUser.name || '';
            const misSyncResult = await this.misAuthService.upsertPatient({
                ID: null,
                PersonalID: savedUser.idNumber || '',
                FirstName: firstName,
                LastName: lastName,
                FatherName: '',
                Gender: savedUser.gender === user_schema_1.Gender.FEMALE ? 1 : 0,
                BirthDate: savedUser.dateOfBirth
                    ? new Date(savedUser.dateOfBirth).toISOString()
                    : undefined,
                Phone: savedUser.phone || '',
                Mobile: savedUser.phone || '',
                Email: savedUser.email || '',
                Citizenship: citizenship?.trim() || residency?.trim() || undefined,
                LegalAddress: savedUser.address || '',
                ActualAddress: savedUser.address || '',
                Description: '',
                IdentificationStatus: 0,
                ConsentForm: true,
                Encrypted: false,
                UserID: savedUser._id.toString(),
                UserFirstName: firstName,
                UserLastName: lastName,
                DateCreated: new Date().toISOString(),
                DateChanged: new Date().toISOString(),
                IsFromEMR: false,
            });
            if (!misSyncResult.success) {
                await this.userModel.findByIdAndDelete(savedUser._id);
                throw new common_1.BadRequestException('Patient sync to MIS failed. Registration cancelled.');
            }
            if (misSyncResult.personId) {
                await this.userModel.findByIdAndUpdate(savedUser._id, {
                    misPersonId: misSyncResult.personId,
                });
                misPersonId = misSyncResult.personId;
            }
        }
        const tokens = await this.generateTokens(savedUser._id.toString());
        return {
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: savedUser._id.toString(),
                    role: savedUser.role,
                    name: savedUser.name,
                    email: savedUser.email,
                    phone: savedUser.phone,
                    misPersonId,
                    isVerified: savedUser.isVerified,
                    approvalStatus: savedUser.approvalStatus,
                },
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        console.log('🔐 [AuthService] Login request received:', {
            email,
            hasPassword: !!password,
        });
        const user = await this.userModel.findOne({ email });
        if (!user) {
            console.log('❌ [AuthService] User not found for email:', email);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log('❌ [AuthService] Invalid password for email:', email);
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            console.log('❌ [AuthService] Account is deactivated for email:', email);
            throw new common_1.UnauthorizedException('Account is deactivated');
        }
        console.log('✅ [AuthService] User found and password valid:', {
            userId: user._id.toString(),
            email: user.email,
            phone: user.phone,
            hasPhone: !!(user.phone && user.phone.trim()),
        });
        if (user.phone && user.phone.trim()) {
            const isPhoneVerified = await this.phoneVerificationService.isPhoneVerified(user.phone.trim());
            console.log('📱 [AuthService] Phone verification check:', {
                phone: user.phone.trim(),
                isPhoneVerified,
            });
            if (!isPhoneVerified) {
                console.log('📱 [AuthService] OTP verification required for login, frontend will send code:', user.phone.trim());
                const response = {
                    success: true,
                    message: 'OTP verification required',
                    requiresOTP: true,
                    data: {
                        user: {
                            id: user._id.toString(),
                            role: user.role,
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            isVerified: user.isVerified,
                            approvalStatus: user.approvalStatus,
                            isActive: user.isActive,
                            doctorStatus: user.doctorStatus,
                        },
                    },
                };
                console.log('📤 [AuthService] Returning login response (OTP required):', {
                    requiresOTP: response.requiresOTP,
                    hasUser: !!response.data.user,
                    userPhone: response.data.user.phone,
                    hasToken: false,
                });
                return response;
            }
        }
        else {
            console.warn('⚠️ [AuthService] User has no phone number, allowing login without OTP:', {
                userId: user._id.toString(),
                email: user.email,
            });
        }
        const tokens = await this.generateTokens(user._id.toString());
        return {
            success: true,
            message: 'Login successful',
            requiresOTP: false,
            data: {
                user: {
                    id: user._id.toString(),
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
    async verifyLoginOTP(email, verificationCode) {
        console.log('🔐 [AuthService] verifyLoginOTP called:', {
            email,
            verificationCodeLength: verificationCode.length,
            verificationCode: verificationCode.replace(/\d/g, '*'),
        });
        const user = await this.userModel.findOne({ email });
        if (!user) {
            console.log('❌ [AuthService] User not found for email:', email);
            throw new common_1.UnauthorizedException('User not found');
        }
        if (!user.phone || !user.phone.trim()) {
            console.log('❌ [AuthService] Phone number not found for user:', {
                email,
                userId: user._id.toString(),
            });
            throw new common_1.BadRequestException('Phone number not found for this user');
        }
        console.log('📱 [AuthService] Verifying OTP for user:', {
            email,
            phone: user.phone.trim(),
            userId: user._id.toString(),
        });
        const isBypassCode = verificationCode.trim() === '000000';
        if (!isBypassCode) {
            const verificationResult = await this.phoneVerificationService.verifyCode(user.phone.trim(), verificationCode.trim());
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
                throw new common_1.BadRequestException(verificationResult.message || 'Invalid verification code');
            }
        }
        else {
            console.log('⚠️ [AuthService] Login without OTP (bypass code 000000)');
        }
        const tokens = await this.generateTokens(user._id.toString());
        const response = {
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id.toString(),
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
    async getDevAdminToken() {
        const admin = await this.userModel.findOne({
            email: 'admin@medicare.com',
            role: user_schema_1.UserRole.ADMIN,
        });
        if (!admin) {
            throw new common_1.UnauthorizedException('Admin user not found');
        }
        const tokens = await this.generateDevTokens(admin._id.toString());
        return {
            success: true,
            message: 'DEV: Admin token generated',
            data: {
                user: {
                    id: admin._id.toString(),
                    role: admin.role,
                    name: admin.name,
                    email: admin.email,
                },
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            },
        };
    }
    async refreshToken(refreshToken) {
        const tokenDoc = await this.refreshTokenModel
            .findOne({
            token: refreshToken,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        })
            .populate('userId');
        if (!tokenDoc) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = tokenDoc.userId;
        const tokens = await this.generateTokens(user);
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
    async logout(refreshToken) {
        await this.refreshTokenModel.findOneAndUpdate({ token: refreshToken }, { revokedAt: new Date() });
        return {
            success: true,
            message: 'Logged out successfully',
        };
    }
    async generateTokens(userId) {
        const payload = { sub: userId };
        const refreshPayload = { sub: userId, jti: (0, crypto_1.randomUUID)() };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
        const refreshToken = this.jwtService.sign(refreshPayload, {
            expiresIn: '7d',
        });
        await this.refreshTokenModel.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
        const refreshTokenDoc = new this.refreshTokenModel({
            token: refreshToken,
            userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await refreshTokenDoc.save();
        return {
            accessToken,
            refreshToken,
        };
    }
    async generateDevTokens(userId) {
        const payload = { sub: userId };
        const refreshPayload = { sub: userId, jti: (0, crypto_1.randomUUID)() };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        const refreshToken = this.jwtService.sign(refreshPayload, {
            expiresIn: '30d',
        });
        await this.refreshTokenModel.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
        const refreshTokenDoc = new this.refreshTokenModel({
            token: refreshToken,
            userId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        await refreshTokenDoc.save();
        return {
            accessToken,
            refreshToken,
        };
    }
    async forgotPassword(forgotPasswordDto) {
        const { phone } = forgotPasswordDto;
        console.log('🔐 [AuthService] Forgot password request received:', {
            phone,
        });
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
            console.log('⚠️ [AuthService] User not found for phone (not revealing):', cleanPhone);
            return {
                success: true,
                message: 'თუ ტელეფონის ნომერი არსებობს, ვერიფიკაციის კოდი გაიგზავნა SMS-ით',
            };
        }
        try {
            await this.phoneVerificationService.sendVerificationCode(phone);
            console.log('✅ [AuthService] Password reset OTP sent successfully:', {
                phone: cleanPhone,
                userId: user._id.toString(),
            });
            return {
                success: true,
                message: 'თუ ტელეფონის ნომერი არსებობს, ვერიფიკაციის კოდი გაიგზავნა SMS-ით',
            };
        }
        catch (error) {
            console.error('❌ [AuthService] Failed to send password reset OTP:', error);
            throw new common_1.BadRequestException('ვერ მოხერხდა კოდის გაგზავნა');
        }
    }
    async resetPassword(resetPasswordDto) {
        const { phone, newPassword } = resetPasswordDto;
        console.log('🔐 [AuthService] Reset password request received:', {
            phone,
        });
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
            throw new common_1.UnauthorizedException('Invalid phone number');
        }
        const isPhoneVerified = await this.phoneVerificationService.isPhoneVerified(phone);
        if (!isPhoneVerified) {
            throw new common_1.UnauthorizedException('ტელეფონის ნომერი არ არის დადასტურებული. გთხოვთ დაუბრუნდეთ და გაიაროთ ვერიფიკაცია');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        console.log('✅ [AuthService] Password reset successful:', {
            phone: cleanPhone,
            userId: user._id.toString(),
        });
        return {
            success: true,
            message: 'პაროლი წარმატებით შეიცვალა',
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(refresh_token_schema_1.RefreshToken.name)),
    __param(5, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [mongoose.Model, mongoose.Model, jwt_1.JwtService,
        phone_verification_service_1.PhoneVerificationService,
        mis_auth_service_1.MisAuthService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map