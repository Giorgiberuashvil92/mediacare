import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Req,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';
import { AiSubscriptionService } from '../ai-subscription/ai-subscription.service';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => AiSubscriptionService))
    private readonly aiSubscriptionService: AiSubscriptionService,
  ) {}

  @Post('create-order')
  async createPaymentOrder(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.createPaymentOrder({
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency || 'GEL',
      orderId: createPaymentDto.orderId,
      description: createPaymentDto.description,
      callbackUrl: createPaymentDto.callbackUrl,
      captureMethod: createPaymentDto.captureMethod,
      doctorId: createPaymentDto.doctorId,
    });
  }

  @Get('status/:orderId')
  async getPaymentStatus(
    @Param('orderId') orderId: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.paymentService.getPaymentStatus(orderId, doctorId);
  }

  @Post('callback')
  handleCallback(
    @Body() callbackData: Record<string, unknown>,
    @Headers('callback-signature') signature?: string,
    @Req() request?: Request,
  ) {
    // Get raw body for signature verification
    // Note: In NestJS, raw body might need to be configured in main.ts
    // For now, we'll use JSON.stringify of the parsed body
    // In production, you should configure raw body parsing middleware
    const rawBody =
      (request as { rawBody?: string } | undefined)?.rawBody ||
      JSON.stringify(callbackData);

    const result = this.paymentService.handlePaymentCallback(
      callbackData,
      signature,
      rawBody,
    );
    if (result.orderId && result.status) {
      void this.aiSubscriptionService.handlePayment(
        result.orderId,
        result.status,
      );
    }
    return result;
  }
}
