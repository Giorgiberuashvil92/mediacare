import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  apiService,
  LoginRequest,
  RegisterRequest,
  User,
} from "../_services/api";
const ROLE_STORAGE_KEY = "@medicare_user_role";

export type UserRole = "doctor" | "patient" | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ data: { user: User; role: string }; requiresOTP?: boolean }>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
  refreshUser: () => Promise<void>;
  completeLoginAfterOTP: (authResponse: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🔐 AuthProvider initialized');
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('🔍 AuthProvider state:', { user: !!user, userRole, isLoading });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [currentUser, isAuth] = await Promise.all([
        apiService.getCurrentUser(),
        apiService.isAuthenticated(),
      ]);

      if (currentUser && isAuth) {
        setUser(currentUser);
        setUserRoleState(currentUser.role);
      } else {
        // Clear any invalid data
        await apiService.logout();
        setUser(null);
        setUserRoleState(null);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      await apiService.logout();
      setUser(null);
      setUserRoleState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    console.log('🔑 AuthProvider login called:', credentials.email);
    try {
      setIsLoading(true);
      console.log('📞 Calling apiService.login...');
      const authResponse = await apiService.login(credentials);
      console.log('✅ Login response received:', authResponse);
      
      // ALWAYS require OTP if user has a phone number (after logout, force OTP)
      // Even if backend says requiresOTP: false, we still require OTP on frontend
      if (authResponse.data.user.phone && authResponse.data.user.phone.trim()) {
        // Don't set user yet, return response for OTP verification
        // Don't store tokens - they will be stored after OTP verification
        return { 
          data: { user: authResponse.data.user, role: authResponse.data.user.role },
          requiresOTP: true,
        };
      }
      
      // OTP not required only if user doesn't have a phone number
      // Proceed with normal login
      setUser(authResponse.data.user);
      setUserRoleState(authResponse.data.user.role);
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, authResponse.data.user.role);
      
      // Create AI Assistant session after successful login
      try {
        const sessionResponse = await apiService.createAISession({
          initiator_id: authResponse.data.user.id,
          initiator_type: authResponse.data.user.role === "doctor" ? "doctor" : "customer",
        });
        if (sessionResponse.success) {
          console.log('✅ AI Assistant session created:', sessionResponse.data.id);
          // Store session ID for later use
          await AsyncStorage.setItem("ai_session_id", sessionResponse.data.id);
        }
      } catch (sessionError) {
        // Don't fail login if session creation fails
        console.warn("Failed to create AI Assistant session:", sessionError);
      }
      
      return { data: { user: authResponse.data.user, role: authResponse.data.user.role } };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete login after OTP verification
   */
  const completeLoginAfterOTP = async (authResponse: any) => {
    try {
      setIsLoading(true);
      
      // Store tokens if they exist (they should already be stored by verifyLoginOTP, but ensure they are)
      if (authResponse.data.token) {
        await AsyncStorage.setItem("accessToken", authResponse.data.token);
        console.log('✅ [AuthContext] Access token stored');
      }
      if (authResponse.data.refreshToken) {
        await AsyncStorage.setItem("refreshToken", authResponse.data.refreshToken);
        console.log('✅ [AuthContext] Refresh token stored');
      }
      if (authResponse.data.user) {
        await AsyncStorage.setItem("user", JSON.stringify(authResponse.data.user));
        console.log('✅ [AuthContext] User data stored');
      }
      
      setUser(authResponse.data.user);
      setUserRoleState(authResponse.data.user.role);
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, authResponse.data.user.role);
      console.log('✅ [AuthContext] User and role set in context');
      
      // Create AI Assistant session after successful login
      try {
        const sessionResponse = await apiService.createAISession({
          initiator_id: authResponse.data.user.id,
          initiator_type: authResponse.data.user.role === "doctor" ? "doctor" : "customer",
        });
        if (sessionResponse.success) {
          console.log('✅ AI Assistant session created:', sessionResponse.data.id);
          await AsyncStorage.setItem("ai_session_id", sessionResponse.data.id);
        }
      } catch (sessionError) {
        console.warn("Failed to create AI Assistant session:", sessionError);
      }
      
      console.log('🎉 [AuthContext] Login completed successfully after OTP verification');
    } catch (error) {
      console.error("Error completing login after OTP:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true);
      console.log('🔐 [AuthContext] Starting registration...');
      const authResponse = await apiService.register(userData);
      
      // Tokens are already stored by apiService.register
      console.log('✅ [AuthContext] Registration successful, setting user and role');
      
      setUser(authResponse.data.user);
      setUserRoleState(authResponse.data.user.role);
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, authResponse.data.user.role);
      
      // Create AI Assistant session after successful registration
      try {
        const sessionResponse = await apiService.createAISession({
          initiator_id: authResponse.data.user.id,
          initiator_type: authResponse.data.user.role === "doctor" ? "doctor" : "customer",
        });
        if (sessionResponse.success) {
          console.log('✅ AI Assistant session created:', sessionResponse.data.id);
          await AsyncStorage.setItem("ai_session_id", sessionResponse.data.id);
        }
      } catch (sessionError) {
        console.warn("Failed to create AI Assistant session:", sessionError);
      }
      
      console.log('🎉 [AuthContext] Registration completed successfully');
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiService.logout();
      setUser(null);
      setUserRoleState(null);
      
      // Clear all stored data to ensure OTP is required on next login
      await AsyncStorage.multiRemove([
        ROLE_STORAGE_KEY,
        "ai_session_id",
        "accessToken",
        "refreshToken",
        "user",
      ]);
      
      // Also clear any other potential session data
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const sessionKeys = allKeys.filter(key => 
          key.includes("token") || 
          key.includes("session") || 
          key.includes("user") ||
          key.includes("auth") ||
          key === ROLE_STORAGE_KEY
        );
        if (sessionKeys.length > 0) {
          await AsyncStorage.multiRemove(sessionKeys);
        }
      } catch (clearError) {
        console.warn("Error clearing additional session data:", clearError);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUserRole = async (role: UserRole) => {
    setUserRoleState(role);
    if (role) {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const profileResponse = await apiService.getProfile();
      if (profileResponse.success && profileResponse.data) {
        const updatedUser: User = {
          id: profileResponse.data.id,
          email: profileResponse.data.email,
          name: profileResponse.data.name,
          role: profileResponse.data.role,
          profileImage: profileResponse.data.profileImage,
          doctorStatus: profileResponse.data.doctorStatus,
          isActive: profileResponse.data.isActive,
          isVerified: profileResponse.data.isVerified,
          approvalStatus: profileResponse.data.approvalStatus,
        };
        setUser(updatedUser);
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    userRole,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    setUserRole,
    refreshUser,
    completeLoginAfterOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
