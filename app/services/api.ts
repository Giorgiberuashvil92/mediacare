import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { logger } from "../utils/logger";

const getExpoHostIp = () => {
  const host =
    // Expo SDK 49+: expoConfig is available
    Constants.expoConfig?.hostUri ||
    // Older SDK fallback
    (Constants.manifest as any)?.debuggerHost ||
    "";

  if (!host) {
    return undefined;
  }

  const hostWithoutPort = host.split(":")[0];
  if (hostWithoutPort && hostWithoutPort !== "localhost") {
    return hostWithoutPort;
  }

  return undefined;
};

const getDefaultBaseUrl = () => {
  // Force Railway URL for testing (both dev and production)
  const FORCE_RAILWAY = true; // Set to false to use local development
  
  if (FORCE_RAILWAY) {
    console.log('🚂 Forcing Railway URL for testing');
    return "https://localhost:4000";
  }

  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.API_URL ||
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    (Constants.manifest as any)?.extra?.API_URL ||
    (Constants.manifest as any)?.extra?.apiUrl;

  if (envUrl) {
    return envUrl;
  }

  const expoHostIp = getExpoHostIp();
  // if (expoHostIp) {
  //   return `https://mediacare-production.up.railway.app`;
  // }

  if(expoHostIp) {
    return `https://${expoHostIp}:4000`;
  }

  // if (__DEV__) {
  //   if (Platform.OS === "android") {
  //     return "https://mediacare-production.up.railway.app";
  //   }
  //   return "https://mediacare-production.up.railway.app";
  // }

  // return "https://mediacare-production.up.railway.app";
  if (__DEV__) {
    return "http://localhost:4000";
  }
  return "http://localhost:4000";
};

const API_BASE_URL = getDefaultBaseUrl();

const USE_MOCK_API = false; // Changed to false to use real backend

export interface User {
  id: string;
  email: string;
  name: string;
  role: "doctor" | "patient";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: "doctor" | "patient";
  specialization?: string;
  licenseDocument?: string;
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
}

export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  type: "laboratory" | "equipment";
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
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  type: "laboratory" | "equipment";
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  parentCategory?: string | null;
  order?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  products?: ShopProduct[];
}

export interface MedicineShopOverview {
  laboratoryProducts: ShopProduct[];
  equipmentCategories: ShopCategory[];
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log('🚀 ApiService initialized with baseURL:', this.baseURL);
    console.log('🔧 __DEV__ mode:', __DEV__);
    console.log('🎯 USE_MOCK_API:', USE_MOCK_API);
  }

  // Public getter for baseURL
  getBaseURL(): string {
    return this.baseURL;
  }

  // Public mock mode getter (for UI to adjust behavior like uploads)
  isMockMode(): boolean {
    return USE_MOCK_API;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem("accessToken");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log('🔍 Handling response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      // Clone response to avoid "Already read" error
      const clonedResponse = response.clone();
      const errorData = await clonedResponse.json().catch(() => ({}));
      console.log('❌ Error response data:', errorData);
      const errorMessage =
        errorData.message || `HTTP error! status: ${response.status}`;
      
      logger.api.error("Response", response.url, {
        status: response.status,
        message: errorMessage,
        data: errorData,
      });

      throw new Error(errorMessage);
    }
    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('🔐 Login attempt:', {
      email: credentials.email,
      passwordLength: credentials.password?.length || 0,
      baseURL: this.baseURL,
      mockMode: USE_MOCK_API
    });
    logger.auth.login(credentials.email);
    if (USE_MOCK_API) {
      // simple validation mimic
      if (!credentials.email || !credentials.password) {
        throw new Error("Invalid credentials");
      }

      const mockUser: User = {
        id: "mock-user-1",
        email: credentials.email,
        name: "Demo User",
        role: credentials.email.includes("doc") ? "doctor" : "patient",
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: "Logged in (mock)",
        data: {
          user: mockUser,
          token: "mock-access-token",
          refreshToken: "mock-refresh-token",
        },
      };

      logger.auth.loginSuccess(mockUser);
      await AsyncStorage.setItem("accessToken", mockResponse.data.token);
      await AsyncStorage.setItem("refreshToken", mockResponse.data.refreshToken);
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
      return mockResponse;
    }

    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await this.handleResponse<AuthResponse>(response);

    logger.auth.loginSuccess(data.data.user);

    // Store tokens only if they exist
    if (data.data.token) {
      await AsyncStorage.setItem("accessToken", data.data.token);
    }
    if (data.data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.data.refreshToken);
    }
    if (data.data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.data.user));
    }

    return data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    logger.auth.register(userData.email, userData.role);

    if (USE_MOCK_API) {
      if (!userData.email || !userData.password || !userData.name) {
        throw new Error("Validation error");
      }

      const mockUser: User = {
        id: "mock-user-registered-1",
        email: userData.email,
        name: userData.name,
        role: userData.role,
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: "Registered (mock)",
        data: {
          user: mockUser,
          token: "mock-access-token",
          refreshToken: "mock-refresh-token",
        },
      };

      logger.auth.registerSuccess(mockUser);
      await AsyncStorage.setItem("accessToken", mockResponse.data.token);
      await AsyncStorage.setItem("refreshToken", mockResponse.data.refreshToken);
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
      return mockResponse;
    }

    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await this.handleResponse<AuthResponse>(response);

    logger.auth.registerSuccess(data.data.user);

    // Store tokens only if they exist
    if (data.data.token) {
      await AsyncStorage.setItem("accessToken", data.data.token);
    }
    if (data.data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", data.data.refreshToken);
    }
    if (data.data.user) {
      await AsyncStorage.setItem("user", JSON.stringify(data.data.user));
    }

    return data;
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    const refreshToken = await AsyncStorage.getItem("refreshToken");

    if (USE_MOCK_API) {
      const newAccessToken = "mock-access-token";
      await AsyncStorage.setItem("accessToken", newAccessToken);
      return { accessToken: newAccessToken };
    }

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await this.handleResponse<{ accessToken: string }>(response);

    // Update access token only if it exists
    if (data.accessToken) {
      await AsyncStorage.setItem("accessToken", data.accessToken);
    }

    return data;
  }

  async logout(): Promise<void> {
    logger.auth.logout();

    if (!USE_MOCK_API) {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          await fetch(`${this.baseURL}/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          });
        } catch (error) {
          logger.error("Logout error:", error);
        }
      }
    }

    // Clear all stored data
    await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user"]);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem("user");
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem("accessToken");
    return !!token;
  }

  // Doctors endpoints
  async getDoctors(params?: {
    specialization?: string;
    location?: string;
    rating?: number;
    search?: string;
    symptom?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: {
      doctors: any[];
      total: number;
      page: number;
      limit: number;
    };
  }> {
    if (USE_MOCK_API) {
      // Return mock doctors
      return Promise.resolve({
        success: true,
        data: {
          doctors: [],
          total: 0,
          page: 1,
          limit: 10,
        },
      });
    }

    const queryParams = new URLSearchParams();
    if (params?.specialization) {
      queryParams.append('specialization', params.specialization);
    }
    if (params?.location) {
      queryParams.append('location', params.location);
    }
    if (params?.rating) {
      queryParams.append('rating', params.rating.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.symptom) {
      queryParams.append('symptom', params.symptom);
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/doctors${queryString ? `?${queryString}` : ''}`;

    return this.apiCall(endpoint, {
      method: 'GET',
    });
  }

  async getDoctorById(id: string): Promise<{
    success: boolean;
    data: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: null,
      });
    }

    return this.apiCall(`/doctors/${id}`, {
      method: 'GET',
    });
  }

  async getDoctorAvailability(
    doctorId: string,
  ): Promise<{
    success: boolean;
    data: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: [],
      });
    }

    return this.apiCall(`/doctors/${doctorId}/availability`, {
      method: 'GET',
    });
  }

  async updateAvailability(availability: {
    date: string;
    timeSlots: string[];
    isAvailable: boolean;
  }[]): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'Availability updated (mock)',
        data: { updated: availability.length },
      });
    }

    return this.apiCall('/doctors/availability', {
      method: 'PUT',
      body: JSON.stringify({ availability }),
    });
  }

  // Profile endpoints
  async getProfile(): Promise<{
    success: boolean;
    data: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: null,
      });
    }

    return this.apiCall('/profile', {
      method: 'GET',
    });
  }

  async getSpecializations(): Promise<{ success: boolean; data: Specialization[] }> {
    const response = await fetch(`${this.baseURL}/specializations`, {
      method: "GET",
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<{ success: boolean; data: Specialization[] }>(
      response
    );
  }

  async updateProfile(profileData: any): Promise<{
    success: boolean;
    data: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: profileData,
      });
    }

    return this.apiCall('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Doctor Dashboard endpoints
  async getDoctorDashboardStats(): Promise<{
    success: boolean;
    data: {
      earnings: {
        paid: number;
        pending: number;
        thisMonth: number;
        lastMonth: number;
      };
      appointments: {
        completed: number;
        inProgress: number;
        uncompleted: number;
        total: number;
      };
      patients: {
        total: number;
        new: number;
        returning: number;
      };
      visits: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        total: number;
      };
    };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          earnings: {
            paid: 0,
            pending: 0,
            thisMonth: 0,
            lastMonth: 0,
          },
          appointments: {
            completed: 0,
            inProgress: 0,
            uncompleted: 0,
            total: 0,
          },
          patients: {
            total: 0,
            new: 0,
            returning: 0,
          },
          visits: {
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
            total: 0,
          },
        },
      });
    }

    return this.apiCall('/doctors/dashboard/stats', {
      method: 'GET',
    });
  }

  async getDoctorDashboardAppointments(limit: number = 10): Promise<{
    success: boolean;
    data: {
      id: string;
      patientName: string;
      patientAge: number;
      date: string;
      time: string;
      type: 'consultation' | 'followup' | 'emergency';
      status: 'completed' | 'scheduled' | 'in-progress' | 'cancelled';
      fee: number;
      isPaid: boolean;
      diagnosis?: string;
      symptoms?: string;
    }[];
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: [],
      });
    }

    return this.apiCall(`/doctors/dashboard/appointments?limit=${limit}`, {
      method: 'GET',
    });
  }

  async getDoctorDashboardSchedule(): Promise<{
    success: boolean;
    data: {
      date: string;
      dayOfWeek: string;
      consultations: unknown[];
      availableSlots: string[];
      totalSlots: number;
    };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          date: new Date().toISOString().split('T')[0],
          dayOfWeek: '',
          consultations: [],
          availableSlots: [],
          totalSlots: 0,
        },
      });
    }

    return this.apiCall('/doctors/dashboard/schedule', {
      method: 'GET',
    });
  }

  // Appointments endpoints
  async createAppointment(appointmentData: {
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationFee: number;
    totalAmount: number;
    paymentMethod?: string;
    paymentStatus?: string;
    patientDetails?: {
      name?: string;
      dateOfBirth?: string;
      gender?: string;
      problem?: string;
    };
    documents?: string[];
    notes?: string;
  }): Promise<{
    success: boolean;
    data: any;
    message?: string;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          appointmentNumber: 'APT20240001',
          ...appointmentData,
        },
      });
    }

    return this.apiCall('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async getPatientAppointments(): Promise<{
    success: boolean;
    data: any[];
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: [],
      });
    }

    return this.apiCall('/appointments/patient', {
      method: 'GET',
    });
  }

  // Block time slot temporarily
  async blockTimeSlot(blockData: {
    doctorId: string;
    date: string;
    time: string;
  }): Promise<{
    success: boolean;
    message?: string;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'Time slot blocked temporarily',
      });
    }

    return this.apiCall('/appointments/block-timeslot', {
      method: 'POST',
      body: JSON.stringify(blockData),
    });
  }

  async getAppointmentById(appointmentId: string): Promise<{
    success: boolean;
    data: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: null,
      });
    }

    return this.apiCall(`/appointments/${appointmentId}`, {
      method: 'GET',
    });
  }

  async getDoctorPatients(): Promise<{
    success: boolean;
    data: any[];
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: [],
      });
    }

    return this.apiCall('/doctors/patients', {
      method: 'GET',
    });
  }

  async getMedicineShopOverview(): Promise<{
    success: boolean;
    data: MedicineShopOverview;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          laboratoryProducts: [],
          equipmentCategories: [],
        },
      });
    }

    return this.apiCall('/shop/overview', {
      method: 'GET',
    });
  }

  // Generic API call method
  async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = `${this.baseURL}${endpoint}`;
    console.log('📡 API Call:', {
      method: options.method || 'GET',
      url: fullUrl,
      endpoint: endpoint,
      baseURL: this.baseURL,
      mockMode: USE_MOCK_API,
      devMode: __DEV__
    });

    if (USE_MOCK_API) {
      console.log('🎭 Using mock API - returning empty response');
      // Generic mock response placeholder
      return Promise.resolve({} as T);
    }

    const headers = await this.getAuthHeaders();
    console.log('🔑 Auth headers prepared:', headers ? 'Token present' : 'No token');

    console.log('🌐 Making fetch request to:', fullUrl);
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    console.log('📨 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });

    return this.handleResponse<T>(response);
  }
}

export const apiService = new ApiService();
