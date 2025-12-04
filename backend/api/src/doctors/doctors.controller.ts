import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DoctorsService } from './doctors.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { GetDoctorsDto } from './dto/get-doctors.dto';
import { UpdateDoctorAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { UpdateForm100Dto } from './dto/update-form100.dto';
import { DoctorGuard } from './guards/doctor.guard';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async getAllDoctors(@Query() query: GetDoctorsDto) {
    return this.doctorsService.getAllDoctors(query);
  }

  // Specific routes must come before parameterized routes
  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async getDashboardStats(@CurrentUser() user: { sub: string }) {
    return await this.doctorsService.getDashboardStats(user.sub);
  }

  @Get('dashboard/appointments')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async getDashboardAppointments(
    @CurrentUser() user: { sub: string },
    @Query('limit') limit?: string,
  ) {
    return await this.doctorsService.getDashboardAppointments(
      user.sub,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('dashboard/schedule')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async getDashboardSchedule(@CurrentUser() user: { sub: string }) {
    return await this.doctorsService.getDashboardSchedule(user.sub);
  }

  @Get('patients')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async getDoctorPatients(@CurrentUser() user: { sub: string }) {
    console.log('🏥 DoctorsController.getDoctorPatients - START');
    console.log('🏥 DoctorsController.getDoctorPatients - user received:', {
      user,
      userType: typeof user,
      userKeys: user ? Object.keys(user) : 'null',
    });

    try {
      console.log('🏥 DoctorsController.getDoctorPatients - user:', {
        user,
        sub: user?.sub,
        subType: typeof user?.sub,
        subLength: user?.sub?.length,
        userStringified: JSON.stringify(user),
      });

      if (!user || !user.sub) {
        console.error(
          '🏥 DoctorsController.getDoctorPatients - Invalid user:',
          user,
        );
        throw new Error('Invalid user object');
      }

      console.log(
        '🏥 DoctorsController.getDoctorPatients - Calling service with doctorId:',
        user.sub,
      );
      const result = await this.doctorsService.getDoctorPatients(user.sub);
      console.log(
        '🏥 DoctorsController.getDoctorPatients - Service returned:',
        {
          success: result.success,
          dataLength: result.data?.length,
        },
      );
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('🏥 DoctorsController.getDoctorPatients - Error:', {
        errorMessage,
        errorStack,
      });
      throw error;
    }
  }

  @Patch('appointments/:appointmentId')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async updateAppointment(
    @CurrentUser() user: { sub: string },
    @Param('appointmentId') appointmentId: string,
    @Body() body: UpdateDoctorAppointmentDto,
  ) {
    return this.doctorsService.updateAppointmentByDoctor(
      user.sub,
      appointmentId,
      body,
    );
  }

  @Patch('appointments/:appointmentId/form100')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadForm100(
    @CurrentUser() user: { sub: string },
    @Param('appointmentId') appointmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateForm100Dto,
  ) {
    return this.doctorsService.updateForm100ByDoctor(
      user.sub,
      appointmentId,
      body,
      file,
    );
  }

  @Post('appointments/:appointmentId/follow-up')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async scheduleFollowUp(
    @CurrentUser() user: { sub: string },
    @Param('appointmentId') appointmentId: string,
    @Body() body: CreateFollowUpDto,
  ) {
    return this.doctorsService.scheduleFollowUpAppointmentByDoctor(
      user.sub,
      appointmentId,
      body,
    );
  }

  // Parameterized routes must come after specific routes
  @Get(':id')
  async getDoctorById(
    @Param('id') id: string,
    @Query('includePending') includePending?: string,
  ) {
    return this.doctorsService.getDoctorById(id, includePending === 'true');
  }

  @Get(':id/availability')
  async getDoctorAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: 'video' | 'home-visit',
  ) {
    return this.doctorsService.getDoctorAvailability(
      id,
      startDate,
      endDate,
      type,
    );
  }

  @Put('availability')
  @UseGuards(JwtAuthGuard, DoctorGuard)
  async updateAvailability(
    @CurrentUser() user: { sub: string },
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.doctorsService.updateAvailability(
      user.sub,
      updateAvailabilityDto,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateDoctor(
    @Param('id') id: string,
    @Body() updateDoctorDto: UpdateDoctorDto,
  ) {
    return this.doctorsService.updateDoctor(id, updateDoctorDto);
  }
}
