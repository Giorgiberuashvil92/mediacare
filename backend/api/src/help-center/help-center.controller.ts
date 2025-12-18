import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateHelpCenterDto } from './dto/update-help-center.dto';
import { HelpCenterService } from './help-center.service';

@Controller('help-center')
export class HelpCenterController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  // Public endpoint - get active FAQs and contact info
  @Get()
  async get() {
    return this.helpCenterService.get();
  }

  // Admin endpoint - get all FAQs including inactive
  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAll() {
    return this.helpCenterService.getAll();
  }

  // Admin endpoint - update help center content
  @Put()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Body() updateDto: UpdateHelpCenterDto) {
    return this.helpCenterService.update(updateDto);
  }
}
