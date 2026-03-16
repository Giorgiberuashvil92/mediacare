'use client';

import Breadcrumb from '@/components/Breadcrumbs/Breadcrumb';
import {
  type Clinic,
  ShopCategory,
  ShopEntityType,
  ShopProduct,
  apiService
} from '@/lib/api';
import { FormEvent, useEffect, useMemo, useState } from 'react';

const CATEGORY_TYPES: ShopEntityType[] = ['laboratory', 'equipment'];

const defaultCategoryForm = {
  name: '',
  type: 'laboratory' as ShopEntityType,
  description: '',
  imageUrl: '',
  isActive: true,
  parentCategory: '',
  order: '',
};

const defaultProductForm = {
  name: '',
  icdCode: '',
  icdCode2: '',
  uniqueCode: '',
  type: 'laboratory' as ShopEntityType,
  description: '',
  price: '',
  currency: 'GEL',
  discountPercent: '',
  stock: '',
  unit: '',
  category: '',
  isActive: true,
  isFeatured: false,
  imageUrl: '',
  order: '',
  clinic: '',
};

const defaultClinicForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
  isActive: true,
};

export default function MedicineShopPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [categoryForm, setCategoryForm] = useState({ ...defaultCategoryForm });
  const [productForm, setProductForm] = useState({ ...defaultProductForm });
  const [clinicForm, setClinicForm] = useState({ ...defaultClinicForm });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | ShopEntityType>('all');
  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'clinics'>('categories');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showClinicForm, setShowClinicForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoryResponse, productResponse, clinicResponse] = await Promise.all([
        apiService.getShopCategories({ includeProducts: true }),
        apiService.getShopProducts({ limit: 200 }),
        apiService.getClinics(),
      ]);

      if (categoryResponse.success) {
        setCategories(categoryResponse.data);
      }

      if (productResponse.success) {
        setProducts(productResponse.data.items);
      }

      if (clinicResponse.success) {
        setClinics(clinicResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to load shop data', err);
      setError(err.message || 'მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (typeFilter === 'all') {
      return categories;
    }
    return categories.filter((category) => category.type === typeFilter);
  }, [categories, typeFilter]);

  const filteredProducts = useMemo(() => {
    if (typeFilter === 'all') {
      return products;
    }
    return products.filter((product) => product.type === typeFilter);
  }, [products, typeFilter]);

  const handleCategorySubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setFeedback(null);
      setError(null);

      const payload = {
        name: categoryForm.name,
        type: categoryForm.type,
        description: categoryForm.description || undefined,
        imageUrl: categoryForm.imageUrl || undefined,
        isActive: categoryForm.isActive,
        order: categoryForm.order ? Number(categoryForm.order) : undefined,
        parentCategory: categoryForm.parentCategory || undefined,
      };

      if (editingCategoryId) {
        await apiService.updateShopCategory(editingCategoryId, payload);
        setFeedback('კატეგორია წარმატებით განახლდა');
      } else {
        await apiService.createShopCategory(payload);
        setFeedback('ახალი კატეგორია დაემატა');
      }

      setCategoryForm({ ...defaultCategoryForm });
      setEditingCategoryId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'ოპერაცია ვერ შესრულდა');
    }
  };

  const handleProductSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setFeedback(null);
      setError(null);

      const payload = {
        name: productForm.name,
        icdCode: productForm.icdCode || undefined,
        icdCode2: productForm.icdCode2 || undefined,
        uniqueCode: productForm.uniqueCode || undefined,
        type: productForm.type,
        description: productForm.description || undefined,
        price: productForm.price ? Number(productForm.price) : undefined,
        currency: productForm.currency || undefined,
        discountPercent: productForm.discountPercent
          ? Number(productForm.discountPercent)
          : undefined,
        stock: productForm.stock ? Number(productForm.stock) : undefined,
        unit: productForm.unit || undefined,
        category: productForm.category || undefined,
        isActive: productForm.isActive,
        isFeatured: productForm.isFeatured,
        imageUrl: productForm.imageUrl || undefined,
        order: productForm.order ? Number(productForm.order) : undefined,
        clinic: productForm.clinic || undefined,
      };

      if (editingProductId) {
        await apiService.updateShopProduct(editingProductId, payload);
        setFeedback('პროდუქტი განახლდა');
      } else {
        await apiService.createShopProduct(payload);
        setFeedback('პროდუქტი დაემატა');
      }

      setProductForm({ ...defaultProductForm });
      setEditingProductId(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'პროდუქტის შენახვა ვერ მოხერხდა');
    }
  };

  const startCategoryEdit = (category: ShopCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      type: category.type,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      isActive: category.isActive,
      parentCategory: category.parentCategory || '',
      order: category.order ? String(category.order) : '',
    });
  };

  const startProductEdit = (product: ShopProduct) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      icdCode: product.icdCode || '',
      icdCode2: product.icdCode2 || '',
      uniqueCode: product.uniqueCode || '',
      type: product.type,
      description: product.description || '',
      price: product.price !== undefined ? String(product.price) : '',
      currency: product.currency || 'GEL',
      discountPercent:
        product.discountPercent !== undefined ? String(product.discountPercent) : '',
      stock: product.stock !== undefined ? String(product.stock) : '',
      unit: product.unit || '',
      category: product.category || '',
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      imageUrl: product.imageUrl || '',
      order: product.order !== undefined ? String(product.order) : '',
      clinic: product.clinic || '',
    });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('დარწმუნებული ხარ რომ გინდა კატეგორიის წაშლა?')) {
      return;
    }
    try {
      await apiService.deleteShopCategory(id);
      setFeedback('კატეგორია წაიშალა');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'კატეგორიის წაშლა ვერ მოხერხდა');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('დარწმუნებული ხარ რომ გინდა პროდუქტის წაშლა?')) {
      return;
    }
    try {
      await apiService.deleteShopProduct(id);
      setFeedback('პროდუქტი წაიშალა');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'პროდუქტის წაშლა ვერ მოხერხდა');
    }
  };

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
      await loadData();
    } catch (err: any) {
      setError(err.message || 'ოპერაცია ვერ შესრულდა');
    }
  };

  const startClinicEdit = (clinic: Clinic) => {
    setEditingClinicId(clinic.id);
    setClinicForm({
      name: clinic.name,
      address: clinic.address || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      isActive: clinic.isActive,
    });
  };

  const handleDeleteClinic = async (id: string) => {
    if (!confirm('დარწმუნებული ხარ რომ გინდა კლინიკის წაშლა?')) {
      return;
    }
    try {
      await apiService.deleteClinic(id);
      setFeedback('კლინიკა წაიშალა');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'კლინიკის წაშლა ვერ მოხერხდა');
    }
  };

  const equipmentCategories = useMemo(
    () => categories.filter((category) => category.type === 'equipment'),
    [categories],
  );
  const laboratoryCategories = useMemo(
    () => categories.filter((category) => category.type === 'laboratory'),
    [categories],
  );

  const inputClass =
    'w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary';
  const labelClass = 'mb-2 block text-sm font-medium text-dark dark:text-white';

  return (
    <>
      <Breadcrumb pageName="მედიკამენტების მაღაზია" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke p-6 dark:border-dark-3">
          <h2 className="text-2xl font-bold text-dark dark:text-white">
            მედიცინ შოპის მართვა
          </h2>
          <p className="mt-1 text-dark-4 dark:text-dark-6">
            კატეგორიები, პროდუქტები (ლაბორატორიული / ინსტრუმენტული გამოკვლევები) და კლინიკები
          </p>

          {!loading && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div
                onClick={() => setActiveTab('categories')}
                className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                  activeTab === 'categories'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-stroke hover:border-primary/50 dark:border-dark-3'
                }`}
              >
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {categories.length}
                </div>
                <div className="text-sm text-dark-4 dark:text-dark-6">კატეგორია</div>
              </div>
              <div
                onClick={() => setActiveTab('products')}
                className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                  activeTab === 'products'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-stroke hover:border-primary/50 dark:border-dark-3'
                }`}
              >
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {products.length}
                </div>
                <div className="text-sm text-dark-4 dark:text-dark-6">პროდუქტი</div>
              </div>
              <div
                onClick={() => setActiveTab('clinics')}
                className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                  activeTab === 'clinics'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-stroke hover:border-primary/50 dark:border-dark-3'
                }`}
              >
                <div className="text-2xl font-bold text-dark dark:text-white">
                  {clinics.length}
                </div>
                <div className="text-sm text-dark-4 dark:text-dark-6">კლინიკა</div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-b border-stroke dark:border-dark-3">
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === 'categories'
                  ? 'bg-primary text-white'
                  : 'text-dark-4 hover:bg-gray-2 hover:text-dark dark:text-dark-6 dark:hover:bg-dark-3 dark:hover:text-white'
              }`}
            >
              კატეგორიები
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === 'products'
                  ? 'bg-primary text-white'
                  : 'text-dark-4 hover:bg-gray-2 hover:text-dark dark:text-dark-6 dark:hover:bg-dark-3 dark:hover:text-white'
              }`}
            >
              პროდუქტები
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clinics')}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === 'clinics'
                  ? 'bg-primary text-white'
                  : 'text-dark-4 hover:bg-gray-2 hover:text-dark dark:text-dark-6 dark:hover:bg-dark-3 dark:hover:text-white'
              }`}
            >
              კლინიკები
            </button>
          </div>
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
            <div className="flex items-center justify-center py-20 text-dark-4">
              იტვირთება მედიცინ შოპის მონაცემები...
            </div>
          ) : (
            <>
              {activeTab === 'categories' && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-dark dark:text-white">
                      კატეგორიების სია
                    </h3>
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      ლაბორატორიული და ინსტრუმენტული გამოკვლევების კატეგორიები
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as 'all' | ShopEntityType)}
                      className={inputClass}
                    >
                      <option value="all">ყველა ტიპი</option>
                      <option value="laboratory">ლაბორატორიული</option>
                      <option value="equipment">ინსტრუმენტული</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryForm((v) => !v);
                        if (showCategoryForm) {
                          setEditingCategoryId(null);
                          setCategoryForm({ ...defaultCategoryForm });
                        }
                      }}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      {showCategoryForm ? 'ფორმის დამალვა' : 'ახალი კატეგორია'}
                    </button>
                  </div>
                </div>

                {(showCategoryForm || editingCategoryId) && (
                  <div className="rounded-xl border border-stroke bg-gray-2/50 p-6 dark:border-dark-3 dark:bg-dark-3/30">
                    <h4 className="mb-4 text-sm font-semibold text-dark dark:text-white">
                      {editingCategoryId ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორიის დამატება'}
                    </h4>
                    <form onSubmit={handleCategorySubmit} className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className={labelClass}>კატეგორიის სახელი *</label>
                        <input
                          type="text"
                          required
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>ტიპი</label>
                        <select
                          value={categoryForm.type}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, type: e.target.value as ShopEntityType })
                          }
                          className={inputClass}
                        >
                          {CATEGORY_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type === 'laboratory' ? 'ლაბორატორიული' : 'ინსტრუმენტული'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>მშობელი კატეგორია</label>
                        <select
                          value={categoryForm.parentCategory}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, parentCategory: e.target.value })
                          }
                          className={inputClass}
                        >
                          <option value="">— არა</option>
                          {categories
                            .filter((c) => c.id !== editingCategoryId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>რიგითობა</label>
                        <input
                          type="number"
                          min={0}
                          value={categoryForm.order}
                          onChange={(e) => setCategoryForm({ ...categoryForm, order: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>აღწერა</label>
                        <textarea
                          rows={2}
                          value={categoryForm.description}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, description: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>სურათის URL</label>
                        <input
                          type="text"
                          value={categoryForm.imageUrl}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, imageUrl: e.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="category-active"
                          type="checkbox"
                          checked={categoryForm.isActive}
                          onChange={(e) =>
                            setCategoryForm({ ...categoryForm, isActive: e.target.checked })
                          }
                          className="h-4 w-4"
                        />
                        <label htmlFor="category-active" className="text-sm text-dark dark:text-white">
                          აქტიური
                        </label>
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-3">
                        {editingCategoryId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(null);
                              setCategoryForm({ ...defaultCategoryForm });
                              setShowCategoryForm(false);
                            }}
                            className="rounded-lg border border-stroke px-4 py-2 text-sm dark:border-dark-3"
                          >
                            გაუქმება
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setCategoryForm({ ...defaultCategoryForm });
                          }}
                          className="rounded-lg border border-stroke px-4 py-2 text-sm dark:border-dark-3"
                        >
                          გასუფთავება
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                          {editingCategoryId ? 'განახლება' : 'დამატება'}
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
                        <th className="p-3">ტიპი</th>
                        <th className="p-3">სტატუსი</th>
                        <th className="p-3">პროდუქტები</th>
                        <th className="p-3 text-right">ქმედებები</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-dark-4">
                            კატეგორია არ მოიძებნა
                          </td>
                        </tr>
                      ) : (
                        filteredCategories.map((category) => (
                          <tr
                            key={category.id}
                            className="border-b border-stroke text-dark last:border-0 dark:border-dark-3 dark:text-white"
                          >
                            <td className="p-3">
                              <div className="font-medium">{category.name}</div>
                              {category.description && (
                                <div className="text-xs text-dark-4">{category.description}</div>
                              )}
                            </td>
                            <td className="p-3">
                              {category.type === 'laboratory' ? 'ლაბორატორიული' : 'ინსტრუმენტული'}
                            </td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  category.isActive
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                    : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                                }`}
                              >
                                {category.isActive ? 'აქტიური' : 'გამორთული'}
                              </span>
                            </td>
                            <td className="p-3">{(category.products?.length || 0)}</td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setShowCategoryForm(true);
                                  startCategoryEdit(category);
                                }}
                                className="text-primary hover:underline"
                              >
                                რედაქტირება
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
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
              </section>
              )}

              {activeTab === 'products' && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-dark dark:text-white">
                      პროდუქტების სია
                    </h3>
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      ლაბორატორიული და ინსტრუმენტული გამოკვლევები
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as 'all' | ShopEntityType)}
                      className={inputClass}
                    >
                      <option value="all">ყველა ტიპი</option>
                      <option value="laboratory">ლაბორატორიული</option>
                      <option value="equipment">ინსტრუმენტული</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm((v) => !v);
                        if (showProductForm) {
                          setEditingProductId(null);
                          setProductForm({ ...defaultProductForm });
                        }
                      }}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      {showProductForm ? 'ფორმის დამალვა' : 'ახალი პროდუქტი'}
                    </button>
                  </div>
                </div>

                {(showProductForm || editingProductId) && (
                  <div className="rounded-xl border border-stroke bg-gray-2/50 p-6 dark:border-dark-3 dark:bg-dark-3/30">
                    <h4 className="mb-4 text-sm font-semibold text-dark dark:text-white">
                      {editingProductId ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტის დამატება'}
                    </h4>
                    <form onSubmit={handleProductSubmit} className="space-y-6">
                      <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                        <div className="mb-3 text-xs font-semibold uppercase text-dark-4 dark:text-dark-6">
                          ძირითადი ინფორმაცია
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={labelClass}>პროდუქტის სახელი *</label>
                            <input
                              type="text"
                              required
                              value={productForm.name}
                              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>ტიპი</label>
                            <select
                              value={productForm.type}
                              onChange={(e) =>
                                setProductForm({
                                  ...productForm,
                                  type: e.target.value as ShopEntityType,
                                  category: '',
                                })
                              }
                              className={inputClass}
                            >
                              {CATEGORY_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type === 'laboratory' ? 'ლაბორატორიული' : 'ინსტრუმენტული'}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelClass}>კატეგორია</label>
                            <select
                              value={productForm.category}
                              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                              required={productForm.type === 'laboratory'}
                              className={inputClass}
                            >
                              <option value="">— აირჩიეთ</option>
                              {(productForm.type === 'laboratory'
                                ? laboratoryCategories
                                : equipmentCategories
                              ).map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className={labelClass}>აღწერა</label>
                            <textarea
                              rows={2}
                              value={productForm.description}
                              onChange={(e) =>
                                setProductForm({ ...productForm, description: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                        <div className="mb-3 text-xs font-semibold uppercase text-dark-4 dark:text-dark-6">
                          ფასი
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className={labelClass}>ფასი (₾)</label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={productForm.price}
                              onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>ფასდაკლება (%)</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={productForm.discountPercent}
                              onChange={(e) =>
                                setProductForm({ ...productForm, discountPercent: e.target.value })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>შეთავაზებული ფასი (₾)</label>
                            <div className="flex h-[42px] items-center rounded-lg border border-stroke bg-gray-50 px-4 dark:border-dark-3 dark:bg-gray-dark">
                              {productForm.price && productForm.discountPercent
                                ? (
                                    Number(productForm.price) *
                                    (1 - Number(productForm.discountPercent) / 100)
                                  ).toFixed(2)
                                : productForm.price || '0.00'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                        <div className="mb-3 text-xs font-semibold uppercase text-dark-4 dark:text-dark-6">
                          კოდები (არასავალდებულო)
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className={labelClass}>ICD კოდი</label>
                            <input
                              type="text"
                              value={productForm.icdCode}
                              onChange={(e) => setProductForm({ ...productForm, icdCode: e.target.value })}
                              placeholder="მაგ: BL.6"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>მეორე ICD</label>
                            <input
                              type="text"
                              value={productForm.icdCode2}
                              onChange={(e) => setProductForm({ ...productForm, icdCode2: e.target.value })}
                              placeholder="მაგ: BL.7"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>NCSP / უნიკალური კოდი</label>
                            <input
                              type="text"
                              value={productForm.uniqueCode}
                              onChange={(e) => setProductForm({ ...productForm, uniqueCode: e.target.value })}
                              placeholder="მაგ: LAB-001"
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                        <div className="mb-3 text-xs font-semibold uppercase text-dark-4 dark:text-dark-6">
                          კლინიკა და მარაგი
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className={labelClass}>კლინიკა</label>
                            <select
                              value={productForm.clinic}
                              onChange={(e) => setProductForm({ ...productForm, clinic: e.target.value })}
                              className={inputClass}
                            >
                              <option value="">—</option>
                              {clinics.filter((c) => c.isActive).map((c) => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>მარაგი</label>
                            <input
                              type="number"
                              min={0}
                              value={productForm.stock}
                              onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>ერთეული</label>
                            <input
                              type="text"
                              value={productForm.unit}
                              onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                        <div className="mb-3 text-xs font-semibold uppercase text-dark-4 dark:text-dark-6">
                          ჩვენება
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={labelClass}>სურათის URL</label>
                            <input
                              type="text"
                              value={productForm.imageUrl}
                              onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>რიგითობა</label>
                            <input
                              type="number"
                              min={0}
                              value={productForm.order}
                              onChange={(e) => setProductForm({ ...productForm, order: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
                              <input
                                type="checkbox"
                                checked={productForm.isActive}
                                onChange={(e) =>
                                  setProductForm({ ...productForm, isActive: e.target.checked })
                                }
                                className="h-4 w-4"
                              />
                              აქტიური
                            </label>
                            <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
                              <input
                                type="checkbox"
                                checked={productForm.isFeatured}
                                onChange={(e) =>
                                  setProductForm({ ...productForm, isFeatured: e.target.checked })
                                }
                                className="h-4 w-4"
                              />
                              გამორჩეული
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        {editingProductId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(null);
                              setProductForm({ ...defaultProductForm });
                              setShowProductForm(false);
                            }}
                            className="rounded-lg border border-stroke px-4 py-2 text-sm dark:border-dark-3"
                          >
                            გაუქმება
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProductId(null);
                            setProductForm({ ...defaultProductForm });
                          }}
                          className="rounded-lg border border-stroke px-4 py-2 text-sm dark:border-dark-3"
                        >
                          გასუფთავება
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
                        >
                          {editingProductId ? 'განახლება' : 'დამატება'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stroke bg-gray-2 text-left text-xs uppercase text-dark-4 dark:border-dark-3 dark:bg-dark-3">
                        <th className="p-3">კვლევა</th>
                        <th className="p-3">კოდები</th>
                        <th className="p-3">ფასი</th>
                        <th className="p-3">შეთავაზებული</th>
                        <th className="p-3">კლინიკა</th>
                        <th className="p-3">სტატუსი</th>
                        <th className="p-3 text-right">ქმედებები</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-dark-4">
                            პროდუქტი არ მოიძებნა
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => {
                          const discountedPrice =
                            product.price && product.discountPercent
                              ? product.price * (1 - product.discountPercent / 100)
                              : product.price || 0;
                          const codes = [product.icdCode, product.icdCode2, product.uniqueCode]
                            .filter(Boolean)
                            .join(' / ') || '—';
                          return (
                            <tr
                              key={product.id}
                              className="border-b border-stroke text-dark last:border-0 dark:border-dark-3 dark:text-white"
                            >
                              <td className="p-3">
                                <div className="font-medium">{product.name}</div>
                                {product.description && (
                                  <div className="text-xs text-dark-4 line-clamp-1">{product.description}</div>
                                )}
                              </td>
                              <td className="p-3 text-xs">{codes}</td>
                              <td className="p-3">
                                {product.price != null ? `₾${product.price.toFixed(2)}` : '—'}
                              </td>
                              <td className="p-3 font-medium text-green-600 dark:text-green-400">
                                {discountedPrice > 0 ? `₾${discountedPrice.toFixed(2)}` : '—'}
                              </td>
                              <td className="p-3">{product.clinic || '—'}</td>
                              <td className="p-3">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    product.isActive
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                      : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                                  }`}
                                >
                                  {product.isActive ? 'აქტიური' : 'გამორთული'}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setShowProductForm(true);
                                    startProductEdit(product);
                                  }}
                                  className="text-primary hover:underline"
                                >
                                  რედაქტირება
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="text-red-500 hover:underline"
                                >
                                  წაშლა
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              )}

              {activeTab === 'clinics' && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-dark dark:text-white">
                      კლინიკების სია
                    </h3>
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      კლინიკები ლაბორატორიული კვლევებისთვის
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClinicForm((v) => !v);
                      if (showClinicForm) {
                        setEditingClinicId(null);
                        setClinicForm({ ...defaultClinicForm });
                      }
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    {showClinicForm ? 'ფორმის დამალვა' : 'ახალი კლინიკა'}
                  </button>
                </div>

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
                        {editingClinicId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClinicId(null);
                              setClinicForm({ ...defaultClinicForm });
                              setShowClinicForm(false);
                            }}
                            className="rounded-lg border border-stroke px-4 py-2 text-sm dark:border-dark-3"
                          >
                            გაუქმება
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClinicId(null);
                            setClinicForm({ ...defaultClinicForm });
                          }}
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
                        <th className="p-3">სტატუსი</th>
                        <th className="p-3 text-right">ქმედებები</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinics.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-dark-4">
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
                                onClick={() => {
                                  setShowClinicForm(true);
                                  startClinicEdit(clinic);
                                }}
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
              </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

