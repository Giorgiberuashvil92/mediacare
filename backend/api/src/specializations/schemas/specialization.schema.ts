import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SpecializationDocument = Specialization & Document;

@Schema({ timestamps: true })
export class Specialization {
  /** Georgian — canonical key for doctor.specialization matching */
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  nameEn?: string;

  @Prop({ trim: true })
  nameRu?: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  symptoms?: string[];
}

export const SpecializationSchema =
  SchemaFactory.createForClass(Specialization);
