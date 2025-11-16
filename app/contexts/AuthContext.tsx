import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  apiService,
  LoginRequest,
  RegisterRequest,
  User,
} from "../services/api";
const ROLE_STORAGE_KEY = "@medicare_user_role";

export type UserRole = "doctor" | "patient" | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<{ data: { user: User; role: string } }>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
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
      setUser(authResponse.data.user);
      setUserRoleState(authResponse.data.user.role);
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, authResponse.data.user.role);
      return { data: { user: authResponse.data.user, role: authResponse.data.user.role } };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true);
      const authResponse = await apiService.register(userData);
      setUser(authResponse.data.user);
      setUserRole(authResponse.data.user.role);
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
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
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

  const value: AuthContextType = {
    user,
    userRole,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    setUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
