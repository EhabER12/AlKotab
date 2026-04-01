import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/lib/axios";
import { BilingualText } from "./courseService";

export type StudentMemberType = "direct" | "group";

export interface StudentMember {
  id: string;
  _id?: string;
  userId?: {
    id: string;
    _id?: string;
    fullName: BilingualText;
    email: string;
  };
  name: BilingualText;
  phone: string;
  governorate?: string;
  sheetName?: string;
  startDate: string;
  billingDay?: number; // Optional - kept for backward compatibility
  nextDueDate: string; // End date of subscription
  status: "active" | "due_soon" | "overdue" | "paused" | "cancelled";
  packageId?: {
    id: string;
    _id?: string;
    name: BilingualText;
  };
  packagePrice?: number;
  assignedTeacherId?: {
    id: string;
    _id?: string;
    fullName: BilingualText;
    email: string;
  };
  assignedTeacherName?: string;
  renewalHistory: any[];
  lastReminderSent?: string;
  reminderCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  memberType?: StudentMemberType;
  // Legacy or optional
  studentName?: BilingualText;
  whatsappNumber?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

export interface CreateStudentMemberData {
  userId: string;
  studentName: BilingualText;
  whatsappNumber: string;
  subscriptionEndDate: string;
  notes?: string;
  packageId?: string;
  packagePrice?: number;
  memberType?: StudentMemberType;
}

const getApiErrorMessage = (error: any) =>
  error.response?.data?.message ||
  error.response?.data?.error?.message ||
  error.message ||
  "Request failed";

// Get all student members
export const getStudentMembers = createAsyncThunk(
  "studentMembers/getAll",
  async (
    filters: {
      memberType?: StudentMemberType;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      // Request all records without pagination for dropdown lists
      const params = new URLSearchParams();
      params.append("limit", "9999");
      if (filters?.memberType) params.append("memberType", filters.memberType);

      const response = await axios.get(`/student-members?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch student members"
      );
    }
  }
);

// Get single student member
export const getStudentMember = createAsyncThunk(
  "studentMembers/getOne",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/student-members/${id}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch student member"
      );
    }
  }
);

// Get current user's subscriptions
export const getMySubscriptions = createAsyncThunk(
  "studentMembers/getMy",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/student-members/my");
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch your subscriptions"
      );
    }
  }
);

// Create student member
export const createStudentMember = createAsyncThunk(
  "studentMembers/create",
  async (data: CreateStudentMemberData, { rejectWithValue }) => {
    try {
      const response = await axios.post("/student-members", data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create student member"
      );
    }
  }
);

// Update student member
export const updateStudentMember = createAsyncThunk(
  "studentMembers/update",
  async (
    { id, data }: { id: string; data: Partial<CreateStudentMemberData> },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.put(`/student-members/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update student member"
      );
    }
  }
);

// Delete student member
export const deleteStudentMember = createAsyncThunk(
  "studentMembers/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/student-members/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete student member"
      );
    }
  }
);

// Renew subscription
export const renewSubscription = createAsyncThunk(
  "studentMembers/renew",
  async (
    { id, endDate }: { id: string; endDate: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(`/student-members/${id}/renew`, {
        subscriptionEndDate: endDate,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to renew subscription"
      );
    }
  }
);
// Import student members from CSV
export const importStudentMembers = createAsyncThunk(
  "studentMembers/import",
  async (
    {
      file,
      sheetName,
      memberType,
    }: { file: File; sheetName: string; memberType?: StudentMemberType },
    { rejectWithValue }
  ) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheetName", sheetName);
      if (memberType) formData.append("memberType", memberType);

      const response = await axios.post("/student-members/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to import student members"
      );
    }
  }
);

// Import simple student members from CSV (name + date only)
export const importSimpleStudentMembers = createAsyncThunk(
  "studentMembers/importSimple",
  async (
    { file, sheetName }: { file: File; sheetName: string },
    { rejectWithValue }
  ) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sheetName", sheetName);

      const response = await axios.post("/student-members/import-simple", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to import simple student members"
      );
    }
  }
);

// Export student members to CSV
export const exportStudentMembers = async (filters: {
  status?: string;
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  governorate?: string;
  packageId?: string;
  search?: string;
  memberType?: StudentMemberType;
}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.assignedTeacherId) params.append("assignedTeacherId", filters.assignedTeacherId);
  if (filters.assignedTeacherName) params.append("assignedTeacherName", filters.assignedTeacherName);
  if (filters.governorate) params.append("governorate", filters.governorate);
  if (filters.packageId) params.append("packageId", filters.packageId);
  if (filters.search) params.append("search", filters.search);
  if (filters.memberType) params.append("memberType", filters.memberType);

  const response = await axios.get(`/student-members/export?${params.toString()}`, {
    responseType: "blob",
  });

  return response.data;
};

export interface SendStudentReminderResponse {
  success: boolean;
  message?: string;
  phone?: string;
}

export interface SendBulkStudentReminderResponse {
  success: boolean;
  message?: string;
  summary?: {
    scope?: string;
    total: number;
    successful: number;
    failed: number;
  };
  results?: Array<{
    memberId: string;
    name: BilingualText;
    phone: string;
    success: boolean;
    error?: string;
  }>;
}

export const sendStudentMemberWhatsAppReminder = async ({
  id,
  messageTemplate,
}: {
  id: string;
  messageTemplate?: string;
}) => {
  try {
    const response = await axios.post(`/student-members/${id}/whatsapp`, {
      messageTemplate,
    });
    return response.data as SendStudentReminderResponse;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error));
  }
};

export const sendBulkStudentMemberWhatsAppReminders = async ({
  memberIds,
  messageTemplate,
  scope = "overdue",
  remindBeforeDays = 5,
}: {
  memberIds?: string[];
  messageTemplate?: string;
  scope?: "due_soon" | "overdue" | "all_due";
  remindBeforeDays?: number;
}) => {
  try {
    const response = await axios.post("/student-members/bulk-reminders", {
      memberIds,
      messageTemplate,
      scope,
      remindBeforeDays,
    });
    return response.data as SendBulkStudentReminderResponse;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error));
  }
};
