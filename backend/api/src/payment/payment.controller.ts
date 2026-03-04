import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    Post,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  async createPaymentOrder(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.createPaymentOrder({
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency || 'GEL',
      orderId: createPaymentDto.orderId,
      description: createPaymentDto.description,
      callbackUrl: createPaymentDto.callbackUrl,
      captureMethod: createPaymentDto.captureMethod,
    });
  }

  @Get('status/:orderId')
  async getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(orderId);
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

    return this.paymentService.handlePaymentCallback(
      callbackData,
      signature,
      rawBody,
    );
  }
}
