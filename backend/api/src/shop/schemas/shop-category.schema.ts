import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ShopCategoryType {
  LABORATORY = 'laboratory',
  EQUIPMENT = 'equipment',
}

@Schema({ timestamps: true, collection: 'shop_categories' })
export class ShopCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({
    type: String,
    enum: Object.values(ShopCategoryType),
    default: ShopCategoryType.EQUIPMENT,
  })
  type: ShopCategoryType;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: ShopCategory.name, default: null })
  parentCategory?: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  order?: number;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export type ShopCategoryDocument = ShopCategory & Document;
export const ShopCategorySchema = SchemaFactory.createForClass(ShopCategory);
