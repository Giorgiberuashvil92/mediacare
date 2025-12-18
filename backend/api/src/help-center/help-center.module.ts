import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../schemas/user.schema';
import { HelpCenterController } from './help-center.controller';
import { HelpCenterService } from './help-center.service';
import { HelpCenter, HelpCenterSchema } from './schemas/help-center.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HelpCenter.name, schema: HelpCenterSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [HelpCenterController],
  providers: [HelpCenterService],
  exports: [HelpCenterService],
})
export class HelpCenterModule {}
