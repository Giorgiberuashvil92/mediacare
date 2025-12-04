import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { AdvisorsController } from './advisors.controller';
import { AdvisorsService } from './advisors.service';
import { Advisor, AdvisorSchema } from './schemas/advisor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Advisor.name, schema: AdvisorSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdvisorsController],
  providers: [AdvisorsService],
  exports: [AdvisorsService],
})
export class AdvisorsModule {}

