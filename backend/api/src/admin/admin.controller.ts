import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovalStatus } from '../schemas/user.schema';
import { AdminService } from './admin.service';
import { GetUsersDto } from './dto/get-users.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUsers(@Query() query: GetUsersDto) {
    return this.adminService.getUsers(query);
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
}
