import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientGuard } from '../auth/guards/patient.guard';
import { CreateFollowUpDto } from '../doctors/dto/create-follow-up.dto';
import { DoctorGuard } from '../doctors/guards/doctor.guard';
import { AppointmentsService } from './appointments.service';
import { AssignLaboratoryTestsDto } from './dto/assign-laboratory-tests.dto';
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

  // Check if patient is eligible for follow-up
  // IMPORTANT: This must come BEFORE @Get(':id') to avoid route conflicts
  @Get(':id/follow-up/eligibility')
  @UseGuards(JwtAuthGuard, PatientGuard)
  async checkFollowUpEligibility(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
  ) {
    return this.appointmentsService.checkFollowUpEligibility(
      appointmentId,
      user.sub,
    );
  }

  // Patient schedules follow-up appointment
  // IMPORTANT: This must come BEFORE @Get(':id') to avoid route conflicts
  @Post(':id/follow-up')
  @UseGuards(JwtAuthGuard, PatientGuard)
  async scheduleFollowUpByPatient(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
    @Body() body: CreateFollowUpDto,
  ) {
    return this.appointmentsService.scheduleFollowUpAppointmentByPatient(
      user.sub,
      appointmentId,
      body,
    );
  }

  // Reschedule appointment (admin, doctor, or patient can reschedule)
  // IMPORTANT: This must come BEFORE @Get(':id') to avoid route conflicts
  @Put(':id/reschedule')
  @UseGuards(JwtAuthGuard)
  async rescheduleAppointment(
    @Param('id') appointmentId: string,
    @Body() body: { newDate: string; newTime: string },
  ) {
    return this.appointmentsService.rescheduleAppointment(
      appointmentId,
      body.newDate,
      body.newTime,
    );
  }

  // Patient books laboratory test by selecting clinic
  // IMPORTANT: This must come BEFORE @Put(':id/laboratory-tests') to avoid route conflicts
  @Put(':id/laboratory-tests/book')
  @UseGuards(JwtAuthGuard, PatientGuard)
  async bookLaboratoryTest(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
    @Body() body: { productId: string; clinicId: string; clinicName: string },
  ) {
    return this.appointmentsService.bookLaboratoryTest(
      user.sub,
      appointmentId,
      body,
    );
  }

  // Doctor assigns laboratory tests to completed appointment
  // IMPORTANT: This must come BEFORE @Get(':id') to avoid route conflicts
  @Put(':id/laboratory-tests')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async assignLaboratoryTests(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
    @Body() dto: AssignLaboratoryTestsDto,
  ) {
    return this.appointmentsService.assignLaboratoryTests(
      user.sub,
      appointmentId,
      dto.tests,
    );
  }

  // Patient uploads laboratory test result (for assigned tests)
  @Post(':id/laboratory-tests/:productId/result')
  @UseGuards(JwtAuthGuard, PatientGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLaboratoryTestResult(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.appointmentsService.uploadLaboratoryTestResult(
      user.sub,
      appointmentId,
      productId,
      file,
    );
  }

  // Patient uploads external lab result (not pre-assigned)
  @Post(':id/external-lab-result')
  @UseGuards(JwtAuthGuard, PatientGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadExternalLabResult(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { testName?: string },
  ) {
    return this.appointmentsService.uploadExternalLabResult(
      user.sub,
      appointmentId,
      file,
      body.testName,
    );
  }

  // Agora token generation for video calls
  @Get(':id/agora-token')
  @UseGuards(JwtAuthGuard)
  async getAgoraToken(
    @CurrentUser() user: { sub: string },
    @Param('id') appointmentId: string,
  ) {
    return this.appointmentsService.generateAgoraToken(user.sub, appointmentId);
  }

  // ორივეს შეუძლია ნახოს appointment-ის დეტალები
  // IMPORTANT: This must come AFTER all specific routes like :id/reschedule, :id/follow-up, etc.
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAppointmentById(@Param('id') id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }
}
