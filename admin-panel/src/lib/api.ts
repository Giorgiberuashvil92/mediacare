// API Service for Medicare Admin Panel
const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  'https://mediacare-production.up.railway.app';
  // 'http://localhost:4000';

// DEVELOPMENT MODE: Skip auth and use static token
const DISABLE_AUTH = true;
// This token should be a valid JWT for an admin user (get it from /auth/dev-token)
// Production token - expires in 24h, refresh via: curl https://mediacare-production.up.railway.app/auth/dev-token
const DEV_STATIC_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTQzYjEyNTMwYzQwOTI0ODA2YTI0YTYiLCJpYXQiOjE3NjYwNDcwNzMsImV4cCI6MTc2NjEzMzQ3M30.QOTftYPmecMDcECNleZt_5eeqZ7XUdyXVBl4856Q-7c';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface User {
  id: string;
  role: 'patient' | 'doctor';
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  profileImage?: string;
  isVerified: boolean;
  isActive: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
  // Doctor specific
  specialization?: string;
  licenseNumber?: string;
  licenseDocument?: string; // File path/URL for medical license (PDF or Image)
  degrees?: string;
  experience?: string;
  consultationFee?: number;
  followUpFee?: number;
  about?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  isTopRated?: boolean;
  // Minimum working days doctor must have scheduled in the next 2 weeks (set by admin)
  minWorkingDaysRequired?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface Specialization {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  symptoms?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type ShopEntityType = 'laboratory' | 'equipment';

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  type: ShopEntityType;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  parentCategory?: string | null;
  order?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  products?: ShopProduct[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  icdCode?: string;
  description?: string;
  type: ShopEntityType;
  category?: string | null;
  price?: number;
  currency?: string;
  discountPercent?: number;
  stock?: number;
  unit?: string;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  order?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  clinic?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Use static token in dev mode if available
    const tokenToUse = DISABLE_AUTH && DEV_STATIC_TOKEN ? DEV_STATIC_TOKEN : this.token;
    
    if (tokenToUse) {
      headers['Authorization'] = `Bearer ${tokenToUse}`;
    }

    return headers;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message || `HTTP error! status: ${response.status}`;
      
      // If unauthorized (401), clear token and redirect to login
      if (response.status === 401) {
        this.setToken(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/auth/sign-in';
        }
      }
      
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    
    if (data.data.token) {
      this.setToken(data.data.token);
    }

    return data;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Users endpoints
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: 'patient' | 'doctor';
    search?: string;
  }): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(
      `${this.baseURL}/admin/users?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<{ users: User[]; pagination: any }>>(
      response,
    );
  }

  async getUserById(userId: string): Promise<ApiResponse<{ user: User }>> {
    const response = await fetch(`${this.baseURL}/admin/users/${userId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{ user: User }>>(response);
  }

  async createUser(userData: {
    role: 'patient' | 'doctor';
    name: string;
    email: string;
    password: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    specialization?: string;
    degrees?: string;
    experience?: string;
    consultationFee?: number;
    followUpFee?: number;
    about?: string;
    location?: string;
  }): Promise<ApiResponse<{ id: string; role: string; name: string; email: string }>> {
    const response = await fetch(`${this.baseURL}/admin/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse<ApiResponse<{ id: string; role: string; name: string; email: string }>>(response);
  }

  async updateUser(
    userId: string,
    userData: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: 'male' | 'female' | 'other';
      profileImage?: string;
      isVerified?: boolean;
      isActive?: boolean;
      approvalStatus?: 'pending' | 'approved' | 'rejected';
      specialization?: string;
      degrees?: string;
      experience?: string;
      consultationFee?: number;
      followUpFee?: number;
      about?: string;
      location?: string;
    },
  ): Promise<ApiResponse<{ id: string; role: string; name: string; email: string }>> {
    const response = await fetch(`${this.baseURL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    return this.handleResponse<ApiResponse<{ id: string; role: string; name: string; email: string }>>(response);
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${this.baseURL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{ message: string }>>(response);
  }

  async hardDeleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${this.baseURL}/admin/users/${userId}/hard`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{ message: string }>>(response);
  }

  // Doctors endpoints
  async getDoctors(params?: {
    page?: number;
    limit?: number;
    specialization?: string;
    location?: string;
    search?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'all';
  }): Promise<ApiResponse<{ doctors: any[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.specialization)
      queryParams.append('specialization', params.specialization);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(
      `${this.baseURL}/doctors?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<{ doctors: any[]; pagination: any }>>(
      response,
    );
  }

  async getDoctorById(
    id: string,
    includePending: boolean = true,
  ): Promise<ApiResponse<User>> {
    const queryParams = new URLSearchParams();
    if (includePending) {
      queryParams.append('includePending', 'true');
    }

    const response = await fetch(
      `${this.baseURL}/doctors/${id}?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<User>>(response);
  }

  async getDoctorAvailability(
    doctorId: string,
    startDate?: string,
    endDate?: string,
    type?: 'video' | 'home-visit',
  ): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (type) queryParams.append('type', type);

    const response = await fetch(
      `${this.baseURL}/doctors/${doctorId}/availability?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<any>>(response);
  }

  async updateDoctorAvailability(
    doctorId: string,
    availability: {
      date: string;
      timeSlots: string[];
      isAvailable: boolean;
      type: 'video' | 'home-visit';
    }[],
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/admin/doctors/${doctorId}/availability`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ availability }),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  async updateDoctor(
    id: string,
    data: Partial<User>,
  ): Promise<ApiResponse<User>> {
    const response = await fetch(`${this.baseURL}/doctors/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<User>>(response);
  }

  async uploadLicenseDocument(
    file: File,
  ): Promise<ApiResponse<{ filePath: string; fileName: string; fileSize: number; mimeType: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/upload/license`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<
      ApiResponse<{ filePath: string; fileName: string; fileSize: number; mimeType: string }>
    >(response);
  }

  async uploadProfileImage(
    file: File,
  ): Promise<ApiResponse<{ url: string; publicId: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}/uploads/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<ApiResponse<{ url: string; publicId: string }>>(
      response,
    );
  }

  // Stats endpoint
  async getStats(): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/admin/stats`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  // Specializations endpoints
  async getSpecializations(params?: {
    page?: number;
    limit?: number;
    specialization?: string;
    location?: string;
    search?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'all';
  }): Promise<ApiResponse<{ doctors: any[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.specialization)
      queryParams.append('specialization', params.specialization);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(
      `${this.baseURL}/specializations?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<{ doctors: any[]; pagination: any }>>(
      response,
    );
  }

  async getPublicSpecializations(): Promise<ApiResponse<Specialization[]>> {
    const response = await fetch(`${this.baseURL}/specializations`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<Specialization[]>>(response);
  }

  async getSpecializationsAdmin(): Promise<ApiResponse<Specialization[]>> {
    const response = await fetch(`${this.baseURL}/specializations/admin`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<Specialization[]>>(response);
  }

  async createSpecialization(data: {
    name: string;
    description?: string;
    isActive?: boolean;
    symptoms?: string[];
  }): Promise<ApiResponse<Specialization>> {
    const response = await fetch(`${this.baseURL}/specializations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<Specialization>>(response);
  }

  async toggleSpecialization(
    id: string,
    isActive: boolean,
  ): Promise<ApiResponse<Specialization>> {
    const response = await fetch(
      `${this.baseURL}/specializations/${id}/toggle?isActive=${isActive}`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<Specialization>>(response);
  }

  async updateSpecialization(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean; symptoms?: string[] },
  ): Promise<ApiResponse<Specialization>> {
    const response = await fetch(`${this.baseURL}/specializations/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<Specialization>>(response);
  }

  async deleteSpecialization(id: string): Promise<ApiResponse<null>> {
    const response = await fetch(`${this.baseURL}/specializations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<null>>(response);
  }

  // Create super admin (public endpoint for initial setup)
  async createSuperAdmin(): Promise<ApiResponse<{ email: string; password: string; note?: string }>> {
    const response = await fetch(`${this.baseURL}/admin/create-superadmin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<ApiResponse<{ email: string; password: string; note?: string }>>(response);
  }

  // Admin Appointments Management
  async getAdminAppointments(params: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
  }): Promise<ApiResponse<{
    appointments: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.paymentStatus && params.paymentStatus !== 'all') queryParams.append('paymentStatus', params.paymentStatus);
    if (params.search) queryParams.append('search', params.search);

    const response = await fetch(`${this.baseURL}/admin/appointments?${queryParams.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{
      appointments: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>(response);
  }

  async getAppointmentById(appointmentId: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/appointments/${appointmentId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/appointments/${appointmentId}/reschedule`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ newDate, newTime }),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/admin/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  async updateDoctorApproval(
    doctorId: string, 
    approvalStatus: 'pending' | 'approved' | 'rejected', 
    isActive?: boolean
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/admin/doctors/${doctorId}/approval`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ approvalStatus, isActive }),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  // Advisors endpoints
  async getAdvisors(): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${this.baseURL}/advisors`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<any[]>>(response);
  }

  async getActiveAdvisors(): Promise<ApiResponse<any[]>> {
    const response = await fetch(`${this.baseURL}/advisors/active`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<any[]>>(response);
  }

  async createAdvisor(data: {
    doctorId: string;
    bio?: string;
    order?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/advisors`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  async updateAdvisor(
    id: string,
    data: { bio?: string; order?: number; isActive?: boolean },
  ): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/advisors/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  async deleteAdvisor(id: string): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/advisors/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<any>>(response);
  }

  // Terms endpoints
  async getTerms(type: 'cancellation' | 'service' | 'privacy' | 'contract' | 'usage' | 'doctor-cancellation' | 'doctor-service'): Promise<ApiResponse<{ type: string; content: string; updatedAt?: string }>> {
    const response = await fetch(`${this.baseURL}/terms/${type}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{ type: string; content: string; updatedAt?: string }>>(response);
  }

  async updateTerms(type: 'cancellation' | 'service' | 'privacy' | 'contract' | 'usage' | 'doctor-cancellation' | 'doctor-service', content: string): Promise<ApiResponse<{ type: string; content: string }>> {
    const response = await fetch(`${this.baseURL}/terms/${type}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });

    return this.handleResponse<ApiResponse<{ type: string; content: string }>>(response);
  }

  async getAllTerms(): Promise<ApiResponse<{ type: string; content: string; updatedAt?: string }[]>> {
    const response = await fetch(`${this.baseURL}/terms`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{ type: string; content: string; updatedAt?: string }[]>>(response);
  }

  // Medicine shop endpoints
  async getShopCategories(params?: {
    type?: ShopEntityType;
    search?: string;
    isActive?: boolean;
    parentCategory?: string;
    includeProducts?: boolean;
  }): Promise<ApiResponse<ShopCategory[]>> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (typeof params?.isActive === 'boolean')
      queryParams.append('isActive', String(params.isActive));
    if (params?.parentCategory) queryParams.append('parentCategory', params.parentCategory);
    if (params?.includeProducts)
      queryParams.append('includeProducts', String(params.includeProducts));

    const response = await fetch(
      `${this.baseURL}/shop/categories?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<ShopCategory[]>>(response);
  }

  async createShopCategory(
    data: Pick<ShopCategory, 'name' | 'type'> &
      Partial<
        Pick<
          ShopCategory,
          | 'description'
          | 'imageUrl'
          | 'isActive'
          | 'order'
          | 'parentCategory'
          | 'metadata'
        >
      >,
  ): Promise<ApiResponse<ShopCategory>> {
    const response = await fetch(`${this.baseURL}/admin/shop/categories`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<ShopCategory>>(response);
  }

  async updateShopCategory(
    id: string,
    data: Partial<ShopCategory>,
  ): Promise<ApiResponse<ShopCategory>> {
    const response = await fetch(
      `${this.baseURL}/admin/shop/categories/${id}`,
      {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      },
    );

    return this.handleResponse<ApiResponse<ShopCategory>>(response);
  }

  async deleteShopCategory(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(
      `${this.baseURL}/admin/shop/categories/${id}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<{ message: string }>>(response);
  }

  async getShopProducts(params?: {
    type?: ShopEntityType;
    category?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<
    ApiResponse<{
      items: ShopProduct[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>
  > {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (typeof params?.isActive === 'boolean')
      queryParams.append('isActive', String(params.isActive));
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(
      `${this.baseURL}/shop/products?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<
      ApiResponse<{
        items: ShopProduct[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>
    >(response);
  }

  async createShopProduct(
    data: Pick<ShopProduct, 'name' | 'type'> &
      Partial<
        Pick<
          ShopProduct,
          | 'icdCode'
          | 'description'
          | 'price'
          | 'currency'
          | 'discountPercent'
          | 'stock'
          | 'unit'
          | 'category'
          | 'isActive'
          | 'isFeatured'
          | 'imageUrl'
          | 'order'
          | 'metadata'
          | 'clinic'
        >
      >,
  ): Promise<ApiResponse<ShopProduct>> {
    const response = await fetch(`${this.baseURL}/admin/shop/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<ShopProduct>>(response);
  }

  async updateShopProduct(
    id: string,
    data: Partial<ShopProduct>,
  ): Promise<ApiResponse<ShopProduct>> {
    const response = await fetch(`${this.baseURL}/admin/shop/products/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<ShopProduct>>(response);
  }

  async deleteShopProduct(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${this.baseURL}/admin/shop/products/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{ message: string }>>(response);
  }

  // Clinic endpoints
  async getClinics(isActive?: boolean): Promise<ApiResponse<Clinic[]>> {
    const queryParams = new URLSearchParams();
    if (typeof isActive === 'boolean') {
      queryParams.append('isActive', String(isActive));
    }

    const response = await fetch(
      `${this.baseURL}/admin/shop/clinics?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      },
    );

    return this.handleResponse<ApiResponse<Clinic[]>>(response);
  }

  async getClinicById(id: string): Promise<ApiResponse<Clinic>> {
    const response = await fetch(`${this.baseURL}/admin/shop/clinics/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<Clinic>>(response);
  }

  async createClinic(data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Clinic>> {
    const response = await fetch(`${this.baseURL}/admin/shop/clinics`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<Clinic>>(response);
  }

  async updateClinic(
    id: string,
    data: Partial<Clinic>,
  ): Promise<ApiResponse<Clinic>> {
    const response = await fetch(`${this.baseURL}/admin/shop/clinics/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ApiResponse<Clinic>>(response);
  }

  async deleteClinic(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${this.baseURL}/admin/shop/clinics/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ApiResponse<{ message: string }>>(response);
  }

  // Generic API call
  async apiCall<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    return this.handleResponse<ApiResponse<T>>(response);
  }
}

export const apiService = new ApiService();

