'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService, User } from '@/lib/api';
import { useEffect, useState } from 'react';
import { AddDoctorForm } from './_components/add-doctor-form';
import { DoctorDetailsModal } from './_components/doctor-details-modal';
import { EditDoctorForm } from './_components/edit-doctor-form';

interface Doctor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization: string;
  rating: number;
  reviewCount: number;
  location?: string;
  experience?: string;
  degrees?: string;
  about?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  licenseDocument?: string;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isTopRated?: boolean;
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, [statusFilter]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDoctors({
        page: 1,
        limit: 50,
        status: statusFilter,
      });
      if (response.success) {
        // Map all fields from backend response
        const mappedDoctors = response.data.doctors.map((doctor: any) => {
          const mapped: Doctor = {
            id: doctor.id,
            name: doctor.name || '',
            email: doctor.email,
            phone: doctor.phone,
            specialization: doctor.specialization || '',
            rating: doctor.rating || 0,
            reviewCount: doctor.reviewCount || 0,
            location: doctor.location,
            experience: doctor.experience,
            degrees: doctor.degrees,
            about: doctor.about,
            dateOfBirth: doctor.dateOfBirth,
            gender: doctor.gender,
            licenseDocument: doctor.licenseDocument,
            isActive: doctor.isActive !== undefined ? doctor.isActive : false,
            approvalStatus: (doctor.approvalStatus || 'pending') as 'pending' | 'approved' | 'rejected',
            isTopRated: doctor.isTopRated ?? false,
          };
          console.log('Mapped doctor:', mapped);
          return mapped;
        });
        setDoctors(mappedDoctors);
      }
    } catch (err: any) {
      setError(err.message || 'ექიმების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorAdded = () => {
    setShowAddForm(false);
    loadDoctors(); // Reload doctors list
  };

  const handleViewDoctor = async (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    setShowDetailsModal(true);
  };

  const handleEditDoctor = async (doctorId: string) => {
    try {
      setLoading(true);
      const response = await apiService.getDoctorById(doctorId, true);
      if (response.success) {
        setSelectedDoctor(response.data);
        setShowDetailsModal(false);
        setShowEditForm(true);
      }
    } catch (err: any) {
      setError(err.message || 'ექიმის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorUpdated = () => {
    setShowEditForm(false);
    setSelectedDoctor(null);
    loadDoctors();
  };

  const handleApproveDoctor = async (doctorId: string) => {
    try {
      setLoading(true);
      await apiService.updateDoctor(doctorId, {
        approvalStatus: 'approved',
        isActive: true,
      });
      loadDoctors();
    } catch (err: any) {
      setError(err.message || 'ექიმის დამტკიცება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDoctor = async (doctorId: string) => {
    try {
      setLoading(true);
      await apiService.updateDoctor(doctorId, {
        approvalStatus: 'rejected',
        isActive: false,
      });
      loadDoctors();
    } catch (err: any) {
      setError(err.message || 'ექიმის უარყოფა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTopRated = async (doctorId: string, currentValue: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.updateDoctor(doctorId, {
        isTopRated: !currentValue,
      });
      if (response.success) {
        await loadDoctors();
      }
    } catch (err: any) {
      setError(err.message || 'ტოპ ექიმის სტატუსის განახლება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb pageName="ექიმები" />

      {showAddForm ? (
        <AddDoctorForm
          onSuccess={handleDoctorAdded}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-dark dark:text-white">
              ექიმების მართვა
            </h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90"
            >
              + ექიმის დამატება
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            {[
              { label: 'განხილვის მოლოდინში', value: 'pending' as const },
              { label: 'დამტკიცებული', value: 'approved' as const },
              { label: 'უარყოფილი', value: 'rejected' as const },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  statusFilter === filter.value
                    ? 'bg-primary text-white'
                    : 'bg-light/60 text-dark dark:bg-dark-3 dark:text-dark-6'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
            <div className="p-6">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {doctors.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-dark-4">
                    ექიმები არ მოიძებნა
                  </div>
                ) : (
                  doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="rounded-lg border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-dark dark:text-white">
                        {doctor.name}
                      </h3>
                      <p className="text-sm text-dark-4 dark:text-dark-6">
                        {doctor.specialization}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        doctor.isActive
                          ? 'bg-green-500 text-white dark:bg-green-600'
                          : 'bg-gray-400 text-white dark:bg-gray-600'
                      }`}
                    >
                      {doctor.isActive ? 'აქტიური' : 'არააქტიური'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {doctor.email && (
                      <div className="flex items-center text-sm text-dark-4 dark:text-dark-6">
                        <span className="mr-2">📧</span>
                        {doctor.email}
                      </div>
                    )}
                    {doctor.location && (
                      <div className="flex items-center text-sm text-dark-4 dark:text-dark-6">
                        <span className="mr-2">📍</span>
                        {doctor.location}
                      </div>
                    )}
                    {doctor.experience && (
                      <div className="flex items-center text-sm text-dark-4 dark:text-dark-6">
                        <span className="mr-2">💼</span>
                        გამოცდილება: {doctor.experience}
                      </div>
                    )}
                    {doctor.degrees && (
                      <div className="flex items-center text-sm text-dark-4 dark:text-dark-6">
                        <span className="mr-2">🎓</span>
                        {doctor.degrees}
                      </div>
                    )}
                    {doctor.phone && (
                      <div className="flex items-center text-sm text-dark-4 dark:text-dark-6">
                        <span className="mr-2">📞</span>
                        {doctor.phone}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-dark-4 dark:text-dark-6">
                      <span className="mr-2">⭐</span>
                      {doctor.rating.toFixed(1)} ({doctor.reviewCount} შეფასება)
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="mr-2 text-dark-4 dark:text-dark-6">📄</span>
                      <span className="text-dark-4 dark:text-dark-6">სტატუსი:</span>
                      <span
                        className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          doctor.approvalStatus === 'approved'
                            ? 'bg-green-500 text-white dark:bg-green-600'
                            : doctor.approvalStatus === 'rejected'
                            ? 'bg-red-500 text-white dark:bg-red-600'
                            : 'bg-yellow-500 text-white dark:bg-yellow-600'
                        }`}
                      >
                        {doctor.approvalStatus === 'pending'
                          ? 'განხილვის მოლოდინში'
                          : doctor.approvalStatus === 'approved'
                          ? 'დამტკიცებული'
                          : 'უარყოფილი'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDoctor(doctor.id)}
                        className="flex-1 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        დეტალების ნახვა
                      </button>
                      <button
                        onClick={() => handleEditDoctor(doctor.id)}
                        className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                      >
                        რედაქტირება
                      </button>
                    </div>
                    {doctor.approvalStatus === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveDoctor(doctor.id)}
                          disabled={loading}
                          className="flex-1 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                        >
                          დამტკიცება
                        </button>
                        <button
                          onClick={() => handleRejectDoctor(doctor.id)}
                          disabled={loading}
                          className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          უარყოფა
                        </button>
                      </div>
                    )}
                    {doctor.approvalStatus === 'rejected' && (
                      <button
                        onClick={() => handleApproveDoctor(doctor.id)}
                        disabled={loading}
                        className="w-full rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                      >
                        დამტკიცება
                      </button>
                    )}
                    {doctor.approvalStatus === 'approved' && (
                      <button
                        onClick={() => handleToggleTopRated(doctor.id, doctor.isTopRated || false)}
                        disabled={loading}
                        className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                          doctor.isTopRated
                            ? 'bg-orange-500 hover:bg-orange-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {doctor.isTopRated ? '⭐ ტოპ ექიმიდან ამოღება' : '⭐ ტოპ ექიმად დამატება'}
                      </button>
                    )}
                  </div>
                </div>
                  ))
                )}
              </div>
          </div>
          </div>
        </>
      )}

      {selectedDoctorId && (
        <DoctorDetailsModal
          doctorId={selectedDoctorId}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedDoctorId(null);
          }}
          onEdit={() => handleEditDoctor(selectedDoctorId)}
          onUpdate={loadDoctors}
        />
      )}

      {showEditForm && selectedDoctor && (
        <div className="mt-6">
          <EditDoctorForm
            doctor={selectedDoctor}
            onSuccess={handleDoctorUpdated}
            onCancel={() => {
              setShowEditForm(false);
              setSelectedDoctor(null);
            }}
          />
        </div>
      )}
    </>
  );
}

