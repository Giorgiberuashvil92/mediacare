'use client';

import { apiService, Specialization, User } from '@/lib/api';
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
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
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
    specializations: [] as string[],
    degrees: '',
    experience: '',
    consultationFee: '',
    followUpFee: '',
    about: '',
    location: '',
  });

  useEffect(() => {
    const loadSpecializations = async () => {
      try {
        setLoadingSpecializations(true);
        const response = await apiService.getPublicSpecializations();
        if (response.success) {
          setSpecializations(response.data.filter((spec) => spec.isActive));
        }
      } catch (err: any) {
        console.error('Failed to load specializations:', err);
      } finally {
        setLoadingSpecializations(false);
      }
    };
    loadSpecializations();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && user) {
      // Format dateOfBirth - handle both Date objects and ISO strings
      let formattedDateOfBirth = '';
      if (user.dateOfBirth) {
        try {
          const date = typeof user.dateOfBirth === 'string' 
            ? new Date(user.dateOfBirth) 
            : new Date(user.dateOfBirth);
          if (!isNaN(date.getTime())) {
            formattedDateOfBirth = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error('Error parsing dateOfBirth:', e);
        }
      }

      setFormData({
        role: user.role,
        name: user.name || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        dateOfBirth: formattedDateOfBirth,
        gender: user.gender || 'male',
        isVerified: user.isVerified || false,
        isActive: user.isActive !== undefined ? user.isActive : true,
        approvalStatus: user.approvalStatus || 'pending',
        specializations: (user.specialization || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
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
        specializations: [],
        degrees: '',
        experience: '',
        consultationFee: '',
        followUpFee: '',
        about: '',
        location: '',
      });
      setIsPhoneVerified(false);
      setVerificationCode('');
      setVerificationError(null);
    }
  }, [mode, user, isOpen]);

  const handleSpecializationToggle = (specName: string) => {
    setFormData((prev) => {
      const current = prev.specializations;
      if (current.includes(specName)) {
        return { ...prev, specializations: current.filter((s) => s !== specName) };
      } else {
        return { ...prev, specializations: [...current, specName] };
      }
    });
  };

  const handleSendVerificationCode = async () => {
    if (!formData.phone.trim()) {
      setVerificationError('გთხოვთ შეიყვანოთ ტელეფონის ნომერი');
      return;
    }

    try {
      setSendingCode(true);
      setVerificationError(null);
      const response = await apiService.sendPhoneVerificationCode(formData.phone.trim());
      if (response.success) {
        alert('ვერიფიკაციის კოდი გაიგზავნა');
      } else {
        throw new Error(response.message || 'ვერ მოხერხდა კოდის გაგზავნა');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'ვერ მოხერხდა კოდის გაგზავნა');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setVerificationError('გთხოვთ შეიყვანოთ 6-ნიშნა კოდი');
      return;
    }

    try {
      setVerifyingCode(true);
      setVerificationError(null);
      const response = await apiService.verifyPhoneCode(formData.phone.trim(), verificationCode.trim());
      if (response.success && response.verified) {
        setIsPhoneVerified(true);
        setFormData((prev) => ({ ...prev, isVerified: true }));
        alert('ტელეფონი წარმატებით დადასტდა');
      } else {
        throw new Error(response.message || 'არასწორი ვერიფიკაციის კოდი');
      }
    } catch (err: any) {
      setVerificationError(err.message || 'ვერიფიკაცია ვერ მოხერხდა');
    } finally {
      setVerifyingCode(false);
    }
  };

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
        if (!formData.phone) {
          throw new Error('ტელეფონის ნომერი აუცილებელია');
        }
        submitData.password = formData.password;
        // Phone verification temporarily disabled
        // TODO: Re-enable phone verification when SMS service is fully configured
        // For admin-created users, we allow bypassing verification
        // Admin can mark user as verified manually
        // if (isPhoneVerified) {
        //   submitData.isVerified = true;
        // }
      } else if (formData.password) {
        submitData.password = formData.password;
      }

      if (mode === 'edit') {
        submitData.isVerified = formData.isVerified;
        submitData.isActive = formData.isActive;
        submitData.approvalStatus = formData.approvalStatus;
      } else if (formData.role === 'patient') {
        submitData.isActive = formData.isActive;
      }

      if (formData.role === 'doctor') {
        submitData.specialization = formData.specializations
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ') || undefined;
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
              ტელეფონი {mode === 'create' && '*'}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
              }}
              required={mode === 'create'}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            />

            {/* Phone Verification - Temporarily Disabled */}
            {/* TODO: Re-enable phone verification when SMS service is fully configured */}
            {/* {mode === 'create' && formData.phone && !isPhoneVerified && (
              <div className="mt-3 rounded-lg border border-stroke bg-gray-50 p-3 dark:border-dark-3 dark:bg-dark-2">
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                      setVerificationCode(numericValue);
                      setVerificationError(null);
                    }}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1 rounded-lg border border-stroke bg-white px-3 py-2 text-center text-lg font-semibold tracking-widest text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || verificationCode.length !== 6}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {verifyingCode ? '...' : 'დადასტურება'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode}
                  className="w-full rounded-lg border border-primary bg-transparent px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
                >
                  {sendingCode ? 'კოდი იგზავნება...' : 'კოდის გაგზავნა'}
                </button>
                {verificationError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">{verificationError}</p>
                )}
                <p className="mt-2 text-xs text-dark-4 dark:text-dark-6">
                  ნაბიჯი 1: დააჭირეთ "კოდის გაგზავნა" ღილაკს
                  <br />
                  ნაბიჯი 2: შეიყვანეთ SMS-ით მიღებული 6-ნიშნა კოდი
                  <br />
                  <span className="text-primary">შენიშვნა: ადმინებს შეუძლიათ გამოტოვონ ვერიფიკაცია და მომხმარებელი ხელით მონიშნონ დადასტურებულად</span>
                </p>
              </div>
            )} */}
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

          {/* პაციენტის სტატუსი – create mode-ში მხოლოდ აქტიური/არააქტიური */}
          {formData.role === 'patient' && mode === 'create' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                სტატუსი
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: true })}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    formData.isActive
                      ? 'border-primary bg-primary text-white dark:bg-primary dark:text-white'
                      : 'border-stroke bg-transparent text-dark hover:border-primary dark:border-dark-3 dark:text-white dark:hover:border-primary'
                  }`}
                >
                  აქტიური
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: false })}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    !formData.isActive
                      ? 'border-primary bg-primary text-white dark:bg-primary dark:text-white'
                      : 'border-stroke bg-transparent text-dark hover:border-primary dark:border-dark-3 dark:text-white dark:hover:border-primary'
                  }`}
                >
                  არააქტიური
                </button>
              </div>
            </div>
          )}

          {/* Edit mode only fields */}
          {mode === 'edit' && (
            <>
              {/* ექიმის ლიცენზია – ჩანს რედაქტირებაში, გადმოწერადი. ჯერ შეამოწმეთ, შემდეგ „აქტიური“. */}
              {formData.role === 'doctor' && (
                <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    სამედიცინო ლიცენზია
                  </label>
                  {user?.licenseDocument ? (
                    <div className="flex flex-wrap items-center gap-3">
                      {(() => {
                        // Helper function to check if URL is absolute (starts with http:// or https://)
                        const isAbsoluteUrl = (url: string) => {
                          return url && (url.startsWith('http://') || url.startsWith('https://'));
                        };
                        const licenseUrl = isAbsoluteUrl(user.licenseDocument)
                          ? user.licenseDocument
                          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${user.licenseDocument}`;
                        return (
                          <>
                            <a
                              href={licenseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              ლიცენზიის ნახვა
                            </a>
                            <a
                              href={licenseUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        გადმოწერა
                      </a>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      ლიცენზია არ არის ატვირთული. „აქტიურის“ მინიჭებამდე გირჩევნიათ ლიცენზიის შემოწმება.
                    </p>
                  )}
                </div>
              )}

              {/* რედაქტირებისას ყველა მომხმარებლისთვის: დადასტურებული, აქტიური, დამტკიცების სტატუსი */}
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
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  სპეციალიზაცია (მრავალი არჩევანი)
                </label>
                {loadingSpecializations ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
                    <span className="text-sm text-dark-4 dark:text-dark-6">სპეციალიზაციები იტვირთება...</span>
                  </div>
                ) : specializations.length === 0 ? (
                  <div className="rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark-4 dark:border-dark-3 dark:bg-gray-dark dark:text-dark-6">
                    სპეციალიზაციები არ არის ხელმისაწვდომი
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {specializations.map((spec) => {
                      const checked = formData.specializations.includes(spec.name);
                      return (
                        <label
                          key={spec._id}
                          className="flex items-center gap-2 rounded-lg border border-stroke px-3 py-2 text-sm text-dark transition hover:border-primary dark:border-dark-3 dark:text-white dark:hover:border-primary"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleSpecializationToggle(spec.name)}
                            className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                          />
                          <span>{spec.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-xs text-dark-4 dark:text-dark-6">
                  მონიშნე ერთზე მეტი საჭიროების შემთხვევაში.
                </p>
              </div>

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

