'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService, User } from '@/lib/api';
import { useEffect, useState } from 'react';

interface Advisor {
  _id: string;
  doctorId: User;
  name: string;
  specialization?: string;
  bio?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdvisorsPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [bio, setBio] = useState('');
  const [order, setOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadAdvisors();
    loadDoctors();
  }, []);

  const loadAdvisors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAdvisors();
      if (response.success) {
        setAdvisors(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'მრჩეველების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await apiService.getDoctors({
        page: 1,
        limit: 100,
        status: 'approved',
      });
      if (response.success) {
        setDoctors(response.data.doctors);
      }
    } catch (err: any) {
      console.error('Error loading doctors:', err);
    }
  };

  const handleAddAdvisor = async () => {
    if (!selectedDoctorId) {
      alert('გთხოვთ აირჩიოთ ექიმი');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.createAdvisor({
        doctorId: selectedDoctorId,
        bio: bio.trim() || undefined,
        order,
        isActive,
      });

      if (response.success) {
        alert('მრჩეველი წარმატებით დაემატა');
        setShowAddForm(false);
        setSelectedDoctorId('');
        setBio('');
        setOrder(0);
        setIsActive(true);
        loadAdvisors();
      }
    } catch (err: any) {
      alert(err.message || 'მრჩეველის დამატება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      const response = await apiService.updateAdvisor(id, {
        isActive: !currentStatus,
      });

      if (response.success) {
        loadAdvisors();
      }
    } catch (err: any) {
      alert(err.message || 'განახლება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('დარწმუნებული ხართ რომ გსურთ მრჩეველის წაშლა?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.deleteAdvisor(id);

      if (response.success) {
        alert('მრჩეველი წარმატებით წაიშალა');
        loadAdvisors();
      }
    } catch (err: any) {
      alert(err.message || 'წაშლა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableDoctors = () => {
    const advisorDoctorIds = advisors.map((a) =>
      typeof a.doctorId === 'object' ? a.doctorId.id : a.doctorId,
    );
    return doctors.filter((d) => !advisorDoctorIds.includes(d.id));
  };

  return (
    <>
      <Breadcrumb pageName="მრჩეველები" />

      {showAddForm ? (
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="mb-4 text-xl font-semibold text-dark dark:text-white">
            მრჩეველის დამატება
          </h3>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              ექიმი *
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-strokedark dark:text-white"
            >
              <option value="">აირჩიეთ ექიმი</option>
              {getAvailableDoctors().map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              ბიოგრაფია
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-strokedark dark:text-white"
              placeholder="მრჩეველის ბიოგრაფია..."
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              რიგი
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-strokedark dark:text-white"
            />
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm font-medium text-dark dark:text-white">
              აქტიური
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddAdvisor}
              disabled={loading || !selectedDoctorId}
              className="rounded-lg bg-primary px-6 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              დამატება
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSelectedDoctorId('');
                setBio('');
                setOrder(0);
                setIsActive(true);
              }}
              className="rounded-lg border border-stroke bg-white px-6 py-2 font-medium text-dark hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-white"
            >
              გაუქმება
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-dark dark:text-white">
              მრჩეველების მართვა
            </h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
            >
              + მრჩეველის დამატება
            </button>
          </div>

          {loading && (
            <div className="text-center py-8 text-dark dark:text-white">
              ჩატვირთვა...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-red-700 dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="rounded-lg border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke dark:border-strokedark">
                      <th className="px-6 py-3 text-left text-sm font-medium text-dark dark:text-white">
                        ექიმი
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-dark dark:text-white">
                        სპეციალიზაცია
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-dark dark:text-white">
                        რიგი
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-dark dark:text-white">
                        სტატუსი
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-dark dark:text-white">
                        მოქმედებები
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {advisors.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-dark dark:text-white"
                        >
                          მრჩეველები არ მოიძებნა
                        </td>
                      </tr>
                    ) : (
                      advisors.map((advisor) => {
                        const doctor =
                          typeof advisor.doctorId === 'object'
                            ? advisor.doctorId
                            : doctors.find((d) => d.id === advisor.doctorId);
                        return (
                          <tr
                            key={advisor._id}
                            className="border-b border-stroke dark:border-strokedark"
                          >
                            <td className="px-6 py-4 text-sm text-dark dark:text-white">
                              {doctor?.name || advisor.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-dark dark:text-white">
                              {doctor?.specialization || advisor.specialization || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-dark dark:text-white">
                              {advisor.order}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  advisor.isActive
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}
                              >
                                {advisor.isActive ? 'აქტიური' : 'არააქტიური'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() =>
                                    handleToggleActive(advisor._id, advisor.isActive)
                                  }
                                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                                    advisor.isActive
                                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                >
                                  {advisor.isActive ? 'დეაქტივაცია' : 'აქტივაცია'}
                                </button>
                                <button
                                  onClick={() => handleDelete(advisor._id)}
                                  className="rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
                                >
                                  წაშლა
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

