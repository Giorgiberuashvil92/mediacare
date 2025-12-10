import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientGuard } from '../auth/guards/patient.guard';
import { DoctorGuard } from '../doctors/guards/doctor.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // დროებით time slot-ის დაბლოკვა
  @Post('block-timeslot')
  @UseGuards(JwtAuthGuard, PatientGuard)
  async blockTimeSlot(
    @CurrentUser() user: { sub: string },
    @Body() blockData: { doctorId: string; date: string; time: string },
  ) {
    return this.appointmentsService.blockTimeSlot(
      user.sub,
      blockData.doctorId,
      blockData.date,
      blockData.time,
    );
  }

  // პაციენტი ქმნის appointment-ს
  @Post()
  @UseGuards(JwtAuthGuard, PatientGuard)
  async createAppointment(
    @CurrentUser() user: { sub: string },
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(
      user.sub,
      createAppointmentDto,
    );
  }

  // პაციენტი ხედავს თავის appointments-ებს
  @Get('patient')
  @UseGuards(JwtAuthGuard, PatientGuard)
  async getPatientAppointments(@CurrentUser() user: { sub: string }) {
    return this.appointmentsService.getAppointmentsByPatient(user.sub);
  }

  // ექიმი ხედავს თავის appointments-ებს
  @Get('doctor')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async getDoctorAppointments(@CurrentUser() user: { sub: string }) {
    return this.appointmentsService.getAppointmentsByDoctor(user.sub);
  }

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard, PatientGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAppointmentDocument(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.appointmentsService.addDocument(user.sub, appointmentId, file);
  }

  @Get(':id/documents')
  @UseGuards(JwtAuthGuard)
  async listAppointmentDocuments(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
  ) {
    return this.appointmentsService.getDocuments(user.sub, appointmentId);
  }

  // ორივეს შეუძლია ნახოს appointment-ის დეტალები
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAppointmentById(@Param('id') id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }
}
