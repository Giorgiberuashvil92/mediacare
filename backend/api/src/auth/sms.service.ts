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
    const cleaned = phone.replace(/\D/g, '');

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
   * Returns object with success status and additional info
   */
  async sendVerificationCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; isDevMode?: boolean; provider?: string }> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      const message = `თქვენი ვერიფიკაციის კოდია: ${code}. კოდი მოქმედებს 10 წუთის განმავლობაში.`;

      // Try sender.ge API first if configured
      const senderGeApiKey = process.env.SENDER_GE_API_KEY;
      this.logger.log(`🔍 [SMS Service] Checking SMS configuration:`, {
        hasSenderGeApiKey: !!senderGeApiKey,
        hasTwilioClient: !!this.twilioClient,
        hasTwilioPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
        nodeEnv: process.env.NODE_ENV,
        phone: normalizedPhone,
      });

      if (senderGeApiKey) {
        try {
          // Extract 9-digit Georgian mobile number (remove +995 prefix if present)
          const destination = normalizedPhone
            .replace(/^\+995/, '')
            .replace(/\s+/g, '');
          if (destination.length === 9 && destination.startsWith('5')) {
            // Format is correct (9 digits starting with 5)

            const apiUrl = 'https://sender.ge/api/send.php';
            // smsno: 1 = with SmsNo (advertising), 2 = without SmsNo (informational)
            // priority: 1 = skip SMS subscription check (optional)
            const params = new URLSearchParams({
              apikey: senderGeApiKey,
              smsno: '2', // 2 = without SmsNo (informational) - better for verification codes
              destination: destination,
              content: message,
              priority: '1', // Skip subscription check
            });

            this.logger.log(
              `📤 Sending SMS via sender.ge to ${destination} with API key: ${senderGeApiKey.substring(0, 8)}...`,
            );

            // sender.ge API uses POST request with application/x-www-form-urlencoded
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            });

            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch (error: any) {
              this.logger.error(
                `sender.ge API returned invalid JSON: ${responseText}`,
              );
              throw new Error(
                `Invalid JSON response from sender.ge: ${responseText}`,
              );
            }

            this.logger.log(
              `📥 sender.ge API response: ${JSON.stringify(responseData)}`,
            );

            // Check for success - sender.ge returns statusId: 1 for success
            if (
              response.ok &&
              responseData.data &&
              Array.isArray(responseData.data) &&
              responseData.data.length > 0 &&
              responseData.data[0]?.statusId === 1
            ) {
              this.logger.log(
                `✅ SMS sent successfully via sender.ge to ${destination}. Message ID: ${responseData.data[0].messageId}`,
              );
              return { success: true, isDevMode: false, provider: 'sender.ge' };
            } else {
              // Log detailed error information
              const errorDetails = {
                status: response.status,
                statusText: response.statusText,
                responseData: responseData,
                destination: destination,
                phone: normalizedPhone,
              };
              this.logger.error(
                `❌ sender.ge API error: ${JSON.stringify(errorDetails)}`,
              );
              // Don't fall through - throw error so user knows SMS wasn't sent
              throw new Error(
                `sender.ge API error: ${responseData?.message || responseData?.error || 'Unknown error'}`,
              );
            }
          } else {
            this.logger.warn(
              `Invalid phone number format for sender.ge: ${destination}. Expected 9-digit Georgian number starting with 5.`,
            );
            // Fall through to Twilio or dev mode
          }
        } catch (senderGeError: any) {
          this.logger.error(
            `❌ sender.ge error sending SMS to ${normalizedPhone}:`,
            senderGeError.message || senderGeError,
          );
          // Log full error for debugging
          this.logger.error(
            'Full sender.ge error:',
            JSON.stringify(senderGeError, null, 2),
          );
          // Fall back to Twilio or dev mode
          this.logger.warn('Falling back to Twilio or dev mode');
        }
      }

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
          return { success: true, isDevMode: false, provider: 'twilio' };
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
      // IMPORTANT: In production, SMS should ALWAYS be sent via real service
      // Dev mode should only be used for local development
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        // In production, we should never reach here - SMS service must be configured
        this.logger.error(
          `❌ CRITICAL: SMS service not configured in PRODUCTION! Cannot send SMS to ${normalizedPhone}`,
        );
        this.logger.error(
          'Please configure SENDER_GE_API_KEY or Twilio credentials',
        );
        return { success: false, isDevMode: false };
      }

      // Only allow dev mode in non-production environments
      this.logger.warn(
        `⚠️ [DEV MODE] SMS Verification Code for ${normalizedPhone}: ${code}`,
      );
      this.logger.warn(`⚠️ [DEV MODE] Message: ${message}`);
      this.logger.warn(
        '⚠️ SMS service is in development mode. SMS was NOT sent to phone!',
      );
      this.logger.warn('To enable real SMS:');
      this.logger.warn(
        '1. Set SENDER_GE_API_KEY environment variable for sender.ge',
      );
      this.logger.warn('2. Or install Twilio: npm install twilio');
      this.logger.warn('3. Set environment variables:');
      this.logger.warn('   - TWILIO_ACCOUNT_SID');
      this.logger.warn('   - TWILIO_AUTH_TOKEN');
      this.logger.warn('   - TWILIO_PHONE_NUMBER');

      // Simulate SMS sending delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      return { success: true, isDevMode: true, provider: 'console' };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}:`, error);
      return { success: false, isDevMode: false };
    }
  }
}
