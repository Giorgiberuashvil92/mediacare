import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateTermDto } from './dto/update-term.dto';
import { Term, TermDocument } from './schemas/term.schema';

@Injectable()
export class TermsService {
  constructor(
    @InjectModel(Term.name)
    private termModel: Model<TermDocument>,
  ) {}

  async findOne(
    type:
      | 'cancellation'
      | 'service'
      | 'privacy'
      | 'contract'
      | 'usage'
      | 'doctor-cancellation'
      | 'doctor-service',
  ) {
    const term = await this.termModel.findOne({ type, isActive: true }).lean();

    if (!term) {
      // Return default empty content if not found
      return {
        success: true,
        data: {
          type,
          content: '',
          updatedAt: null,
        },
      };
    }

    return {
      success: true,
      data: {
        type: term.type,
        content: term.content,
        updatedAt: term['updatedAt'] || term['createdAt'],
      },
    };
  }

  async update(
    type:
      | 'cancellation'
      | 'service'
      | 'privacy'
      | 'contract'
      | 'usage'
      | 'doctor-cancellation'
      | 'doctor-service',
    updateTermDto: UpdateTermDto,
  ) {
    const term = await this.termModel
      .findOneAndUpdate(
        { type },
        {
          content: updateTermDto.content,
          isActive: true,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();

    return {
      success: true,
      data: {
        type: term.type,
        content: term.content,
        updatedAt: term['updatedAt'] || term['createdAt'],
      },
    };
  }

  async findAll() {
    const terms = await this.termModel.find({ isActive: true }).lean();
    return {
      success: true,
      data: terms.map((term) => ({
        type: term.type,
        content: term.content,
        updatedAt: term['updatedAt'] || term['createdAt'],
      })),
    };
  }
}
