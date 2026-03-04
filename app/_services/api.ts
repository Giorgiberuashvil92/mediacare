import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { logger } from "../utils/logger";

// Development build-ისთვის IP მისამართის ავტომატურად გამოყენება
const getDevelopmentIP = (): string | null => {
  // დეტალური ლოგირება debug-ისთვის
  console.log("🔍 IP Detection Debug Info:");
  console.log("  - Constants.debuggerHost:", Constants.debuggerHost);
  console.log("  - Constants.expoConfig?.hostUri:", Constants.expoConfig?.hostUri);
  console.log("  - Constants.manifest?.hostUri:", (Constants.manifest as any)?.hostUri);
  
  // პირველ რიგში ვცდილობთ expo-constants-დან ავტომატურად მივიღოთ IP
  const debuggerHost = Constants.debuggerHost;
  if (debuggerHost) {
    // debuggerHost არის "IP:port" ფორმატში, მაგ: "192.168.1.100:8081"
    const ip = debuggerHost.split(':')[0];
    console.log(`  - Extracted IP from debuggerHost: ${ip}`);
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      console.log(`🌐 ✅ Auto-detected IP from debuggerHost: ${ip}`);
      return ip;
    }
  }

  // ალტერნატიულად ვცდილობთ hostUri-დან
  const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri;
  if (hostUri) {
    console.log(`  - hostUri value: ${hostUri}`);
    
    // hostUri შეიძლება იყოს "exp://IP:port", "http://IP:port" ან "IP:port" ფორმატში
    let ip: string | null = null;
    
    // ვცდილობთ exp:// ან http:// prefix-ით
    const matchWithPrefix = hostUri.match(/(?:exp|http):\/\/([^:]+)/);
    if (matchWithPrefix && matchWithPrefix[1]) {
      ip = matchWithPrefix[1];
      console.log(`  - Extracted IP from hostUri (with prefix): ${ip}`);
    } else {
      // თუ prefix არ აქვს, ვცდილობთ პირდაპირ IP:port format-ს
      const matchWithoutPrefix = hostUri.match(/^([^:]+):/);
      if (matchWithoutPrefix && matchWithoutPrefix[1]) {
        ip = matchWithoutPrefix[1];
        console.log(`  - Extracted IP from hostUri (without prefix): ${ip}`);
      }
    }
    
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      console.log(`🌐 ✅ Auto-detected IP from hostUri: ${ip}`);
      return ip;
    }
  }

  // Fallback: სტატიკური IP (თუ ავტომატურად ვერ მოიძებნა)
  const STATIC_IP = "172.20.10.2"; // შეცვალეთ თქვენი IP-ით თუ ავტომატურად ვერ მოიძებნა
  if (STATIC_IP) {
    console.log(`🌐 ⚠️ Using static IP (fallback): ${STATIC_IP}`);
    return STATIC_IP;
  }

  console.log("🌐 ❌ No IP found!");
  return null;
};

const getDefaultBaseUrl = () => {
  // Railway production URL
  const RAILWAY_URL = "https://mediacare-production.up.railway.app";

  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as any)?.API_URL ||
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    (Constants.manifest as any)?.extra?.API_URL ||
    (Constants.manifest as any)?.extra?.apiUrl;

  console.log("🌐 API URL Configuration:", {
    isDev: __DEV__,
    envUrl: envUrl,
    hasEnvUrl: !!envUrl,
    expoConfigExtra: (Constants.expoConfig?.extra as any)?.apiUrl,
    manifestExtra: (Constants.manifest as any)?.extra?.apiUrl,
  });

  // Production-ისთვის (არა development) გამოვიყენოთ Railway URL
  if (!__DEV__) {
    // თუ envUrl არის განსაზღვრული და არ არის localhost, გამოვიყენოთ ის
    if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
      console.log("✅ Using production URL from env:", envUrl);
      return envUrl;
    }
    // Production-ისთვის Railway URL
    console.log("🚂 Using Railway production URL:", RAILWAY_URL);
    return RAILWAY_URL;
  }

  // Development build-ისთვის გამოვიყენოთ ავტომატურად გამოვლენილი IP
  // თუ envUrl არის განსაზღვრული და არ არის localhost, გამოვიყენოთ ის
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    console.log("✅ Using development URL from env:", envUrl);
    return envUrl;
  }

  // Development-ისთვის IP-ის გამოყენება
  const devIP = getDevelopmentIP();
  if (devIP) {
    const devUrl = `http://${devIP}:4001`;
    console.log("🔧 Using development URL with IP:", devUrl);
    return devUrl;
  }

  // Fallback
  if (envUrl) {
    console.log("✅ Using fallback URL:", envUrl);
    return envUrl;
  }

  console.warn("⚠️ No API URL found, using localhost fallback");
  return "http://localhost:4001";
};

const API_BASE_URL = getDefaultBaseUrl();

const USE_MOCK_API = false; // Changed to false to use real backend

export interface User {
  id: string;
  email: string;
  name: string;
  role: "doctor" | "patient";
  phone?: string;
  profileImage?: string;
  doctorStatus?: "awaiting_schedule" | "active";
  isActive?: boolean;
  isVerified?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
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
  phone: string;
  verificationCode: string; // OTP code for phone verification
  specialization?: string;
  licenseDocument?: string;
  profileImage?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  requiresOTP?: boolean; // If true, OTP verification is required before login
  data: {
    user: User;
    token?: string; // Optional if requiresOTP is true
    refreshToken?: string; // Optional if requiresOTP is true
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

// AI Assistant Types
export interface AISession {
  id: string;
  initiator_type: "customer" | "doctor";
  initiator_id: string;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
}

export interface CreateSessionRequest {
  initiator_id: string;
  initiator_type: "customer" | "doctor";
}

export interface AIMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  image_url?: string;
  // Additional metadata that AI might return (e.g., doctor recommendations)
  metadata?: {
    doctors?: {
      id: string;
      name: string;
      specialization: string;
      rating?: number;
      reviewCount?: number;
      image?: string;
      consultationFee?: string;
      [key: string]: any;
    }[];
    [key: string]: any;
  };
}

export interface SendMessageRequest {
  content: string;
  image?: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface SendMessageResponse {
  user_message: AIMessage;
  assistant_message: AIMessage;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    console.log("🚀 ApiService initialized with baseURL:", this.baseURL);
    console.log("🔧 __DEV__ mode:", __DEV__);
    console.log("🎯 USE_MOCK_API:", USE_MOCK_API);
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
    if (!response.ok) {
      // Clone response to avoid "Already read" error
      const clonedResponse = response.clone();
      const errorData = await clonedResponse.json().catch(() => ({}));
      const errorMessage =
        errorData.message || `HTTP error! status: ${response.status}`;

      throw new Error(errorMessage);
    }

    const jsonData = await response.json();
    console.log("📦 Parsed JSON response:", {
      hasSuccess: "success" in jsonData,
      success: jsonData?.success,
      hasData: "data" in jsonData,
      dataKeys: jsonData?.data ? Object.keys(jsonData.data) : null,
    });

    return jsonData;
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log("🔐 Login attempt:", {
      email: credentials.email,
      passwordLength: credentials.password?.length || 0,
      baseURL: this.baseURL,
      mockMode: USE_MOCK_API,
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
      if (mockResponse.data.token) {
        await AsyncStorage.setItem("accessToken", mockResponse.data.token);
      }
      if (mockResponse.data.refreshToken) {
        await AsyncStorage.setItem(
          "refreshToken",
          mockResponse.data.refreshToken,
        );
      }
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
      return mockResponse;
    }

    const data = await this.apiCall<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    logger.auth.loginSuccess(data.data.user);

    // Store tokens only if OTP is NOT required
    // If OTP is required, tokens will be stored after OTP verification
    // Also, if user has a phone number, always require OTP (force OTP after logout)
    if (!data.requiresOTP && (!data.data.user.phone || !data.data.user.phone.trim())) {
      // Only store tokens if OTP is not required AND user doesn't have a phone
      if (data.data.token) {
        await AsyncStorage.setItem("accessToken", data.data.token);
      }
      if (data.data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", data.data.refreshToken);
      }
      if (data.data.user) {
        await AsyncStorage.setItem("user", JSON.stringify(data.data.user));
      }
    } else {
      // OTP required or user has phone - don't store tokens yet
      // They will be stored after OTP verification in verifyLoginOTP
      console.log('⚠️ [ApiService] OTP required or user has phone - not storing tokens yet');
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
      if (mockResponse.data.token) {
        await AsyncStorage.setItem("accessToken", mockResponse.data.token);
      }
      if (mockResponse.data.refreshToken) {
        await AsyncStorage.setItem(
          "refreshToken",
          mockResponse.data.refreshToken,
        );
      }
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

  async sendPhoneVerificationCode(
    phone: string,
  ): Promise<{ success: boolean; message: string }> {
    if (USE_MOCK_API) {
      // In mock mode, always succeed
      console.log(`[MOCK] Verification code would be sent to ${phone}`);
      return Promise.resolve({
        success: true,
        message: "Verification code sent successfully (mock)",
      });
    }

    const response = await fetch(
      `${this.baseURL}/auth/send-verification-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      },
    );

    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async verifyLoginOTP(
    email: string,
    verificationCode: string,
  ): Promise<AuthResponse> {
    if (USE_MOCK_API) {
      // In mock mode, always succeed
      console.log(`[MOCK] Login OTP verified for ${email}`);
      const mockUser: User = {
        id: "mock-user-1",
        email: email,
        name: "Demo User",
        role: email.includes("doc") ? "doctor" : "patient",
      };

      const mockResponse: AuthResponse = {
        success: true,
        message: "Login successful (mock)",
        requiresOTP: false,
        data: {
          user: mockUser,
          token: "mock-access-token",
          refreshToken: "mock-refresh-token",
        },
      };

      if (mockResponse.data.token) {
        await AsyncStorage.setItem("accessToken", mockResponse.data.token);
      }
      if (mockResponse.data.refreshToken) {
        await AsyncStorage.setItem(
          "refreshToken",
          mockResponse.data.refreshToken,
        );
      }
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));
      return mockResponse;
    }

    const response = await fetch(`${this.baseURL}/auth/verify-login-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, verificationCode }),
    });

    const data = await this.handleResponse<AuthResponse>(response);

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

  async verifyPhoneCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message: string; verified: boolean }> {
    if (USE_MOCK_API) {
      // In mock mode, accept any 6-digit code
      if (code.length === 6 && /^\d{6}$/.test(code)) {
        return Promise.resolve({
          success: true,
          message: "Phone verified successfully (mock)",
          verified: true,
        });
      }
      return Promise.resolve({
        success: false,
        message: "Invalid verification code (mock)",
        verified: false,
      });
    }

    const response = await fetch(`${this.baseURL}/auth/verify-phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, code }),
    });

    return this.handleResponse<{
      success: boolean;
      message: string;
      verified: boolean;
    }>(response);
  }

  async uploadProfileImagePublic(file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<{ success: boolean; url: string; publicId: string }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        url: file.uri,
        publicId: "mock-public-id",
      });
    }

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name || "profile.jpg",
        type: file.type || "image/jpeg",
      } as any);

      console.log("📤 Uploading profile image:", {
        uri: file.uri,
        name: file.name,
        type: file.type,
        url: `${this.baseURL}/uploads/image/public`,
      });

      const response = await fetch(`${this.baseURL}/uploads/image/public`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - React Native FormData sets it automatically with boundary
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        console.error("❌ Upload error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });

        throw new Error(errorMessage);
      }

      const jsonData = await response.json();
      console.log("✅ Upload success:", jsonData);

      // Backend returns { success: true, url: string, publicId: string }
      if (jsonData.success && jsonData.url) {
        return {
          success: true,
          url: jsonData.url,
          publicId: jsonData.publicId || "",
        };
      }

      // Handle case where response might be wrapped in data property
      if (jsonData.data && jsonData.data.url) {
        return {
          success: true,
          url: jsonData.data.url,
          publicId: jsonData.data.publicId || "",
        };
      }

      throw new Error("Invalid response format from server");
    } catch (error) {
      console.error("❌ Profile image upload error:", error);
      throw error instanceof Error 
        ? error 
        : new Error("Failed to upload profile image");
    }
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
      queryParams.append("specialization", params.specialization);
    }
    if (params?.location) {
      queryParams.append("location", params.location);
    }
    if (params?.rating) {
      queryParams.append("rating", params.rating.toString());
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }
    if (params?.symptom) {
      queryParams.append("symptom", params.symptom);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/doctors${queryString ? `?${queryString}` : ""}`;

    return this.apiCall(endpoint, {
      method: "GET",
    });
  }

  async getDoctorById(
    id: string,
    includePending = true,
  ): Promise<{
    success: boolean;
    data: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: null,
      });
    }

    const query = includePending ? "?includePending=true" : "";

    const [doctorRes, availabilityRes] = await Promise.all([
      this.apiCall(`/doctors/${id}${query}`, {
        method: "GET",
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
    type?: "video" | "home-visit",
    forPatient: boolean = false,
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
      queryParams.append("type", type);
    }
    if (forPatient) {
      queryParams.append("forPatient", "true");
    }

    const queryString = queryParams.toString();
    return this.apiCall(
      `/doctors/${doctorId}/availability${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
      },
    );
  }

  async updateAvailability(
    availability: {
      date: string;
      timeSlots: string[];
      isAvailable: boolean;
      type: "video" | "home-visit";
    }[],
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "Availability updated (mock)",
        data: { updated: availability.length },
      });
    }

    return this.apiCall("/doctors/availability", {
      method: "PUT",
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

    return this.apiCall("/profile", {
      method: "GET",
    });
  }

  async getSpecializations(): Promise<{
    success: boolean;
    data: Specialization[];
  }> {
    const response = await fetch(`${this.baseURL}/specializations`, {
      method: "GET",
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<{ success: boolean; data: Specialization[] }>(
      response,
    );
  }

  async updateProfile(profileData: any): Promise<{
    success: boolean;
    data: any;
  }> {
    console.log(
      "📸 [ApiService] updateProfile called with:",
      JSON.stringify(profileData, null, 2),
    );
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: profileData,
      });
    }

    const result = await this.apiCall<{ success: boolean; data: any }>(
      "/profile",
      {
        method: "PUT",
        body: JSON.stringify(profileData),
      },
    );
    console.log(
      "📸 [ApiService] updateProfile response:",
      JSON.stringify(result, null, 2),
    );
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
        message: "პაროლი წარმატებით შეიცვალა",
      });
    }

    return this.apiCall("/profile/password", {
      method: "PUT",
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

    return this.apiCall("/doctors/dashboard/stats", {
      method: "GET",
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
      type: "consultation" | "followup" | "emergency" | "video" | "home-visit";
      status: "completed" | "scheduled" | "in-progress" | "cancelled";
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
      method: "GET",
    });
  }

  async updateDoctorAppointment(
    appointmentId: string,
    payload: {
      status?: "scheduled" | "completed" | "in-progress" | "cancelled";
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
      scheduled: "confirmed",
      "in-progress": "in-progress",
      completed: "completed",
      cancelled: "cancelled",
    };

    const body: Record<string, unknown> = {
      ...payload,
    };

    if (payload.status) {
      body.status = statusMap[payload.status] ?? payload.status;
    }

    return this.apiCall(`/doctors/appointments/${appointmentId}`, {
      method: "PATCH",
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
      formData.append("file", {
        uri: file.uri,
        name: file.name || "form-100.pdf",
        type: file.mimeType || "application/pdf",
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
      },
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
      type?: "video" | "home-visit";
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
      method: "POST",
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

    return this.apiCall(
      `/appointments/${appointmentId}/follow-up/eligibility`,
      {
        method: "GET",
      },
    );
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
        message: "ლაბორატორიული კვლევები წარმატებით დაემატა",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/laboratory-tests`, {
      method: "PUT",
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
        message: "ინსტრუმენტული კვლევები წარმატებით დაემატა",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/instrumental-tests`, {
      method: "PUT",
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
        message: "ლაბორატორიული კვლევა წარმატებით დაჯავშნა",
      });
    }

    return this.apiCall(
      `/appointments/${appointmentId}/laboratory-tests/book`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
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
        message: "ინსტრუმენტული კვლევა წარმატებით დაჯავშნა",
      });
    }

    return this.apiCall(
      `/appointments/${appointmentId}/instrumental-tests/book`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
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
          date: new Date().toISOString().split("T")[0],
          dayOfWeek: "",
          consultations: [],
          availableSlots: [],
          totalSlots: 0,
        },
      });
    }

    return this.apiCall("/doctors/dashboard/schedule", {
      method: "GET",
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
    console.log("🏥 [ApiService] createAppointment გამოძახებულია");
    console.log(
      "🏥 [ApiService] createAppointment - Full data:",
      JSON.stringify(appointmentData, null, 2),
    );
    console.log(
      "🏥 [ApiService] createAppointment - Doctor ID:",
      appointmentData.doctorId,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Date:",
      appointmentData.appointmentDate,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Time:",
      appointmentData.appointmentTime,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Type:",
      appointmentData.type,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Fee:",
      appointmentData.consultationFee,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Total:",
      appointmentData.totalAmount,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Patient Details:",
      JSON.stringify(appointmentData.patientDetails, null, 2),
    );
    console.log(
      "🏥 [ApiService] createAppointment - Visit Address:",
      appointmentData.visitAddress,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Notes:",
      appointmentData.notes,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Documents:",
      appointmentData.documents,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Payment Method:",
      appointmentData.paymentMethod,
    );
    console.log(
      "🏥 [ApiService] createAppointment - Payment Status:",
      appointmentData.paymentStatus,
    );
    console.log("🏥 [ApiService] createAppointment - Base URL:", this.baseURL);
    console.log(
      "🏥 [ApiService] createAppointment - Endpoint: POST /appointments",
    );
    console.log("🏥 [ApiService] createAppointment - Mock Mode:", USE_MOCK_API);

    if (USE_MOCK_API) {
      console.log(
        "🎭 [ApiService] createAppointment - Mock API mode, returning mock response",
      );
      return Promise.resolve({
        success: true,
        data: {
          appointmentNumber: "APT20240001",
          ...appointmentData,
        },
      });
    }

    console.log(
      "🌐 [ApiService] createAppointment - Sending request to backend...",
    );
    const result = await this.apiCall<{
      success: boolean;
      data: any;
      message?: string;
    }>("/appointments", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    });

    console.log(
      "✅ [ApiService] createAppointment - Response received:",
      JSON.stringify(result, null, 2),
    );
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

    return this.apiCall("/appointments/patient", {
      method: "GET",
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
        message: "ჯავშანი წარმატებით გაუქმდა",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/cancel`, {
      method: "PUT",
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
        message: "Time slot blocked temporarily",
      });
    }

    return this.apiCall("/appointments/block-timeslot", {
      method: "POST",
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
      method: "GET",
    });
  }

  async requestReschedule(
    appointmentId: string,
    newDate?: string,
    newTime?: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "გადაჯავშნის მოთხოვნა გაიგზავნა",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule-request`, {
      method: "POST",
      body: JSON.stringify({
        ...(newDate && { newDate }),
        ...(newTime && { newTime }),
        ...(reason && { reason }),
      }),
    });
  }

  async approveReschedule(
    appointmentId: string,
    newDate?: string,
    newTime?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "გადაჯავშნა დამტკიცდა",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule-approve`, {
      method: "PUT",
      body: JSON.stringify({
        ...(newDate && { newDate }),
        ...(newTime && { newTime }),
      }),
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
        message: "გადაჯავშნის მოთხოვნა უარყოფილია",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule-reject`, {
      method: "PUT",
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
        message: "Join time recorded (mock)",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/join`, {
      method: "POST",
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
        message: "Consultation marked as conducted (mock)",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/complete`, {
      method: "POST",
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
        message: "Home visit marked as completed (mock)",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/home-visit-complete`, {
      method: "POST",
    });
  }

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: any;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "ჯავშანი წარმატებით გადაინიშნა",
      });
    }

    return this.apiCall(`/appointments/${appointmentId}/reschedule`, {
      method: "PUT",
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
      method: "GET",
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
    data: {
      url: string;
      publicId?: string;
      name?: string;
      type?: string;
      size?: number;
      uploadedAt: string;
    };
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
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.baseURL}/appointments/${appointmentId}/documents`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    return this.handleResponse<{
      success: boolean;
      data: {
        url: string;
        publicId?: string;
        name?: string;
        type?: string;
        size?: number;
        uploadedAt: string;
      };
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
    data?: {
      url: string;
      publicId?: string;
      name?: string;
      type?: string;
      size?: number;
      uploadedAt: string;
      isExternalLabResult?: boolean;
    };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "გარე ლაბორატორიული კვლევის შედეგი წარმატებით ატვირთა",
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
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    if (testName) {
      formData.append("testName", testName);
    }

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.baseURL}/appointments/${appointmentId}/external-lab-result`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    return this.handleResponse<{
      success: boolean;
      message?: string;
      data?: {
        url: string;
        publicId?: string;
        name?: string;
        type?: string;
        size?: number;
        uploadedAt: string;
        isExternalLabResult?: boolean;
      };
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
    data?: {
      url: string;
      publicId?: string;
      name?: string;
      type?: string;
      size?: number;
      uploadedAt: string;
    };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "ლაბორატორიული კვლევის შედეგი წარმატებით ატვირთა",
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
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.baseURL}/appointments/${appointmentId}/laboratory-tests/${productId}/result`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    return this.handleResponse<{
      success: boolean;
      message?: string;
      data?: {
        url: string;
        publicId?: string;
        name?: string;
        type?: string;
        size?: number;
        uploadedAt: string;
      };
    }>(response);
  }

  async uploadInstrumentalTestResult(
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
    data?: {
      url: string;
      publicId?: string;
      name?: string;
      type?: string;
      size?: number;
      uploadedAt: string;
    };
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "ინსტრუმენტული კვლევის შედეგი წარმატებით ატვირთა",
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
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const token = await AsyncStorage.getItem("accessToken");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${this.baseURL}/appointments/${appointmentId}/instrumental-tests/${productId}/result`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    return this.handleResponse<{
      success: boolean;
      message?: string;
      data?: {
        url: string;
        publicId?: string;
        name?: string;
        type?: string;
        size?: number;
        uploadedAt: string;
      };
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

    return this.apiCall("/doctors/patients", {
      method: "GET",
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

    return this.apiCall("/shop/overview", {
      method: "GET",
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

    return this.apiCall("/shop/clinics", {
      method: "GET",
    });
  }

  // Generic API call method with timeout and better error handling
  async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = `${this.baseURL}${endpoint}`;
    const timeoutMs = 30000; // 30 seconds timeout
    
    console.log("📡 API Call:", {
      method: options.method || "GET",
      url: fullUrl,
      endpoint: endpoint,
      baseURL: this.baseURL,
      mockMode: USE_MOCK_API,
      devMode: __DEV__,
      timeout: timeoutMs,
    });

    if (USE_MOCK_API) {
      console.log("🎭 Using mock API - returning empty response");
      // Generic mock response placeholder
      return Promise.resolve({} as T);
    }

    const headers = await this.getAuthHeaders();
    console.log(
      "🔑 Auth headers prepared:",
      headers ? "Token present" : "No token",
    );

    if (options.body && typeof options.body === "string") {
      try {
        const bodyData = JSON.parse(options.body);
        console.log("📦 Request body:", JSON.stringify(bodyData, null, 2));
        if (bodyData.profileImage) {
          console.log(
            "📸 Request body contains profileImage:",
            bodyData.profileImage,
          );
        }
      } catch {
        console.log("📦 Request body (not JSON):", options.body);
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      console.log("🌐 Making fetch request to:", fullUrl);
      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      console.log("📨 Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      });

      return this.handleResponse<T>(response);
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Network error handling
      if (error.name === "AbortError") {
        console.error("⏱️ Request timeout:", fullUrl);
        throw new Error(
          `მოთხოვნა დრო ამოეწურა. გთხოვთ შეამოწმოთ ინტერნეტ კავშირი და სცადოთ თავიდან.`
        );
      }
      
      if (error.message?.includes("Network request failed") || 
          error.message?.includes("Network request timed out") ||
          error.message?.includes("Failed to connect")) {
        console.error("🌐 Network error:", {
          url: fullUrl,
          error: error.message,
          baseURL: this.baseURL,
        });
        throw new Error(
          `ინტერნეტ კავშირი ვერ დამყარდა. გთხოვთ შეამოწმოთ:\n` +
          `1. ინტერნეტ კავშირი\n` +
          `2. Backend სერვერი მუშაობს: ${this.baseURL}\n` +
          `3. WiFi/მობილური ინტერნეტი ჩართულია`
        );
      }
      
      console.error("❌ API Error:", {
        url: fullUrl,
        error: error.message,
        errorType: error.name,
      });
      throw error;
    }
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
  async getTerms(
    type:
      | "cancellation"
      | "service"
      | "privacy"
      | "contract"
      | "usage"
      | "doctor-cancellation"
      | "doctor-service",
  ): Promise<{
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
    content: string,
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
        role?: "doctor" | "patient"; // Role: doctor or patient
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

  async createAISession(
    request: CreateSessionRequest
  ): Promise<{
    success: boolean;
    data: AISession;
  }> {
    // ALWAYS use external API for session creation (NOT our backend)
    // HERA Backend API - External AI Assistant Service
    // HERA XXI Organization: https://hera-youth.ge
    const EXTERNAL_API_URL = "http://16.16.218.17:8008";
    const API_KEY = "hera-api-key";

    console.log("🚀 [createAISession] Using EXTERNAL API (NOT backend):", {
      url: `${EXTERNAL_API_URL}/sessions`,
      request: request,
      apiKey: API_KEY,
    });

    try {
      const response = await fetch(`${EXTERNAL_API_URL}/sessions`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "X-API-Key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      console.log("📨 [createAISession] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;
        console.error("❌ [createAISession] Error response:", errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ [createAISession] Session created successfully:", data);

      return {
        success: true,
        data: data,
      };
    } catch (error: any) {
      console.error("❌ [createAISession] Exception:", error);
      throw new Error(error.message || "Session creation failed");
    }
  }

  async getAISessions(params?: {
    skip?: number;
    limit?: number;
    initiator_id?: string;
  }): Promise<{
    success: boolean;
    data: AISession[];
  }> {
    // ALWAYS use external API for getting sessions (NOT our backend)
    // DO NOT use this.apiCall - use fetch directly!
    // HERA Backend API - External AI Assistant Service
    // HERA XXI Organization: https://hera-youth.ge
    const EXTERNAL_API_URL = "http://16.16.218.17:8008";
    const API_KEY = "hera-api-key";

    console.log("🚀🚀🚀 [getAISessions] Using EXTERNAL API (NOT backend) - DO NOT USE apiCall:", {
      url: `${EXTERNAL_API_URL}/sessions`,
      params: params,
      apiKey: API_KEY,
    });

    try {
      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) {
        queryParams.append("skip", params.skip.toString());
      }
      if (params?.limit !== undefined) {
        queryParams.append("limit", params.limit.toString());
      }
      if (params?.initiator_id) {
        queryParams.append("initiator_id", params.initiator_id);
      }

      const queryString = queryParams.toString();
      const url = `${EXTERNAL_API_URL}/sessions${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "X-API-Key": API_KEY,
        },
      });

      console.log("📨 [getAISessions] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;
        console.error("❌ [getAISessions] Error response:", errorData);
        throw new Error(errorMessage);
      }

      // External API returns array of sessions directly
      const sessionsArray = await response.json();
      
      console.log("✅ [getAISessions] Sessions received:", {
        count: sessionsArray.length,
        sessions: sessionsArray,
        firstSession: sessionsArray[0] || null,
        sessionStructure: sessionsArray[0] ? Object.keys(sessionsArray[0]) : [],
      });
      
      // Log each session's details
      if (sessionsArray.length > 0) {
        console.log("📋 [getAISessions] Session details:");
        sessionsArray.forEach((session: any, index: number) => {
          console.log(`  Session ${index + 1}:`, {
            id: session.id,
            initiator_type: session.initiator_type,
            initiator_id: session.initiator_id,
            status: session.status,
            created_at: session.created_at,
            updated_at: session.updated_at,
            allFields: Object.keys(session),
          });
        });
      }

      return {
        success: true,
        data: sessionsArray,
      };
    } catch (error: any) {
      console.error("❌ [getAISessions] Exception:", error);
      throw new Error(error.message || "Failed to get sessions");
    }
  }

  async getAISession(sessionId: string): Promise<{
    success: boolean;
    data: AISession;
  }> {
    // ALWAYS use external API for getting session (NOT our backend)
    // HERA Backend API - External AI Assistant Service
    // HERA XXI Organization: https://hera-youth.ge
    const EXTERNAL_API_URL = "http://16.16.218.17:8008";
    const API_KEY = "hera-api-key";

    console.log("🚀 [getAISession] Using EXTERNAL API (NOT backend):", {
      url: `${EXTERNAL_API_URL}/sessions/${sessionId}`,
      sessionId: sessionId,
    });

    try {
      const response = await fetch(`${EXTERNAL_API_URL}/sessions/${sessionId}`, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "X-API-Key": API_KEY,
        },
      });

      console.log("📨 [getAISession] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;
        console.error("❌ [getAISession] Error response:", errorData);
        throw new Error(errorMessage);
      }

      const sessionData = await response.json();
      console.log("✅ [getAISession] Session received:", sessionData);

      return {
        success: true,
        data: sessionData,
      };
    } catch (error: any) {
      console.error("❌ [getAISession] Exception:", error);
      throw new Error(error.message || "Failed to get session");
    }
  }

  async updateAISession(
    sessionId: string,
    updates: Partial<Pick<AISession, "status">>
  ): Promise<{
    success: boolean;
    data: AISession;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        data: {
          id: sessionId,
          initiator_type: "customer",
          initiator_id: "mock-user",
          status: updates.status || "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }

    return this.apiCall(`/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async deleteAISession(sessionId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    if (USE_MOCK_API) {
      return Promise.resolve({
        success: true,
        message: "Session deleted",
      });
    }

    return this.apiCall(`/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  // AI Assistant - Messages
  async sendAIMessage(
    sessionId: string,
    request: SendMessageRequest
  ): Promise<{
    success: boolean;
    data: SendMessageResponse;
  }> {
    // ALWAYS use external API for sending messages (NOT our backend)
    // HERA Backend API - External AI Assistant Service
    // HERA XXI Organization: https://hera-youth.ge
    const EXTERNAL_API_URL = "http://16.16.218.17:8008";
    const API_KEY = "hera-api-key";

    console.log("🚀 [sendAIMessage] Using EXTERNAL API (NOT backend):", {
      url: `${EXTERNAL_API_URL}/sessions/${sessionId}/messages`,
      sessionId: sessionId,
      hasContent: !!request.content,
      hasImage: !!request.image,
    });

    try {
      // Note: External API currently only supports text content, not images
      // If image is provided, we'll send it as part of the content description
      const messageContent = request.content || "";
      
      if (request.image) {
        console.warn("⚠️ [sendAIMessage] Image upload not yet supported by external API, sending text only");
        // TODO: When external API supports images, implement image upload here
      }

      const response = await fetch(
        `${EXTERNAL_API_URL}/sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "accept": "application/json",
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: messageContent,
          }),
        }
      );

      console.log("📨 [sendAIMessage] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;
        console.error("❌ [sendAIMessage] Error response:", errorData);
        throw new Error(errorMessage);
      }

      // External API returns array: [user_message, assistant_message]
      const messagesArray = await response.json();
      console.log("✅ [sendAIMessage] Messages received:", JSON.stringify(messagesArray, null, 2));

      // Convert array format to our expected format
      if (!Array.isArray(messagesArray) || messagesArray.length < 2) {
        throw new Error("Invalid response format from external API");
      }

      const userMessage = messagesArray[0];
      const assistantMessage = messagesArray[1];

      // Parse assistant message content to extract metadata (e.g., doctor recommendations)
      // AI might return structured data in JSON format within the content
      let assistantMetadata: any = undefined;
      try {
        // Try to parse content as JSON first (in case AI returns structured data)
        const parsedContent = JSON.parse(assistantMessage.content);
        if (parsedContent && typeof parsedContent === 'object') {
          // If content is JSON, extract metadata
          assistantMetadata = parsedContent.metadata || parsedContent;
          console.log("📋 [sendAIMessage] Extracted metadata from JSON content:", assistantMetadata);
        }
      } catch {
        // Content is not JSON, check if there's a metadata field in the response
        if (assistantMessage.metadata) {
          assistantMetadata = assistantMessage.metadata;
          console.log("📋 [sendAIMessage] Found metadata in response:", assistantMetadata);
        }
        
        // Also try to extract doctor recommendations from content if it's in a structured format
        // This handles cases where AI returns doctor info in the content text
        // Look for patterns that might indicate doctor recommendations
        // (This is a fallback - ideally the API would return structured data)
      }

      return {
        success: true,
        data: {
          user_message: {
            id: userMessage.id,
            session_id: userMessage.session_id,
            role: userMessage.role,
            content: userMessage.content,
            created_at: userMessage.created_at,
            image_url: request.image?.uri, // Preserve image URL if provided
          },
          assistant_message: {
            id: assistantMessage.id,
            session_id: assistantMessage.session_id,
            role: assistantMessage.role,
            content: assistantMessage.content,
            created_at: assistantMessage.created_at,
            metadata: assistantMetadata, // Include extracted metadata
          },
        },
      };
    } catch (error: any) {
      console.error("❌ [sendAIMessage] Exception:", error);
      throw new Error(error.message || "Failed to send message");
    }
  }

  async getAIMessages(
    sessionId: string,
    params?: {
      skip?: number;
      limit?: number;
    }
  ): Promise<{
    success: boolean;
    data: AIMessage[];
  }> {
    // ALWAYS use external API for getting messages (NOT our backend)
    // DO NOT use this.apiCall - use fetch directly!
    // HERA Backend API - External AI Assistant Service
    // HERA XXI Organization: https://hera-youth.ge
    const EXTERNAL_API_URL = "http://16.16.218.17:8008";
    const API_KEY = "hera-api-key";

    console.log("🚀🚀🚀 [getAIMessages] Using EXTERNAL API (NOT backend) - DO NOT USE apiCall:", {
      url: `${EXTERNAL_API_URL}/sessions/${sessionId}/messages`,
      sessionId: sessionId,
      params: params,
      apiKey: API_KEY,
    });

    try {
      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) {
        queryParams.append("skip", params.skip.toString());
      }
      if (params?.limit !== undefined) {
        queryParams.append("limit", params.limit.toString());
      } else {
        // Default limit if not provided
        queryParams.append("limit", "100");
      }

      const queryString = queryParams.toString();
      const url = `${EXTERNAL_API_URL}/sessions/${sessionId}/messages${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "X-API-Key": API_KEY,
        },
      });

      console.log("📨 [getAIMessages] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `HTTP error! status: ${response.status}`;
        console.error("❌ [getAIMessages] Error response:", errorData);
        throw new Error(errorMessage);
      }

      // External API returns array of messages directly
      const messagesArray = await response.json();
      console.log("✅ [getAIMessages] Messages received:", {
        count: messagesArray.length,
        messages: messagesArray,
        firstMessage: messagesArray[0] || null,
      });

      return {
        success: true,
        data: messagesArray,
      };
    } catch (error: any) {
      console.error("❌ [getAIMessages] Exception:", error);
      throw new Error(error.message || "Failed to get messages");
    }
  }

  // ==================== PAYMENT METHODS ====================

  /**
   * Create BOG payment order
   */
  async createPaymentOrder(params: {
    amount: number;
    currency?: string;
    orderId: string;
    description: string;
    callbackUrl: string;
    captureMethod?: "AUTO" | "MANUAL";
  }): Promise<{
    success: boolean;
    orderId?: string;
    paymentUrl?: string;
    orderStatus?: string;
    error?: string;
  }> {
    try {
      console.log("💳 [ApiService] createPaymentOrder called:", params);

      const result = await this.apiCall<{
        success: boolean;
        orderId?: string;
        paymentUrl?: string;
        orderStatus?: string;
        error?: string;
      }>("/payment/create-order", {
        method: "POST",
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency || "GEL",
          orderId: params.orderId,
          description: params.description,
          callbackUrl: params.callbackUrl,
          captureMethod: params.captureMethod || "AUTO",
        }),
      });

      console.log("✅ [ApiService] createPaymentOrder response:", result);
      return result;
    } catch (error: any) {
      console.error("❌ [ApiService] createPaymentOrder error:", error);
      return {
        success: false,
        error: error.message || "Failed to create payment order",
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(orderId: string): Promise<{
    success: boolean;
    status?: string;
    amount?: number;
    error?: string;
  }> {
    try {
      console.log("💳 [ApiService] getPaymentStatus called:", orderId);

      const result = await this.apiCall<{
        success: boolean;
        status?: string;
        amount?: number;
        error?: string;
      }>(`/payment/status/${orderId}`, {
        method: "GET",
      });

      console.log("✅ [ApiService] getPaymentStatus response:", result);
      return result;
    } catch (error: any) {
      console.error("❌ [ApiService] getPaymentStatus error:", error);
      return {
        success: false,
        error: error.message || "Failed to get payment status",
      };
    }
  }
}

export const apiService = new ApiService();
