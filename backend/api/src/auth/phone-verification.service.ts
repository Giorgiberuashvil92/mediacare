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
  async sendVerificationCode(
    phone: string,
  ): Promise<{ success: boolean; message: string }> {
    // Normalize phone number to match database format
    const cleanPhone = this.normalizePhoneForDb(phone);

    if (!cleanPhone || cleanPhone.length < 9) {
      throw new BadRequestException('Invalid phone number format');
    }

    console.log('📤 [PhoneVerification] Sending code:', {
      inputPhone: phone,
      normalizedPhone: cleanPhone,
    });

    // Check if there's a recent verification code (rate limiting)
    // Try both normalized and original formats
    let recentVerification = await this.phoneVerificationModel.findOne({
      phone: cleanPhone,
      verified: false,
      expiresAt: { $gt: new Date() },
      createdAt: { $gte: new Date(Date.now() - 60000) }, // 1 minute ago
    });

    // If not found, try with +995 prefix
    if (!recentVerification && !cleanPhone.startsWith('+995')) {
      recentVerification = await this.phoneVerificationModel.findOne({
        phone: `+995${cleanPhone}`,
        verified: false,
        expiresAt: { $gt: new Date() },
        createdAt: { $gte: new Date(Date.now() - 60000) },
      });
    }

    if (recentVerification) {
      throw new HttpException(
        'Please wait before requesting a new verification code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Generate new code
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('🔑 [PhoneVerification] Generated OTP code:', {
      phone: cleanPhone,
      code: code,
      expiresAt: expiresAt.toISOString(),
    });

    // Invalidate previous unverified codes for this phone
    // Try both formats
    await this.phoneVerificationModel.updateMany(
      {
        $or: [
          { phone: cleanPhone, verified: false },
          { phone: `+995${cleanPhone}`, verified: false },
        ],
      },
      { verified: true }, // Mark as "used" by setting verified to true
    );

    // Create new verification record - store in normalized format (without +995)
    const verification = new this.phoneVerificationModel({
      phone: cleanPhone, // Store without +995 prefix for consistency
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    await verification.save();

    console.log('💾 [PhoneVerification] OTP code saved to database:', {
      verificationId: String(verification._id),
      phone: cleanPhone,
      code: code,
      expiresAt: expiresAt.toISOString(),
    });

    const smsSent = await this.smsService.sendVerificationCode(
      cleanPhone,
      code,
    );

    if (!smsSent) {
      throw new BadRequestException('Failed to send verification code');
    }

    console.log('✅ [PhoneVerification] OTP code sent successfully via SMS:', {
      phone: cleanPhone,
      code: code,
    });

    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  }

  /**
   * Normalize phone number to match database format
   */
  private normalizePhoneForDb(phone: string): string {
    // Remove all spaces and trim
    let cleaned = phone.replace(/\s+/g, '').trim();

    // Remove +995 prefix if present
    if (cleaned.startsWith('+995')) {
      cleaned = cleaned.substring(4);
    }

    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  }

  /**
   * Verify phone number with code
   */
  async verifyCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message: string; verified: boolean }> {
    const cleanPhone = this.normalizePhoneForDb(phone);
    const currentTime = new Date();

    console.log('🔍 [PhoneVerification] Verifying code - INPUT:', {
      inputPhone: phone,
      normalizedPhone: cleanPhone,
      code: code,
      codeLength: code.length,
      currentTime: currentTime.toISOString(),
    });

    // Find the most recent unverified verification for this phone
    // Try both normalized and original formats
    let verification = await this.phoneVerificationModel
      .findOne({
        phone: cleanPhone,
        verified: false,
        expiresAt: { $gt: currentTime },
      })
      .sort({ createdAt: -1 });

    console.log('🔍 [PhoneVerification] First search result (normalized):', {
      found: !!verification,
      verificationId: verification?._id ? String(verification._id) : undefined,
      verificationCode: verification?.code,
      verificationVerified: verification?.verified,
      verificationExpiresAt: verification?.expiresAt?.toISOString(),
      verificationCreatedAt: verification?.createdAt?.toISOString(),
    });

    // If not found, try with +995 prefix
    if (!verification && !cleanPhone.startsWith('+995')) {
      const phoneWithPrefix = `+995${cleanPhone}`;
      verification = await this.phoneVerificationModel
        .findOne({
          phone: phoneWithPrefix,
          verified: false,
          expiresAt: { $gt: currentTime },
        })
        .sort({ createdAt: -1 });

      console.log('🔍 [PhoneVerification] Second search result (with +995):', {
        searchedPhone: phoneWithPrefix,
        found: !!verification,
        verificationId: verification?._id
          ? String(verification._id)
          : undefined,
        verificationCode: verification?.code,
      });
    }

    // If still not found, try without +995 prefix
    if (!verification && cleanPhone.startsWith('+995')) {
      const phoneWithoutPrefix = cleanPhone.substring(4);
      verification = await this.phoneVerificationModel
        .findOne({
          phone: phoneWithoutPrefix,
          verified: false,
          expiresAt: { $gt: currentTime },
        })
        .sort({ createdAt: -1 });

      console.log(
        '🔍 [PhoneVerification] Third search result (without +995):',
        {
          searchedPhone: phoneWithoutPrefix,
          found: !!verification,
          verificationId: verification?._id
            ? String(verification._id)
            : undefined,
          verificationCode: verification?.code,
        },
      );
    }

    if (!verification) {
      // Get all recent verifications (including expired) for debugging
      const allRecentVerifications = await this.phoneVerificationModel
        .find({
          $or: [
            { phone: cleanPhone },
            { phone: `+995${cleanPhone}` },
            {
              phone: cleanPhone.startsWith('+995')
                ? cleanPhone.substring(4)
                : null,
            },
          ].filter(Boolean),
        })
        .select('phone code verified expiresAt createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

      // Get all unverified codes (for any phone) for debugging
      const allUnverifiedCodes = await this.phoneVerificationModel
        .find({
          verified: false,
        })
        .select('phone createdAt expiresAt')
        .sort({ createdAt: -1 })
        .limit(10);

      console.error('❌ [PhoneVerification] Verification code not found:', {
        searchedPhone: cleanPhone,
        searchAttempts: [
          { format: 'normalized', phone: cleanPhone },
          { format: 'with +995', phone: `+995${cleanPhone}` },
          {
            format: 'without +995',
            phone: cleanPhone.startsWith('+995')
              ? cleanPhone.substring(4)
              : 'N/A',
          },
        ],
        allRecentVerificationsForPhone: allRecentVerifications,
        allUnverifiedCodesInDb: allUnverifiedCodes,
        currentTime: new Date(),
      });
      throw new NotFoundException('Verification code not found or expired');
    }

    // Check attempts (max 5 attempts)
    if (verification.attempts >= 5) {
      throw new HttpException(
        'Too many verification attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    console.log('🔍 [PhoneVerification] Comparing codes:', {
      phone: cleanPhone,
      storedCodeInDb: verification.code,
      userEnteredCode: code,
      codesMatch: verification.code === code,
      verificationId: String(verification._id),
      attempts: verification.attempts,
      expiresAt: verification.expiresAt.toISOString(),
      isExpired: verification.expiresAt <= currentTime,
    });

    // Increment attempts
    verification.attempts += 1;
    await verification.save();

    // Verify code
    if (verification.code !== code) {
      console.log(
        '❌ [PhoneVerification] Codes DO NOT match - verification failed:',
        {
          phone: cleanPhone,
          storedCodeInDb: verification.code,
          userEnteredCode: code,
          codesMatch: false,
          attempts: verification.attempts,
        },
      );
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

    console.log(
      '✅ [PhoneVerification] Codes MATCH - verification successful:',
      {
        phone: cleanPhone,
        storedCodeInDb: verification.code,
        userEnteredCode: code,
        codesMatch: true,
        verificationId: String(verification._id),
        verifiedAt: verification.verifiedAt.toISOString(),
      },
    );

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
    // If phone is empty or not provided, return false
    if (!phone || !phone.trim()) {
      console.log(
        '⚠️ [PhoneVerification] isPhoneVerified called with empty phone',
      );
      return false;
    }

    const cleanPhone = this.normalizePhoneForDb(phone);

    // Try both normalized and original formats
    let verification = await this.phoneVerificationModel
      .findOne({
        phone: cleanPhone,
        verified: true,
        verifiedAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // Verified within last 30 minutes
      })
      .sort({ verifiedAt: -1 });

    // If not found, try with +995 prefix
    if (!verification && !cleanPhone.startsWith('+995')) {
      verification = await this.phoneVerificationModel
        .findOne({
          phone: `+995${cleanPhone}`,
          verified: true,
          verifiedAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
        })
        .sort({ verifiedAt: -1 });
    }

    return !!verification;
  }
}
