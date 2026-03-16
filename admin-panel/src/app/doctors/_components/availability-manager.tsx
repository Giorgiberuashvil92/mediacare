'use client';

import { apiService } from '@/lib/api';
import { useEffect, useState } from 'react';

interface AvailabilityDay {
  date: string;
  timeSlots: string[];
  bookedSlots?: string[];
  isAvailable: boolean;
  type: 'video' | 'home-visit';
  _id?: string;
}

interface AvailabilityManagerProps {
  doctorId: string;
  doctorName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function AvailabilityManager({
  doctorId,
  doctorName,
  isOpen,
  onClose,
  onUpdate,
}: AvailabilityManagerProps) {
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedType, setSelectedType] = useState<'video' | 'home-visit'>('video');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [editingDay, setEditingDay] = useState<AvailabilityDay | null>(null);
  const [newDay, setNewDay] = useState<{
    date: string;
    timeSlots: string[];
    type: 'video' | 'home-visit';
  } | null>(null);

  useEffect(() => {
    if (isOpen && doctorId) {
      loadAvailability();
    }
  }, [isOpen, doctorId, dateRange, selectedType]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDoctorAvailability(
        doctorId,
        dateRange.start,
        dateRange.end,
        selectedType,
      );

      if (response.success && response.data) {
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.availability || [];

        setAvailability(
          data.map((day: any) => {
            // Backend returns timeSlots (all slots: available + booked) and bookedSlots
            // For admin panel, we want to show only available slots (timeSlots - bookedSlots)
            const allSlots = day.timeSlots || [];
            const bookedSlots = day.bookedSlots || [];
            const availableSlots = allSlots.filter(
              (slot: string) => !bookedSlots.includes(slot),
            );

            return {
              date: day.date || day.dateString,
              timeSlots: availableSlots, // Show only available slots in admin panel
              bookedSlots: bookedSlots,
              isAvailable: day.isAvailable !== false,
              type: day.type || selectedType,
              _id: day._id,
            };
          }),
        );
      }
    } catch (err: any) {
      setError(err.message || 'ხელმისაწვდომობის ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const availabilityToSave = availability.map((day) => ({
        date: day.date,
        timeSlots: day.timeSlots,
        isAvailable: day.isAvailable,
        type: day.type,
      }));

      const response = await apiService.updateDoctorAvailability(
        doctorId,
        availabilityToSave,
      );

      if (response.success) {
        setSuccess(true);
        if (onUpdate) {
          onUpdate();
        }
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        setError(response.message || 'ხელმისაწვდომობის განახლება ვერ მოხერხდა');
      }
    } catch (err: any) {
      setError(err.message || 'ხელმისაწვდომობის განახლება ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDay = () => {
    setNewDay({
      date: new Date().toISOString().split('T')[0],
      timeSlots: [],
      type: selectedType,
    });
  };

  const handleSaveNewDay = () => {
    if (!newDay || !newDay.date) return;

    const existingIndex = availability.findIndex(
      (day) =>
        day.date === newDay.date &&
        day.type === newDay.type,
    );

    if (existingIndex >= 0) {
      // Update existing
      const updated = [...availability];
      updated[existingIndex] = {
        ...updated[existingIndex],
        timeSlots: newDay.timeSlots,
        isAvailable: true,
      };
      setAvailability(updated);
    } else {
      // Add new
      setAvailability([
        ...availability,
        {
          date: newDay.date,
          timeSlots: newDay.timeSlots,
          isAvailable: true,
          type: newDay.type,
        },
      ]);
    }

    setNewDay(null);
  };

  const handleDeleteDay = (date: string, type: 'video' | 'home-visit') => {
    const typeLabel = type === 'video' ? 'ვიდეო' : 'ბინაზე';
    const dateStr = new Date(date).toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    if (
      !window.confirm(
        `დარწმუნებული ხართ, რომ გსურთ ამ დღის (${dateStr}, ${typeLabel}) განრიგის წაშლა? ცვლილება ძალაში შევა „შენახვის“ დაჭერის შემდეგ.`,
      )
    ) {
      return;
    }
    setAvailability(
      availability.filter(
        (day) => !(day.date === date && day.type === type),
      ),
    );
  };

  const handleEditDay = (day: AvailabilityDay) => {
    setEditingDay(day);
  };

  const handleSaveEditDay = () => {
    if (!editingDay) return;

    const index = availability.findIndex(
      (day) =>
        day.date === editingDay.date &&
        day.type === editingDay.type,
    );

    if (index >= 0) {
      const updated = [...availability];
      updated[index] = editingDay;
      setAvailability(updated);
    }

    setEditingDay(null);
  };

  const addTimeSlot = (day: AvailabilityDay, time: string) => {
    if (!day.timeSlots.includes(time)) {
      const updated = { ...day, timeSlots: [...day.timeSlots, time].sort() };
      if (editingDay && editingDay.date === day.date && editingDay.type === day.type) {
        setEditingDay(updated);
      } else {
        const index = availability.findIndex(
          (d) => d.date === day.date && d.type === day.type,
        );
        if (index >= 0) {
          const updatedAvail = [...availability];
          updatedAvail[index] = updated;
          setAvailability(updatedAvail);
        }
      }
    }
  };

  const removeTimeSlot = (day: AvailabilityDay, time: string) => {
    const updated = {
      ...day,
      timeSlots: day.timeSlots.filter((t) => t !== time),
    };
    if (editingDay && editingDay.date === day.date && editingDay.type === day.type) {
      setEditingDay(updated);
    } else {
      const index = availability.findIndex(
        (d) => d.date === day.date && d.type === day.type,
      );
      if (index >= 0) {
        const updatedAvail = [...availability];
        updatedAvail[index] = updated;
        setAvailability(updatedAvail);
      }
    }
  };

  if (!isOpen) return null;

  // Generate time slots - 24 hours (00:00 to 23:00)
  const allTimeSlots = Array.from({ length: 24 }, (_, i) => {
    return `${i.toString().padStart(2, '0')}:00`;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-gray-dark shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stroke bg-white px-6 py-4 dark:border-dark-3 dark:bg-gray-dark">
          <h2 className="text-xl font-bold text-dark dark:text-white">
            ხელმისაწვდომობის მართვა - {doctorName}
          </h2>
          <button
            onClick={onClose}
            className="text-dark-4 hover:text-dark dark:text-dark-6 dark:hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {/* Info Banner + color legend */}
          <div className="mb-4 space-y-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <p>
              <strong>ინფორმაცია:</strong> აქ შეგიძლიათ მართოთ ექიმის გრაფიკი. 
              შეგიძლიათ დაამატოთ ახალი დღეები, შეცვალოთ საათები, ან წაშალოთ დღეები. 
              ყველა ცვლილება შენახვის შემდეგ გამოჩნდება.
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span><span className="mr-1.5 inline-block h-4 w-4 rounded bg-green-500"></span> მწვანე — ექიმის არჩეული საათი (პაციენტისთვის ხელმისაწვდომი)</span>
              <span><span className="mr-1.5 inline-block h-4 w-4 rounded bg-red-600"></span> <strong>წითელი</strong> — პაციენტის დაჯავშნილი</span>
              <span><span className="mr-1.5 inline-block h-4 w-4 rounded border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark"></span> თეთრი — ექიმს არ აქვს გრაფიკში</span>
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                ტიპი
              </label>
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value as 'video' | 'home-visit')
                }
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
              >
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
            <div className="flex items-end">
              <button
                onClick={handleAddDay}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                + ახალი დღე
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
              ხელმისაწვდომობა წარმატებით განახლდა!
            </div>
          )}

          {/* Add New Day Form */}
          {newDay && (
            <div className="mb-4 rounded-lg border border-primary bg-blue-50 p-4 dark:border-primary dark:bg-blue-900/20">
              <h3 className="mb-3 font-semibold text-dark dark:text-white">
                ახალი დღის დამატება
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    თარიღი
                  </label>
                  <input
                    type="date"
                    value={newDay.date}
                    onChange={(e) =>
                      setNewDay({ ...newDay, date: e.target.value })
                    }
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-stroke bg-white px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    საათები (24 საათიანი)
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-stroke p-2 dark:border-dark-3">
                    <p className="mb-2 text-xs text-dark-4 dark:text-dark-6">
                      მწვანე = ექიმის არჩეული (პაციენტისთვის ხელმისაწვდომი) · თეთრი = არ არის გრაფიკში
                    </p>
                    <div className="grid grid-cols-6 gap-2">
                      {allTimeSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            const updated = {
                              ...newDay,
                              timeSlots: newDay.timeSlots.includes(time)
                                ? newDay.timeSlots.filter((t) => t !== time)
                                : [...newDay.timeSlots, time].sort(),
                            };
                            setNewDay(updated);
                          }}
                          className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                            newDay.timeSlots.includes(time)
                              ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                              : 'border border-stroke bg-white text-dark hover:bg-gray-100 dark:border-dark-3 dark:bg-gray-dark dark:text-white'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSaveNewDay}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  დამატება
                </button>
                <button
                  onClick={() => setNewDay(null)}
                  className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          )}

          {/* Availability List */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {availability.length === 0 ? (
                <div className="rounded-lg border border-stroke bg-gray-50 p-8 text-center text-dark-4 dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6">
                  ამ პერიოდში ხელმისაწვდომობა არ არის
                </div>
              ) : (
                availability.map((day) => (
                  <div
                    key={`${day.date}-${day.type}`}
                    className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-dark-3 dark:bg-dark-2"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-dark dark:text-white">
                          {new Date(day.date).toLocaleDateString('ka-GE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long',
                          })}
                        </h4>
                        <span className="text-xs text-dark-4 dark:text-dark-6">
                          {day.type === 'video' ? 'ვიდეო' : 'ბინაზე'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditDay(day)}
                          className="rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
                        >
                          რედაქტირება
                        </button>
                        <button
                          onClick={() => handleDeleteDay(day.date, day.type)}
                          className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                        >
                          წაშლა
                        </button>
                      </div>
                    </div>

                    {editingDay &&
                    editingDay.date === day.date &&
                    editingDay.type === day.type ? (
                      <div className="space-y-3">
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-stroke p-2 dark:border-dark-3">
                          <p className="mb-2 text-xs text-dark-4 dark:text-dark-6">
                            მწვანე = ხელმისაწვდომი · <strong className="text-red-600 dark:text-red-400">წითელი = პაციენტის დაჯავშნილი</strong> · თეთრი = არ არის გრაფიკში
                          </p>
                          <div className="grid grid-cols-6 gap-2">
                            {allTimeSlots.map((time) => {
                              const isBooked = editingDay.bookedSlots?.includes(time) || false;
                              const isSelected = editingDay.timeSlots.includes(time);
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                    if (isBooked) return; // Don't allow removing booked slots
                                    if (isSelected) {
                                      removeTimeSlot(editingDay, time);
                                    } else {
                                      addTimeSlot(editingDay, time);
                                    }
                                  }}
                                  disabled={isBooked}
                                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                    isBooked
                                      ? 'bg-red-600 text-white border-2 border-red-700 cursor-not-allowed shadow-md dark:bg-red-700 dark:border-red-800'
                                      : isSelected
                                        ? 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                                        : 'border border-stroke bg-white text-dark hover:bg-gray-100 dark:border-dark-3 dark:bg-gray-dark dark:text-white'
                                  }`}
                                  title={isBooked ? 'პაციენტის დაჯავშნილი - ვერ შეიცვლება' : isSelected ? 'ექიმის არჩეული (ხელმისაწვდომი)' : 'არ არის გრაფიკში'}
                                >
                                  {time} {isBooked && <span className="ml-1">🔒</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {editingDay.bookedSlots && editingDay.bookedSlots.length > 0 && (
                          <div className="rounded-lg border-2 border-red-400 bg-red-50 p-3 text-sm font-bold text-red-800 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🔒</span>
                              <span>პაციენტის დაჯავშნილი საათები ({editingDay.bookedSlots.length}):</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {editingDay.bookedSlots.map((slot) => (
                                <span
                                  key={slot}
                                  className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm dark:bg-red-700"
                                >
                                  {slot}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                              ⚠️ ეს საათები ვერ შეიცვლება, რადგან პაციენტს უკვე აქვს გადახდილი ჯავშანი
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEditDay}
                            className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
                          >
                            შენახვა
                          </button>
                          <button
                            onClick={() => setEditingDay(null)}
                            className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                          >
                            გაუქმება
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Available Slots - green: doctor selected, available for patient */}
                        <div>
                          <div className="mb-2 text-xs font-semibold text-dark-4 dark:text-dark-6">
                            ექიმის არჩეული საათები (პაციენტისთვის ხელმისაწვდომი):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {day.timeSlots.length === 0 ? (
                              <span className="text-sm text-dark-4 dark:text-dark-6">
                                საათები არ არის დამატებული
                              </span>
                            ) : (
                              day.timeSlots
                                .filter((time: string) => !day.bookedSlots?.includes(time))
                                .map((time: string) => (
                                  <span
                                    key={time}
                                    className="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white dark:bg-green-600"
                                    title="პაციენტისთვის ხელმისაწვდომი"
                                  >
                                    {time}
                                  </span>
                                ))
                            )}
                          </div>
                        </div>

                        {/* Booked Slots - bold red: patient has booked */}
                        {day.bookedSlots && day.bookedSlots.length > 0 && (
                          <div className="rounded-lg border-2 border-red-400 bg-red-50 p-3 dark:bg-red-900/20 dark:border-red-600">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-base">🔒</span>
                              <span className="text-sm font-bold text-red-800 dark:text-red-300">
                                პაციენტის დაჯავშნილი საათები ({day.bookedSlots.length}):
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {day.bookedSlots.map((slot: string) => (
                                <span
                                  key={slot}
                                  className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm dark:bg-red-700"
                                  title="პაციენტის დაჯავშანი"
                                >
                                  {slot}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-stroke bg-white px-6 py-2 font-medium text-dark hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
            >
              დახურვა
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'შენახვა...' : 'შენახვა'}
            </button>
          </div>
        </div>
      </div>
    </div>
    
  );
}


