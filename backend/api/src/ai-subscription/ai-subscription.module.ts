import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { AiSubscriptionController } from './ai-subscription.controller';
import { AiSubscriptionService } from './ai-subscription.service';
import { AiSubscription, AiSubscriptionSchema } from './schemas/ai-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AiSubscription.name, schema: AiSubscriptionSchema }]),
    AuthModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [AiSubscriptionController],
  providers: [AiSubscriptionService],
  exports: [AiSubscriptionService],
})
export class AiSubscriptionModule {}
