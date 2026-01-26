'use client';

import { EmailIcon, PasswordIcon, UserIcon } from '@/assets/icons';
import InputGroup from '@/components/FormElements/InputGroup';
import { apiService, Specialization } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';

interface AddDoctorFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddDoctorForm({ onSuccess, onCancel }: AddDoctorFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specializations: [] as string[],
    degrees: '',
    experience: '',
    about: '',
    location: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isLoadingSpecializations, setIsLoadingSpecializations] = useState(false);
  const [showLicenseInfoModal, setShowLicenseInfoModal] = useState(false);

  useEffect(() => {
    const loadSpecializations = async () => {
      try {
        setIsLoadingSpecializations(true);
        const response = await apiService.getPublicSpecializations();
        if (response.success) {
          setSpecializations(response.data);
        }
      } catch (err) {
        console.error('Failed to load specializations', err);
        setSpecializations([]);
      } finally {
        setIsLoadingSpecializations(false);
      }
    };

    loadSpecializations();
  }, []);

  const activeSpecializations = useMemo(
    () => specializations.filter((spec) => spec.isActive),
    [specializations],
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSpecializationToggle = (value: string) => {
    setFormData((prev) => {
      const exists = prev.specializations.includes(value);
      const next = exists
        ? prev.specializations.filter((v) => v !== value)
        : [...prev.specializations, value];
      return { ...prev, specializations: next };
    });
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLicenseFile(file ?? null);
    setError(null);
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setProfileImageFile(file ?? null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (formData.specializations.length === 0) {
      setError('აირჩიე მინიმუმ ერთი სპეციალიზაცია.');
      return;
    }

    if (!licenseFile) {
      setError('გთხოვთ ატვირთოთ ექიმის სამედიცინო ლიცენზია (PDF).');
      return;
    }

    setLoading(true);

    try {
      let licenseDocumentPath: string | undefined;
      let profileImageUrl: string | undefined;

      const uploadResponse = await apiService.uploadLicenseDocument(licenseFile);
      if (uploadResponse.success) {
        licenseDocumentPath = uploadResponse.data.filePath;
      }

      if (profileImageFile) {
        const imageResponse = await apiService.uploadProfileImage(profileImageFile);
        if (imageResponse.success) {
          profileImageUrl = imageResponse.data.url;
        }
      }

      const registerData = {
        role: 'doctor' as const,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        specialization: formData.specializations.join(', ') || undefined,
        degrees: formData.degrees || undefined,
        experience: formData.experience || undefined,
        about: formData.about || undefined,
        location: formData.location || undefined,
        licenseDocument: licenseDocumentPath,
        profileImage: profileImageUrl,
      };

      const response = await apiService.apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
      });

      if (response.success) {
        const successMessage = response.message || 'ექიმი წარმატებით დაემატა';
        setSuccess(successMessage);
        
        setFormData({
          name: '',
          email: '',
          password: '',
          phone: '',
          specializations: [],
          degrees: '',
          experience: '',
          about: '',
          location: '',
          dateOfBirth: '',
          gender: 'male',
        });
        setLicenseFile(null);
        setProfileImageFile(null);
        
        // Call onSuccess after a short delay to show success message
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'ექიმის დამატება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="p-6">
        <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">
          ახალი ექიმის დამატება
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <InputGroup
              className="w-full sm:w-1/2"
              type="text"
              name="name"
              label="სრული სახელი"
              placeholder="დოქტორი გიორგი ბერიძე"
              value={formData.name}
              handleChange={handleChange}
              icon={<UserIcon />}
              iconPosition="left"
              height="sm"
              required
            />

            <InputGroup
              className="w-full sm:w-1/2"
              type="email"
              name="email"
              label="ელ. ფოსტა"
              placeholder="doctor@example.com"
              value={formData.email}
              handleChange={handleChange}
              icon={<EmailIcon />}
              iconPosition="left"
              height="sm"
              required
            />
          </div>

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <InputGroup
              className="w-full sm:w-1/2"
              type="password"
              name="password"
              label="პაროლი"
              placeholder="შეიყვანე პაროლი"
              value={formData.password}
              handleChange={handleChange}
              icon={<PasswordIcon />}
              iconPosition="left"
              height="sm"
              required
            />

            <InputGroup
              className="w-full sm:w-1/2"
              type="text"
              name="phone"
              label="ტელეფონი"
              placeholder="+995 555 123 456"
              value={formData.phone}
              handleChange={handleChange}
              height="sm"
            />
          </div>

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                სპეციალიზაცია (აირჩიე ერთზე მეტი)
              </label>
              {isLoadingSpecializations ? (
                <div className="rounded-lg border border-dashed border-stroke px-5 py-3 text-sm text-dark-4 dark:border-dark-3 dark:text-dark-6">
                  სპეციალიზაციები იტვირთება...
                </div>
              ) : activeSpecializations.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activeSpecializations.map((spec) => {
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
              ) : (
                <div className="rounded-lg border border-dashed border-stroke px-5 py-3 text-sm text-dark-4 dark:border-dark-3 dark:text-dark-6">
                  სპეციალიზაციები არ არის ხელმისაწვდომი. ჯერ შექმენი ერთი.
                </div>
              )}
              <p className="mt-2 text-xs text-dark-4 dark:text-dark-6">
                მინიმუმ ერთი მაინც მონიშნე.
              </p>
            </div>

            <InputGroup
              className="w-full sm:w-1/2"
              type="text"
              name="degrees"
              label="ხარისხი"
              placeholder="MD, PhD"
              value={formData.degrees}
              handleChange={handleChange}
              height="sm"
            />
          </div>

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <InputGroup
              className="w-full sm:w-1/2"
              type="text"
              name="experience"
              label="გამოცდილება"
              placeholder="10 წელი"
              value={formData.experience}
              handleChange={handleChange}
              height="sm"
            />

            <InputGroup
              className="w-full sm:w-1/2"
              type="text"
              name="location"
              label="მდებარეობა"
              placeholder="თბილისი, საქართველო"
              value={formData.location}
              handleChange={handleChange}
              height="sm"
            />
          </div>

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <InputGroup
              className="w-full sm:w-1/2"
              type="date"
              name="dateOfBirth"
              label="დაბადების თარიღი"
              placeholder="DD/MM/YYYY"
              value={formData.dateOfBirth}
              handleChange={handleChange}
              height="sm"
            />

            <div className="w-full sm:w-1/2">
              <div className="mb-2.5 flex items-center gap-2">
                <label className="block text-sm font-medium text-dark dark:text-white">
                  სამედიცინო ლიცენზია (PDF)
                </label>
                <button
                  type="button"
                  onClick={() => setShowLicenseInfoModal(true)}
                  className="text-primary hover:text-primary/80 focus:outline-none"
                  title="ინფორმაცია"
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                required
                className="block w-full cursor-pointer rounded-lg border border-stroke bg-transparent px-5 py-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
              />
              {licenseFile && (
                <p className="mt-2 text-sm text-dark-4 dark:text-dark-6">
                  არჩეული: {licenseFile.name}
                </p>
              )}
            </div>
          </div>

          <div className="mb-5.5">
            <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
              პროფილის სურათი (არასავალდებულო)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleProfileImageChange}
              className="block w-full cursor-pointer rounded-lg border border-dashed border-stroke px-4 py-3 text-sm text-dark outline-none transition hover:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
            />
            {profileImageFile && (
              <p className="mt-2 text-sm text-dark-4 dark:text-dark-6">
                არჩეული: {profileImageFile.name}
              </p>
            )}
          </div>

          <div className="mb-5.5">
            <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
              სქესი
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            >
              <option value="male">კაცი</option>
              <option value="female">ქალი</option>
              <option value="other">სხვა</option>
            </select>
          </div>

          <div className="mb-5.5">
            <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
              შესახებ
            </label>
            <textarea
              name="about"
              value={formData.about}
              onChange={handleChange}
              rows={6}
              placeholder="დაწერე ექიმის შესახებ..."
              className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3">
            {onCancel && (
              <button
                className="rounded-lg border border-stroke px-6 py-[7px] font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
                type="button"
                onClick={onCancel}
                disabled={loading}
              >
                გაუქმება
              </button>
            )}

            <button
              className="rounded-lg bg-primary px-6 py-[7px] font-medium text-gray-2 hover:bg-opacity-90 disabled:opacity-50"
              type="submit"
              disabled={loading || activeSpecializations.length === 0}
            >
              {loading ? 'დამატება...' : 'ექიმის დამატება'}
            </button>
          </div>
        </form>
      </div>

      {/* License Info Modal */}
      {showLicenseInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-dark">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                სამედიცინო ლიცენზიის ატვირთვის ინფორმაცია
              </h3>
              <button
                onClick={() => setShowLicenseInfoModal(false)}
                className="text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-6 w-6 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      მნიშვნელოვანი ინფორმაცია
                    </p>
                    <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      ლიცენზია იტვირთება მხოლოდ ერთხელ. გთხოვთ, ყურადღებით შეამოწმოთ არჩეული ფაილი სანამ ატვირთვას დააწყებთ. შეცდომის შემთხვევაში ლიცენზიის შეცვლა შესაძლებელი იქნება მხოლოდ ადმინისტრატორის მხარდაჭერით.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowLicenseInfoModal(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
              >
                გასაგებია
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

