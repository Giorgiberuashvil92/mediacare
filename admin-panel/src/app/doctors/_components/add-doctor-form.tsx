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
    specialization: '',
    degrees: '',
    experience: '',
    about: '',
    location: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isLoadingSpecializations, setIsLoadingSpecializations] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLicenseFile(file ?? null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!licenseFile) {
      setError('გთხოვთ ატვირთოთ ექიმის სამედიცინო ლიცენზია (PDF).');
      return;
    }

    setLoading(true);

    try {
      let licenseDocumentPath: string | undefined;

      const uploadResponse = await apiService.uploadLicenseDocument(licenseFile);
      if (uploadResponse.success) {
        licenseDocumentPath = uploadResponse.data.filePath;
      }

      const registerData = {
        role: 'doctor' as const,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        specialization: formData.specialization,
        degrees: formData.degrees || undefined,
        experience: formData.experience || undefined,
        about: formData.about || undefined,
        location: formData.location || undefined,
        licenseDocument: licenseDocumentPath,
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
          specialization: '',
          degrees: '',
          experience: '',
          about: '',
          location: '',
          dateOfBirth: '',
          gender: 'male',
        });
        setLicenseFile(null);
        
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
                სპეციალიზაცია
              </label>
              {isLoadingSpecializations ? (
                <div className="rounded-lg border border-dashed border-stroke px-5 py-3 text-sm text-dark-4 dark:border-dark-3 dark:text-dark-6">
                  სპეციალიზაციები იტვირთება...
                </div>
              ) : activeSpecializations.length > 0 ? (
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                >
                  <option value="" disabled>
                    აირჩიე სპეციალიზაცია
                  </option>
                  {activeSpecializations.map((spec) => (
                    <option key={spec._id} value={spec.name}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-dashed border-stroke px-5 py-3 text-sm text-dark-4 dark:border-dark-3 dark:text-dark-6">
                  სპეციალიზაციები არ არის ხელმისაწვდომი. ჯერ შექმენი ერთი.
                </div>
              )}
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
              placeholder="აირჩიე დაბადების თარიღი"
              value={formData.dateOfBirth}
              handleChange={handleChange}
              height="sm"
            />

            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                სამედიცინო ლიცენზია (PDF)
              </label>
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
    </div>
  );
}

