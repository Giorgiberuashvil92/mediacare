'use client';

import { apiService, User } from '@/lib/api';
import React, { useEffect, useState } from 'react';

interface DoctorDetailsModalProps {
  doctorId: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onUpdate: () => void;
}

export function DoctorDetailsModal({
  doctorId,
  isOpen,
  onClose,
  onEdit,
  onUpdate,
}: DoctorDetailsModalProps) {
  const [doctor, setDoctor] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && doctorId) {
      loadDoctor();
    }
  }, [isOpen, doctorId]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDoctorById(doctorId, true);
      if (response.success) {
        setDoctor(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'ექიმის დეტალების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-dark">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stroke bg-white px-6 py-4 dark:border-dark-3 dark:bg-gray-dark">
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            ექიმის დეტალები
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              რედაქტირება
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              დახურვა
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : doctor ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                  ძირითადი ინფორმაცია
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                      სახელი
                    </label>
                    <p className="text-dark dark:text-white">{doctor.name}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                      ელ. ფოსტა
                    </label>
                    <p className="text-dark dark:text-white">{doctor.email}</p>
                  </div>
                  {doctor.phone && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        ტელეფონი
                      </label>
                      <p className="text-dark dark:text-white">
                        {doctor.phone}
                      </p>
                    </div>
                  )}
                  {doctor.gender && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        სქესი
                      </label>
                      <p className="text-dark dark:text-white capitalize">
                        {doctor.gender === 'male' ? 'კაცი' : doctor.gender === 'female' ? 'ქალი' : 'სხვა'}
                      </p>
                    </div>
                  )}
                  {doctor.dateOfBirth && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        დაბადების თარიღი
                      </label>
                      <p className="text-dark dark:text-white">
                        {new Date(doctor.dateOfBirth).toLocaleDateString('ka-GE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Specific */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                  პროფესიონალური ინფორმაცია
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {doctor.specialization && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        სპეციალიზაცია
                      </label>
                      <p className="text-dark dark:text-white">
                        {doctor.specialization}
                      </p>
                    </div>
                  )}
                  {doctor.degrees && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        ხარისხი
                      </label>
                      <p className="text-dark dark:text-white">
                        {doctor.degrees}
                      </p>
                    </div>
                  )}
                  {doctor.experience && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        გამოცდილება
                      </label>
                      <p className="text-dark dark:text-white">
                        {doctor.experience}
                      </p>
                    </div>
                  )}
                  {doctor.location && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        მდებარეობა
                      </label>
                      <p className="text-dark dark:text-white">
                        {doctor.location}
                      </p>
                    </div>
                  )}
                  {doctor.consultationFee !== undefined && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        კონსულტაციის საფასური
                      </label>
                      <p className="text-dark dark:text-white">
                        ${doctor.consultationFee}
                      </p>
                    </div>
                  )}
                  {doctor.followUpFee !== undefined && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                        განმეორებითი კონსულტაციის საფასური
                      </label>
                      <p className="text-dark dark:text-white">
                        ${doctor.followUpFee}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* About */}
              {doctor.about && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                    შესახებ
                  </h3>
                  <p className="text-dark-4 dark:text-dark-6">
                    {doctor.about}
                  </p>
                </div>
              )}

              {/* License Document */}
              {doctor.licenseDocument && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                    სამედიცინო ლიცენზია
                  </h3>
                  <div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${doctor.licenseDocument}`}
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
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      ლიცენზიის ნახვა
                    </a>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                  სტატუსი
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                      დამტკიცების სტატუსი
                    </label>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        doctor.approvalStatus === 'approved'
                          ? 'bg-success/10 text-success'
                          : doctor.approvalStatus === 'rejected'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {doctor.approvalStatus === 'pending'
                        ? 'განხილვის მოლოდინში'
                        : doctor.approvalStatus === 'approved'
                        ? 'დამტკიცებული'
                        : 'უარყოფილი'}
                    </span>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                      აქტიური სტატუსი
                    </label>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        doctor.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {doctor.isActive ? 'აქტიური' : 'არააქტიური'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
                  სტატისტიკა
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                      რეიტინგი
                    </label>
                    <p className="text-dark dark:text-white">
                      {doctor.rating?.toFixed(1) || 'არ არის'}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-dark-4 dark:text-dark-6">
                      შეფასებების რაოდენობა
                    </label>
                    <p className="text-dark dark:text-white">
                      {doctor.reviewCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

