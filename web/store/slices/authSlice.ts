import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "@/lib/axios";
import {
  forgotPassword,
  getCurrentUser,
  resetPassword,
  login,
  register,
  logout,
} from "../services/authService";

// Define types
export interface User {
  id?: string;
  _id?: string;
  name?: string;
  fullName?: {
    ar: string;
    en: string;
  };
  email?: string;
  phone?: string;
  token?: string;
  role?: string;
  profilePic?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  requiresVerification?: boolean;
  message?: string;
  teacherInfo?: {
    isApproved?: boolean;
    canPublishDirectly?: boolean;
    coursesCount?: number;
    studentsCount?: number;
    bio?: string;
    specialization?: string;
  };
  employeeInfo?: {
    dashboardAccess?: string[];
  };
  studentInfo?: {
    age?: number;
    assignedTeacher?: string;
    subscriptionStatus?: string;
    subscriptionType?: string;
  };
}

// Define the expected response structure for login
export interface LoginResponse {
  success: boolean;
  data: User;
  message: string;
  token?: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
}

// Get user from localStorage
const user: User | null =
  typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || "null")
    : null;

const initialState: AuthState = {
  user: user,
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: "",
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Register cases
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload?.token ? action.payload : null;
        state.message = action.payload?.message || "";
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
        state.user = null;
      })
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(
        login.fulfilled,
        (state, action: PayloadAction<LoginResponse>) => {
          state.isLoading = false;
          state.isSuccess = action.payload.success;
          state.user = action.payload.data;
          state.message = action.payload.message;
        }
      )
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
        state.user = null;
      })
      // Get current user cases
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(
        getCurrentUser.fulfilled,
        (state, action: PayloadAction<User>) => {
          state.isLoading = false;
          state.isSuccess = true;
          state.user = { ...state.user, ...action.payload };
        }
      )
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Forgot password cases
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Reset password cases
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // Logout case
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
