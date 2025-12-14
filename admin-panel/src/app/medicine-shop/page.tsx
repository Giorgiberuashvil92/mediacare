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

  return (
    <>
      <Breadcrumb pageName="მედიკამენტების მაღაზია" />

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="border-b border-stroke p-6 dark:border-dark-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-dark dark:text-white">
                მედიცინ შოპის მართვა
              </h2>
              <p className="text-dark-4 dark:text-dark-6">
                კატეგორიებისა და პროდუქტების დინამიური მართვა
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-dark dark:text-white">ფილტრი</label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as any)}
                className="rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
              >
                <option value="all">ყველა</option>
                <option value="laboratory">ლაბორატორია</option>
                <option value="equipment">ექუიფმენთი</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
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
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-dark dark:text-white">
                      კატეგორიების მართვა
                    </h3>
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      დაამატე ან შეცვალე კატეგორიები ლაბორატორიისა და ექუიფმენთის მიხედვით
                    </p>
                  </div>
                  {editingCategoryId && (
                    <button
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({ ...defaultCategoryForm });
                      }}
                      className="text-sm font-medium text-primary"
                    >
                      გაუქმება
                    </button>
                  )}
                </div>

                <form onSubmit={handleCategorySubmit} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      კატეგორიის სახელი
                    </label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, name: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ტიპი
                    </label>
                    <select
                      value={categoryForm.type}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, type: event.target.value as ShopEntityType })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    >
                      {CATEGORY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type === 'laboratory' ? 'ლაბორატორია' : 'ექუიფმენთი'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      მშობელი კატეგორია (არასავალდებულო)
                    </label>
                    <select
                      value={categoryForm.parentCategory}
                      onChange={(event) =>
                        setCategoryForm({
                          ...categoryForm,
                          parentCategory: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    >
                      <option value="">-</option>
                      {categories
                        .filter((category) => category.id !== editingCategoryId)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ვიზუალური რიგითობა
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={categoryForm.order}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, order: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      აღწერა
                    </label>
                    <textarea
                      rows={3}
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, description: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      სურათის URL
                    </label>
                    <input
                      type="text"
                      value={categoryForm.imageUrl}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, imageUrl: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="category-active"
                      type="checkbox"
                      checked={categoryForm.isActive}
                      onChange={(event) =>
                        setCategoryForm({ ...categoryForm, isActive: event.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="category-active"
                      className="text-sm font-medium text-dark dark:text-white"
                    >
                      აქტიური კატეგორია
                    </label>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({ ...defaultCategoryForm });
                      }}
                      className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      გასუფთავება
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      {editingCategoryId ? 'კატეგორიის განახლება' : 'კატეგორიის დამატება'}
                    </button>
                  </div>
                </form>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-dark dark:text-white">
                      პროდუქტების მართვა
                    </h3>
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      დაამატე ლაბორატორიის პაკეტები და ექუიფმენთის პროდუქტი
                    </p>
                  </div>
                  {editingProductId && (
                    <button
                      onClick={() => {
                        setEditingProductId(null);
                        setProductForm({ ...defaultProductForm });
                      }}
                      className="text-sm font-medium text-primary"
                    >
                      გაუქმება
                    </button>
                  )}
                </div>

                <form onSubmit={handleProductSubmit} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      პროდუქტის სახელი
                    </label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(event) =>
                        setProductForm({ ...productForm, name: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ICD კოდი (უნიკალური)
                    </label>
                    <input
                      type="text"
                      value={productForm.icdCode}
                      onChange={(event) =>
                        setProductForm({ ...productForm, icdCode: event.target.value })
                      }
                      placeholder="მაგ: BL.6"
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ტიპი
                    </label>
                    <select
                      value={productForm.type}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          type: event.target.value as ShopEntityType,
                          category: '',
                        })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    >
                      {CATEGORY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type === 'laboratory' ? 'ლაბორატორია' : 'ექუიფმენთი'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ფასი / ლარი (₾)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={productForm.price}
                      onChange={(event) =>
                        setProductForm({ ...productForm, price: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ფასდაკლება (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={productForm.discountPercent}
                      onChange={(event) =>
                        setProductForm({
                          ...productForm,
                          discountPercent: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      შეთავაზებული ფასი (₾)
                    </label>
                    <div className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-2 text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white">
                      {productForm.price && productForm.discountPercent
                        ? (
                            Number(productForm.price) *
                            (1 - Number(productForm.discountPercent) / 100)
                          ).toFixed(2)
                        : productForm.price || '0.00'}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      კლინიკა
                    </label>
                    <select
                      value={productForm.clinic}
                      onChange={(event) =>
                        setProductForm({ ...productForm, clinic: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    >
                      <option value="">-</option>
                      {clinics
                        .filter((clinic) => clinic.isActive)
                        .map((clinic) => (
                          <option key={clinic.id} value={clinic.name}>
                            {clinic.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      მარაგი
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={productForm.stock}
                      onChange={(event) =>
                        setProductForm({ ...productForm, stock: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ერთეული
                    </label>
                    <input
                      type="text"
                      value={productForm.unit}
                      onChange={(event) =>
                        setProductForm({ ...productForm, unit: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      კატეგორია ({productForm.type === 'laboratory' ? 'ლაბორატორია' : 'ექუიფმენთი'})
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(event) =>
                        setProductForm({ ...productForm, category: event.target.value })
                      }
                      required={productForm.type === 'laboratory'}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    >
                      <option value="">-</option>
                      {(productForm.type === 'laboratory'
                        ? laboratoryCategories
                        : equipmentCategories
                      ).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      აღწერა
                    </label>
                    <textarea
                      rows={3}
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm({ ...productForm, description: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      სურათის URL
                    </label>
                    <input
                      type="text"
                      value={productForm.imageUrl}
                      onChange={(event) =>
                        setProductForm({ ...productForm, imageUrl: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ვიზუალური რიგითობა
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={productForm.order}
                      onChange={(event) =>
                        setProductForm({ ...productForm, order: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                      <input
                        type="checkbox"
                        checked={productForm.isActive}
                        onChange={(event) =>
                          setProductForm({ ...productForm, isActive: event.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      აქტიური
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-dark dark:text-white">
                      <input
                        type="checkbox"
                        checked={productForm.isFeatured}
                        onChange={(event) =>
                          setProductForm({
                            ...productForm,
                            isFeatured: event.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      გამორჩეული
                    </label>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProductId(null);
                        setProductForm({ ...defaultProductForm });
                      }}
                      className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      გასუფთავება
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      {editingProductId ? 'პროდუქტის განახლება' : 'პროდუქტის დამატება'}
                    </button>
                  </div>
                </form>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-dark dark:text-white">
                      კლინიკების მართვა
                    </h3>
                    <p className="text-sm text-dark-4 dark:text-dark-6">
                      დაამატე ან შეცვალე კლინიკები ლაბორატორიული კვლევებისთვის
                    </p>
                  </div>
                  {editingClinicId && (
                    <button
                      onClick={() => {
                        setEditingClinicId(null);
                        setClinicForm({ ...defaultClinicForm });
                      }}
                      className="text-sm font-medium text-primary"
                    >
                      გაუქმება
                    </button>
                  )}
                </div>

                <form onSubmit={handleClinicSubmit} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      კლინიკის სახელი
                    </label>
                    <input
                      type="text"
                      required
                      value={clinicForm.name}
                      onChange={(event) =>
                        setClinicForm({ ...clinicForm, name: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      მისამართი
                    </label>
                    <input
                      type="text"
                      value={clinicForm.address}
                      onChange={(event) =>
                        setClinicForm({ ...clinicForm, address: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ტელეფონი
                    </label>
                    <input
                      type="text"
                      value={clinicForm.phone}
                      onChange={(event) =>
                        setClinicForm({ ...clinicForm, phone: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                      ელ. ფოსტა
                    </label>
                    <input
                      type="email"
                      value={clinicForm.email}
                      onChange={(event) =>
                        setClinicForm({ ...clinicForm, email: event.target.value })
                      }
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="clinic-active"
                      type="checkbox"
                      checked={clinicForm.isActive}
                      onChange={(event) =>
                        setClinicForm({ ...clinicForm, isActive: event.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor="clinic-active"
                      className="text-sm font-medium text-dark dark:text-white"
                    >
                      აქტიური კლინიკა
                    </label>
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClinicId(null);
                        setClinicForm({ ...defaultClinicForm });
                      }}
                      className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                    >
                      გასუფთავება
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      {editingClinicId ? 'კლინიკის განახლება' : 'კლინიკის დამატება'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="space-y-6">
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    კატეგორიების სია
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stroke text-left text-xs uppercase text-dark-4 dark:border-dark-3">
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
                            <td colSpan={5} className="p-4 text-center text-dark-4">
                              კატეგორია არ მოიძებნა
                            </td>
                          </tr>
                        ) : (
                          filteredCategories.map((category) => (
                            <tr
                              key={category.id}
                              className="border-b border-stroke text-sm text-dark dark:border-dark-3 dark:text-white"
                            >
                              <td className="p-3">
                                <div className="font-medium">{category.name}</div>
                                {category.description && (
                                  <div className="text-xs text-dark-4 dark:text-dark-6">
                                    {category.description}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 capitalize">
                                {category.type === 'laboratory' ? 'ლაბორატორია' : 'ექუიფმენთი'}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                                    category.isActive
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                      : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-300'
                                  }`}
                                >
                                  {category.isActive ? 'აქტიური' : 'გამორთული'}
                                </span>
                              </td>
                              <td className="p-3">
                                {(category.products?.length || 0).toLocaleString()}
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={() => startCategoryEdit(category)}
                                  className="text-sm font-medium text-primary"
                                >
                                  რედაქტირება
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="text-sm font-medium text-red-500"
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
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    პროდუქტების სია
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stroke text-left text-xs uppercase text-dark-4 dark:border-dark-3">
                          <th className="p-3">ICD</th>
                          <th className="p-3">კვლევის დასახელება</th>
                          <th className="p-3">ფასი / ლარი</th>
                          <th className="p-3">ფასდაკლება</th>
                          <th className="p-3">შეთავაზებული ფასი</th>
                          <th className="p-3">კლინიკა</th>
                          <th className="p-3">სტატუსი</th>
                          <th className="p-3 text-right">ქმედებები</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-dark-4">
                              პროდუქტი არ მოიძებნა
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((product) => {
                            const discountedPrice =
                              product.price && product.discountPercent
                                ? product.price * (1 - product.discountPercent / 100)
                                : product.price || 0;
                            return (
                              <tr
                                key={product.id}
                                className="border-b border-stroke text-sm text-dark dark:border-dark-3 dark:text-white"
                              >
                                <td className="p-3">
                                  <div className="font-medium">{product.icdCode || '-'}</div>
                                </td>
                                <td className="p-3">
                                  <div className="font-medium">{product.name}</div>
                                  {product.description && (
                                    <div className="text-xs text-dark-4 dark:text-dark-6">
                                      {product.description}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  {product.price ? `₾${product.price.toFixed(2)}` : '-'}
                                </td>
                                <td className="p-3">
                                  {product.discountPercent
                                    ? `${product.discountPercent}%`
                                    : '-'}
                                </td>
                                <td className="p-3">
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {discountedPrice > 0 ? `₾${discountedPrice.toFixed(2)}` : '-'}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {product.clinic || '-'}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                                    onClick={() => startProductEdit(product)}
                                    className="text-sm font-medium text-primary"
                                  >
                                    რედაქტირება
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="text-sm font-medium text-red-500"
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
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-semibold text-dark dark:text-white">
                    კლინიკების სია
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stroke text-left text-xs uppercase text-dark-4 dark:border-dark-3">
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
                            <td colSpan={6} className="p-4 text-center text-dark-4">
                              კლინიკა არ მოიძებნა
                            </td>
                          </tr>
                        ) : (
                          clinics.map((clinic) => (
                            <tr
                              key={clinic.id}
                              className="border-b border-stroke text-sm text-dark dark:border-dark-3 dark:text-white"
                            >
                              <td className="p-3">
                                <div className="font-medium">{clinic.name}</div>
                              </td>
                              <td className="p-3">
                                {clinic.address || '-'}
                              </td>
                              <td className="p-3">
                                {clinic.phone || '-'}
                              </td>
                              <td className="p-3">
                                {clinic.email || '-'}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                                  className="text-sm font-medium text-primary"
                                >
                                  რედაქტირება
                                </button>
                                <button
                                  onClick={() => handleDeleteClinic(clinic.id)}
                                  className="text-sm font-medium text-red-500"
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
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}

