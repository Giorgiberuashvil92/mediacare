import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DoctorsService } from './doctors.service';
import { GetDoctorsDto } from './dto/get-doctors.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
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
  ) {
    return this.doctorsService.getDoctorAvailability(id, startDate, endDate);
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
