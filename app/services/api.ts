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
  const FORCE_RAILWAY = false; // Set to false to use local development
  
  if (FORCE_RAILWAY) {
    console.log('🚂 Forcing Railway URL for testing');
    return "https://mediacare-production.up.railway.app";  
    // return "https://localhost:4000";  
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
  console.log('🔍 expoHostIp:', expoHostIp);
  if (expoHostIp) {
    return `https://${expoHostIp}:4000`;
    // return `http://${expoHostIp}:4000`;
  }

  // For development, handle different platforms
  
  // Production - use Railway URL
  return "https://mediacare-production.up.railway.app";
};

const API_BASE_URL = getDefaultBaseUrl();

const USE_MOCK_API = false; // Changed to false to use real backend

export interface User {
  id: string;
  email: string;
  name: string;
  role: "doctor" | "patient";
  profileImage?: string;
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
  idNumber: string;
  specialization?: string;
  licenseDocument?: string;
  profileImage?: string;
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
  laboratoryCategories: ShopCategory[];
  equipmentProducts: ShopProduct[];
  equipmentCategories: ShopCategory[];
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

export type AppointmentType = "video" | "home-visit";

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
    
    const jsonData = await response.json();
    console.log('📦 Parsed JSON response:', {
      hasSuccess: 'success' in jsonData,
      success: jsonData?.success,
      hasData: 'data' in jsonData,
      dataKeys: jsonData?.data ? Object.keys(jsonData.data) : null,
    });
    
    return jsonData;
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

  async uploadProfileImagePublic(
    file: {
      uri: string;
      name: string;
      type: string;
    },
  ): Promise<{ success: boolean; url: string; publicId: string }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        url: file.uri,
        publicId: "mock-public-id",
      });
    }

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const response = await fetch(`${this.baseURL}/uploads/image/public`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - React Native FormData sets it automatically with boundary
    });

    return this.handleResponse<{ success: boolean; url: string; publicId: string }>(response);
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

  async getDoctorById(id: string, includePending = true): Promise<{
    success: boolean;
    data: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: null,
      });
    }

    const query = includePending ? '?includePending=true' : '';

    const [doctorRes, availabilityRes] = await Promise.all([
      this.apiCall(`/doctors/${id}${query}`, {
        method: 'GET',
      }),
      this.getDoctorAvailability(id),
    ]);

    const doctorData: any = (doctorRes as any)?.data ?? {};
    const availabilityData: any = (availabilityRes as any)?.data ?? [];

    return {
      ...(doctorRes as any),
      data: {
        ...doctorData,
        availability: availabilityData,
      },
    };
  }

  async getDoctorAvailability(
    doctorId: string,
    type?: 'video' | 'home-visit',
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

    const queryParams = new URLSearchParams();
    if (type) {
      queryParams.append('type', type);
    }

    const queryString = queryParams.toString();
    return this.apiCall(`/doctors/${doctorId}/availability${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  }

  async updateAvailability(availability: {
    date: string;
    timeSlots: string[];
    isAvailable: boolean;
    type: 'video' | 'home-visit';
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
    console.log('📸 [ApiService] updateProfile called with:', JSON.stringify(profileData, null, 2));
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: profileData,
      });
    }

    const result = await this.apiCall<{ success: boolean; data: any }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    console.log('📸 [ApiService] updateProfile response:', JSON.stringify(result, null, 2));
    return result;
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    message?: string;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'პაროლი წარმატებით შეიცვალა',
      });
    }

    return this.apiCall('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
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
      videoConsultations: {
        total: number;
        completed: number;
        thisMonth: number;
      };
      homeVisits: {
        total: number;
        completed: number;
        thisMonth: number;
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
          videoConsultations: {
            total: 0,
            completed: 0,
            thisMonth: 0,
          },
          homeVisits: {
            total: 0,
            completed: 0,
            thisMonth: 0,
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
      type: 'consultation' | 'followup' | 'emergency' | 'video' | 'home-visit';
      status: 'completed' | 'scheduled' | 'in-progress' | 'cancelled';
      fee: number;
      isPaid: boolean;
      diagnosis?: string;
      symptoms?: string;
      visitAddress?: string;
      consultationSummary?: {
        diagnosis?: string;
        symptoms?: string;
        medications?: string;
        notes?: string;
        vitals?: {
          bloodPressure?: string;
          heartRate?: string;
          temperature?: string;
          weight?: string;
        };
      };
      followUp?: {
        required: boolean;
        date?: string;
        reason?: string;
      };
      form100?: {
        id?: string;
        issueDate?: string;
        validUntil?: string;
        reason?: string;
        diagnosis?: string;
        recommendations?: string;
        pdfUrl?: string;
        fileName?: string;
      };
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

  async updateDoctorAppointment(
    appointmentId: string,
    payload: {
      status?: 'scheduled' | 'completed' | 'in-progress' | 'cancelled';
      consultationSummary?: {
        diagnosis?: string;
        symptoms?: string;
        medications?: string;
        notes?: string;
        vitals?: {
          bloodPressure?: string;
          heartRate?: string;
          temperature?: string;
          weight?: string;
        };
      };
      followUp?: {
        required: boolean;
        date?: string;
        reason?: string;
      };
    },
  ) {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: payload,
      });
    }

    const statusMap: Record<string, string> = {
      scheduled: 'confirmed',
      'in-progress': 'in-progress',
      completed: 'completed',
      cancelled: 'cancelled',
    };

    const body: Record<string, unknown> = {
      ...payload,
    };

    if (payload.status) {
      body.status = statusMap[payload.status] ?? payload.status;
    }

    return this.apiCall(`/doctors/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async uploadForm100Document(
    appointmentId: string,
    payload: {
      diagnosis?: string;
    },
    file?: {
      uri: string;
      name?: string | null;
      mimeType?: string | null;
    },
  ) {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: null,
      } as any);
    }

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value);
      }
    });

    if (file) {
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'form-100.pdf',
        type: file.mimeType || 'application/pdf',
      } as any);
    }

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.baseURL}/doctors/appointments/${appointmentId}/form100`,
      {
        method: "PATCH",
        headers,
        body: formData,
      }
    );

    return this.handleResponse(response);
  }

  async getAgoraToken(appointmentId: string): Promise<{
    success: boolean;
    data: {
      token: string;
      channelName: string;
      appId: string;
      uid: number;
      expirationTime: number;
    };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          token: "mock_token",
          channelName: `appointment-${appointmentId}`,
          appId: "mock_app_id",
          uid: 1,
          expirationTime: Math.floor(Date.now() / 1000) + 3600 * 24,
        },
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/agora-token`, {
      method: "GET",
    });
  }

  async scheduleFollowUpAppointment(
    appointmentId: string,
    payload: {
      date: string;
      time: string;
      type?: 'video' | 'home-visit';
      visitAddress?: string;
      reason?: string;
    },
    isDoctor: boolean = false, // true for doctor, false for patient
  ) {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: null,
      } as any);
    }

    // Use different endpoints for doctor vs patient
    const endpoint = isDoctor
      ? `/doctors/appointments/${appointmentId}/follow-up`
      : `/appointments/${appointmentId}/follow-up`;

    return this.apiCall(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async checkFollowUpEligibility(appointmentId: string) {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        eligible: true,
      } as any);
    }

    return this.apiCall(`/appointments/${appointmentId}/follow-up/eligibility`, {
      method: 'GET',
    });
  }

  async assignLaboratoryTests(
    appointmentId: string,
    tests: {
      productId: string;
      productName: string;
      clinicId?: string;
      clinicName?: string;
    }[],
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'ლაბორატორიული კვლევები წარმატებით დაემატა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/laboratory-tests`, {
      method: 'PUT',
      body: JSON.stringify({ tests }),
    });
  }

  async assignInstrumentalTests(
    appointmentId: string,
    tests: {
      productId: string;
      productName: string;
      notes?: string;
    }[],
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'ინსტრუმენტული კვლევები წარმატებით დაემატა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/instrumental-tests`, {
      method: 'PUT',
      body: JSON.stringify({ tests }),
    });
  }

  async bookLaboratoryTest(
    appointmentId: string,
    data: {
      productId: string;
      clinicId: string;
      clinicName: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'ლაბორატორიული კვლევა წარმატებით დაჯავშნა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/laboratory-tests/book`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async bookInstrumentalTest(
    appointmentId: string,
    data: {
      productId: string;
      clinicId: string;
      clinicName: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'ინსტრუმენტული კვლევა წარმატებით დაჯავშნა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/instrumental-tests/book`, {
      method: 'PUT',
      body: JSON.stringify(data),
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
    type: AppointmentType;
    consultationFee: number;
    totalAmount: number;
    paymentMethod?: string;
    paymentStatus?: string;
    patientDetails?: {
      name?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
      personalId?: string;
      address?: string;
      problem?: string;
    };
    documents?: string[];
    notes?: string;
    visitAddress?: string;
  }): Promise<{
    success: boolean;
    data: any;
    message?: string;
  }> {
    console.log('🏥 [ApiService] createAppointment გამოძახებულია');
    console.log('🏥 [ApiService] createAppointment - Full data:', JSON.stringify(appointmentData, null, 2));
    console.log('🏥 [ApiService] createAppointment - Doctor ID:', appointmentData.doctorId);
    console.log('🏥 [ApiService] createAppointment - Date:', appointmentData.appointmentDate);
    console.log('🏥 [ApiService] createAppointment - Time:', appointmentData.appointmentTime);
    console.log('🏥 [ApiService] createAppointment - Type:', appointmentData.type);
    console.log('🏥 [ApiService] createAppointment - Fee:', appointmentData.consultationFee);
    console.log('🏥 [ApiService] createAppointment - Total:', appointmentData.totalAmount);
    console.log('🏥 [ApiService] createAppointment - Patient Details:', JSON.stringify(appointmentData.patientDetails, null, 2));
    console.log('🏥 [ApiService] createAppointment - Visit Address:', appointmentData.visitAddress);
    console.log('🏥 [ApiService] createAppointment - Notes:', appointmentData.notes);
    console.log('🏥 [ApiService] createAppointment - Documents:', appointmentData.documents);
    console.log('🏥 [ApiService] createAppointment - Payment Method:', appointmentData.paymentMethod);
    console.log('🏥 [ApiService] createAppointment - Payment Status:', appointmentData.paymentStatus);
    console.log('🏥 [ApiService] createAppointment - Base URL:', this.baseURL);
    console.log('🏥 [ApiService] createAppointment - Endpoint: POST /appointments');
    console.log('🏥 [ApiService] createAppointment - Mock Mode:', USE_MOCK_API);

    if (USE_MOCK_API) {
      console.log('🎭 [ApiService] createAppointment - Mock API mode, returning mock response');
      return Promise.resolve({
        success: true,
        data: {
          appointmentNumber: 'APT20240001',
          ...appointmentData,
        },
      });
    }

    console.log('🌐 [ApiService] createAppointment - Sending request to backend...');
    const result = await this.apiCall<{
      success: boolean;
      data: any;
      message?: string;
    }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
    
    console.log('✅ [ApiService] createAppointment - Response received:', JSON.stringify(result, null, 2));
    return result;
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

  async cancelAppointment(appointmentId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'ჯავშანი წარმატებით გაუქმდა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/cancel`, {
      method: 'PUT',
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

  async requestReschedule(
    appointmentId: string,
    newDate: string,
    newTime: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'გადაჯავშნის მოთხოვნა გაიგზავნა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule-request`, {
      method: 'POST',
      body: JSON.stringify({
        newDate,
        newTime,
        reason,
      }),
    });
  }

  async approveReschedule(appointmentId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'გადაჯავშნა დამტკიცდა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule-approve`, {
      method: 'PUT',
    });
  }

  async rejectReschedule(appointmentId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'გადაჯავშნის მოთხოვნა უარყოფილია',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule-reject`, {
      method: 'PUT',
    });
  }

  // Join video call - track when patient or doctor joins
  async joinCall(appointmentId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'Join time recorded (mock)',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/join`, {
      method: 'POST',
    });
  }

  // Complete video consultation - called by doctor after both parties leave
  async completeConsultation(appointmentId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'Consultation marked as conducted (mock)',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/complete`, {
      method: 'POST',
    });
  }

  // Complete home visit - called by patient
  async completeHomeVisit(appointmentId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'Home visit marked as completed (mock)',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/home-visit-complete`, {
      method: 'POST',
    });
  }

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'ჯავშანი წარმატებით გადაინიშნა',
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ newDate, newTime }),
    });
  }

  async getAppointmentDocuments(appointmentId: string): Promise<{
    success: boolean;
    data: any[];
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: [],
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/documents`, {
      method: 'GET',
    });
  }

  async uploadAppointmentDocument(
    appointmentId: string,
    file: {
      uri: string;
      name: string;
      type: string;
    },
  ): Promise<{
    success: boolean;
    data: { url: string; publicId?: string; name?: string; type?: string; size?: number; uploadedAt: string };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          url: file.uri,
          name: file.name,
          type: file.type,
          size: 0,
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/appointments/${appointmentId}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<{
      success: boolean;
      data: { url: string; publicId?: string; name?: string; type?: string; size?: number; uploadedAt: string };
    }>(response);
  }

  async uploadExternalLabResult(
    appointmentId: string,
    file: {
      uri: string;
      name: string;
      type: string;
    },
    testName?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: { url: string; publicId?: string; name?: string; type?: string; size?: number; uploadedAt: string; isExternalLabResult?: boolean };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'გარე ლაბორატორიული კვლევის შედეგი წარმატებით ატვირთა',
        data: {
          url: file.uri,
          name: testName || file.name,
          type: file.type,
          size: 0,
          uploadedAt: new Date().toISOString(),
          isExternalLabResult: true,
        },
      });
    }

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    if (testName) {
      formData.append('testName', testName);
    }

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/appointments/${appointmentId}/external-lab-result`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<{
      success: boolean;
      message?: string;
      data?: { url: string; publicId?: string; name?: string; type?: string; size?: number; uploadedAt: string; isExternalLabResult?: boolean };
    }>(response);
  }

  async uploadLaboratoryTestResult(
    appointmentId: string,
    productId: string,
    file: {
      uri: string;
      name: string;
      type: string;
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: { url: string; publicId?: string; name?: string; type?: string; size?: number; uploadedAt: string };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: 'ლაბორატორიული კვლევის შედეგი წარმატებით ატვირთა',
        data: {
          url: file.uri,
          name: file.name,
          type: file.type,
          size: 0,
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/appointments/${appointmentId}/laboratory-tests/${productId}/result`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<{
      success: boolean;
      message?: string;
      data?: { url: string; publicId?: string; name?: string; type?: string; size?: number; uploadedAt: string };
    }>(response);
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
          laboratoryCategories: [],
          equipmentProducts: [],
          equipmentCategories: [],
        },
      });
    }

    return this.apiCall('/shop/overview', {
      method: 'GET',
    });
  }

  async getClinics(): Promise<{
    success: boolean;
    data: Clinic[];
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: [],
      });
    }

    return this.apiCall('/shop/clinics', {
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

    if (options.body && typeof options.body === 'string') {
      try {
        const bodyData = JSON.parse(options.body);
        console.log('📦 Request body:', JSON.stringify(bodyData, null, 2));
        if (bodyData.profileImage) {
          console.log('📸 Request body contains profileImage:', bodyData.profileImage);
        }
      } catch {
        console.log('📦 Request body (not JSON):', options.body);
      }
    }

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

  // Advisors endpoints
  async getAdvisors(): Promise<{
    success: boolean;
    data: any[];
  }> {
    try {
      const response = await fetch(`${this.getBaseURL()}/advisors`, {
        method: "GET",
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: data.success || false,
        data: data.data || [],
      };
    } catch (error: any) {
      logger.error("Error fetching advisors:", error);
      return {
        success: false,
        data: [],
      };
    }
  }

  async getActiveAdvisors(): Promise<{
    success: boolean;
    data: any[];
  }> {
    try {
      const response = await fetch(`${this.getBaseURL()}/advisors/active`, {
        method: "GET",
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: data.success || false,
        data: data.data || [],
      };
    } catch (error: any) {
      logger.error("Error fetching active advisors:", error);
      return {
        success: false,
        data: [],
      };
    }
  }

  // Terms endpoints
  async getTerms(type: "cancellation" | "service" | "privacy" | "contract" | "usage" | "doctor-cancellation" | "doctor-service"): Promise<{
    success: boolean;
    data: { content: string; type: string; updatedAt?: string };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          content: `ეს არის მოკლე ტექსტი ${type} პირობების შესახებ.`,
          type,
        },
      });
    }

    return this.apiCall(`/terms/${type}`, {
      method: "GET",
    });
  }

  async updateTerms(
    type: "cancellation" | "service" | "privacy",
    content: string
  ): Promise<{
    success: boolean;
    data: { content: string; type: string };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: { content, type },
      });
    }

    return this.apiCall(`/terms/${type}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  // Help Center endpoints
  async getHelpCenter(): Promise<{
    success: boolean;
    data: {
      faqs: {
        question: string;
        answer: string;
        isActive?: boolean;
        order?: number;
        role?: 'doctor' | 'patient'; // Role: doctor or patient
      }[];
      contactInfo: {
        phone?: string;
        whatsapp?: string;
        email?: string;
        website?: string;
        address?: string;
        workingHours?: string;
      };
      updatedAt?: string;
    };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          faqs: [],
          contactInfo: {},
        },
      });
    }

    return this.apiCall("/help-center", {
      method: "GET",
    });
  }
}

export const apiService = new ApiService();
