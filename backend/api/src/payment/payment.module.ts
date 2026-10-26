import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiSubscriptionModule } from '../ai-subscription/ai-subscription.module';
import { User, UserSchema } from '../schemas/user.schema';
import { Clinic, ClinicSchema } from '../shop/schemas/clinic.schema';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    forwardRef(() => AiSubscriptionModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Clinic.name, schema: ClinicSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
