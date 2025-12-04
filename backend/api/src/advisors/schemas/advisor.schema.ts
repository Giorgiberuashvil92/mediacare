import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdvisorDocument = Advisor & Document;

@Schema({ timestamps: true })
export class Advisor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  specialization?: string;

  @Prop()
  bio?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number; // For sorting advisors

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AdvisorSchema = SchemaFactory.createForClass(Advisor);
