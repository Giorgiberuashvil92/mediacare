'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import { apiService } from '@/lib/api';
import { useEffect, useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  isActive: boolean;
  order: number;
}

interface ContactInfo {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  workingHours?: string;
}

export default function HelpCenterPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // New FAQ form
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const loadHelpCenter = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getHelpCenterAdmin();
      if (response.success && response.data) {
        setFaqs(response.data.faqs || []);
        setContactInfo(response.data.contactInfo || {});
      }
    } catch (err: any) {
      setError(err.message || 'ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHelpCenter();
  }, []);

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);
      
      const response = await apiService.updateHelpCenter({
        faqs: faqs.map((faq, index) => ({
          ...faq,
          order: index,
        })),
        contactInfo,
      });
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('შენახვა ვერ მოხერხდა');
      }
    } catch (err: any) {
      setError(err.message || 'შენახვა ვერ მოხერხდა');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFaq = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      setError('შეავსეთ კითხვა და პასუხი');
      return;
    }
    setFaqs([...faqs, { ...newFaq, isActive: true, order: faqs.length }]);
    setNewFaq({ question: '', answer: '' });
    setError(null);
  };

  const handleUpdateFaq = (index: number, field: keyof FAQItem, value: any) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  const handleDeleteFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === faqs.length - 1) return;
    
    const updated = [...faqs];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFaqs(updated);
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
      <Breadcrumb pageName="დახმარების ცენტრი" />
      
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-4">
          <p className="text-sm text-green-800">წარმატებით შეინახა!</p>
        </div>
      )}

      {/* Contact Info Section */}
      <div className="mb-6 rounded-sm border border-stroke bg-white shadow-default">
        <div className="border-b border-stroke px-6.5 py-4">
          <h3 className="font-medium text-black">საკონტაქტო ინფორმაცია</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6.5 md:grid-cols-2">
          <div>
            <label className="mb-2.5 block text-black">ტელეფონი</label>
            <input
              type="text"
              value={contactInfo.phone || ''}
              onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
              placeholder="+995 XXX XXX XXX"
              className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2.5 block text-black">WhatsApp</label>
            <input
              type="text"
              value={contactInfo.whatsapp || ''}
              onChange={(e) => setContactInfo({ ...contactInfo, whatsapp: e.target.value })}
              placeholder="+995 XXX XXX XXX"
              className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2.5 block text-black">ელ-ფოსტა</label>
            <input
              type="email"
              value={contactInfo.email || ''}
              onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
              placeholder="support@example.com"
              className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2.5 block text-black">ვებსაიტი</label>
            <input
              type="text"
              value={contactInfo.website || ''}
              onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })}
              placeholder="www.example.com"
              className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2.5 block text-black">მისამართი</label>
            <input
              type="text"
              value={contactInfo.address || ''}
              onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
              placeholder="თბილისი, საქართველო"
              className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-2.5 block text-black">სამუშაო საათები</label>
            <input
              type="text"
              value={contactInfo.workingHours || ''}
              onChange={(e) => setContactInfo({ ...contactInfo, workingHours: e.target.value })}
              placeholder="ორშ-პარ: 09:00-18:00"
              className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-black outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="rounded-sm border border-stroke bg-white shadow-default">
        <div className="border-b border-stroke px-6.5 py-4">
          <h3 className="font-medium text-black">FAQ - ხშირად დასმული კითხვები</h3>
        </div>
        <div className="p-6.5">
          {/* Add New FAQ */}
          <div className="mb-6 rounded-lg border border-stroke bg-gray-50 p-4">
            <h4 className="mb-4 font-medium text-black">ახალი კითხვის დამატება</h4>
            <div className="mb-3">
              <input
                type="text"
                value={newFaq.question}
                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                placeholder="კითხვა"
                className="w-full rounded border border-stroke bg-white px-4 py-2.5 text-black outline-none focus:border-primary"
              />
            </div>
            <div className="mb-3">
              <textarea
                value={newFaq.answer}
                onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                placeholder="პასუხი"
                rows={3}
                className="w-full rounded border border-stroke bg-white px-4 py-2.5 text-black outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleAddFaq}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              დამატება
            </button>
          </div>

          {/* FAQ List */}
          {faqs.length === 0 ? (
            <p className="text-center text-gray-500">FAQ ჯერ არ არის დამატებული</p>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 ${faq.isActive ? 'border-stroke bg-white' : 'border-red-200 bg-red-50'}`}
                >
                  {editingIndex === index ? (
                    <div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleUpdateFaq(index, 'question', e.target.value)}
                        className="mb-2 w-full rounded border border-stroke px-3 py-2 text-black outline-none focus:border-primary"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(index, 'answer', e.target.value)}
                        rows={3}
                        className="mb-2 w-full rounded border border-stroke px-3 py-2 text-black outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-opacity-90"
                      >
                        დასრულება
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <span className="mr-2 text-sm font-medium text-gray-500">#{index + 1}</span>
                          <span className="font-semibold text-black">{faq.question}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMoveFaq(index, 'up')}
                            disabled={index === 0}
                            className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveFaq(index, 'down')}
                            disabled={index === faqs.length - 1}
                            className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={faq.isActive}
                              onChange={(e) => handleUpdateFaq(index, 'isActive', e.target.checked)}
                              className="h-4 w-4"
                            />
                            აქტიური
                          </label>
                          <button
                            onClick={() => setEditingIndex(index)}
                            className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                          >
                            რედაქტირება
                          </button>
                          <button
                            onClick={() => handleDeleteFaq(index)}
                            className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                          >
                            წაშლა
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={submitting}
          className="rounded bg-primary px-8 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {submitting ? 'შენახვა...' : 'ყველაფრის შენახვა'}
        </button>
      </div>
    </>
  );
}
