import { create } from "zustand";
import { login, register, getCurrentUser } from "../api";

export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    full_name: string,
  ) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  updateUserProfile: (data: Partial<User>) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await login(email, password);
      localStorage.setItem("token", response.access_token);

      // Fetch user data
      const userData = await getCurrentUser();

      set({
        token: response.access_token,
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to login",
      });
      return false;
    }
  },

  register: async (email: string, password: string, full_name: string) => {
    set({ isLoading: true, error: null });
    try {
      const userData = { email, password, full_name };
      await register(userData);

      // Auto login after registration
      return get().login(email, password);
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || "Failed to register",
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ isAuthenticated: false });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      // Fetch user data with current token
      const userData = await getCurrentUser();

      set({
        token,
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error: any) {
      // Token is invalid
      localStorage.removeItem("token");
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return false;
    }
  },

  updateUserProfile: async (data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      // This function doesn't exist yet, so we'll mock it for now
      // In a real app, you'd implement this API call
      // const updatedUser = await updateProfile(data);

      // Mock implementation - in real app, replace with actual API call
      const currentUser = get().user;
      if (!currentUser) throw new Error("User not logged in");

      const updatedUser = {
        ...currentUser,
        ...data,
      };

      set({
        user: updatedUser,
        isLoading: false,
      });

      return true;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || "Failed to update profile",
      });
      return false;
    }
  },
}));
