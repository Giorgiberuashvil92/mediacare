import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../schemas/user.schema';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermsService } from './terms.service';

@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get(':type')
  async findOne(
    @Param('type')
    type:
      | 'cancellation'
      | 'service'
      | 'privacy'
      | 'contract'
      | 'usage'
      | 'doctor-cancellation'
      | 'doctor-service',
  ) {
    return this.termsService.findOne(type);
  }

  @Put(':type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('type')
    type:
      | 'cancellation'
      | 'service'
      | 'privacy'
      | 'contract'
      | 'usage'
      | 'doctor-cancellation'
      | 'doctor-service',
    @Body() updateTermDto: UpdateTermDto,
  ) {
    return this.termsService.update(type, updateTermDto);
  }

  @Get()
  async findAll() {
    return this.termsService.findAll();
  }
}
