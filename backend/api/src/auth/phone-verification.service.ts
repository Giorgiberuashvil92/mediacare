import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import {
    PhoneVerification,
    PhoneVerificationDocument,
} from '../schemas/phone-verification.schema';
import { SmsService } from './sms.service';

@Injectable()
export class PhoneVerificationService {
  constructor(
    @InjectModel(PhoneVerification.name)
    private phoneVerificationModel: mongoose.Model<PhoneVerificationDocument>,
    private smsService: SmsService,
  ) {}

  /**
   * Generate a random 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(phone: string): Promise<{ success: boolean; message: string }> {
    // Validate phone number format (basic validation)
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new BadRequestException('Invalid phone number format');
    }

    // Check if there's a recent verification code (rate limiting)
    const recentVerification = await this.phoneVerificationModel.findOne({
      phone: cleanPhone,
      verified: false,
      expiresAt: { $gt: new Date() },
      createdAt: { $gte: new Date(Date.now() - 60000) }, // 1 minute ago
    });

    if (recentVerification) {
      throw new HttpException(
        'Please wait before requesting a new verification code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate new code
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous unverified codes for this phone
    await this.phoneVerificationModel.updateMany(
      { phone: cleanPhone, verified: false },
      { verified: true }, // Mark as "used" by setting verified to true
    );

    // Create new verification record
    const verification = new this.phoneVerificationModel({
      phone: cleanPhone,
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    await verification.save();

    // Send SMS
    const smsSent = await this.smsService.sendVerificationCode(cleanPhone, code);

    if (!smsSent) {
      throw new BadRequestException('Failed to send verification code');
    }

    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  }

  /**
   * Verify phone number with code
   */
  async verifyCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message: string; verified: boolean }> {
    const cleanPhone = phone.replace(/\s+/g, '').trim();

    // Find the most recent unverified verification for this phone
    const verification = await this.phoneVerificationModel.findOne({
      phone: cleanPhone,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!verification) {
      throw new NotFoundException('Verification code not found or expired');
    }

    // Check attempts (max 5 attempts)
    if (verification.attempts >= 5) {
      throw new HttpException(
        'Too many verification attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment attempts
    verification.attempts += 1;
    await verification.save();

    // Verify code
    if (verification.code !== code) {
      return {
        success: false,
        message: 'Invalid verification code',
        verified: false,
      };
    }

    // Mark as verified
    verification.verified = true;
    verification.verifiedAt = new Date();
    await verification.save();

    return {
      success: true,
      message: 'Phone number verified successfully',
      verified: true,
    };
  }

  /**
   * Check if phone number is verified (for registration)
   */
  async isPhoneVerified(phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/\s+/g, '').trim();

    const verification = await this.phoneVerificationModel.findOne({
      phone: cleanPhone,
      verified: true,
      verifiedAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // Verified within last 30 minutes
    }).sort({ verifiedAt: -1 });

    return !!verification;
  }
}
