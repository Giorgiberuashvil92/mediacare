"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiService, Notification as NotificationType } from "@/lib/api";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "./icons";

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications({ limit: 10, unreadOnly: false });
      if (response.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadNotificationCount();
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
      if (isOpen) {
        loadNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

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
    return date.toLocaleDateString('ka-GE');
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
      default:
        return '🔔';
    }
  };

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={(open) => {
        setIsOpen(open);
        if (open) {
          loadNotifications();
        }
      }}
    >
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="View Notifications"
      >
        <span className="relative">
          <BellIcon />

          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute right-0 top-0 z-1 flex size-5 items-center justify-center rounded-full bg-red-light text-xs font-bold text-white ring-2 ring-gray-2 dark:ring-dark-3",
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className={cn(
          "border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-gray-dark",
          "w-[min(24rem,calc(100vw-2rem))] max-w-[24rem]",
          "p-3 sm:p-3.5",
          "rounded-xl sm:rounded-lg"
        )}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 py-0.5 sm:mb-1 sm:px-2 sm:py-1.5">
          <span className="text-base font-semibold text-dark dark:text-white sm:text-lg sm:font-medium">
            შეტყობინებები
          </span>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-white">
                {unreadCount} ახალი
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleMarkAllAsRead();
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                ყველას წაკითხვა
              </button>
            </div>
          )}
        </div>

        {loading && notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-dark-4 dark:text-dark-6 sm:py-8">
            იტვირთება...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-dark-4 dark:text-dark-6 sm:py-8">
            შეტყობინებები არ არის
          </div>
        ) : (
          <ul
            className={cn(
              "mb-3 space-y-1.5 overflow-y-auto overflow-x-hidden",
              "max-h-[min(23rem,60vh)] overscroll-contain",
              "pr-0.5 [-webkit-overflow-scrolling:touch]"
            )}
          >
            {notifications.map((notification) => (
              <li
                key={notification.id}
                role="menuitem"
                onClick={() => {
                  if (!notification.read) {
                    handleMarkAsRead(notification.id);
                  }
                }}
              >
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-start gap-2 rounded-lg px-2 py-2.5 outline-none transition-colors hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3 sm:gap-3",
                    !notification.read && "bg-blue-light-5 dark:bg-dark-2"
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-2 text-base dark:bg-dark-3 sm:size-10 sm:text-lg">
                    {notification.userId?.profileImage ? (
                      <Image
                        src={notification.userId.profileImage}
                        className="size-9 rounded-full object-cover sm:size-10"
                        width={40}
                        height={40}
                        alt={notification.userId.name ?? ""}
                      />
                    ) : (
                      <span>{getNotificationIcon(notification.type)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <strong
                        className={cn(
                          "block text-sm font-medium leading-snug",
                          !notification.read
                            ? "text-dark dark:text-white"
                            : "text-dark-4 dark:text-dark-6"
                        )}
                      >
                        {notification.title}
                      </strong>
                      {!notification.read && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>

                    <p
                      className={cn(
                        "mt-0.5 line-clamp-2 break-words text-xs",
                        !notification.read
                          ? "font-medium text-dark-5 dark:text-dark-6"
                          : "text-dark-4 dark:text-dark-7"
                      )}
                    >
                      {notification.message}
                    </p>

                    <span className="mt-1 block text-xs text-dark-4 dark:text-dark-7">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/notifications"
          onClick={() => setIsOpen(false)}
          className="block w-full rounded-lg border border-primary p-2.5 text-center text-sm font-medium tracking-wide text-primary outline-none transition-colors hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7 sm:p-2"
        >
          ყველა შეტყობინების ნახვა
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
