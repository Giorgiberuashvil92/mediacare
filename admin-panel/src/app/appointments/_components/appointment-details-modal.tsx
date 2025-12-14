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
  doctorId?: string;
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
  onReschedule?: () => void;
}

export function AppointmentDetailsModal({
  appointmentId,
  isOpen,
  onClose,
  onReschedule,
}: AppointmentDetailsModalProps) {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [previousDate, setPreviousDate] = useState<string | null>(null);
  const [previousTime, setPreviousTime] = useState<string | null>(null);
  const [doctorAvailability, setDoctorAvailability] = useState<any[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedDateForSlots, setSelectedDateForSlots] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && appointmentId) {
      loadAppointmentDetails();
      setShowRescheduleForm(false);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleSuccess(false);
      setPreviousDate(null);
      setPreviousTime(null);
      setStatusUpdateSuccess(false);
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
          doctorId: data.doctorId?._id || data.doctorId?.id || data.doctorId,
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

  const loadDoctorAvailability = async () => {
    if (!appointment || !appointment.doctorId) return;

    try {
      setLoadingAvailability(true);
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await apiService.getDoctorAvailability(
        appointment.doctorId,
        startDate,
        endDate,
        appointment.type,
      );

      if (response.success && response.data) {
        // Backend returns { success: true, data: [...] } where data is an array
        const availability = Array.isArray(response.data) 
          ? response.data 
          : response.data.availability || [];
        
        console.log('Loaded availability:', availability);
        setDoctorAvailability(availability);
      } else {
        console.error('Failed to load availability:', response);
      }
    } catch (err: any) {
      console.error('Error loading doctor availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleDateSelect = (date: string) => {
    setRescheduleDate(date);
    setSelectedDateForSlots(date);
    
    // Find available slots for selected date
    const dayAvailability = doctorAvailability.find((day: any) => {
      const dayDate = day.date || day.dateString;
      return dayDate && new Date(dayDate).toISOString().split('T')[0] === date;
    });

    // Backend returns 'timeSlots', not 'availableSlots'
    if (dayAvailability && dayAvailability.timeSlots && dayAvailability.timeSlots.length > 0) {
      setAvailableTimeSlots(dayAvailability.timeSlots);
    } else {
      setAvailableTimeSlots([]);
    }
    setRescheduleTime(''); // Reset time when date changes
  };

  const handleTimeSlotSelect = (time: string) => {
    setRescheduleTime(time);
  };

  // Get available dates from availability
  const getAvailableDates = () => {
    const dates: string[] = [];
    doctorAvailability.forEach((day: any) => {
      const dayDate = day.date || day.dateString;
      // Backend returns 'timeSlots', not 'availableSlots'
      if (dayDate && day.timeSlots && Array.isArray(day.timeSlots) && day.timeSlots.length > 0) {
        const dateStr = new Date(dayDate).toISOString().split('T')[0];
        if (!dates.includes(dateStr)) {
          dates.push(dateStr);
        }
      }
    });
    return dates.sort();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!appointmentId || !appointment) return;

    try {
      setUpdatingStatus(true);
      setError(null);
      setStatusUpdateSuccess(false);

      const response = await apiService.updateAppointmentStatus(appointmentId, newStatus);

      if (response.success) {
        setStatusUpdateSuccess(true);
        // Update local state
        setAppointment({
          ...appointment,
          status: newStatus as any,
        });
        
        if (onReschedule) {
          onReschedule();
        }

        // Hide success message after 3 seconds
        setTimeout(() => {
          setStatusUpdateSuccess(false);
        }, 3000);
      } else {
        setError(response.message || 'სტატუსის შეცვლა ვერ მოხერხდა');
      }
    } catch (err: any) {
      setError(err.message || 'სტატუსის შეცვლა ვერ მოხერხდა');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointmentId || !rescheduleDate || !rescheduleTime) {
      setError('გთხოვთ შეიყვანოთ თარიღი და დრო');
      return;
    }

    try {
      setRescheduling(true);
      setError(null);
      setRescheduleSuccess(false);
      
      // Save previous date and time for comparison
      if (appointment) {
        setPreviousDate(appointment.appointmentDate);
        setPreviousTime(appointment.appointmentTime);
      }

      // Debug: Log appointment ID and details
      console.log('Rescheduling appointment:', {
        appointmentId,
        currentDate: appointment?.appointmentDate,
        currentTime: appointment?.appointmentTime,
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        currentStatus: appointment?.status,
      });

      const response = await apiService.rescheduleAppointment(
        appointmentId,
        rescheduleDate,
        rescheduleTime,
      );

      if (response.success) {
        setShowRescheduleForm(false);
        setRescheduleDate('');
        setRescheduleTime('');
        setRescheduleSuccess(true);
        
        // Reload appointment details to show updated info
        await loadAppointmentDetails();
        
        if (onReschedule) {
          onReschedule();
        }

        // Hide success message after 5 seconds
        setTimeout(() => {
          setRescheduleSuccess(false);
          setPreviousDate(null);
          setPreviousTime(null);
        }, 5000);
      } else {
        setError(response.message || 'გადაჯავშნა ვერ მოხერხდა');
      }
    } catch (err: any) {
      setError(err.message || 'გადაჯავშნა ვერ მოხერხდა');
    } finally {
      setRescheduling(false);
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
          ) : error && !rescheduleSuccess ? (
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

              {/* Status Update Success Message */}
              {statusUpdateSuccess && (
                <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  <div className="flex items-center gap-2">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-medium">სტატუსი წარმატებით შეიცვალა!</span>
                  </div>
                </div>
              )}

              {/* Status Change Section */}
              <div className="mb-4 rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2">
                <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                  სტატუსის შეცვლა
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={updatingStatus || appointment.status === status}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        appointment.status === status
                          ? `${getStatusColor(status)} cursor-not-allowed`
                          : 'bg-white text-dark hover:bg-gray-100 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-4'
                      } ${
                        updatingStatus ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {status === 'pending' && 'მოლოდინში'}
                      {status === 'confirmed' && 'დადასტურებული'}
                      {status === 'completed' && 'დასრულებული'}
                      {status === 'cancelled' && 'გაუქმებული'}
                      {updatingStatus && appointment.status === status && '...'}
                    </button>
                  ))}
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

              {/* Success Message */}
              {rescheduleSuccess && (
                <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  <div className="flex items-center gap-2">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-medium">ჯავშანი წარმატებით გადაჯავშნილია!</span>
                  </div>
                  {previousDate && previousTime && (
                    <div className="mt-2 text-xs">
                      <span className="text-dark-4 dark:text-dark-6">წინა: </span>
                      <span className="line-through">
                        {new Date(previousDate).toLocaleDateString('ka-GE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}{' '}
                        {previousTime}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && !rescheduleSuccess && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Appointment Details */}
              <div className={`rounded-lg border p-4 dark:border-dark-3 ${
                rescheduleSuccess 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                  : 'border-stroke bg-gray-50 dark:bg-dark-2'
              }`}>
                <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                  ჯავშნის დეტალები
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-dark-4 dark:text-dark-6">თარიღი:</span>
                    <span className={`ml-2 font-medium ${
                      rescheduleSuccess 
                        ? 'text-green-700 dark:text-green-400 font-bold' 
                        : 'text-dark dark:text-white'
                    }`}>
                      {new Date(appointment.appointmentDate).toLocaleDateString('ka-GE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {rescheduleSuccess && (
                        <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-dark-4 dark:text-dark-6">დრო:</span>
                    <span className={`ml-2 font-medium ${
                      rescheduleSuccess 
                        ? 'text-green-700 dark:text-green-400 font-bold' 
                        : 'text-dark dark:text-white'
                    }`}>
                      {appointment.appointmentTime}
                      {rescheduleSuccess && (
                        <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                      )}
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

              {/* Reschedule Section */}
              {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                <div className="rounded-lg border border-stroke bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-dark dark:text-white">
                      გადაჯავშნა
                    </h3>
                    {!showRescheduleForm && (
                      <button
                        onClick={async () => {
                          setShowRescheduleForm(true);
                          setRescheduleDate(appointment.appointmentDate.split('T')[0]);
                          setRescheduleTime(appointment.appointmentTime);
                          await loadDoctorAvailability();
                        }}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                      >
                        გადაჯავშნა
                      </button>
                    )}
                  </div>

                  {showRescheduleForm && (
                    <div className="space-y-4">
                      {loadingAvailability ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          <span className="ml-2 text-sm text-dark-4 dark:text-dark-6">ხელმისაწვდომობის ჩატვირთვა...</span>
                        </div>
                      ) : (
                        <>
                          {/* Available Dates Calendar */}
                          <div>
                            <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                              აირჩიეთ თარიღი
                            </label>
                            <div className="grid grid-cols-7 gap-2 rounded-lg border border-stroke bg-white p-3 dark:border-dark-3 dark:bg-gray-dark">
                              {getAvailableDates().length === 0 ? (
                                <div className="col-span-7 py-4 text-center text-sm text-dark-4 dark:text-dark-6">
                                  ამ პერიოდში ხელმისაწვდომი თარიღები არ არის
                                </div>
                              ) : (
                                getAvailableDates().slice(0, 14).map((date) => {
                                  const dateObj = new Date(date);
                                  const isSelected = rescheduleDate === date;
                                  const isToday = date === new Date().toISOString().split('T')[0];
                                  
                                  return (
                                    <button
                                      key={date}
                                      type="button"
                                      onClick={() => handleDateSelect(date)}
                                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-primary text-white'
                                          : 'bg-gray-100 text-dark hover:bg-gray-200 dark:bg-dark-3 dark:text-white dark:hover:bg-dark-2'
                                      } ${isToday ? 'ring-2 ring-primary' : ''}`}
                                    >
                                      <div className="text-center">
                                        <div className="text-[10px] text-dark-4 dark:text-dark-6">
                                          {dateObj.toLocaleDateString('ka-GE', { weekday: 'short' })}
                                        </div>
                                        <div className="mt-1">{dateObj.getDate()}</div>
                                        <div className="text-[10px] text-dark-4 dark:text-dark-6">
                                          {dateObj.toLocaleDateString('ka-GE', { month: 'short' })}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            {getAvailableDates().length > 14 && (
                              <p className="mt-2 text-xs text-dark-4 dark:text-dark-6">
                                ნაჩვენებია პირველი 14 დღე. სულ: {getAvailableDates().length} ხელმისაწვდომი დღე
                              </p>
                            )}
                          </div>

                          {/* Available Time Slots */}
                          {rescheduleDate && (
                            <div>
                              <label className="mb-3 block text-sm font-medium text-dark dark:text-white">
                                აირჩიეთ დრო ({new Date(rescheduleDate).toLocaleDateString('ka-GE', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })})
                              </label>
                              {availableTimeSlots.length === 0 ? (
                                <div className="rounded-lg border border-stroke bg-gray-50 p-4 text-center text-sm text-dark-4 dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6">
                                  ამ თარიღზე ხელმისაწვდომი საათები არ არის
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 gap-2">
                                  {availableTimeSlots.map((time) => {
                                    const isSelected = rescheduleTime === time;
                                    return (
                                      <button
                                        key={time}
                                        type="button"
                                        onClick={() => handleTimeSlotSelect(time)}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                          isSelected
                                            ? 'bg-primary text-white'
                                            : 'border border-stroke bg-white text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-3'
                                        }`}
                                      >
                                        {time}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Selected Date and Time Summary */}
                          {rescheduleDate && rescheduleTime && (
                            <div className="rounded-lg border border-green-500 bg-green-50 p-3 dark:border-green-600 dark:bg-green-900/20">
                              <div className="flex items-center gap-2 text-sm">
                                <svg
                                  className="h-5 w-5 text-green-600 dark:text-green-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-medium text-green-800 dark:text-green-300">
                                  არჩეული: {new Date(rescheduleDate).toLocaleDateString('ka-GE', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}{' '}
                                  {rescheduleTime}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleReschedule}
                          disabled={rescheduling || !rescheduleDate || !rescheduleTime}
                          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {rescheduling ? 'მიმდინარეობს...' : 'დადასტურება'}
                        </button>
                        <button
                          onClick={() => {
                            setShowRescheduleForm(false);
                            setRescheduleDate('');
                            setRescheduleTime('');
                            setError(null);
                          }}
                          disabled={rescheduling}
                          className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:hover:bg-dark-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          გაუქმება
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

