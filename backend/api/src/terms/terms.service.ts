import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateTermDto } from './dto/update-term.dto';
import { mergePrivacyWithDefaults } from './default-privacy-policy';
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
      const defaults =
        type === 'privacy'
          ? mergePrivacyWithDefaults(null)
          : { content: '', contentEn: '', contentRu: '' };
      return {
        success: true,
        data: {
          type,
          content: defaults.content,
          contentEn: defaults.contentEn,
          contentRu: defaults.contentRu,
          updatedAt: null,
        },
      };
    }

    if (type === 'privacy') {
      const merged = mergePrivacyWithDefaults({
        content: term.content,
        contentEn: term.contentEn,
        contentRu: term.contentRu,
      });
      return {
        success: true,
        data: {
          type: term.type,
          content: merged.content,
          contentEn: merged.contentEn,
          contentRu: merged.contentRu,
          updatedAt: term['updatedAt'] || term['createdAt'],
        },
      };
    }

    return {
      success: true,
      data: {
        type: term.type,
        content: term.content,
        contentEn: term.contentEn || '',
        contentRu: term.contentRu || '',
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
          contentEn: updateTermDto.contentEn ?? '',
          contentRu: updateTermDto.contentRu ?? '',
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
        contentEn: term.contentEn || '',
        contentRu: term.contentRu || '',
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
        contentEn: term.contentEn || '',
        contentRu: term.contentRu || '',
        updatedAt: term['updatedAt'] || term['createdAt'],
      })),
    };
  }
}
