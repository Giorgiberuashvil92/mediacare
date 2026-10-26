import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAiCheckoutDto } from './dto/ai-subscription.dto';
import { AiSubscriptionService } from './ai-subscription.service';

@Controller('ai/subscription')
@UseGuards(JwtAuthGuard)
export class AiSubscriptionController {
  constructor(private readonly service: AiSubscriptionService) {}

  @Get()
  getStatus(@CurrentUser() user: { sub: string }) {
    return this.service.getStatus(user.sub);
  }

  @Post('checkout')
  createCheckout(@CurrentUser() user: { sub: string }, @Body() dto: CreateAiCheckoutDto) {
    return this.service.createCheckout(user.sub, dto.plan);
  }

  @Post('cancel')
  cancel(@CurrentUser() user: { sub: string }) {
    return this.service.cancel(user.sub);
  }

  @Post('consume')
  consume(@CurrentUser() user: { sub: string }) {
    return this.service.consume(user.sub);
  }

  @Get('payments')
  listPayments(@CurrentUser() user: { sub: string }) {
    return this.service.listPayments(user.sub);
  }
}
