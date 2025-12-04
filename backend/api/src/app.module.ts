import { Module } from '@nestjs/common';
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
import { DoctorsModule } from './doctors/doctors.module';
import { ProfileModule } from './profile/profile.module';
import { ShopModule } from './shop/shop.module';
import { SpecializationsModule } from './specializations/specializations.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.DATABASE_URL ||
        'mongodb+srv://Giorgiberuashvili1999:Berobero12@medicarehera.3obzg53.mongodb.net/medicare?retryWrites=true&w=majority&appName=Medicarehera',
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
    ProfileModule,
    DoctorsModule,
    SpecializationsModule,
    AppointmentsModule,
    AdminModule,
    ShopModule,
    AdvisorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
