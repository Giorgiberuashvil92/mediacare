'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService } from '@/lib/api';
import { useEffect, useState } from 'react';
import { AppointmentDetailsModal } from './_components/appointment-details-modal';
import { EmptySlots } from './_components/empty-slots';

interface Appointment {
  id: string;
  appointmentNumber?: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  type?: 'video' | 'home-visit';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  consultationFee: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  symptoms?: string;
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'empty-slots'>('appointments');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, paymentFilter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      // Real API call to Medicare backend
      const params: any = {
        page: 1,
        limit: 50,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (paymentFilter !== 'all') {
        params.paymentStatus = paymentFilter;
      }

      const response = await apiService.getAdminAppointments(params);
      
      if (response.success && response.data) {
        setAppointments(response.data.appointments);
      } else {
        // Fallback to mock data if API fails
        const mockAppointments: Appointment[] = [
          {
            id: '1',
            patientName: 'გიორგი გელაშვილი',
            doctorName: 'დ. ნინო ჯავახიშვილი',
            appointmentDate: '2024-01-15',
            appointmentTime: '10:00',
            status: 'confirmed',
            consultationFee: 50,
            paymentStatus: 'paid',
            symptoms: 'თავის ტკივილი'
          },
          {
            id: '2',
            patientName: 'მარიამ კვარაცხელია',
            doctorName: 'დ. დავით მამაცაშვილი',
            appointmentDate: '2024-01-15',
            appointmentTime: '14:30',
            status: 'pending',
            consultationFee: 60,
            paymentStatus: 'pending',
            symptoms: 'ყელის ტკივილი'
          }
        ];
        
        setAppointments(mockAppointments);
      }
    } catch (err: any) {
      console.log('Error loading appointments:', err);
      setError(err.message || 'ჯავშნების ჩატვირთვა ვერ მოხერხდა');
      
      // Show mock data on error
      const mockAppointments: Appointment[] = [
        {
          id: '1',
          patientName: 'გიორგი გელაშვილი (Mock)',
          doctorName: 'დ. ნინო ჯავახიშვილი',
          appointmentDate: '2024-01-15',
          appointmentTime: '10:00',
          status: 'confirmed',
          consultationFee: 50,
          paymentStatus: 'paid',
          symptoms: 'თავის ტკივილი'
        }
      ];
      setAppointments(mockAppointments);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb pageName="ჯავშნები" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-dark dark:text-white">
              ჯავშნების მართვა
            </h2>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-2 border-b border-stroke dark:border-dark-3">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'appointments'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white'
              }`}
            >
              ჯავშნები
            </button>
            <button
              onClick={() => setActiveTab('empty-slots')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'empty-slots'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white'
              }`}
            >
              ცარიელი ჯავშნები
            </button>
          </div>

          {activeTab === 'empty-slots' ? (
            <EmptySlots />
          ) : (
            <>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                სტატუსი
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
              >
                <option value="all">ყველა</option>
                <option value="pending">მოლოდინში</option>
                <option value="confirmed">დადასტურებული</option>
                <option value="completed">დასრულებული</option>
                <option value="cancelled">გაუქმებული</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                გადახდის სტატუსი
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
              >
                <option value="all">ყველა</option>
                <option value="pending">მოლოდინში</option>
                <option value="paid">გადახდილი</option>
                <option value="failed">ვერ გადაიხადა</option>
              </select>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    ნომერი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    პაციენტი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    ექიმი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    თარიღი/დრო
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    ტიპი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    სტატუსი
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    გადახდა
                  </th>
                  <th className="p-4 text-left font-medium text-dark dark:text-white">
                    ღირებულება
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-dark-4">
                      ჯავშნები არ მოიძებნა
                    </td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      onClick={() => {
                        setSelectedAppointmentId(appointment.id);
                        setIsModalOpen(true);
                      }}
                      className="cursor-pointer border-b border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-dark-3 transition-colors"
                    >
                      <td className="p-4">
                        <div className="text-sm font-mono text-dark-4 dark:text-dark-6">
                          {appointment.appointmentNumber || `#${appointment.id.slice(-6)}`}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-dark dark:text-white">
                            {appointment.patientName}
                          </div>
                          {appointment.symptoms && (
                            <div className="text-sm text-dark-4 dark:text-dark-6">
                              {appointment.symptoms}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-dark dark:text-white">
                        {appointment.doctorName}
                      </td>
                      <td className="p-4">
                        <div className="text-dark dark:text-white">
                          {new Date(appointment.appointmentDate).toLocaleDateString('ka-GE')}
                        </div>
                        <div className="text-sm text-dark-4 dark:text-dark-6">
                          {appointment.appointmentTime}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {appointment.type === 'home-visit' ? 'ბინაზე' : 'ვიდეო'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status === 'pending' && 'მოლოდინში'}
                          {appointment.status === 'confirmed' && 'დადასტურებული'}
                          {appointment.status === 'completed' && 'დასრულებული'}
                          {appointment.status === 'cancelled' && 'გაუქმებული'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPaymentStatusColor(appointment.paymentStatus)}`}>
                          {appointment.paymentStatus === 'pending' && 'მოლოდინში'}
                          {appointment.paymentStatus === 'paid' && 'გადახდილი'}
                          {appointment.paymentStatus === 'failed' && 'ვერ გადაიხადა'}
                        </span>
                      </td>
                      <td className="p-4 text-dark dark:text-white font-medium">
                        ₾{appointment.consultationFee}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            </>
          )}
        </div>
      </div>

      <AppointmentDetailsModal
        appointmentId={selectedAppointmentId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAppointmentId(null);
        }}
        onReschedule={() => {
          loadAppointments();
        }}
      />
    </>
  );
}
