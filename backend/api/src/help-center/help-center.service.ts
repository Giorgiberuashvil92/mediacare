import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateHelpCenterDto } from './dto/update-help-center.dto';
import { HelpCenter, HelpCenterDocument } from './schemas/help-center.schema';

@Injectable()
export class HelpCenterService {
  constructor(
    @InjectModel(HelpCenter.name)
    private helpCenterModel: Model<HelpCenterDocument>,
  ) {}

  async get() {
    // There should only be one document
    let helpCenter = await this.helpCenterModel.findOne().lean();

    if (!helpCenter) {
      // Create default document if it doesn't exist
      helpCenter = await this.helpCenterModel.create({
        faqs: [],
        contactInfo: {},
      });
    }

    // Filter only active FAQs and sort by order
    const activeFaqs = (helpCenter.faqs || [])
      .filter((faq) => faq.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return {
      success: true,
      data: {
        faqs: activeFaqs,
        contactInfo: helpCenter.contactInfo || {},
        updatedAt: helpCenter['updatedAt'] || helpCenter['createdAt'],
      },
    };
  }

  async getAll() {
    // Get all FAQs including inactive (for admin panel)
    let helpCenter = await this.helpCenterModel.findOne().lean();

    if (!helpCenter) {
      helpCenter = await this.helpCenterModel.create({
        faqs: [],
        contactInfo: {},
      });
    }

    const sortedFaqs = (helpCenter.faqs || []).sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );

    return {
      success: true,
      data: {
        faqs: sortedFaqs,
        contactInfo: helpCenter.contactInfo || {},
        updatedAt: helpCenter['updatedAt'] || helpCenter['createdAt'],
      },
    };
  }

  async update(updateDto: UpdateHelpCenterDto) {
    const updateData: any = {};

    if (updateDto.faqs !== undefined) {
      updateData.faqs = updateDto.faqs;
    }

    if (updateDto.contactInfo !== undefined) {
      updateData.contactInfo = updateDto.contactInfo;
    }

    const helpCenter = await this.helpCenterModel
      .findOneAndUpdate(
        {},
        { $set: updateData },
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
        faqs: helpCenter.faqs || [],
        contactInfo: helpCenter.contactInfo || {},
        updatedAt: helpCenter['updatedAt'] || helpCenter['createdAt'],
      },
    };
  }
}
