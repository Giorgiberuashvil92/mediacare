import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PhoneVerificationDocument = PhoneVerification & Document;

@Schema({ timestamps: true })
export class PhoneVerification {
  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  verified: boolean;

  @Prop()
  verifiedAt?: Date;

  @Prop({ default: 0 })
  attempts: number; // Number of verification attempts

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PhoneVerificationSchema = SchemaFactory.createForClass(PhoneVerification);
