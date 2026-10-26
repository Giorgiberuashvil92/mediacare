"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiService } from "@/lib/api";
import { Fragment, useEffect, useState } from "react";

type PaymentAttempt = {
  orderId: string;
  status: "pending" | "successful" | "failed";
  plan: string;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt?: string;
};

const getFinalPaymentAttempts = (payments?: PaymentAttempt[]) =>
  (payments || []).filter((payment) => payment.status !== "pending");

type Subscription = {
  _id: string;
  plan: string;
  status: string;
  monthlyLimit: number;
  usageCount: number;
  periodStart: string;
  periodEnd: string;
  cardSaveStatus?: string;
  savedCardParentOrderId?: string;
  payments?: PaymentAttempt[];
  userId?: { name?: string; email?: string; phone?: string };
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ka-GE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const paymentStatusClass: Record<string, string> = {
  successful: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function AISubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiService
      .getAISubscriptions()
      .then((response) => setItems(response.data as Subscription[]))
      .catch((reason: any) => setError(reason?.message || "ჩატვირთვა ვერ მოხერხდა"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Breadcrumb pageName="AI გამოწერები" />
      <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark sm:p-7.5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-dark dark:text-white">AI გამოწერები</h2>
            <p className="mt-1 text-sm text-dark-4 dark:text-dark-6">მომხმარებლების გეგმები, ლიმიტები და ვადები</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{items.length}</span>
        </div>
        {loading ? <p className="py-8 text-center">იტვირთება...</p> : error ? <p className="py-8 text-center text-red-500">{error}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead><tr className="border-b border-stroke dark:border-dark-3">
                {['მომხმარებელი', 'გეგმა', 'სტატუსი', 'ბარათი', 'BOG Parent Order', 'ცდები', 'გამოყენება', 'პერიოდი', 'განახლდა'].map((heading) => <th key={heading} className="p-4 font-medium text-dark dark:text-white">{heading}</th>)}
              </tr></thead>
              <tbody>{items.map((item) => (
                <Fragment key={item._id}>
                  <tr className="border-b border-stroke dark:border-dark-3">
                    <td className="p-4"><div className="font-medium text-dark dark:text-white">{item.userId?.name || '-'}</div><div className="text-xs text-dark-4">{item.userId?.email || '-'}</div></td>
                    <td className="p-4 uppercase text-dark dark:text-white">{item.plan}</td>
                    <td className="p-4"><span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">{item.status}</span></td>
                    <td className="p-4"><span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{item.cardSaveStatus || 'none'}</span></td>
                    <td className="max-w-[220px] truncate p-4 font-mono text-xs text-dark-4" title={item.savedCardParentOrderId || ''}>{item.savedCardParentOrderId || '-'}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                        onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                      >
                        {getFinalPaymentAttempts(item.payments).length} ცდა
                      </button>
                    </td>
                    <td className="p-4 text-dark-4">{item.usageCount} / {item.monthlyLimit}</td>
                    <td className="p-4 text-dark-4">{new Date(item.periodStart).toLocaleDateString('ka-GE')} — {new Date(item.periodEnd).toLocaleDateString('ka-GE')}</td>
                    <td className="p-4 text-dark-4">{new Date(item.periodEnd).toLocaleDateString('ka-GE')}</td>
                  </tr>
                  {expandedId === item._id ? (
                    <tr className="border-b border-stroke bg-gray-1/60 dark:border-dark-3 dark:bg-dark-2">
                      <td colSpan={9} className="p-4">
                        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-medium text-dark dark:text-white">გადახდის ცდები</h3>
                            <span className="text-xs text-dark-4">{item.userId?.email || item.userId?.phone || "-"}</span>
                          </div>
                          {getFinalPaymentAttempts(item.payments).length ? (
                            <table className="w-full min-w-[760px] text-left text-xs">
                              <thead>
                                <tr className="border-b border-stroke dark:border-dark-3">
                                  {["Order ID", "სტატუსი", "გეგმა", "თანხა", "შეიქმნა", "გადახდილია"].map((heading) => (
                                    <th key={heading} className="p-3 font-medium text-dark dark:text-white">{heading}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[...getFinalPaymentAttempts(item.payments)].reverse().map((payment) => (
                                  <tr key={payment.orderId} className="border-b border-stroke last:border-0 dark:border-dark-3">
                                    <td className="max-w-[260px] truncate p-3 font-mono text-dark-4" title={payment.orderId}>{payment.orderId}</td>
                                    <td className="p-3">
                                      <span className={`rounded-full px-2 py-1 text-xs ${paymentStatusClass[payment.status] || "bg-gray-100 text-dark-4"}`}>
                                        {payment.status}
                                      </span>
                                    </td>
                                    <td className="p-3 uppercase text-dark-4">{payment.plan}</td>
                                    <td className="p-3 text-dark-4">{payment.amount} {payment.currency}</td>
                                    <td className="p-3 text-dark-4">{formatDateTime(payment.createdAt)}</td>
                                    <td className="p-3 text-dark-4">{formatDateTime(payment.paidAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="py-4 text-center text-sm text-dark-4">ამ მომხმარებელზე დასრულებული გადახდის ცდები ჯერ არ არის</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}</tbody>
            </table>
            {!items.length && <p className="py-8 text-center text-dark-4">გამოწერები ჯერ არ არის</p>}
          </div>
        )}
      </div>
    </>
  );
}
