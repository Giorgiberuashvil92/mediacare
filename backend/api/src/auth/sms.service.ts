import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any = null;

  constructor() {
    // Initialize Twilio client if credentials are provided
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      try {
        // Dynamic import to avoid requiring twilio if not installed
        const twilio = require('twilio');
        this.twilioClient = twilio(accountSid, authToken);
        this.logger.log('Twilio SMS service initialized');
      } catch (error) {
        this.logger.warn(
          'Twilio package not found. Install it with: npm install twilio',
        );
      }
    } else {
      this.logger.warn(
        'Twilio credentials not configured. SMS will be logged to console in dev mode.',
      );
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 995 (Georgia country code without +), add +
    if (cleaned.startsWith('995')) {
      return `+${cleaned}`;
    }

    // If starts with 0, replace with +995
    if (cleaned.startsWith('0')) {
      return `+995${cleaned.substring(1)}`;
    }

    // If doesn't start with +, add +995
    if (!cleaned.startsWith('+')) {
      return `+995${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Send SMS verification code
   */
  async sendVerificationCode(phone: string, code: string): Promise<boolean> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      const message = `თქვენი ვერიფიკაციის კოდია: ${code}. კოდი მოქმედებს 10 წუთის განმავლობაში.`;

      // If Twilio is configured, use it
      if (this.twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const messageResponse = await this.twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: normalizedPhone,
          });

          this.logger.log(
            `SMS sent successfully to ${normalizedPhone}. SID: ${messageResponse.sid}`,
          );
          return true;
        } catch (twilioError: any) {
          this.logger.error(
            `Twilio error sending SMS to ${normalizedPhone}:`,
            twilioError.message,
          );
          // Fall back to dev mode if Twilio fails
          this.logger.warn('Falling back to dev mode (console log)');
        }
      }

      // Dev mode: Log the code to console
      this.logger.log(`[DEV MODE] SMS Verification Code for ${normalizedPhone}: ${code}`);
      this.logger.log(`[DEV MODE] Message: ${message}`);
      this.logger.warn(
        'SMS service is in development mode. To enable real SMS:',
      );
      this.logger.warn('1. Install Twilio: npm install twilio');
      this.logger.warn('2. Set environment variables:');
      this.logger.warn('   - TWILIO_ACCOUNT_SID');
      this.logger.warn('   - TWILIO_AUTH_TOKEN');
      this.logger.warn('   - TWILIO_PHONE_NUMBER');

      // Simulate SMS sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}:`, error);
      return false;
    }
  }
}
