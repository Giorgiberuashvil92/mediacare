'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService } from '@/lib/api';
import { useEffect, useState } from 'react';

type TermType = 'cancellation' | 'service' | 'privacy' | 'contract' | 'usage' | 'doctor-cancellation' | 'doctor-service';

interface Term {
  type: string;
  content: string;
  contentEn?: string;
  contentRu?: string;
  updatedAt?: string;
}

type TermContentValues = Pick<Term, 'content' | 'contentEn' | 'contentRu'>;

function TermLanguageFields({
  values,
  onChange,
}: {
  values: TermContentValues;
  onChange: (field: keyof TermContentValues, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stroke bg-white p-3">
        <p className="mb-2 text-sm font-medium text-black">ქართული *</p>
        <textarea
          value={values.content}
          onChange={(e) => onChange('content', e.target.value)}
          rows={12}
          className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
          placeholder="შეიყვანეთ ტერმინების კონტენტი (ქართული)..."
        />
      </div>

      <div className="rounded-lg border border-stroke bg-white p-3">
        <p className="mb-2 text-sm font-medium text-black">English</p>
        <textarea
          value={values.contentEn || ''}
          onChange={(e) => onChange('contentEn', e.target.value)}
          rows={12}
          className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
          placeholder="Enter terms content (English)..."
        />
      </div>

      <div className="rounded-lg border border-stroke bg-white p-3">
        <p className="mb-2 text-sm font-medium text-black">Русский</p>
        <textarea
          value={values.contentRu || ''}
          onChange={(e) => onChange('contentRu', e.target.value)}
          rows={12}
          className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
          placeholder="Введите текст условий (русский)..."
        />
      </div>
    </div>
  );
}

const termLabels: Record<TermType, string> = {
  cancellation: 'ჯავშნების გაუქმების პირობები',
  service: 'სერვისის პირობები',
  privacy: 'კონფიდენციალურობა',
  contract: 'ხელშეკრულება (ექიმებისთვის)',
  usage: 'მოხმარების წესები (ექიმებისთვის)',
  'doctor-cancellation': 'ჯავშნების გაუქმების პირობები (ექიმებისთვის)',
  'doctor-service': 'სერვისის პირობები (ექიმებისთვის)',
};

export default function TermsPage() {
  const [terms, setTerms] = useState<Record<TermType, Term>>({
    cancellation: { type: 'cancellation', content: '' },
    service: { type: 'service', content: '' },
    privacy: { type: 'privacy', content: '' },
    contract: { type: 'contract', content: '' },
    usage: { type: 'usage', content: '' },
    'doctor-cancellation': { type: 'doctor-cancellation', content: '' },
    'doctor-service': { type: 'doctor-service', content: '' },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<TermType | null>(null);
  const [editContent, setEditContent] = useState<TermContentValues>({
    content: '',
    contentEn: '',
    contentRu: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadTerms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [cancellationRes, serviceRes, privacyRes, contractRes, usageRes, doctorCancellationRes, doctorServiceRes] = await Promise.all([
        apiService.getTerms('cancellation'),
        apiService.getTerms('service'),
        apiService.getTerms('privacy'),
        apiService.getTerms('contract'),
        apiService.getTerms('usage'),
        apiService.getTerms('doctor-cancellation'),
        apiService.getTerms('doctor-service'),
      ]);

      if (cancellationRes.success && serviceRes.success && privacyRes.success) {
        setTerms({
          cancellation: cancellationRes.data,
          service: serviceRes.data,
          privacy: privacyRes.data,
          contract: contractRes.data || { type: 'contract', content: '' },
          usage: usageRes.data || { type: 'usage', content: '' },
          'doctor-cancellation': doctorCancellationRes.data || { type: 'doctor-cancellation', content: '' },
          'doctor-service': doctorServiceRes.data || { type: 'doctor-service', content: '' },
        });
      } else {
        setError('ტერმინების ჩატვირთვა ვერ მოხერხდა');
      }
    } catch (err: any) {
      setError(err.message || 'ტერმინების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  const handleEdit = (type: TermType) => {
    setEditingType(type);
    setEditContent({
      content: terms[type].content,
      contentEn: terms[type].contentEn || '',
      contentRu: terms[type].contentRu || '',
    });
  };

  const handleCancel = () => {
    setEditingType(null);
    setEditContent({ content: '', contentEn: '', contentRu: '' });
  };

  const handleSave = async (type: TermType) => {
    if (!editContent.content.trim()) {
      setError('ქართული კონტენტი არ შეიძლება იყოს ცარიელი');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await apiService.updateTerms(type, {
        content: editContent.content.trim(),
        contentEn: editContent.contentEn?.trim() || '',
        contentRu: editContent.contentRu?.trim() || '',
      });
      
      if (response.success) {
        setTerms((prev) => ({
          ...prev,
          [type]: response.data,
        }));
        setEditingType(null);
        setEditContent({ content: '', contentEn: '', contentRu: '' });
      } else {
        setError('ტერმინის განახლება ვერ მოხერხდა');
      }
    } catch (err: any) {
      setError(err.message || 'ტერმინის განახლება ვერ მოხერხდა');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-gray-600">იტვირთება...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb pageName="ტერმინები" />
      <div className="rounded-sm border border-stroke bg-white shadow-default">
        <div className="border-b border-stroke px-6.5 py-4">
          <h3 className="font-medium text-black">ტერმინების მართვა</h3>
        </div>

        {error && (
          <div className="mx-6.5 mt-4 rounded border border-red-300 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="p-6.5">
          {(['cancellation', 'service', 'privacy', 'contract', 'usage', 'doctor-cancellation', 'doctor-service'] as TermType[]).map((type) => (
            <div key={type} className="mb-6 rounded-lg border border-stroke bg-gray-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-black">
                  {termLabels[type]}
                </h4>
                {editingType !== type && (
                  <button
                    onClick={() => handleEdit(type)}
                    className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                  >
                    რედაქტირება
                  </button>
                )}
              </div>

              {editingType === type ? (
                <div>
                  <TermLanguageFields
                    values={editContent}
                    onChange={(field, value) =>
                      setEditContent((prev) => ({ ...prev, [field]: value }))
                    }
                  />
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleSave(type)}
                      disabled={submitting}
                      className="rounded bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {submitting ? 'შენახვა...' : 'შენახვა'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={submitting}
                      className="rounded border border-stroke bg-white px-6 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50"
                    >
                      გაუქმება
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded border border-stroke bg-white p-4">
                    <p className="mb-1 text-xs font-medium text-gray-500">ქართული</p>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                      {terms[type].content || 'კონტენტი ჯერ არ არის დამატებული.'}
                    </p>
                  </div>
                  {(terms[type].contentEn || terms[type].contentRu) && (
                    <>
                      {terms[type].contentEn && (
                        <div className="rounded border border-stroke bg-white p-4">
                          <p className="mb-1 text-xs font-medium text-gray-500">English</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {terms[type].contentEn}
                          </p>
                        </div>
                      )}
                      {terms[type].contentRu && (
                        <div className="rounded border border-stroke bg-white p-4">
                          <p className="mb-1 text-xs font-medium text-gray-500">Русский</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {terms[type].contentRu}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {terms[type].updatedAt && (
                    <p className="mt-2 text-xs text-gray-500">
                      ბოლო განახლება: {new Date(terms[type].updatedAt!).toLocaleString('ka-GE')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

