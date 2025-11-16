import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import { SpecializationsService } from './specializations.service';

@Controller('specializations')
export class SpecializationsController {
  constructor(
    private readonly specializationsService: SpecializationsService,
  ) {}

  @Get()
  async findAll() {
    return this.specializationsService.findAll();
  }

  @Get('admin')
  async findAllAdmin() {
    return this.specializationsService.findAllAdmin();
  }

  @Post()
  async create(@Body() createSpecializationDto: CreateSpecializationDto) {
    return this.specializationsService.create(createSpecializationDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSpecializationDto: UpdateSpecializationDto,
  ) {
    return this.specializationsService.update(id, updateSpecializationDto);
  }

  @Patch(':id/toggle')
  async toggleActive(
    @Param('id') id: string,
    @Query('isActive') isActive: string,
  ) {
    return this.specializationsService.toggleActive(id, isActive === 'true');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.specializationsService.remove(id);
  }
}
