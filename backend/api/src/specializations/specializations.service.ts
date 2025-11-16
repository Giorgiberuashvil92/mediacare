import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import {
  Specialization,
  SpecializationDocument,
} from './schemas/specialization.schema';

@Injectable()
export class SpecializationsService {
  constructor(
    @InjectModel(Specialization.name)
    private specializationModel: Model<SpecializationDocument>,
  ) {}

  async create(createSpecializationDto: CreateSpecializationDto) {
    const specialization = new this.specializationModel(
      createSpecializationDto,
    );
    const saved = await specialization.save();
    return {
      success: true,
      data: saved,
    };
  }

  async findAll() {
    const specializations = await this.specializationModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .lean();
    return {
      success: true,
      data: specializations,
    };
  }

  async findAllAdmin() {
    const specializations = await this.specializationModel
      .find()
      .sort({ createdAt: -1 })
      .lean();
    return {
      success: true,
      data: specializations,
    };
  }

  async update(id: string, updateSpecializationDto: UpdateSpecializationDto) {
    const specialization = await this.specializationModel.findByIdAndUpdate(
      id,
      updateSpecializationDto,
      { new: true },
    );

    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    return {
      success: true,
      data: specialization,
    };
  }

  async toggleActive(id: string, isActive: boolean) {
    const specialization = await this.specializationModel.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );

    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    return {
      success: true,
      data: specialization,
    };
  }

  async remove(id: string) {
    const specialization = await this.specializationModel.findByIdAndDelete(id);

    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    return {
      success: true,
      message: 'Specialization removed successfully',
    };
  }
}
