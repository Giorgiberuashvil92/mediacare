import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PhoneVerificationService } from './phone-verification.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly phoneVerificationService: PhoneVerificationService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
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

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  // DEV ONLY: Get admin token without password
  @Get('dev-token')
  async getDevToken() {
    return this.authService.getDevAdminToken();
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    return this.phoneVerificationService.sendVerificationCode(dto.phone);
  }

  @Post('verify-phone')
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    return this.phoneVerificationService.verifyCode(dto.phone, dto.code);
  }
}
