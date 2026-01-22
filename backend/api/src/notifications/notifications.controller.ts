import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationPriority } from '../schemas/notification.schema';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import * as mongoose from 'mongoose';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
  ) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: NotificationType,
  ) {
    // Get user from database to check role
    const dbUser = await this.userModel.findById(user.sub);
    // For admin users, show all system-wide notifications (targetUserId: null)
    // For other users, show notifications targeted to them
    const targetUserId = dbUser?.role === 'admin' ? undefined : user.sub;
    return this.notificationsService.getNotifications(targetUserId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      unreadOnly: unreadOnly === 'true',
      type,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    // Get user from database to check role
    const dbUser = await this.userModel.findById(user.sub);
    // For admin users, show all system-wide notifications (targetUserId: null)
    // For other users, show notifications targeted to them
    const targetUserId = dbUser?.role === 'admin' ? undefined : user.sub;
    const count = await this.notificationsService.getUnreadCount(targetUserId);
    return {
      success: true,
      data: { count },
    };
  }

  @Post('mark-read/:id')
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Post('mark-all-read')
  async markAllAsRead(@CurrentUser() user: any) {
    // Get user from database to check role
    const dbUser = await this.userModel.findById(user.sub);
    // For admin users, mark all system-wide notifications as read
    // For other users, mark their notifications as read
    const targetUserId = dbUser?.role === 'admin' ? undefined : user.sub;
    await this.notificationsService.markAllAsRead(targetUserId);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  // DEV ONLY: Test endpoint to create a notification
  @Post('test-create')
  @UseGuards(JwtAuthGuard)
  async testCreateNotification(@CurrentUser() user: any) {
    const notification = await this.notificationsService.createNotification({
      type: NotificationType.USER_REGISTERED,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system works',
      priority: NotificationPriority.HIGH,
      userId: user.sub,
      targetUserId: null,
      metadata: {
        test: true,
        createdAt: new Date(),
      },
    });
    return {
      success: true,
      message: 'Test notification created',
      data: {
        notificationId: notification._id,
        title: notification.title,
        targetUserId: notification.targetUserId,
      },
    };
  }
}
