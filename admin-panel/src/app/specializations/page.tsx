'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService, Specialization } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';

export default function SpecializationsPage() {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadSpecializations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getSpecializationsAdmin();
      if (response.success) {
        setSpecializations(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'სპეციალიზაციების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecializations();
  }, []);

  const handleAddSymptom = () => {
    if (currentSymptom.trim() && !symptoms.includes(currentSymptom.trim())) {
      setSymptoms([...symptoms, currentSymptom.trim()]);
      setCurrentSymptom('');
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter((s) => s !== symptom));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('სპეციალიზაციის დასახელება სავალდებულოა');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (editingId) {
        await apiService.updateSpecialization(editingId, {
          name: name.trim(),
          description: description.trim() || undefined,
          symptoms: symptoms.length > 0 ? symptoms : undefined,
        });
      } else {
        await apiService.createSpecialization({
          name: name.trim(),
          description: description.trim() || undefined,
          symptoms: symptoms.length > 0 ? symptoms : undefined,
        });
      }
      setName('');
      setDescription('');
      setSymptoms([]);
      setCurrentSymptom('');
      setEditingId(null);
      await loadSpecializations();
    } catch (err: any) {
      setError(err.message || 'სპეციალიზაციის შექმნა ვერ მოხერხდა');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      setError(null);
      await apiService.toggleSpecialization(id, !isActive);
      await loadSpecializations();
    } catch (err: any) {
      setError(err.message || 'სპეციალიზაციის განახლება ვერ მოხერხდა');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('სპეციალიზაციის წაშლა?')) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteSpecialization(id);
      await loadSpecializations();
    } catch (err: any) {
      setError(err.message || 'სპეციალიზაციის წაშლა ვერ მოხერხდა');
    }
  };

  const handleEdit = (spec: Specialization) => {
    setEditingId(spec._id);
    setName(spec.name);
    setDescription(spec.description || '');
    setSymptoms(spec.symptoms || []);
    setCurrentSymptom('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setSymptoms([]);
    setCurrentSymptom('');
    setError(null);
  };

  const activeCount = useMemo(
    () => specializations.filter((spec) => spec.isActive).length,
    [specializations],
  );

  return (
    <div>
      <Breadcrumb pageName="სპეციალიზაციები" />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              {editingId ? 'რედაქტირება' : 'სპეციალიზაციის დამატება'}
            </h2>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-sm font-medium text-dark-4 underline-offset-2 hover:underline dark:text-dark-6"
              >
                გააუქმე
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-dark-6">
                დასახელება
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="მაგ. კარდიოლოგია"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-dark-6">
                აღწერა (არასავალდებულო)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="დამატებითი ინფორმაცია"
                rows={3}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-dark-6">
                სიმპტომები
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentSymptom}
                  onChange={(e) => setCurrentSymptom(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSymptom();
                    }
                  }}
                  placeholder="დაამატე სიმპტომა"
                  className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddSymptom}
                  className="rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/20"
                >
                  +
                </button>
              </div>
              {symptoms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {symptoms.map((symptom, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {symptom}
                      <button
                        type="button"
                        onClick={() => handleRemoveSymptom(symptom)}
                        className="ml-1 text-primary hover:text-primary/70"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? editingId
                  ? 'რედაქტირება...'
                  : 'დამატება...'
                : editingId
                ? 'განაახლე სპეციალიზაცია'
                : 'დაამატე სპეციალიზაცია'}
            </button>
          </form>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              ყველა სპეციალიზაცია
            </h2>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {activeCount} აქტიური
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : specializations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stroke p-6 text-center text-sm text-dark-4 dark:border-dark-3 dark:text-dark-6">
              სპეციალიზაციები არ არის. დაამატე პირველი.
            </div>
          ) : (
            <div className="space-y-4">
              {specializations.map((spec) => (
                <div
                  key={spec._id}
                  className="flex flex-col gap-3 rounded-lg border border-stroke p-4 transition hover:shadow dark:border-dark-3 dark:bg-gray-dark sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <p className="text-base font-medium text-dark dark:text-white">
                      {spec.name}
                    </p>
                    {spec.description && (
                      <p className="text-sm text-dark-4 dark:text-dark-6">
                        {spec.description}
                      </p>
                    )}
                    {spec.symptoms && spec.symptoms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {spec.symptoms.map((symptom, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            {symptom}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-dark-4 dark:text-dark-6">
                      დამატებულია{' '}
                      {new Date(spec.createdAt || '').toLocaleDateString('ka-GE')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => handleEdit(spec)}
                      className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
                    >
                      რედაქტირება
                    </button>
                    <button
                      onClick={() => handleToggle(spec._id, spec.isActive)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        spec.isActive
                          ? 'bg-warning/10 text-warning hover:bg-warning/20'
                          : 'bg-success/10 text-success hover:bg-success/20'
                      }`}
                    >
                      {spec.isActive ? 'დეაქტივაცია' : 'აქტივაცია'}
                    </button>
                    <button
                      onClick={() => handleDelete(spec._id)}
                      className="rounded-lg bg-danger/10 px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/20"
                    >
                      წაშლა
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
