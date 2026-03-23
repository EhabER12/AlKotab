import axiosInstance from "@/lib/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";

// Types
export interface EmployeeInfo {
  salary: {
    amount: number;
    currency: "EGP" | "SAR" | "USD";
    paymentSchedule: "monthly" | "weekly" | "biweekly";
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  emergencyContact: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  hireDate?: string;
  department?: string;
  position?: string;
  dashboardAccess?: string[];
}

export interface ActivityInfo {
  lastActivityAt?: string;
  lastLoginAt?: string;
  lastIpAddress?: string;
  loginCount: number;
}

export interface AdminNote {
  _id: string;
  note: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface TaskStats {
  total: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  thisWeek: number;
  thisMonthCompleted: number;
  overdue: number;
}

export interface EmployeeRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  metrics: {
    tasksCompleted: number;
    tasksAssigned: number;
    articlesCreated: number;
    reviewsApproved: number;
    submissionsProcessed: number;
  };
  status: "pending" | "reviewed" | "approved";
  adminNotes?: string;
  reviewedBy?: { _id: string; name: string; email: string };
  reviewedAt?: string;
  daysActive: number;
  totalLoginCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTask {
  _id: string;
  id: string;
  employeeId: string;
  title: { ar?: string; en?: string };
  description?: { ar?: string; en?: string };
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  completedAt?: string;
  weekStart: string;
  assignedBy: { _id: string; name: string; email: string };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "moderator";
  status: "active" | "inactive" | "invited";
  employeeInfo?: EmployeeInfo;
  activityInfo?: ActivityInfo;
  adminNotes?: AdminNote[];
  taskStats?: TaskStats;
  recentRecords?: EmployeeRecord[];
  createdAt: string;
  updatedAt: string;
}

interface GetEmployeesResponse {
  success: boolean;
  data: {
    results: Employee[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface GetEmployeeResponse {
  success: boolean;
  data: Employee;
}

interface GetTasksResponse {
  success: boolean;
  data: {
    results: EmployeeTask[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface GetRecordsResponse {
  success: boolean;
  data: EmployeeRecord[];
}

// ==================== SELF-SERVICE THUNKS ====================

export const getMyProfile = createAsyncThunk<
  Employee,
  void,
  { rejectValue: string }
>("employees/getMyProfile", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.get("/employees/me");
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const getMyTasks = createAsyncThunk<
  GetTasksResponse,
  { status?: string } | void,
  { rejectValue: string }
>("employees/getMyTasks", async (params, thunkAPI) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);

    const response = await axiosInstance.get(
      `/employees/me/tasks?${queryParams.toString()}`
    );
    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const updateMyTaskStatus = createAsyncThunk<
  EmployeeTask,
  { taskId: string; status: string },
  { rejectValue: string }
>("employees/updateMyTaskStatus", async ({ taskId, status }, thunkAPI) => {
  try {
    const response = await axiosInstance.put(`/employees/me/tasks/${taskId}`, {
      status,
    });
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// ==================== EMPLOYEE THUNKS ====================

export const getAllEmployees = createAsyncThunk<
  GetEmployeesResponse,
  { page?: number; limit?: number; search?: string; status?: string } | void,
  { rejectValue: string }
>("employees/getAll", async (params, thunkAPI) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.status) queryParams.append("status", params.status);

    const response = await axiosInstance.get(
      `/employees?${queryParams.toString()}`
    );
    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const getEmployeeById = createAsyncThunk<
  Employee,
  string,
  { rejectValue: string }
>("employees/getById", async (employeeId, thunkAPI) => {
  try {
    const response = await axiosInstance.get(`/employees/${employeeId}`);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const updateEmployee = createAsyncThunk<
  Employee,
  { employeeId: string; data: Partial<Employee> },
  { rejectValue: string }
>("employees/update", async ({ employeeId, data }, thunkAPI) => {
  try {
    const response = await axiosInstance.put(`/employees/${employeeId}`, data);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// ==================== ADMIN NOTES THUNKS ====================

export const addEmployeeNote = createAsyncThunk<
  Employee,
  { employeeId: string; note: string },
  { rejectValue: string }
>("employees/addNote", async ({ employeeId, note }, thunkAPI) => {
  try {
    const response = await axiosInstance.post(
      `/employees/${employeeId}/notes`,
      { note }
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const deleteEmployeeNote = createAsyncThunk<
  Employee,
  { employeeId: string; noteId: string },
  { rejectValue: string }
>("employees/deleteNote", async ({ employeeId, noteId }, thunkAPI) => {
  try {
    const response = await axiosInstance.delete(
      `/employees/${employeeId}/notes/${noteId}`
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// ==================== TASK THUNKS ====================

export const getEmployeeTasks = createAsyncThunk<
  GetTasksResponse,
  {
    employeeId: string;
    page?: number;
    limit?: number;
    status?: string;
    weekOnly?: boolean;
  },
  { rejectValue: string }
>(
  "employees/getTasks",
  async ({ employeeId, page, limit, status, weekOnly }, thunkAPI) => {
    try {
      const queryParams = new URLSearchParams();
      if (page) queryParams.append("page", page.toString());
      if (limit) queryParams.append("limit", limit.toString());
      if (status) queryParams.append("status", status);
      if (weekOnly) queryParams.append("weekOnly", "true");

      const response = await axiosInstance.get(
        `/employees/${employeeId}/tasks?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const createEmployeeTask = createAsyncThunk<
  EmployeeTask,
  { employeeId: string; taskData: Partial<EmployeeTask> },
  { rejectValue: string }
>("employees/createTask", async ({ employeeId, taskData }, thunkAPI) => {
  try {
    const response = await axiosInstance.post(
      `/employees/${employeeId}/tasks`,
      taskData
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const updateEmployeeTask = createAsyncThunk<
  EmployeeTask,
  { employeeId: string; taskId: string; data: Partial<EmployeeTask> },
  { rejectValue: string }
>("employees/updateTask", async ({ employeeId, taskId, data }, thunkAPI) => {
  try {
    const response = await axiosInstance.put(
      `/employees/${employeeId}/tasks/${taskId}`,
      data
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const deleteEmployeeTask = createAsyncThunk<
  string,
  { employeeId: string; taskId: string },
  { rejectValue: string }
>("employees/deleteTask", async ({ employeeId, taskId }, thunkAPI) => {
  try {
    await axiosInstance.delete(`/employees/${employeeId}/tasks/${taskId}`);
    return taskId;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const getTaskStats = createAsyncThunk<
  TaskStats,
  string,
  { rejectValue: string }
>("employees/getTaskStats", async (employeeId, thunkAPI) => {
  try {
    const response = await axiosInstance.get(
      `/employees/${employeeId}/tasks/stats`
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// ==================== RECORD THUNKS ====================

export const getEmployeeRecords = createAsyncThunk<
  EmployeeRecord[],
  { employeeId: string; limit?: number },
  { rejectValue: string }
>("employees/getRecords", async ({ employeeId, limit }, thunkAPI) => {
  try {
    const queryParams = limit ? `?limit=${limit}` : "";
    const response = await axiosInstance.get(
      `/employees/${employeeId}/records${queryParams}`
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const updateEmployeeRecord = createAsyncThunk<
  EmployeeRecord,
  { employeeId: string; recordId: string; data: Partial<EmployeeRecord> },
  { rejectValue: string }
>(
  "employees/updateRecord",
  async ({ employeeId, recordId, data }, thunkAPI) => {
    try {
      const response = await axiosInstance.put(
        `/employees/${employeeId}/records/${recordId}`,
        data
      );
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const generateMonthlyRecords = createAsyncThunk<
  EmployeeRecord[],
  void,
  { rejectValue: string }
>("employees/generateRecords", async (_, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/employees/records/generate");
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});
