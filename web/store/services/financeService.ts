import axiosInstance from "@/lib/axios";
import { createAsyncThunk } from "@reduxjs/toolkit";

// Types
export interface FinanceTransaction {
  id: string;
  type: "income" | "expense" | "adjustment";
  amount: number;
  currency: "EGP" | "SAR" | "USD";
  amountInUSD: number;
  exchangeRate: number;
  category: string;
  description?: string;
  transactionDate: string;
  source: "manual" | "payment_auto" | "refund_auto" | "system";
  reference?: {
    id?:
      | string
      | {
          id?: string;
          _id?: string;
          merchantOrderId?: string;
          amount?: number;
          currency?: string;
          paymentMethod?: string;
          status?: string;
          couponCode?: string;
          couponDetails?: Record<string, any>;
          billingInfo?: {
            name?: string;
            email?: string;
            phone?: string;
            city?: string;
            country?: string;
          };
          paymentDetails?: Record<string, any>;
          productId?: any;
          courseId?: any;
          serviceId?: any;
          packageId?: any;
          studentMemberId?: any;
          cartSessionId?: any;
          createdAt?: string;
          processedAt?: string;
        };
    model?: string;
    displayId?: string;
  };
  createdBy?: {
    id?: string;
    name?: string;
    email?: string;
  };
  isReconciled: boolean;
  attachmentUrl?: string;
  tags?: string[];
  metadata?: {
    customerName?: string;
    customerEmail?: string;
    paymentMethod?: string;
    purchaseType?: string;
    couponCode?: string;
    originalAmount?: number;
    discountAmount?: number;
    itemsCount?: number;
    itemsSummary?: Array<{
      itemType?: string;
      itemId?: string;
      name?: any;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
      variantName?: any;
    }>;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  totalIncomeUSD: number;
  totalExpenseUSD: number;
  totalAdjustmentUSD: number;
  balanceUSD: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  recentTransactions?: FinanceTransaction[];
}

export interface MonthlyBreakdown {
  month: number;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

export interface CreateTransactionPayload {
  type: "income" | "expense" | "adjustment";
  amount: number;
  currency?: "EGP" | "SAR" | "USD";
  category?: string;
  description?: string;
  transactionDate?: string;
  tags?: string[];
  attachment?: File;
  referenceId?: string;
  referenceModel?: string;
  referenceDisplayId?: string;
}

export interface UpdateTransactionPayload {
  id: string;
  amount?: number;
  currency?: "EGP" | "SAR" | "USD";
  category?: string;
  description?: string;
  transactionDate?: string;
  tags?: string[];
  isReconciled?: boolean;
  attachment?: File;
}

export interface FinanceQueryParams {
  page?: number;
  limit?: number;
  type?: "income" | "expense" | "adjustment";
  category?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FinanceSettings {
  baseCurrency: "SAR" | "EGP" | "USD";
  exchangeRates: Record<string, number>;
  lastRatesUpdate: string;
}

// Thunks

// Get all transactions
export const getTransactionsThunk = createAsyncThunk<
  { results: FinanceTransaction[]; pagination: any },
  FinanceQueryParams | undefined,
  { rejectValue: string }
>("finance/getTransactions", async (params = {}, thunkAPI) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.type) queryParams.append("type", params.type);
    if (params.category) queryParams.append("category", params.category);
    if (params.source) queryParams.append("source", params.source);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);
    if (params.search) queryParams.append("search", params.search);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const response = await axiosInstance.get(
      `/finance?${queryParams.toString()}`
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch transactions";
    return thunkAPI.rejectWithValue(message);
  }
});

// Get financial summary
export const getFinanceSummaryThunk = createAsyncThunk<
  FinanceSummary,
  { startDate?: string; endDate?: string; category?: string } | undefined,
  { rejectValue: string }
>("finance/getSummary", async (params = {}, thunkAPI) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.category) queryParams.append("category", params.category);

    const response = await axiosInstance.get(
      `/finance/summary?${queryParams.toString()}`
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch summary";
    return thunkAPI.rejectWithValue(message);
  }
});

// Get monthly breakdown
export const getMonthlyBreakdownThunk = createAsyncThunk<
  MonthlyBreakdown[],
  number | undefined,
  { rejectValue: string }
>("finance/getMonthlyBreakdown", async (year, thunkAPI) => {
  try {
    const queryParams = year ? `?year=${year}` : "";
    const response = await axiosInstance.get(`/finance/monthly${queryParams}`);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch monthly data";
    return thunkAPI.rejectWithValue(message);
  }
});

// Get category breakdown
export const getCategoryBreakdownThunk = createAsyncThunk<
  CategoryBreakdown[],
  "income" | "expense" | undefined,
  { rejectValue: string }
>("finance/getCategoryBreakdown", async (type, thunkAPI) => {
  try {
    const queryParams = type ? `?type=${type}` : "";
    const response = await axiosInstance.get(
      `/finance/categories${queryParams}`
    );
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch categories";
    return thunkAPI.rejectWithValue(message);
  }
});

// Create transaction
export const createTransactionThunk = createAsyncThunk<
  FinanceTransaction,
  CreateTransactionPayload,
  { rejectValue: string }
>("finance/createTransaction", async (data, thunkAPI) => {
  try {
    const formData = new FormData();
    formData.append("type", data.type);
    formData.append("amount", data.amount.toString());
    if (data.currency) formData.append("currency", data.currency);
    if (data.category) formData.append("category", data.category);
    if (data.description) formData.append("description", data.description);
    if (data.transactionDate)
      formData.append("transactionDate", data.transactionDate);
    if (data.tags) formData.append("tags", JSON.stringify(data.tags));
    if (data.attachment) formData.append("attachment", data.attachment);
    if (data.referenceId) formData.append("referenceId", data.referenceId);
    if (data.referenceModel)
      formData.append("referenceModel", data.referenceModel);
    if (data.referenceDisplayId)
      formData.append("referenceDisplayId", data.referenceDisplayId);

    const response = await axiosInstance.post("/finance", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to create transaction";
    return thunkAPI.rejectWithValue(message);
  }
});

// Update transaction
export const updateTransactionThunk = createAsyncThunk<
  FinanceTransaction,
  UpdateTransactionPayload,
  { rejectValue: string }
>("finance/updateTransaction", async (data, thunkAPI) => {
  try {
    const { id, ...updateData } = data;
    const formData = new FormData();

    if (updateData.amount !== undefined)
      formData.append("amount", updateData.amount.toString());
    if (updateData.currency) formData.append("currency", updateData.currency);
    if (updateData.category) formData.append("category", updateData.category);
    if (updateData.description !== undefined)
      formData.append("description", updateData.description);
    if (updateData.transactionDate)
      formData.append("transactionDate", updateData.transactionDate);
    if (updateData.tags)
      formData.append("tags", JSON.stringify(updateData.tags));
    if (updateData.isReconciled !== undefined)
      formData.append("isReconciled", updateData.isReconciled.toString());
    if (updateData.attachment)
      formData.append("attachment", updateData.attachment);

    const response = await axiosInstance.put(`/finance/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to update transaction";
    return thunkAPI.rejectWithValue(message);
  }
});

// Delete transaction
export const deleteTransactionThunk = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("finance/deleteTransaction", async (id, thunkAPI) => {
  try {
    await axiosInstance.delete(`/finance/${id}`);
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to delete transaction";
    return thunkAPI.rejectWithValue(message);
  }
});

// Adjust balance
export const adjustBalanceThunk = createAsyncThunk<
  FinanceTransaction,
  { amount: number; currency?: string; description?: string },
  { rejectValue: string }
>("finance/adjustBalance", async (data, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/finance/adjust", data);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to adjust balance";
    return thunkAPI.rejectWithValue(message);
  }
});

// Export transactions
export const exportTransactionsThunk = createAsyncThunk<
  Blob,
  { startDate?: string; endDate?: string; type?: string; category?: string },
  { rejectValue: string }
>("finance/export", async (params, thunkAPI) => {
  try {
    const response = await axiosInstance.post("/finance/export", params, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || "Failed to export";
    return thunkAPI.rejectWithValue(message);
  }
});

// Transaction categories for forms
export const TRANSACTION_CATEGORIES = {
  income: [
    { value: "product_sale", label: { en: "Product Sale", ar: "بيع منتج" } },
    {
      value: "service_payment",
      label: { en: "Service Payment", ar: "دفعة خدمة" },
    },
    { value: "subscription", label: { en: "Subscription", ar: "اشتراك" } },
    { value: "commission", label: { en: "Commission", ar: "عمولة" } },
    { value: "other", label: { en: "Other", ar: "أخرى" } },
  ],
  expense: [
    { value: "refund", label: { en: "Refund", ar: "استرداد" } },
    { value: "salary", label: { en: "Salary", ar: "راتب" } },
    { value: "rent", label: { en: "Rent", ar: "إيجار" } },
    { value: "utilities", label: { en: "Utilities", ar: "مرافق" } },
    { value: "marketing", label: { en: "Marketing", ar: "تسويق" } },
    { value: "software", label: { en: "Software", ar: "برمجيات" } },
    { value: "equipment", label: { en: "Equipment", ar: "معدات" } },
    { value: "taxes", label: { en: "Taxes", ar: "ضرائب" } },
    { value: "other", label: { en: "Other", ar: "أخرى" } },
  ],
  adjustment: [
    {
      value: "adjustment",
      label: { en: "Balance Adjustment", ar: "تعديل رصيد" },
    },
  ],
};
