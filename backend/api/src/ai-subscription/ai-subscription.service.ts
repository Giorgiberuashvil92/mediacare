import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { HeraUsersService } from '../integrations/hera-users.service';
import { PaymentService } from '../payment/payment.service';
import {
  AiPlan,
  AiSubscription,
  AiSubscriptionDocument,
  AiSubscriptionStatus,
} from './schemas/ai-subscription.schema';

const PLANS = {
  free: { amount: 0, monthlyLimit: 10 },
  standard: { amount: 20, monthlyLimit: 20 },
  premium: { amount: 50, monthlyLimit: 50 },
} as const;

@Injectable()
export class AiSubscriptionService {
  constructor(
    @InjectModel(AiSubscription.name)
    private readonly subscriptionModel: Model<AiSubscriptionDocument>,
    private readonly paymentService: PaymentService,
    private readonly heraUsersService: HeraUsersService,
  ) {}

  private async getOrCreate(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }
    return this.subscriptionModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          plan: AiPlan.FREE,
          status: AiSubscriptionStatus.ACTIVE,
          monthlyLimit: PLANS.free.monthlyLimit,
          usageCount: 0,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          payments: [],
        },
      },
      { upsert: true, new: true },
    );
  }

  async getStatus(userId: string) {
    const subscription = await this.getOrCreate(userId);
    const now = new Date();
    if (
      subscription.plan !== AiPlan.FREE &&
      subscription.status === AiSubscriptionStatus.ACTIVE &&
      subscription.periodEnd < now
    ) {
      subscription.status = AiSubscriptionStatus.EXPIRED;
      subscription.plan = AiPlan.FREE;
      subscription.monthlyLimit = PLANS.free.monthlyLimit;
      subscription.usageCount = 0;
      await subscription.save();
      void this.heraUsersService.safeUpdateSubscription({
        userId,
        tier: AiPlan.FREE,
        status: 'inactive',
        expiresAt: now,
      });
    }
    return this.toResponse(subscription);
  }

  async createCheckout(userId: string, plan: 'standard' | 'premium') {
    const subscription = await this.getOrCreate(userId);
    const selected = PLANS[plan];
    const orderId = `ai_${userId}_${Date.now()}`;
    const callbackUrl =
      process.env.BOG_CALLBACK_URL ||
      'https://mediacare-production.up.railway.app/payment/callback';
    const payment = await this.paymentService.createPaymentOrder({
      amount: selected.amount,
      currency: 'GEL',
      orderId,
      description: `Medicare AI Assistant ${plan}`,
      callbackUrl,
      captureMethod: 'AUTO',
    });

    if (!payment.success || !payment.paymentUrl || !payment.orderId) {
      throw new BadRequestException(payment.error || 'Could not create payment order');
    }

    subscription.pendingOrderId = payment.orderId;
    subscription.savedCardParentOrderId = payment.orderId;
    subscription.cardSaveStatus = 'pending';
    subscription.payments = [
      ...(subscription.payments || []).filter((item) => item.orderId !== payment.orderId),
      {
        orderId: payment.orderId,
        status: 'pending',
        plan: plan as AiPlan,
        amount: selected.amount,
        currency: 'GEL',
        createdAt: new Date(),
      },
    ];
    await subscription.save();

    const savedCard = await this.paymentService.saveCardForAutomaticPayments(payment.orderId);
    if (!savedCard.success) {
      const failedAttempt = subscription.payments?.find((item) => item.orderId === payment.orderId);
      if (failedAttempt) failedAttempt.status = 'failed';
      subscription.cardSaveStatus = 'failed';
      subscription.pendingOrderId = undefined;
      await subscription.save();
      throw new BadRequestException(savedCard.error || 'Could not save card for subscription');
    }

    return { success: true, orderId: payment.orderId, paymentUrl: payment.paymentUrl };
  }

  async handlePayment(orderId: string, status?: string) {
    const subscription = await this.subscriptionModel.findOne({ pendingOrderId: orderId });
    if (!subscription) return { success: true, matched: false };

    const payment = subscription.payments?.find((item) => item.orderId === orderId);
    if (!payment) return { success: true, matched: false };

    const normalized = String(status || '').toLowerCase();
    const successful = ['success', 'succeeded', 'completed', 'paid', 'order_paid'].includes(normalized);
    payment.status = successful ? 'successful' : 'failed';

    if (successful) {
      const selected = PLANS[payment.plan];
      const now = new Date();
      subscription.plan = payment.plan;
      subscription.status = AiSubscriptionStatus.ACTIVE;
      subscription.monthlyLimit = selected.monthlyLimit;
      subscription.usageCount = 0;
      subscription.periodStart = now;
      subscription.periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      subscription.cancelledAt = undefined;
      subscription.savedCardParentOrderId = payment.orderId;
      subscription.cardSaveStatus = 'active';
      payment.paidAt = now;
      subscription.pendingOrderId = undefined;
      void this.heraUsersService.safeUpdateSubscription({
        userId: subscription.userId.toString(),
        tier: payment.plan,
        status: 'active',
        expiresAt: subscription.periodEnd,
        externalId: payment.orderId,
      });
    } else {
      subscription.cardSaveStatus = 'failed';
    }

    await subscription.save();
    return { success: true, matched: true, activated: successful };
  }

  async cancel(userId: string) {
    const subscription = await this.getOrCreate(userId);
    if (subscription.plan === AiPlan.FREE) return this.toResponse(subscription);
    // Cancellation takes effect at the end of the paid period. The user keeps
    // access until periodEnd and can be shown as scheduled for cancellation.
    subscription.status = AiSubscriptionStatus.ACTIVE;
    subscription.cancelledAt = new Date();
    await subscription.save();
    void this.heraUsersService.safeUpdateSubscription({
      userId,
      tier: subscription.plan,
      status: 'active',
      expiresAt: subscription.periodEnd,
    });
    return this.toResponse(subscription);
  }

  async consume(userId: string) {
    const subscription = await this.getOrCreate(userId);
    const status = await this.getStatus(userId);
    if (status.status !== AiSubscriptionStatus.ACTIVE || status.usageRemaining <= 0) {
      return { allowed: false, subscription: status };
    }
    const updated = await this.subscriptionModel.findOneAndUpdate(
      { _id: subscription._id, usageCount: { $lt: status.monthlyLimit } },
      { $inc: { usageCount: 1 } },
      { new: true },
    );
    if (!updated) return { allowed: false, subscription: await this.getStatus(userId) };
    return { allowed: true, subscription: this.toResponse(updated) };
  }

  async listPayments(userId: string) {
    const subscription = await this.getOrCreate(userId);
    return { success: true, data: [...(subscription.payments || [])].reverse() };
  }

  private toResponse(subscription: AiSubscriptionDocument) {
    const expired = subscription.periodEnd < new Date() && subscription.plan !== AiPlan.FREE;
    const usageRemaining = Math.max(subscription.monthlyLimit - subscription.usageCount, 0);
    return {
      plan: expired ? AiPlan.FREE : subscription.plan,
      status: expired ? AiSubscriptionStatus.EXPIRED : subscription.status,
      monthlyLimit: subscription.monthlyLimit,
      usageCount: subscription.usageCount,
      usageRemaining,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      cancelledAt: subscription.cancelledAt,
      cardSaveStatus: subscription.cardSaveStatus,
    };
  }
}
