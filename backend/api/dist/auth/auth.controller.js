"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const register_dto_1 = require("./dto/register.dto");
const send_verification_code_dto_1 = require("./dto/send-verification-code.dto");
const verify_phone_dto_1 = require("./dto/verify-phone.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const phone_verification_service_1 = require("./phone-verification.service");
let AuthController = class AuthController {
    constructor(authService, phoneVerificationService) {
        this.authService = authService;
        this.phoneVerificationService = phoneVerificationService;
    }
    async register(registerDto) {
        console.log('📥 [AuthController] Register endpoint called');
        console.log('📥 [AuthController] Received registerDto:', {
            email: registerDto.email,
            role: registerDto.role,
            name: registerDto.name,
            phone: registerDto.phone,
            phoneLength: registerDto.phone?.length,
            idNumber: registerDto.idNumber,
            hasPassword: !!registerDto.password,
            passwordLength: registerDto.password?.length,
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
            allKeys: Object.keys(registerDto),
        });
        return this.authService.register(registerDto);
    }
    async login(loginDto) {
        console.log('🔐 [AuthController] Login endpoint called');
        console.log('🔐 [AuthController] Login request:', {
            email: loginDto.email,
            hasPassword: !!loginDto.password,
            passwordLength: loginDto.password?.length,
        });
        try {
            const result = await this.authService.login(loginDto);
            console.log('✅ [AuthController] Login successful:', {
                userId: result.data.user.id,
                email: result.data.user.email,
                role: result.data.user.role,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStatus = error && typeof error === 'object' && 'status' in error
                ? error.status
                : error && typeof error === 'object' && 'statusCode' in error
                    ? error.statusCode
                    : undefined;
            console.error('❌ [AuthController] Login failed:', {
                email: loginDto.email,
                error: errorMessage,
                status: errorStatus,
            });
            throw error;
        }
    }
    async refreshToken(refreshTokenDto) {
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }
    async logout(refreshTokenDto) {
        return this.authService.logout(refreshTokenDto.refreshToken);
    }
    async getDevToken() {
        return this.authService.getDevAdminToken();
    }
    async sendVerificationCode(dto) {
        return this.phoneVerificationService.sendVerificationCode(dto.phone);
    }
    async verifyPhone(dto) {
        return this.phoneVerificationService.verifyCode(dto.phone, dto.code);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('dev-token'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getDevToken", null);
__decorate([
    (0, common_1.Post)('send-verification-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_verification_code_dto_1.SendVerificationCodeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendVerificationCode", null);
__decorate([
    (0, common_1.Post)('verify-phone'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_phone_dto_1.VerifyPhoneDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyPhone", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        phone_verification_service_1.PhoneVerificationService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map