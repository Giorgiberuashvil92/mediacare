import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationPriority,
  NotificationType,
} from '../schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: mongoose.Model<NotificationDocument>,
  ) {}

  /**
   * Create a new notification
   */
  async createNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    userId?: string;
    targetUserId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<NotificationDocument> {
    this.logger.log(`Creating notification: ${data.title}, type: ${data.type}, targetUserId: ${data.targetUserId}`);
    
    const notificationData = {
      ...data,
      priority: data.priority || NotificationPriority.MEDIUM,
      read: false,
      // Explicitly set targetUserId to null if it's null or undefined
      targetUserId: data.targetUserId === undefined ? null : data.targetUserId,
    };
    
    this.logger.log(`Notification data before save:`, {
      type: notificationData.type,
      title: notificationData.title,
      targetUserId: notificationData.targetUserId,
      targetUserIdType: typeof notificationData.targetUserId,
    });
    
    const notification = new this.notificationModel(notificationData);

    const saved = await notification.save();
    this.logger.log(`Notification created with ID: ${saved._id}, targetUserId: ${saved.targetUserId}`);
    return saved;
  }

  /**
   * Get notifications for admin users
   */
  async getNotifications(
    targetUserId?: string,
    options?: {
      limit?: number;
      skip?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    },
  ) {
    const { limit = 50, skip = 0, unreadOnly = false, type } = options || {};

    const filter: any = {};

    // If targetUserId is provided, show only notifications for that user
    // Otherwise, show all notifications (for admin dashboard)
    if (targetUserId) {
      filter.$or = [
        { targetUserId: new mongoose.Types.ObjectId(targetUserId) },
        { targetUserId: null }, // System-wide notifications
        { targetUserId: { $exists: false } }, // Notifications without targetUserId
      ];
      this.logger.log(`Getting notifications for user: ${targetUserId}`);
    } else {
      // For admin dashboard, show all system-wide notifications
      filter.$or = [
        { targetUserId: null },
        { targetUserId: { $exists: false } },
      ];
      this.logger.log('Getting notifications for admin (system-wide)');
    }

    if (unreadOnly) {
      filter.read = false;
    }

    if (type) {
      filter.type = type;
    }
    
    this.logger.log('Notification filter:', JSON.stringify(filter, null, 2));

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .populate('userId', 'name email profileImage role')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      this.notificationModel.countDocuments(filter),
    ]);

    this.logger.log(`Found ${notifications.length} notifications (total: ${total})`);

    const unreadCount = await this.notificationModel.countDocuments({
      ...filter,
      read: false,
    });
    
    this.logger.log(`Unread count: ${unreadCount}`);

    return {
      success: true,
      data: {
        notifications: notifications.map((notif) => ({
          id: (notif._id as any).toString(),
          type: notif.type,
          title: notif.title,
          message: notif.message,
          priority: notif.priority,
          read: notif.read,
          readAt: notif.readAt,
          userId: notif.userId
            ? {
                id: (notif.userId as any)._id?.toString() || (notif.userId as any).id,
                name: (notif.userId as any).name,
                email: (notif.userId as any).email,
                profileImage: (notif.userId as any).profileImage,
                role: (notif.userId as any).role,
              }
            : null,
          metadata: notif.metadata,
          createdAt: notif.createdAt,
          updatedAt: notif.updatedAt,
        })),
        pagination: {
          total,
          limit,
          skip,
          totalPages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(notificationId, {
      read: true,
      readAt: new Date(),
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(targetUserId?: string): Promise<void> {
    const filter: any = { read: false };

    if (targetUserId) {
      filter.$or = [
        { targetUserId: new mongoose.Types.ObjectId(targetUserId) },
        { targetUserId: null },
        { targetUserId: { $exists: false } },
      ];
    } else {
      filter.$or = [
        { targetUserId: null },
        { targetUserId: { $exists: false } },
      ];
    }

    await this.notificationModel.updateMany(filter, {
      read: true,
      readAt: new Date(),
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationModel.findByIdAndDelete(notificationId);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(targetUserId?: string): Promise<number> {
    const filter: any = { read: false };

    if (targetUserId) {
      filter.$or = [
        { targetUserId: new mongoose.Types.ObjectId(targetUserId) },
        { targetUserId: null },
        { targetUserId: { $exists: false } },
      ];
    } else {
      filter.$or = [
        { targetUserId: null },
        { targetUserId: { $exists: false } },
      ];
    }

    return this.notificationModel.countDocuments(filter);
  }
}
