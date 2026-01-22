'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService, Notification } from '@/lib/api';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications({
        limit,
        skip: (page - 1) * limit,
        unreadOnly: filter === 'unread',
      });
      if (response.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [page, filter]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [page, filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId
            ? { ...notif, read: true, readAt: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'ახლახან';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} წუთის წინ`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} საათის წინ`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} დღის წინ`;
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'user_registered':
        return '👤';
      case 'doctor_approved':
        return '✅';
      case 'doctor_rejected':
        return '❌';
      case 'appointment_created':
        return '📅';
      case 'appointment_cancelled':
        return '🚫';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'user_registered':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'doctor_approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'doctor_rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'appointment_created':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <>
      <Breadcrumb pageName="შეტყობინებები" />

      <div className="rounded-lg border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-dark dark:text-white sm:text-2xl">
              შეტყობინებები
            </h2>
            <p className="mt-1 text-sm text-dark-4 dark:text-dark-6">
              {unreadCount > 0
                ? `${unreadCount} წაუკითხავი შეტყობინება`
                : 'ყველა შეტყობინება წაკითხულია'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filter */}
            <div className="flex rounded-lg border border-stroke bg-gray-2 p-1 dark:border-dark-3 dark:bg-dark-2">
              <button
                onClick={() => {
                  setFilter('all');
                  setPage(1);
                }}
                className={`rounded px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  filter === 'all'
                    ? 'bg-white text-dark shadow-sm dark:bg-dark-3 dark:text-white'
                    : 'text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white'
                }`}
              >
                ყველა
              </button>
              <button
                onClick={() => {
                  setFilter('unread');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                  filter === 'unread'
                    ? 'bg-white text-dark shadow-sm dark:bg-dark-3 dark:text-white'
                    : 'text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white'
                }`}
              >
                წაუკითხავი
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="w-full rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white dark:border-primary dark:text-primary dark:hover:bg-primary dark:hover:text-white sm:w-auto"
              >
                ყველას წაკითხვა
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="py-10 text-center sm:py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-dark-4 dark:text-dark-6">იტვირთება...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center sm:py-12">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-gray-2 dark:bg-dark-2 sm:size-16">
              <span className="text-2xl sm:text-3xl">🔔</span>
            </div>
            <p className="text-base font-medium text-dark dark:text-white sm:text-lg">
              შეტყობინებები არ არის
            </p>
            <p className="mt-1 text-sm text-dark-4 dark:text-dark-6">
              {filter === 'unread'
                ? 'ყველა შეტყობინება წაკითხულია'
                : 'ჯერ არ არის შეტყობინებები'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group rounded-lg border p-3 transition-all sm:p-4 ${
                    notification.read
                      ? 'border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark'
                      : 'border-primary/30 bg-blue-light-5 dark:border-primary/20 dark:bg-dark-2'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Avatar/Icon */}
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-2 text-xl dark:bg-dark-3 sm:size-12 sm:text-2xl">
                      {notification.userId?.profileImage ? (
                        <Image
                          src={notification.userId.profileImage}
                          className="size-10 rounded-full object-cover sm:size-12"
                          width={48}
                          height={48}
                          alt={notification.userId.name ?? ''}
                        />
                      ) : (
                        <span>{getNotificationIcon(notification.type)}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`text-sm font-semibold sm:text-base ${
                                notification.read
                                  ? 'text-dark-4 dark:text-dark-6'
                                  : 'text-dark dark:text-white'
                              }`}
                            >
                              {notification.title}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getNotificationColor(
                                notification.type
                              )}`}
                            >
                              {notification.type === 'user_registered' && 'რეგისტრაცია'}
                              {notification.type === 'doctor_approved' && 'დამტკიცება'}
                              {notification.type === 'doctor_rejected' && 'უარყოფა'}
                              {notification.type === 'appointment_created' && 'ჯავშანი'}
                              {notification.type === 'appointment_cancelled' && 'გაუქმება'}
                            </span>
                            {!notification.read && (
                              <span className="size-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>

                          <p
                            className={`mt-1 break-words text-sm ${
                              notification.read
                                ? 'text-dark-4 dark:text-dark-7'
                                : 'text-dark-5 dark:text-dark-6'
                            }`}
                          >
                            {notification.message}
                          </p>

                          {notification.userId && (
                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-dark-4 dark:text-dark-7">
                              <span className="shrink-0">მომხმარებელი:</span>
                              <span className="font-medium">{notification.userId.name}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="min-w-0 truncate sm:max-w-[12rem]">
                                {notification.userId.email}
                              </span>
                              {notification.userId.role && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span className="capitalize">
                                    {notification.userId.role === 'doctor' ? 'ექიმი' : 'პაციენტი'}
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dark-4 dark:text-dark-7">
                            <span>{formatTime(notification.createdAt)}</span>
                            {notification.priority === 'high' && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                მაღალი პრიორიტეტი
                              </span>
                            )}
                          </div>
                        </div>

                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="w-full shrink-0 rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-dark-4 transition-opacity hover:bg-gray-2 group-hover:opacity-100 dark:border-dark-3 dark:text-dark-6 dark:hover:bg-dark-3 sm:w-auto sm:opacity-0"
                          >
                            წაკითხვა
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-dark transition-colors disabled:opacity-50 dark:border-dark-3 dark:text-white sm:px-4"
                >
                  წინა
                </button>
                <span className="min-w-[6rem] text-center text-sm text-dark-4 dark:text-dark-6">
                  გვერდი {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-dark transition-colors disabled:opacity-50 dark:border-dark-3 dark:text-white sm:px-4"
                >
                  შემდეგი
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
