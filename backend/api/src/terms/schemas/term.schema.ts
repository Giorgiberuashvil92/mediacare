import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TermDocument = Term & Document;

@Schema({ timestamps: true })
export class Term {
  @Prop({ required: true, enum: ['cancellation', 'service', 'privacy'], unique: true })
  type: string;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const TermSchema = SchemaFactory.createForClass(Term);


