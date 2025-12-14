import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateAvailabilityDto } from '../doctors/dto/update-availability.dto';
import { ApprovalStatus, UserRole } from '../schemas/user.schema';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUsers(@Query() query: GetUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('id') userId: string) {
    return this.adminService.getUserById(userId);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(userId, updateUserDto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  @Delete('users/:id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async hardDeleteUser(@Param('id') userId: string) {
    return this.adminService.hardDeleteUser(userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    return this.adminService.getStats();
  }

  @Post('create-superadmin')
  async createSuperAdmin() {
    return this.adminService.createSuperAdmin();
  }

  @Get('appointments')
  @UseGuards(JwtAuthGuard)
  async getAppointments(
    @Query()
    query: {
      page?: string;
      limit?: string;
      status?: string;
      paymentStatus?: string;
      search?: string;
    },
  ) {
    const parsedQuery = {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 10,
      status: query.status,
      paymentStatus: query.paymentStatus,
      search: query.search,
    };
    return this.adminService.getAppointments(parsedQuery);
  }

  @Put('appointments/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateAppointmentStatus(
    @Param('id') appointmentId: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.updateAppointmentStatus(
      appointmentId,
      body.status,
    );
  }

  @Put('doctors/:id/approval')
  @UseGuards(JwtAuthGuard)
  async updateDoctorApproval(
    @Param('id') doctorId: string,
    @Body() body: { approvalStatus: ApprovalStatus; isActive?: boolean },
  ) {
    return this.adminService.updateDoctorApproval(
      doctorId,
      body.approvalStatus,
      body.isActive,
    );
  }

  @Put('doctors/:id/availability')
  @UseGuards(JwtAuthGuard)
  async updateDoctorAvailability(
    @Param('id') doctorId: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.adminService.updateDoctorAvailability(
      doctorId,
      updateAvailabilityDto.availability,
    );
  }
}
