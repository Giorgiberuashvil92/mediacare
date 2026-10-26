import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AiSubscriptionDocument = AiSubscription & Document;

export enum AiPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum AiSubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Schema({ _id: false })
export class AiPayment {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true, enum: ['pending', 'successful', 'failed'] })
  status: 'pending' | 'successful' | 'failed';

  @Prop({ required: true })
  plan: AiPlan;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, default: 'GEL' })
  currency: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  paidAt?: Date;
}

@Schema({ timestamps: true })
export class AiSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ enum: AiPlan, default: AiPlan.FREE })
  plan: AiPlan;

  @Prop({ enum: AiSubscriptionStatus, default: AiSubscriptionStatus.ACTIVE })
  status: AiSubscriptionStatus;

  @Prop({ default: 10 })
  monthlyLimit: number;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: Date.now })
  periodStart: Date;

  @Prop({ default: Date.now })
  periodEnd: Date;

  @Prop()
  pendingOrderId?: string;

  @Prop()
  savedCardParentOrderId?: string;

  @Prop({ enum: ['none', 'pending', 'active', 'failed'], default: 'none' })
  cardSaveStatus: 'none' | 'pending' | 'active' | 'failed';

  @Prop({ type: [AiPayment], default: [] })
  payments: AiPayment[];

  @Prop()
  cancelledAt?: Date;
}

export const AiSubscriptionSchema = SchemaFactory.createForClass(AiSubscription);
AiSubscriptionSchema.index({ userId: 1 }, { unique: true });
AiSubscriptionSchema.index({ pendingOrderId: 1 }, { sparse: true });
AiSubscriptionSchema.index({ savedCardParentOrderId: 1 }, { sparse: true });
