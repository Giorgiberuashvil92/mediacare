import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  // BOG Payment API credentials
  private readonly BOG_CLIENT_ID = '10003678'; // Public Key
  private readonly BOG_CLIENT_SECRET = 'pp7G3apePhfw'; // Secret Key
  private readonly BOG_MERCHANT_ID = '000000009812A2W';
  private readonly BOG_MERCHANT_NAME = 'MEDEKSES.COM';
  private readonly BOG_CLIENT_INN = '404802987';

  private readonly BOG_AUTH_URL =
    'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token';
  // BOG Payment API base URL
  // Documentation: https://api.bog.ge/docs/payments/introduction
  // Base URL: https://api.bog.ge/payments/v1
  // Order Creation Endpoint: https://api.bog.ge/payments/v1/ecommerce/orders
  // Receipt Endpoint: https://api.bog.ge/payments/v1/receipt/:order_id
  private readonly BOG_API_URL = 'https://api.bog.ge/payments/v1';

  // HTTPS callback URL for BOG (required - BOG doesn't accept HTTP URLs)
  // For development, use ngrok or similar: https://your-ngrok-url.ngrok.io
  // Set BOG_CALLBACK_URL environment variable
  private readonly BOG_CALLBACK_BASE_URL =
    process.env.BOG_CALLBACK_URL ||
    process.env.CALLBACK_URL ||
    'https://marte.ge';

  // BOG Public Key for callback signature verification
  private readonly BOG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;

  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Get BOG access token (with caching)
   */
  async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.accessToken;
    }

    try {
      this.logger.log('🔐 [BOG] Requesting new access token');

      // Create Basic Auth header
      const credentials = `${this.BOG_CLIENT_ID}:${this.BOG_CLIENT_SECRET}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');

      const response = await fetch(this.BOG_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${base64Credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `❌ [BOG] Authentication failed: ${response.status} - ${errorText}`,
        );
        throw new Error(`BOG authentication failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      this.accessToken = data.access_token;
      // expires_in is in seconds, convert to milliseconds
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      this.logger.log(
        `✅ [BOG] Access token obtained, expires in ${data.expires_in} seconds`,
      );

      return this.accessToken;
    } catch (error) {
      this.logger.error(`❌ [BOG] Error getting access token:`, error);
      throw error;
    }
  }

  /**
   * Create payment order
   * BOG API Documentation: https://api.bog.ge/docs/payments/introduction
   * Endpoint: POST /payments/v1/ecommerce/orders
   */
  async createPaymentOrder(params: {
    amount: number;
    currency: string;
    orderId: string;
    description: string;
    callbackUrl: string;
    successUrl?: string;
    failUrl?: string;
    captureMethod?: 'AUTO' | 'MANUAL';
  }): Promise<{
    success: boolean;
    orderId: string;
    paymentUrl?: string;
    orderStatus?: string;
    error?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      this.logger.log('💳 [BOG] Creating payment order:', {
        amount: params.amount,
        currency: params.currency,
        orderId: params.orderId,
        description: params.description,
      });

      // BOG Payment API endpoint - ecommerce/orders
      const endpoint = `${this.BOG_API_URL}/ecommerce/orders`;

      // BOG requires HTTPS URLs for callbacks
      // If callbackUrl is HTTP, try to use BOG_CALLBACK_URL env variable or convert it
      let callbackUrl = params.callbackUrl;
      if (callbackUrl.startsWith('http://')) {
        if (this.BOG_CALLBACK_BASE_URL) {
          // Use environment variable if set (e.g., ngrok HTTPS URL)
          try {
            const originalUrl = new URL(params.callbackUrl);
            const baseUrl = this.BOG_CALLBACK_BASE_URL.endsWith('/')
              ? this.BOG_CALLBACK_BASE_URL.slice(0, -1)
              : this.BOG_CALLBACK_BASE_URL;
            callbackUrl = `${baseUrl}${originalUrl.pathname}${originalUrl.search}`;
            this.logger.warn(
              `⚠️ [BOG] HTTP callback URL detected, using HTTPS from env: ${callbackUrl}`,
            );
          } catch (error) {
            this.logger.error(
              `❌ [BOG] Error parsing callback URL: ${params.callbackUrl}`,
              error,
            );
            throw new Error(
              'Invalid callback URL format. Please provide a valid URL.',
            );
          }
        } else {
          // Throw error if HTTP URL and no HTTPS callback URL configured
          const errorMessage = [
            'BOG API requires HTTPS URLs for callbacks.',
            '',
            'Development Setup:',
            '1. Install ngrok: https://ngrok.com/download',
            '2. Run: ngrok http 4000',
            '3. Set environment variable:',
            '   export BOG_CALLBACK_URL=https://your-ngrok-url.ngrok.io',
            '   (or add to .env file: BOG_CALLBACK_URL=https://your-ngrok-url.ngrok.io)',
            '',
            'Production: Use HTTPS URLs directly in callbackUrl parameter.',
          ].join('\n');
          this.logger.error(`❌ [BOG] ${errorMessage}`);
          throw new Error(errorMessage);
        }
      }

      // Build request body according to BOG API documentation
      const requestBody = {
        callback_url: callbackUrl,
        external_order_id: params.orderId,
        purchase_units: {
          currency: params.currency,
          total_amount: params.amount,
          basket: [
            {
              quantity: 1,
              unit_price: params.amount,
              product_id: this.BOG_MERCHANT_ID, // Use merchant ID as product_id
            },
          ],
        },
        redirect_urls: {
          success: params.successUrl || 'https://marte.ge/payment/success',
          fail: params.failUrl || 'https://marte.ge/payment/fail',
        },
        ...(params.captureMethod && {
          capture: params.captureMethod === 'AUTO' ? 'automatic' : 'manual',
        }),
      };

      this.logger.log('💳 [BOG] Request details:', {
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'ka',
          Authorization: `Bearer ${token.substring(0, 20)}...`,
        },
        body: requestBody,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'ka',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      // Log response status and headers
      this.logger.log('📥 [BOG] Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Get response text first to log it
      const responseText = await response.text();
      this.logger.log('📥 [BOG] Response body (raw):', responseText);

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          errorData = { raw: responseText };
        }

        this.logger.error(
          `❌ [BOG] Payment order creation failed: ${response.status}`,
          {
            status: response.status,
            statusText: response.statusText,
            url: endpoint,
            errorData,
            requestBody,
          },
        );
        const errorMessage =
          typeof errorData.message === 'string'
            ? errorData.message
            : typeof errorData.description === 'string'
              ? errorData.description
              : 'Unknown error';
        throw new Error(
          `Payment order creation failed: ${response.status} - ${errorMessage}`,
        );
      }

      // BOG API response structure according to documentation
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(responseText) as Record<string, unknown>;
        this.logger.log(
          '📥 [BOG] Response body (parsed):',
          JSON.stringify(data, null, 2),
        );
      } catch (error) {
        this.logger.error('❌ [BOG] Error parsing response JSON:', error);
        throw new Error('Failed to parse BOG API response');
      }

      // Type assertion for known fields
      const typedData = data as {
        id?: string;
        order_id?: string;
        _links?: {
          redirect?: {
            href?: string;
          };
          details?: {
            href?: string;
          };
        };
        redirect_links?: {
          success?: string;
          fail?: string;
        };
        order_status?: {
          key?: string;
          value?: string;
        };
        [key: string]: unknown;
      };

      // BOG API returns order_id as "id" in response
      // IMPORTANT: We must use BOG's "id" (UUID) for status checks, not external_order_id
      const bogOrderId = typedData.id;
      const orderId = bogOrderId || typedData.order_id || params.orderId;

      this.logger.log('🔍 [BOG] Extracting order ID from response:', {
        hasId: !!typedData.id,
        id: typedData.id,
        hasOrderId: !!typedData.order_id,
        orderId: typedData.order_id,
        externalOrderId: params.orderId,
        finalOrderId: orderId,
      });

      // BOG returns payment URL in _links.redirect.href
      const paymentUrl =
        typedData._links?.redirect?.href || typedData.redirect_links?.success;

      const orderStatus =
        typedData.order_status?.key || typedData.order_status?.value;

      this.logger.log('✅ [BOG] Payment order created successfully:', {
        bogOrderId,
        orderId,
        paymentUrl,
        orderStatus,
        fullResponse: typedData,
      });

      this.logger.log('✅ [BOG] Payment order created:', {
        orderId,
        paymentUrl,
        orderStatus,
      });

      return {
        success: true,
        orderId,
        paymentUrl,
        orderStatus,
      };
    } catch (error) {
      this.logger.error('❌ [BOG] Error creating payment order:', error);
      return {
        success: false,
        orderId: params.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get payment order status
   * BOG API Documentation: GET /payments/v1/receipt/:order_id
   * Note: orderId should be BOG's order ID (from response.id), not external_order_id
   */
  async getPaymentStatus(orderId: string): Promise<{
    success: boolean;
    status?: string;
    amount?: number;
    orderData?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      // BOG API endpoint for getting receipt/order details
      // orderId should be BOG's order ID (UUID format), not external_order_id
      const endpoint = `${this.BOG_API_URL}/receipt/${orderId}`;

      this.logger.log('🔍 [BOG] Getting payment status:', {
        orderId,
        endpoint,
      });

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Language': 'ka',
        },
      });

      // Log response details
      this.logger.log('📥 [BOG] Status response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Get response text first
      const responseText = await response.text();
      this.logger.log('📥 [BOG] Status response body (raw):', responseText);

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          errorData = { raw: responseText };
        }
        this.logger.error(
          `❌ [BOG] Get payment status failed: ${response.status}`,
          {
            orderId,
            endpoint,
            errorData,
          },
        );
        throw new Error(`Get payment status failed: ${response.status}`);
      }

      // BOG API response structure according to documentation
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(responseText) as Record<string, unknown>;
        this.logger.log(
          '📥 [BOG] Status response body (parsed):',
          JSON.stringify(data, null, 2),
        );
      } catch (error) {
        this.logger.error(
          '❌ [BOG] Error parsing status response JSON:',
          error,
        );
        throw new Error('Failed to parse BOG API status response');
      }

      const typedData = data as {
        order_id?: string;
        id?: string;
        order_status?: {
          key?: string;
          value?: string;
        };
        purchase_units?: {
          request_amount?: string;
          transfer_amount?: string;
          currency_code?: string;
        };
        [key: string]: unknown;
      };

      const status =
        typedData.order_status?.key || typedData.order_status?.value;
      const amount = typedData.purchase_units?.request_amount
        ? parseFloat(typedData.purchase_units.request_amount)
        : undefined;

      this.logger.log('✅ [BOG] Payment status retrieved:', {
        orderId,
        status,
        amount,
        fullResponse: typedData,
      });

      return {
        success: true,
        status,
        amount,
        orderData: typedData,
      };
    } catch (error) {
      this.logger.error('❌ [BOG] Error getting payment status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify callback signature using SHA256withRSA
   * BOG sends signature in Callback-Signature header
   */
  verifyCallbackSignature(signature: string, payload: string): boolean {
    try {
      const publicKey = crypto.createPublicKey(this.BOG_PUBLIC_KEY as string);
      const signatureBuffer = Buffer.from(signature, 'base64');
      const payloadBuffer = Buffer.from(payload, 'utf8');

      const verify = crypto.createVerify('SHA256');
      verify.update(payloadBuffer);
      verify.end();

      return verify.verify(publicKey, signatureBuffer);
    } catch (error) {
      this.logger.error('❌ [BOG] Error verifying callback signature:', error);
      return false;
    }
  }

  /**
   * Handle payment callback
   * BOG sends callback with event: "order_payment"
   * Structure: { event, zoned_request_time, body }
   */
  handlePaymentCallback(
    callbackData: {
      event?: string;
      zoned_request_time?: string;
      body?: {
        order_id?: string;
        order_status?: {
          key?: string;
          value?: string;
        };
        purchase_units?: {
          request_amount?: string;
          transfer_amount?: string;
          currency_code?: string;
        };
        [key: string]: unknown;
      };
      // Also support direct body format for backward compatibility
      order_id?: string;
      orderId?: string;
      status?: string;
      order_status?: string | { key?: string; value?: string };
    },
    signature?: string,
    rawBody?: string,
  ): {
    success: boolean;
    orderId?: string;
    status?: string;
    verified?: boolean;
    error?: string;
  } {
    try {
      this.logger.log('📞 [BOG] Payment callback received:', {
        event: callbackData.event,
        hasBody: !!callbackData.body,
        hasSignature: !!signature,
      });

      // Verify callback signature if provided
      let verified = false;
      if (signature && rawBody) {
        verified = this.verifyCallbackSignature(signature, rawBody);
        if (!verified) {
          this.logger.warn('⚠️ [BOG] Callback signature verification failed');
          return {
            success: false,
            verified: false,
            error: 'Invalid signature',
          };
        }
        this.logger.log('✅ [BOG] Callback signature verified');
      } else {
        this.logger.warn('⚠️ [BOG] No signature provided for verification');
        verified = false;
      }

      // Extract order data from callback structure
      let orderId: string | undefined;
      let status: string | undefined;

      if (callbackData.event === 'order_payment' && callbackData.body) {
        // New callback format
        orderId = callbackData.body.order_id;
        if (callbackData.body.order_status) {
          if (typeof callbackData.body.order_status === 'object') {
            status =
              callbackData.body.order_status.key ||
              callbackData.body.order_status.value;
          } else {
            status = callbackData.body.order_status;
          }
        }
      } else {
        // Backward compatibility - direct format
        orderId =
          callbackData.order_id ||
          callbackData.orderId ||
          callbackData.body?.order_id;
        if (callbackData.order_status) {
          if (typeof callbackData.order_status === 'object') {
            status =
              callbackData.order_status.key || callbackData.order_status.value;
          } else {
            status = callbackData.order_status;
          }
        } else {
          status =
            callbackData.status ||
            callbackData.body?.order_status?.key ||
            callbackData.body?.order_status?.value;
        }
      }

      this.logger.log('✅ [BOG] Callback processed:', {
        orderId,
        status,
        verified,
      });

      return {
        success: true,
        orderId,
        status,
        verified,
      };
    } catch (error) {
      this.logger.error('❌ [BOG] Error handling payment callback:', error);
      return {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
