import axiosInstance from "@/lib/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { User } from "../slices/authSlice";

interface GetUsersResponse {
  success: boolean;
  data: {
    results: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message: string | null;
}

interface UpdateUserRolePayload {
  userId: string;
  role: string;
}

interface CreateUserPayload {
  name?: string;
  email: string;
  password?: string;
  role?: string;
}

interface UpdateUserPayload {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  employeeInfo?: {
    dashboardAccess?: string[];
  };
}

interface UpdateUserPasswordPayload {
  userId: string;
  password: string;
}

// Create User (Admin)
export const createUser = createAsyncThunk<
  User,
  CreateUserPayload,
  { rejectValue: string }
>("users/create", async (userData, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.post("/users", userData);
    return response.data.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

// Update User (Admin)
export const updateUser = createAsyncThunk<
  User,
  UpdateUserPayload,
  { rejectValue: string }
>("users/update", async ({ userId, ...userData }, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.put(`/users/${userId}`, userData);
    return response.data.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

export const getAllUsers = createAsyncThunk<
  GetUsersResponse,
  void,
  { rejectValue: string }
>("users/getAll", async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.get("/users");
    return response.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

// Get User By ID (Admin)
export const getUserById = createAsyncThunk<
  User,
  string,
  { rejectValue: string }
>("users/getById", async (userId, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

// Update User Role (Admin)
export const updateUserRole = createAsyncThunk<
  User,
  UpdateUserRolePayload,
  { rejectValue: string }
>("users/updateRole", async ({ userId, role }, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.put(`/users/${userId}/role`, { role });
    return response.data.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

// Delete User (Admin)
export const deleteUser = createAsyncThunk<
  string, // Return userId on success
  string, // userId to delete
  { rejectValue: string }
>("users/delete", async (userId, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    await axiosInstance.delete(`/users/${userId}`);
    return userId;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

// Approve Teacher (Admin)
export const approveTeacher = createAsyncThunk<
  User,
  string, // userId
  { rejectValue: string }
>("users/approveTeacher", async (userId, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.post(`/users/${userId}/approve-teacher`);
    return response.data.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

// Reject Teacher (Admin)
export const rejectTeacher = createAsyncThunk<
  User,
  { userId: string; reason?: string; sendEmail?: boolean },
  { rejectValue: string }
>("users/rejectTeacher", async ({ userId, reason, sendEmail = true }, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.post(`/users/${userId}/reject-teacher`, {
      reason,
      sendEmail,
    });
    return response.data.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

// Update User Password (Admin)
export const updateUserPassword = createAsyncThunk<
  User,
  UpdateUserPasswordPayload,
  { rejectValue: string }
>("users/updatePassword", async ({ userId, password }, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.put(`/users/${userId}/password`, {
      password,
    });
    return response.data.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    // Handle bilingual message objects
    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

export const assignStudentToTeacher = createAsyncThunk<
  any,
  { teacherId: string; studentId: string },
  { rejectValue: string }
>("users/assignStudent", async ({ teacherId, studentId }, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.post(`/users/${teacherId}/assign-student`, { studentId });
    return response.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

export const removeStudentFromTeacher = createAsyncThunk<
  any,
  { teacherId: string; studentId: string },
  { rejectValue: string }
>("users/removeStudent", async ({ teacherId, studentId }, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.post(`/users/${teacherId}/remove-student`, { studentId });
    return response.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});

export const getTeacherStudents = createAsyncThunk<
  GetUsersResponse,
  { teacherId: string; params?: any },
  { rejectValue: string }
>("users/getTeacherStudents", async ({ teacherId, params }, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: { user?: { token: string } } };
    const token = state.auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue("Not authorized");

    const response = await axiosInstance.get(`/users/${teacherId}/students`, { params });
    return response.data;
  } catch (error: any) {
    let message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();

    if (typeof message === 'object' && message !== null) {
      message = message.en || message.ar || JSON.stringify(message);
    }
    return thunkAPI.rejectWithValue(message);
  }
});
