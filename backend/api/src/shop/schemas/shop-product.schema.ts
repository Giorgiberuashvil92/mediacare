import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ShopCategory } from './shop-category.schema';

export enum ShopProductType {
  LABORATORY = 'laboratory',
  EQUIPMENT = 'equipment',
}

@Schema({ timestamps: true, collection: 'shop_products' })
export class ShopProduct {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, unique: true, sparse: true })
  icdCode?: string;

  @Prop({ trim: true, unique: true, sparse: true })
  uniqueCode?: string; // უნიკალური კოდი ლაბორატორიისთვის

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(ShopProductType),
    required: true,
  })
  type: ShopProductType;

  @Prop({ type: Types.ObjectId, ref: ShopCategory.name })
  category?: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  price?: number;

  @Prop({ default: 'GEL' })
  currency?: string;

  @Prop({ type: Number, default: 0 })
  discountPercent?: number;

  @Prop({ type: Number, default: 0 })
  stock?: number;

  @Prop({ trim: true })
  unit?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Number, default: 0 })
  order?: number;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ trim: true })
  clinic?: string;
}

export type ShopProductDocument = ShopProduct & Document;
export const ShopProductSchema = SchemaFactory.createForClass(ShopProduct);
