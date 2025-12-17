'use client';

import { apiService } from '@/lib/api';
import { useEffect, useState } from 'react';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

interface EmptySlot {
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  type: 'video' | 'home-visit';
}

export function EmptySlots() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [emptySlots, setEmptySlots] = useState<EmptySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'home-visit'>('all');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (doctors.length > 0) {
      loadEmptySlots();
    }
  }, [doctors, selectedDoctor, selectedType, dateRange]);

  const loadDoctors = async () => {
    try {
      const response = await apiService.getDoctors({
        page: 1,
        limit: 100,
        status: 'approved',
      });

      if (response.success && response.data) {
        setDoctors(
          response.data.doctors.map((d: any) => ({
            id: d._id || d.id,
            name: d.name || 'უცნობი ექიმი',
            specialization: d.specialization || '',
          })),
        );
      }
    } catch (err: any) {
      console.error('Error loading doctors:', err);
    }
  };

  const loadEmptySlots = async () => {
    try {
      setLoading(true);
      setError(null);

      const doctorsToCheck =
        selectedDoctor === 'all'
          ? doctors
          : doctors.filter((d) => d.id === selectedDoctor);

      const allSlots: EmptySlot[] = [];

      for (const doctor of doctorsToCheck) {
        try {
          // Load availability for both types
          const typesToCheck: ('video' | 'home-visit')[] =
            selectedType === 'all' ? ['video', 'home-visit'] : [selectedType];

          for (const type of typesToCheck) {
            const availabilityResponse = await apiService.getDoctorAvailability(
              doctor.id,
              dateRange.start,
              dateRange.end,
              type,
            );

            if (
              availabilityResponse.success &&
              availabilityResponse.data
            ) {
              const availability = availabilityResponse.data;

              // Process availability data
              if (Array.isArray(availability)) {
                availability.forEach((day: any) => {
                  if (day.availableSlots && Array.isArray(day.availableSlots)) {
                    day.availableSlots.forEach((slot: string) => {
                      allSlots.push({
                        doctorId: doctor.id,
                        doctorName: doctor.name,
                        specialization: doctor.specialization,
                        date: day.date || day.dateString || '',
                        time: slot,
                        type: type,
                      });
                    });
                  }
                });
              } else if (availability.availability) {
                // Handle different response structure
                availability.availability.forEach((day: any) => {
                  if (day.availableSlots && Array.isArray(day.availableSlots)) {
                    day.availableSlots.forEach((slot: string) => {
                      allSlots.push({
                        doctorId: doctor.id,
                        doctorName: doctor.name,
                        specialization: doctor.specialization,
                        date: day.date || day.dateString || '',
                        time: slot,
                        type: type,
                      });
                    });
                  }
                });
              }
            }
          }
        } catch (err: any) {
          console.error(`Error loading availability for doctor ${doctor.id}:`, err);
        }
      }

      // Sort by date and time
      allSlots.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      setEmptySlots(allSlots);
    } catch (err: any) {
      setError(err.message || 'ცარიელი ჯავშნების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  if (loading && emptySlots.length === 0) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            ექიმი
          </label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
          >
            <option value="all">ყველა ექიმი</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} - {doctor.specialization}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            ტიპი
          </label>
          <select
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value as 'all' | 'video' | 'home-visit')
            }
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
          >
            <option value="all">ყველა</option>
            <option value="video">ვიდეო</option>
            <option value="home-visit">ბინაზე</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            დაწყება
          </label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange({ ...dateRange, start: e.target.value })
            }
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
            დასრულება
          </label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ ...dateRange, end: e.target.value })
            }
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty Slots Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stroke dark:border-dark-3">
              <th className="p-4 text-left font-medium text-dark dark:text-white">
                ექიმი
              </th>
              <th className="p-4 text-left font-medium text-dark dark:text-white">
                სპეციალიზაცია
              </th>
              <th className="p-4 text-left font-medium text-dark dark:text-white">
                თარიღი
              </th>
              <th className="p-4 text-left font-medium text-dark dark:text-white">
                დრო
              </th>
              <th className="p-4 text-left font-medium text-dark dark:text-white">
                ტიპი
              </th>
            </tr>
          </thead>
          <tbody>
            {emptySlots.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-dark-4">
                  ცარიელი ჯავშნები არ მოიძებნა
                </td>
              </tr>
            ) : (
              emptySlots.map((slot, index) => (
                <tr
                  key={`${slot.doctorId}-${slot.date}-${slot.time}-${slot.type}-${index}`}
                  className="border-b border-stroke dark:border-dark-3 hover:bg-gray-50 dark:hover:bg-dark-3"
                >
                  <td className="p-4 text-dark dark:text-white">
                    {slot.doctorName}
                  </td>
                  <td className="p-4 text-dark-4 dark:text-dark-6">
                    {slot.specialization}
                  </td>
                  <td className="p-4 text-dark dark:text-white">
                    {new Date(slot.date).toLocaleDateString('ka-GE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="p-4 text-dark dark:text-white font-mono">
                    {slot.time}
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {slot.type === 'home-visit' ? 'ბინაზე' : 'ვიდეო'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {emptySlots.length > 0 && (
        <div className="text-sm text-dark-4 dark:text-dark-6">
          სულ ნაპოვნია: <span className="font-medium text-dark dark:text-white">{emptySlots.length}</span> ცარიელი ჯავშანი
        </div>
      )}
    </div>
  );
}


