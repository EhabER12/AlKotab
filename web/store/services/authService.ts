import axiosInstance from "@/lib/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { User, LoginResponse } from "../slices/authSlice";
import Cookies from "js-cookie";

// -------------------------------------------------------------
// Helper to consistently extract a meaningful error message from
// axios / fetch errors that follow our backend format.
// The backend returns errors like:
//   { success: false, error: { message: "..." } }
// -------------------------------------------------------------
const extractErrorMessage = (error: any): string => {
  const apiMessage = error?.response?.data?.error?.message;
  const flatMessage = error?.response?.data?.message;
  return apiMessage || flatMessage || error?.message || error?.toString();
};

/***************************************************
 * isAuthenticated
 ***************************************************/
export const isAuthenticated = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    return !!user.token;
  } catch {
    return false;
  }
};

/***************************************************
 * isAdmin - Check if current user has admin role
 ***************************************************/
export const isAdmin = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    return user?.role === "admin";
  } catch (error) {
    return false;
  }
};

/***************************************************
 * isModerator - Check if current user has moderator role
 ***************************************************/
export const isModerator = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    return user?.role === "moderator";
  } catch (error) {
    return false;
  }
};

/***************************************************
 * isTeacher - Check if current user has teacher role
 ***************************************************/
export const isTeacher = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    return user?.role === "teacher";
  } catch (error) {
    return false;
  }
};

/***************************************************
 * isAdminOrModerator - Check if user is admin or moderator
 ***************************************************/
export const isAdminOrModerator = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    return user?.role === "admin" || user?.role === "moderator";
  } catch (error) {
    return false;
  }
};

/***************************************************
 * isAdminOrModeratorOrTeacher - Check if user is admin, moderator, or teacher
 ***************************************************/
export const isAdminOrModeratorOrTeacher = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    return (
      user?.role === "admin" ||
      user?.role === "moderator" ||
      user?.role === "teacher"
    );
  } catch (error) {
    return false;
  }
};

/***************************************************
 * hasRole - Check if user has a specific role
 ***************************************************/
export const hasRole = (role: string | string[]): boolean => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    const userRole = user?.role;

    if (!userRole) return false;

    if (Array.isArray(role)) {
      return role.includes(userRole);
    }

    return userRole === role;
  } catch (error) {
    return false;
  }
};

/***************************************************
 * getUserRole - Get the role of current user
 ***************************************************/
export const getUserRole = (): string | null => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    return user?.role || null;
  } catch (error) {
    return null;
  }
};

/* **************************************************
 ** Register user
 ***************************************************/
export const register = createAsyncThunk<
  User,
  {
    fullName: { ar: string; en: string };
    email: string;
    phone: string;
    lang?: "ar" | "en";
    password: string;
    confirmPassword: string;
    role?: string;
  },
  { rejectValue: string }
>("auth/register", async (userData, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/register", userData);
    const payload = response.data?.data ?? response.data;

    // If verification is required, do NOT auto-login (don't save to localStorage)
    if (payload?.requiresVerification) {
      return payload;
    }

    if (payload) {
      if (payload.token) {
        Cookies.set("token", payload.token, { expires: 7, path: "/" });
      }
      localStorage.setItem("user", JSON.stringify(payload));
    }
    return payload;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error));
  }
});

/* **************************************************
 ** Login user
 ***************************************************/
export const login = createAsyncThunk<
  LoginResponse,
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async (userData, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/login", userData);
    if (response.data && response.data.data) {
      const userToSave = response.data.data;

      if (response.data.token && !userToSave.token) {
        userToSave.token = response.data.token;
      }

      if (userToSave.token) {
        Cookies.set("token", userToSave.token, { expires: 7, path: "/" });
      }

      localStorage.setItem("user", JSON.stringify(userToSave));
      console.log(
        "✅ User saved to localStorage with token:",
        !!userToSave.token
      );
    } else {
      console.error("Login response structure unexpected:", response.data);
    }
    return response.data as LoginResponse;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error));
  }
});

/* **************************************************
 ** Get current user profile
 ***************************************************/
export const getCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("auth/me", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/auth/me");
    // Update local storage with additional user data
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user && response.data) {
      // Preserve the token when updating user data
      const updatedUser = { ...user, ...response.data, token: user.token };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (updatedUser.token) {
        Cookies.set("token", updatedUser.token, { expires: 7, path: "/" });
      }
      console.log("✅ User data updated in localStorage, token preserved");
    }
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error));
  }
});

/* **************************************************
 ** Forgot password
 ***************************************************/
export const forgotPassword = createAsyncThunk<
  { message: string },
  { email: string; lang?: string },
  { rejectValue: string }
>("auth/forgotPassword", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/auth/forgot-password", data);
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error));
  }
});

/***************************************************
 ** Reset password
 ***************************************************/
export const resetPassword = createAsyncThunk<
  { message: string },
  { token: string; password: string; confirmPassword: string; lang?: string },
  { rejectValue: string }
>("auth/resetPassword", async (resetData, thunkAPI) => {
  try {
    const response = await axiosInstance.post(
      "/auth/reset-password",
      resetData
    );
    return response.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error));
  }
});

/* **************************************************
 ** Logout user
 ***************************************************/
export const logout = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("user");
  Cookies.remove("token", { path: "/" });
});

/* **************************************************
 ** Complete
 ***************************************************/
export const completeRegistration = createAsyncThunk<
  User,
  { token: string; name: string; password: string },
  { rejectValue: string }
>("auth/completeRegistration", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.post(
      "/auth/complete-registration",
      data
    );
    if (response.data && response.data.data) {
      const userToSave = response.data.data;
      if (response.data.token && !userToSave.token) {
        userToSave.token = response.data.token;
      }
      if (userToSave.token) {
        Cookies.set("token", userToSave.token, { expires: 7, path: "/" });
      }
      localStorage.setItem("user", JSON.stringify(userToSave));
    }
    return response.data.data;
  } catch (error: any) {
    return thunkAPI.rejectWithValue(extractErrorMessage(error));
  }
});
