import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AvailabilityDocument = Availability & Document;

@Schema({ timestamps: true })
export class Availability {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: [String], default: [] })
  timeSlots: string[];

  @Prop({ default: true })
  isAvailable: boolean;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Create index for efficient queries
AvailabilitySchema.index({ doctorId: 1, date: 1 }, { unique: true });

