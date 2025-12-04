import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { UpdateAdvisorDto } from './dto/update-advisor.dto';
import { Advisor, AdvisorDocument } from './schemas/advisor.schema';

@Injectable()
export class AdvisorsService {
  constructor(
    @InjectModel(Advisor.name)
    private advisorModel: mongoose.Model<AdvisorDocument>,
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
  ) {}

  async create(createAdvisorDto: CreateAdvisorDto) {
    // Validate doctor exists
    if (!mongoose.Types.ObjectId.isValid(createAdvisorDto.doctorId)) {
      throw new BadRequestException('Invalid doctor ID');
    }

    const doctor = await this.userModel.findOne({
      _id: new mongoose.Types.ObjectId(createAdvisorDto.doctorId),
      role: UserRole.DOCTOR,
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Check if advisor already exists for this doctor
    const existingAdvisor = await this.advisorModel.findOne({
      doctorId: new mongoose.Types.ObjectId(createAdvisorDto.doctorId),
    });

    if (existingAdvisor) {
      throw new BadRequestException('Advisor already exists for this doctor');
    }

    const advisor = new this.advisorModel({
      doctorId: new mongoose.Types.ObjectId(createAdvisorDto.doctorId),
      name: doctor.name,
      specialization: doctor.specialization,
      bio: createAdvisorDto.bio || doctor.about || '',
      order: createAdvisorDto.order || 0,
      isActive: createAdvisorDto.isActive !== undefined ? createAdvisorDto.isActive : true,
    });

    const savedAdvisor = await advisor.save();

    // Populate doctor info
    await savedAdvisor.populate('doctorId');

    return {
      success: true,
      data: savedAdvisor,
    };
  }

  async findAll() {
    const advisors = await this.advisorModel
      .find()
      .populate('doctorId')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return {
      success: true,
      data: advisors,
    };
  }

  async findActive() {
    const advisors = await this.advisorModel
      .find({ isActive: true })
      .populate('doctorId')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return {
      success: true,
      data: advisors,
    };
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid advisor ID');
    }

    const advisor = await this.advisorModel
      .findById(id)
      .populate('doctorId')
      .lean();

    if (!advisor) {
      throw new NotFoundException('Advisor not found');
    }

    return {
      success: true,
      data: advisor,
    };
  }

  async update(id: string, updateAdvisorDto: UpdateAdvisorDto) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid advisor ID');
    }

    const advisor = await this.advisorModel.findById(id);

    if (!advisor) {
      throw new NotFoundException('Advisor not found');
    }

    Object.assign(advisor, updateAdvisorDto);
    const updatedAdvisor = await advisor.save();

    await updatedAdvisor.populate('doctorId');

    return {
      success: true,
      data: updatedAdvisor,
    };
  }

  async remove(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid advisor ID');
    }

    const advisor = await this.advisorModel.findByIdAndDelete(id);

    if (!advisor) {
      throw new NotFoundException('Advisor not found');
    }

    return {
      success: true,
      message: 'Advisor deleted successfully',
    };
  }
}

