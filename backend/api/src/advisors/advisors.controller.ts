import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../schemas/user.schema';
import { AdvisorsService } from './advisors.service';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { UpdateAdvisorDto } from './dto/update-advisor.dto';

@Controller('advisors')
export class AdvisorsController {
  constructor(private readonly advisorsService: AdvisorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createAdvisorDto: CreateAdvisorDto) {
    return this.advisorsService.create(createAdvisorDto);
  }

  @Get()
  findAll() {
    return this.advisorsService.findAll();
  }

  @Get('active')
  findActive() {
    return this.advisorsService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.advisorsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateAdvisorDto: UpdateAdvisorDto) {
    return this.advisorsService.update(id, updateAdvisorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.advisorsService.remove(id);
  }
}

