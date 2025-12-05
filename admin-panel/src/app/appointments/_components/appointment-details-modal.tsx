'use client';

import { apiService } from '@/lib/api';
import { useEffect, useState } from 'react';

interface AppointmentDetails {
  id: string;
  appointmentNumber?: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  patientDateOfBirth?: string;
  patientGender?: string;
  doctorName: string;
  doctorEmail?: string;
  doctorPhone?: string;
  doctorSpecialization?: string;
  appointmentDate: string;
  appointmentTime: string;
  type: 'video' | 'home-visit';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  consultationFee: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod?: string;
  symptoms?: string;
  problem?: string;
  visitAddress?: string;
  notes?: string;
  documents?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface AppointmentDetailsModalProps {
  appointmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentDetailsModal({
  appointmentId,
  isOpen,
  onClose,
}: AppointmentDetailsModalProps) {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && appointmentId) {
      loadAppointmentDetails();
    }
  }, [isOpen, appointmentId]);

  const loadAppointmentDetails = async () => {
    if (!appointmentId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAppointmentById(appointmentId);
      
      if (response.success && response.data) {
        const data = response.data;
        setAppointment({
          id: data._id || data.id,
          appointmentNumber: data.appointmentNumber,
          patientName: data.patientDetails?.name || data.patientId?.name || 'უცნობი',
          patientEmail: data.patientId?.email,
          patientPhone: data.patientId?.phone,
          patientDateOfBirth: data.patientDetails?.dateOfBirth,
          patientGender: data.patientDetails?.gender,
          doctorName: data.doctorId?.name || 'ექიმი',
          doctorEmail: data.doctorId?.email,
          doctorPhone: data.doctorId?.phone,
          doctorSpecialization: data.doctorId?.specialization,
          appointmentDate: data.appointmentDate,
          appointmentTime: data.appointmentTime,
          type: data.type || 'video',
          status: data.status,
          consultationFee: data.consultationFee || 0,
          totalAmount: data.totalAmount || data.consultationFee || 0,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod,
          symptoms: data.patientDetails?.problem,
          problem: data.patientDetails?.problem,
          visitAddress: data.visitAddress,
          notes: data.notes,
          documents: data.documents,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } else {
        setError('აპოინტმენტის დეტალების ჩატვირთვა ვერ მოხერხდა');
      }
    } catch (err: any) {
      setError(err.message || 'აპოინტმენტის დეტალების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-gray-dark shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stroke bg-white px-6 py-4 dark:border-dark-3 dark:bg-gray-dark">
          <h2 className="text-xl font-bold text-dark dark:text-white">
            აპოინტმენტის დეტალები
          </h2>
          <button
            onClick={onClose}
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

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : appointment ? (
            <div className="space-y-6">
              {/* Appointment Number & Status */}
              <div className="flex items-center justify-between">
                <div>
                  {appointment.appointmentNumber && (
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      ჯავშნის ნომერი: <span className="font-medium text-dark dark:text-white">{appointment.appointmentNumber}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status === 'pending' && 'მოლოდინში'}
                    {appointment.status === 'confirmed' && 'დადასტურებული'}
                    {appointment.status === 'completed' && 'დასრულებული'}
                    {appointment.status === 'cancelled' && 'გაუქმებული'}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPaymentStatusColor(appointment.paymentStatus)}`}>
                    {appointment.paymentStatus === 'pending' && 'გადახდა მოლოდინში'}
                    {appointment.paymentStatus === 'paid' && 'გადახდილი'}
                    {appointment.paymentStatus === 'failed' && 'გადახდა ვერ მოხერხდა'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Patient Information */}
                <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    პაციენტის ინფორმაცია
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-dark-4 dark:text-dark-6">სახელი:</span>
                      <span className="ml-2 font-medium text-dark dark:text-white">
                        {appointment.patientName}
                      </span>
                    </div>
                    {appointment.patientEmail && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">ელ.ფოსტა:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {appointment.patientEmail}
                        </span>
                      </div>
                    )}
                    {appointment.patientPhone && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">ტელეფონი:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {appointment.patientPhone}
                        </span>
                      </div>
                    )}
                    {appointment.patientDateOfBirth && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">დაბადების თარიღი:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {new Date(appointment.patientDateOfBirth).toLocaleDateString('ka-GE')}
                        </span>
                      </div>
                    )}
                    {appointment.patientGender && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">სქესი:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {appointment.patientGender === 'male' ? 'მამრობითი' : appointment.patientGender === 'female' ? 'მდედრობითი' : 'სხვა'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Information */}
                <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    ექიმის ინფორმაცია
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-dark-4 dark:text-dark-6">სახელი:</span>
                      <span className="ml-2 font-medium text-dark dark:text-white">
                        {appointment.doctorName}
                      </span>
                    </div>
                    {appointment.doctorSpecialization && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">სპეციალიზაცია:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {appointment.doctorSpecialization}
                        </span>
                      </div>
                    )}
                    {appointment.doctorEmail && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">ელ.ფოსტა:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {appointment.doctorEmail}
                        </span>
                      </div>
                    )}
                    {appointment.doctorPhone && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">ტელეფონი:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {appointment.doctorPhone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                  ჯავშნის დეტალები
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-dark-4 dark:text-dark-6">თარიღი:</span>
                    <span className="ml-2 font-medium text-dark dark:text-white">
                      {new Date(appointment.appointmentDate).toLocaleDateString('ka-GE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-4 dark:text-dark-6">დრო:</span>
                    <span className="ml-2 font-medium text-dark dark:text-white">
                      {appointment.appointmentTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-4 dark:text-dark-6">ტიპი:</span>
                    <span className="ml-2 font-medium text-dark dark:text-white">
                      {appointment.type === 'video' ? 'ვიდეო კონსულტაცია' : 'ბინაზე ვიზიტი'}
                    </span>
                  </div>
                  {appointment.visitAddress && (
                    <div className="col-span-2">
                      <span className="text-dark-4 dark:text-dark-6">მისამართი:</span>
                      <span className="ml-2 font-medium text-dark dark:text-white">
                        {appointment.visitAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                  გადახდის ინფორმაცია
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-dark-4 dark:text-dark-6">კონსულტაციის ღირებულება:</span>
                    <span className="ml-2 font-medium text-dark dark:text-white">
                      ₾{appointment.consultationFee}
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-4 dark:text-dark-6">საერთო თანხა:</span>
                    <span className="ml-2 font-medium text-dark dark:text-white">
                      ₾{appointment.totalAmount}
                    </span>
                  </div>
                  {appointment.paymentMethod && (
                    <div>
                      <span className="text-dark-4 dark:text-dark-6">გადახდის მეთოდი:</span>
                      <span className="ml-2 font-medium text-dark dark:text-white">
                        {appointment.paymentMethod}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Problem/Symptoms */}
              {(appointment.problem || appointment.symptoms) && (
                <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    პრობლემა/სიმპტომები
                  </h3>
                  <p className="text-sm text-dark dark:text-white">
                    {appointment.problem || appointment.symptoms}
                  </p>
                </div>
              )}

              {/* Notes */}
              {appointment.notes && (
                <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    შენიშვნები
                  </h3>
                  <p className="text-sm text-dark dark:text-white whitespace-pre-wrap">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {/* Documents */}
              {appointment.documents && appointment.documents.length > 0 && (
                <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    დოკუმენტები
                  </h3>
                  <div className="space-y-2">
                    {appointment.documents.map((doc, index) => (
                      <a
                        key={index}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        დოკუმენტი {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              {(appointment.createdAt || appointment.updatedAt) && (
                <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    დროის ნიშნები
                  </h3>
                  <div className="space-y-2 text-sm">
                    {appointment.createdAt && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">შექმნის თარიღი:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {new Date(appointment.createdAt).toLocaleString('ka-GE')}
                        </span>
                      </div>
                    )}
                    {appointment.updatedAt && (
                      <div>
                        <span className="text-dark-4 dark:text-dark-6">ბოლო განახლება:</span>
                        <span className="ml-2 font-medium text-dark dark:text-white">
                          {new Date(appointment.updatedAt).toLocaleString('ka-GE')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

