import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HelpCenterDocument = HelpCenter & Document;

// FAQ Item subdocument
export class FAQItem {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ enum: ['doctor', 'patient'], required: false })
  role?: 'doctor' | 'patient'; // Role: doctor or patient
}

// Contact Info subdocument
export class ContactInfo {
  @Prop()
  phone?: string;

  @Prop()
  whatsapp?: string;

  @Prop()
  email?: string;

  @Prop()
  website?: string;

  @Prop()
  address?: string;

  @Prop()
  workingHours?: string;
}

@Schema({ timestamps: true })
export class HelpCenter {
  @Prop({ type: [FAQItem], default: [] })
  faqs: FAQItem[];

  @Prop({ type: ContactInfo, default: {} })
  contactInfo: ContactInfo;
}

export const HelpCenterSchema = SchemaFactory.createForClass(HelpCenter);
