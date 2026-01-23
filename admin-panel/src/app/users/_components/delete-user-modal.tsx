'use client';

import React from 'react';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hardDelete: boolean) => void;
  userName: string;
  userEmail: string;
  isDeleting: boolean;
}

export default function DeleteUserModal({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userEmail,
  isDeleting,
}: DeleteUserModalProps) {
  const [hardDelete, setHardDelete] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-dark">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-dark dark:text-white">
            მომხმარებლის წაშლა
          </h2>
        </div>

        <div className="mb-6">
          <p className="mb-4 text-sm text-dark-4 dark:text-dark-6">
            დარწმუნებული ხართ რომ გსურთ მომხმარებლის წაშლა?
          </p>
          <div className="rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-2">
            <p className="font-medium text-dark dark:text-white">{userName}</p>
            <p className="text-sm text-dark-4 dark:text-dark-6">{userEmail}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={hardDelete}
              onChange={(e) => setHardDelete(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-dark dark:text-white">
                სრული წაშლა (Hard Delete)
              </span>
              <p className="mt-1 text-xs text-dark-4 dark:text-dark-6">
                თუ მონიშნულია, მომხმარებელი სრულად წაიშლება ბაზიდან. თუ არა, მხოლოდ
                დეაქტივაცია მოხდება (soft delete). სრული წაშლა შეუძლებელია, თუ
                მომხმარებელს აქვს აქტიური ვიზიტები.
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-stroke px-4 py-2 text-dark transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={() => onConfirm(hardDelete)}
            disabled={isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isDeleting ? 'წაშლა...' : hardDelete ? 'სრული წაშლა' : 'დეაქტივაცია'}
          </button>
        </div>
      </div>
    </div>
  );
}
