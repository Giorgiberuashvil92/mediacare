// API Service for Medicare Admin Panel
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
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

