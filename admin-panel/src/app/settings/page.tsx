'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'Medicare',
    adminEmail: 'admin@medicare.com',
    maxAppointmentsPerDay: 20,
    consultationDuration: 30,
    allowCancellation: true,
    cancellationHours: 24,
    emailNotifications: true,
    smsNotifications: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    try {
      setLoading(true);
      // TODO: Implement save settings API call
      // await apiService.updateSettings(settings);
      
      setMessage({ type: 'success', text: 'პარამეტრები წარმატებით შენახულია' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'პარამეტრების შენახვა ვერ მოხერხდა' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="პარამეტრები" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-dark dark:text-white">
              სისტემის პარამეტრები
            </h2>
            <p className="text-dark-4 dark:text-dark-6">
              Medicare სისტემის ძირითადი პარამეტრების მართვა
            </p>
          </div>

          {message && (
            <div className={`mb-4 rounded-lg p-3 text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            {/* General Settings */}
            <div className="rounded-lg border border-stroke p-6 dark:border-dark-3">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                ზოგადი პარამეტრები
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    საიტის სახელი
                  </label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    ადმინის ელ. ფოსტა
                  </label>
                  <input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Appointment Settings */}
            <div className="rounded-lg border border-stroke p-6 dark:border-dark-3">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                ჯავშნების პარამეტრები
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    მაქსიმალური ჯავშნები დღეში
                  </label>
                  <input
                    type="number"
                    value={settings.maxAppointmentsPerDay}
                    onChange={(e) => setSettings({ ...settings, maxAppointmentsPerDay: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    კონსულტაციის ხანგრძლივობა (წუთი)
                  </label>
                  <input
                    type="number"
                    value={settings.consultationDuration}
                    onChange={(e) => setSettings({ ...settings, consultationDuration: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    გაუქმების ვადა (საათი)
                  </label>
                  <input
                    type="number"
                    value={settings.cancellationHours}
                    onChange={(e) => setSettings({ ...settings, cancellationHours: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowCancellation"
                    checked={settings.allowCancellation}
                    onChange={(e) => setSettings({ ...settings, allowCancellation: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="allowCancellation" className="text-sm font-medium text-dark dark:text-white">
                    ჯავშნის გაუქმების ნება
                  </label>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="rounded-lg border border-stroke p-6 dark:border-dark-3">
              <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                შეტყობინებები
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="emailNotifications" className="text-sm font-medium text-dark dark:text-white">
                    ელ. ფოსტის შეტყობინებები
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="smsNotifications"
                    checked={settings.smsNotifications}
                    onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="smsNotifications" className="text-sm font-medium text-dark dark:text-white">
                    SMS შეტყობინებები
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {loading ? 'შენახვა...' : 'პარამეტრების შენახვა'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
