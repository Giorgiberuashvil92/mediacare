import { DynamicModule, ForwardReference, Module, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AdvisorsModule } from './advisors/advisors.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DoctorsModule } from './doctors/doctors.module';
import { HelpCenterModule } from './help-center/help-center.module';
import { ProfileModule } from './profile/profile.module';
import { ShopModule } from './shop/shop.module';
import { SpecializationsModule } from './specializations/specializations.module';
import { TermsModule } from './terms/terms.module';
import { UploadModule } from './upload/upload.module';

const moduleImports: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [
  ConfigModule.forRoot({
    isGlobal: true,
  }),
  MongooseModule.forRoot(
    'mongodb+srv://gioberuashvili:Berobero12!@cluster0.g31ptrc.mongodb.net/?appName=Cluster0',
  ),

  JwtModule.registerAsync({
    global: true,
    useFactory: () => ({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  }),
  ThrottlerModule.forRoot([
    {
      ttl: 60000,
      limit: 10,
    },
  ]),
  AuthModule,
  UploadModule,
  CloudinaryModule,
  ProfileModule,
  DoctorsModule,
  SpecializationsModule,
  TermsModule,
  AppointmentsModule,
  AdminModule,
  ShopModule,
  AdvisorsModule,
  HelpCenterModule,
];

@Module({
  imports: moduleImports,
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
