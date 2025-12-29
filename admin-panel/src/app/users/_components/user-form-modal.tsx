'use client';

import { apiService, User } from '@/lib/api';
import { useEffect, useState } from 'react';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
  mode: 'create' | 'edit';
}

export default function UserFormModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  mode,
}: UserFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: 'patient' as 'patient' | 'doctor' | 'admin',
    name: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    isVerified: false,
    isActive: true,
    approvalStatus: 'pending' as 'pending' | 'approved' | 'rejected',
    // Doctor specific
    specialization: '',
    degrees: '',
    experience: '',
    consultationFee: '',
    followUpFee: '',
    about: '',
    location: '',
  });

  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        role: user.role,
        name: user.name || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split('T')[0]
          : '',
        gender: user.gender || 'male',
        isVerified: user.isVerified || false,
        isActive: user.isActive !== undefined ? user.isActive : true,
        approvalStatus: user.approvalStatus || 'pending',
        specialization: user.specialization || '',
        degrees: user.degrees || '',
        experience: user.experience || '',
        consultationFee: user.consultationFee?.toString() || '',
        followUpFee: user.followUpFee?.toString() || '',
        about: user.about || '',
        location: user.location || '',
      });
    } else {
      // Reset form for create mode
      setFormData({
        role: 'patient',
        name: '',
        email: '',
        password: '',
        phone: '',
        dateOfBirth: '',
        gender: 'male',
        isVerified: false,
        isActive: true,
        approvalStatus: 'pending',
        specialization: '',
        degrees: '',
        experience: '',
        consultationFee: '',
        followUpFee: '',
        about: '',
        location: '',
      });
    }
  }, [mode, user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const submitData: any = {
        role: formData.role,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
      };

      if (mode === 'create') {
        if (!formData.password) {
          throw new Error('პაროლი აუცილებელია');
        }
        submitData.password = formData.password;
      } else if (formData.password) {
        submitData.password = formData.password;
      }

      if (mode === 'edit') {
        submitData.isVerified = formData.isVerified;
        submitData.isActive = formData.isActive;
        submitData.approvalStatus = formData.approvalStatus;
      }

      if (formData.role === 'doctor') {
        submitData.specialization = formData.specialization || undefined;
        submitData.degrees = formData.degrees || undefined;
        submitData.experience = formData.experience || undefined;
        submitData.consultationFee = formData.consultationFee
          ? parseFloat(formData.consultationFee)
          : undefined;
        submitData.followUpFee = formData.followUpFee
          ? parseFloat(formData.followUpFee)
          : undefined;
        submitData.about = formData.about || undefined;
        submitData.location = formData.location || undefined;
      }

      if (mode === 'create') {
        await apiService.createUser(submitData);
      } else if (user) {
        await apiService.updateUser(user.id, submitData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'შეცდომა მოხდა');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-dark">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            {mode === 'create' ? 'ახალი მომხმარებლის დამატება' : 'მომხმარებლის რედაქტირება'}
          </h2>
          <button
            onClick={onClose}
            className="text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              როლი *
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as 'patient' | 'doctor' })
              }
              required
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            >
              <option value="patient">პაციენტი</option>
              <option value="doctor">ექიმი</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              სახელი *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              ელ. ფოსტა *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              პაროლი {mode === 'create' ? '*' : '(დატოვე ცარიელი შეცვლის გარეშე)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={mode === 'create'}
              minLength={6}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              ტელეფონი
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              დაბადების თარიღი
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              სქესი
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })
              }
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            >
              <option value="male">კაცი</option>
              <option value="female">ქალი</option>
              <option value="other">სხვა</option>
            </select>
          </div>

          {/* Edit mode only fields */}
          {mode === 'edit' && (
            <>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(e) =>
                      setFormData({ ...formData, isVerified: e.target.checked })
                    }
                    className="rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                  />
                  <span className="text-sm text-dark dark:text-white">დადასტურებული</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                  />
                  <span className="text-sm text-dark dark:text-white">აქტიური</span>
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  დამტკიცების სტატუსი
                </label>
                <select
                  value={formData.approvalStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      approvalStatus: e.target.value as 'pending' | 'approved' | 'rejected',
                    })
                  }
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                >
                  <option value="pending">მოლოდინში</option>
                  <option value="approved">დამტკიცებული</option>
                  <option value="rejected">უარყოფილი</option>
                </select>
              </div>
            </>
          )}

          {/* Doctor specific fields */}
          {formData.role === 'doctor' && (
            <>
              {/* <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  სპეციალიზაცია
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) =>
                    setFormData({ ...formData, specialization: e.target.value })
                  }
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                />
              </div> */}

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  ხარისხი
                </label>
                <input
                  type="text"
                  value={formData.degrees}
                  onChange={(e) => setFormData({ ...formData, degrees: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  გამოცდილება
                </label>
                <input
                  type="text"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    კონსულტაციის საფასური
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.consultationFee}
                    onChange={(e) =>
                      setFormData({ ...formData, consultationFee: e.target.value })
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    განმეორებითი ვიზიტის საფასური
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.followUpFee}
                    onChange={(e) =>
                      setFormData({ ...formData, followUpFee: e.target.value })
                    }
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  მისამართი
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  შესახებ
                </label>
                <textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stroke px-4 py-2 text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'შენახვა...' : 'შენახვა'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

