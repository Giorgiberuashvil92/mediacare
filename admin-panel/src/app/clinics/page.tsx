'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService, type Clinic } from '@/lib/api';
import { FormEvent, useEffect, useState } from 'react';

const defaultClinicForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
  isActive: true,
  merchantId: '',
  merchantName: '',
  bogClientId: '',
  bogClientSecret: '',
};

export default function ClinicsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicForm, setClinicForm] = useState({ ...defaultClinicForm });
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [showClinicForm, setShowClinicForm] = useState(false);

  const inputClass =
    'w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary';
  const labelClass = 'mb-2 block text-sm font-medium text-dark dark:text-white';

  const loadClinics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getClinics();
      if (response.success) {
        setClinics(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'კლინიკების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const handleClinicSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setFeedback(null);
      setError(null);

      const payload = {
        name: clinicForm.name,
        address: clinicForm.address || undefined,
        phone: clinicForm.phone || undefined,
        email: clinicForm.email || undefined,
        isActive: clinicForm.isActive,
        merchantId: clinicForm.merchantId.trim() || undefined,
        merchantName: clinicForm.merchantName.trim() || undefined,
        bogClientId: clinicForm.bogClientId.trim() || undefined,
        bogClientSecret: clinicForm.bogClientSecret.trim() || undefined,
      };

      if (editingClinicId) {
        await apiService.updateClinic(editingClinicId, payload);
        setFeedback('კლინიკა წარმატებით განახლდა');
      } else {
        await apiService.createClinic(payload);
        setFeedback('ახალი კლინიკა დაემატა');
      }

      setClinicForm({ ...defaultClinicForm });
      setEditingClinicId(null);
      setShowClinicForm(false);
      await loadClinics();
    } catch (err: any) {
      setError(err.message || 'ოპერაცია ვერ შესრულდა');
    }
  };

  const startClinicEdit = (clinic: Clinic) => {
    setEditingClinicId(clinic.id);
    setShowClinicForm(true);
    setClinicForm({
      name: clinic.name,
      address: clinic.address || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      isActive: clinic.isActive,
      merchantId: clinic.merchantId || '',
      merchantName: clinic.merchantName || '',
      bogClientId: clinic.bogClientId || '',
      bogClientSecret: '',
    });
  };

  const handleDeleteClinic = async (id: string) => {
    if (!confirm('დარწმუნებული ხარ რომ გინდა კლინიკის წაშლა?')) {
      return;
    }
    try {
      await apiService.deleteClinic(id);
      setFeedback('კლინიკა წაიშალა');
      await loadClinics();
    } catch (err: any) {
      setError(err.message || 'კლინიკის წაშლა ვერ მოხერხდა');
    }
  };

  const resetForm = () => {
    setEditingClinicId(null);
    setClinicForm({ ...defaultClinicForm });
    setShowClinicForm(false);
  };

  return (
    <>
      <Breadcrumb pageName="კლინიკები" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke p-6 dark:border-dark-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-dark dark:text-white">
                კლინიკების მართვა
              </h2>
              <p className="mt-1 text-dark-4 dark:text-dark-6">
                კლინიკების დამატება, ექიმების მიბმა და BOG merchant credentials-ის კონფიგურაცია
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showClinicForm && !editingClinicId) {
                  resetForm();
                } else {
                  setShowClinicForm(true);
                  setEditingClinicId(null);
                  setClinicForm({ ...defaultClinicForm });
                }
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              {showClinicForm && !editingClinicId ? 'ფორმის დამალვა' : 'ახალი კლინიკა'}
            </button>
          </div>

          {!loading && (
            <div className="mt-6 inline-flex rounded-xl border-2 border-primary bg-primary/5 px-6 py-4 dark:bg-primary/10">
              <div>
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {clinics.length}
                </div>
                <div className="text-sm text-dark-4 dark:text-dark-6">სულ კლინიკა</div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {feedback && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
              {feedback}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-dark-4 dark:text-dark-6">
              იტვირთება...
            </div>
          ) : (
            <>
              {(showClinicForm || editingClinicId) && (
                <div className="rounded-xl border border-stroke bg-gray-2/50 p-6 dark:border-dark-3 dark:bg-dark-3/30">
                  <h4 className="mb-4 text-sm font-semibold text-dark dark:text-white">
                    {editingClinicId ? 'კლინიკის რედაქტირება' : 'ახალი კლინიკის დამატება'}
                  </h4>
                  <form onSubmit={handleClinicSubmit} className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>კლინიკის სახელი *</label>
                      <input
                        type="text"
                        required
                        value={clinicForm.name}
                        onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>მისამართი</label>
                      <input
                        type="text"
                        value={clinicForm.address}
                        onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ტელეფონი</label>
                      <input
                        type="text"
                        value={clinicForm.phone}
                        onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ელ. ფოსტა</label>
                      <input
                        type="email"
                        value={clinicForm.email}
                        onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>BOG Merchant ID</label>
                      <input
                        type="text"
                        value={clinicForm.merchantId}
                        onChange={(e) =>
                          setClinicForm({ ...clinicForm, merchantId: e.target.value })
                        }
                        placeholder="მაგ. 000000009812A2W"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Merchant სახელი</label>
                      <input
                        type="text"
                        value={clinicForm.merchantName}
                        onChange={(e) =>
                          setClinicForm({ ...clinicForm, merchantName: e.target.value })
                        }
                        placeholder="მაგ. MEDEKSES.COM"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>BOG Client ID</label>
                      <input
                        type="text"
                        value={clinicForm.bogClientId}
                        onChange={(e) =>
                          setClinicForm({ ...clinicForm, bogClientId: e.target.value })
                        }
                        placeholder="კლინიკის BOG client_id"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        BOG Client Secret {editingClinicId ? '(ცარიელი დატოვე თუ არ იცვლება)' : ''}
                      </label>
                      <input
                        type="password"
                        value={clinicForm.bogClientSecret}
                        onChange={(e) =>
                          setClinicForm({ ...clinicForm, bogClientSecret: e.target.value })
                        }
                        placeholder="კლინიკის BOG client_secret"
                        className={inputClass}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="clinic-active"
                        type="checkbox"
                        checked={clinicForm.isActive}
                        onChange={(e) =>
                          setClinicForm({ ...clinicForm, isActive: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <label htmlFor="clinic-active" className="text-sm text-dark dark:text-white">
                        აქტიური
                      </label>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-lg border border-stroke px-4 py-2 text-sm dark:border-dark-3"
                      >
                        გაუქმება
                      </button>
                      <button
                        type="button"
                        onClick={() => setClinicForm({ ...defaultClinicForm })}
                        className="rounded-lg border border-stroke px-4 py-2 text-sm dark:border-dark-3"
                      >
                        გასუფთავება
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        {editingClinicId ? 'განახლება' : 'დამატება'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 text-left text-xs uppercase text-dark-4 dark:border-dark-3 dark:bg-dark-3">
                      <th className="p-3">სახელი</th>
                      <th className="p-3">მისამართი</th>
                      <th className="p-3">ტელეფონი</th>
                      <th className="p-3">ელ. ფოსტა</th>
                      <th className="p-3">Merchant ID</th>
                      <th className="p-3">Merchant სახელი</th>
                      <th className="p-3">BOG Credentials</th>
                      <th className="p-3">სტატუსი</th>
                      <th className="p-3 text-right">ქმედებები</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinics.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-dark-4">
                          კლინიკა არ მოიძებნა
                        </td>
                      </tr>
                    ) : (
                      clinics.map((clinic) => (
                        <tr
                          key={clinic.id}
                          className="border-b border-stroke text-dark last:border-0 dark:border-dark-3 dark:text-white"
                        >
                          <td className="p-3 font-medium">{clinic.name}</td>
                          <td className="p-3">{clinic.address || '—'}</td>
                          <td className="p-3">{clinic.phone || '—'}</td>
                          <td className="p-3">{clinic.email || '—'}</td>
                          <td className="p-3 font-mono text-xs">
                            {clinic.merchantId || '—'}
                          </td>
                          <td className="p-3">{clinic.merchantName || '—'}</td>
                          <td className="p-3">
                            {clinic.hasBogCredentials ? (
                              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                დაყენებულია
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                აკლია
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                clinic.isActive
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                  : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                              }`}
                            >
                              {clinic.isActive ? 'აქტიური' : 'გამორთული'}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => startClinicEdit(clinic)}
                              className="text-primary hover:underline"
                            >
                              რედაქტირება
                            </button>
                            <button
                              onClick={() => handleDeleteClinic(clinic.id)}
                              className="text-red-500 hover:underline"
                            >
                              წაშლა
                            </button>
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
    </>
  );
}
