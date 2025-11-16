'use client';

import InputGroup from '@/components/FormElements/InputGroup';
import { apiService, Specialization, User } from '@/lib/api';
import React, { useEffect, useState } from 'react';

interface EditDoctorFormProps {
  doctor: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditDoctorForm({
  doctor,
  onSuccess,
  onCancel,
}: EditDoctorFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(true);

  const [formData, setFormData] = useState({
    name: doctor.name || '',
    email: doctor.email || '',
    phone: doctor.phone || '',
    specialization: doctor.specialization || '',
    degrees: doctor.degrees || '',
    experience: doctor.experience || '',
    about: doctor.about || '',
    location: doctor.location || '',
    consultationFee: doctor.consultationFee?.toString() || '',
    followUpFee: doctor.followUpFee?.toString() || '',
    approvalStatus: doctor.approvalStatus || 'pending',
    isActive: doctor.isActive !== undefined ? doctor.isActive : true,
    gender: doctor.gender || 'male',
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
        setError(err.message || 'სპეციალიზაციების ჩატვირთვა ვერ მოხერხდა');
      } finally {
        setLoadingSpecializations(false);
      }
    };
    loadSpecializations();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updateData: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        specialization: formData.specialization.trim() || undefined,
        degrees: formData.degrees.trim() || undefined,
        experience: formData.experience.trim() || undefined,
        about: formData.about.trim() || undefined,
        location: formData.location.trim() || undefined,
        approvalStatus: formData.approvalStatus,
        isActive: formData.isActive,
        gender: formData.gender,
      };

      if (formData.consultationFee) {
        updateData.consultationFee = parseFloat(formData.consultationFee);
      }
      if (formData.followUpFee) {
        updateData.followUpFee = parseFloat(formData.followUpFee);
      }

      const response = await apiService.updateDoctor(doctor.id, updateData);

      if (response.success) {
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'ექიმის განახლება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="p-6">
        <h2 className="mb-6 text-2xl font-bold text-dark dark:text-white">
          ექიმის რედაქტირება
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
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
              height="sm"
              required
            />
          </div>

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
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

            <div className="w-full sm:w-1/2">
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
          </div>

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                სპეციალიზაცია
              </label>
              {loadingSpecializations ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent" />
                  <span>სპეციალიზაციები იტვირთება...</span>
                </div>
              ) : specializations.length === 0 ? (
                <InputGroup
                  type="text"
                  name="specialization"
                  label="სპეციალიზაცია"
                  placeholder="შეიყვანე სპეციალიზაცია"
                  value={formData.specialization}
                  handleChange={handleChange}
                  height="sm"
                />
              ) : (
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                >
                  <option value="">აირჩიე სპეციალიზაცია</option>
                  {specializations.map((spec) => (
                    <option key={spec._id} value={spec.name}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <InputGroup
              className="w-full sm:w-1/2"
              type="text"
              name="degrees"
              label="ხარისხი"
              placeholder="მაგ., MBBS, MD"
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
              label="გამოცდილება (წლები)"
              placeholder="მაგ., 5+ წელი"
              value={formData.experience}
              handleChange={handleChange}
              height="sm"
            />

            <InputGroup
              className="w-full sm:w-1/2"
              type="text"
              name="location"
              label="მდებარეობა"
              placeholder="მაგ., თბილისი, საქართველო"
              value={formData.location}
              handleChange={handleChange}
              height="sm"
            />
          </div>

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <InputGroup
              className="w-full sm:w-1/2"
              type="number"
              name="consultationFee"
              label="კონსულტაციის საფასური ($)"
              placeholder="100"
              value={formData.consultationFee}
              handleChange={handleChange}
              height="sm"
            />

            <InputGroup
              className="w-full sm:w-1/2"
              type="number"
              name="followUpFee"
              label="განმეორებითი კონსულტაციის საფასური ($)"
              placeholder="50"
              value={formData.followUpFee}
              handleChange={handleChange}
              height="sm"
            />
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

          <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                დამტკიცების სტატუსი
              </label>
              <select
                name="approvalStatus"
                value={formData.approvalStatus}
                onChange={handleChange}
                className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
              >
                <option value="pending">განხილვის მოლოდინში</option>
                <option value="approved">დამტკიცებული</option>
                <option value="rejected">უარყოფილი</option>
              </select>
            </div>

            <div className="w-full sm:w-1/2">
              <label className="mb-2.5 block text-sm font-medium text-dark dark:text-white">
                აქტიური სტატუსი
              </label>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 rounded border-stroke text-primary focus:ring-2 focus:ring-primary dark:border-dark-3"
                  />
                  <span className="text-sm text-dark dark:text-white">
                    აქტიური
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {onCancel && (
              <button
                className="rounded-lg border border-stroke px-6 py-[7px] font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
                type="button"
                onClick={onCancel}
              >
                გაუქმება
              </button>
            )}

            <button
              className="rounded-lg bg-primary px-6 py-[7px] font-medium text-gray-2 hover:bg-opacity-90 disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? 'განახლება...' : 'ექიმის განახლება'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

