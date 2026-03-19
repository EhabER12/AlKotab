import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "@/lib/axios";
import { BilingualText } from "./courseService";

export interface WhatsAppTemplateVariable {
  name: string;
  description: string;
}

export interface WhatsAppTemplate {
  _id?: string;
  name: string;
  label: BilingualText;
  type: string;
  content: BilingualText;
  variables: WhatsAppTemplateVariable[];
  isActive: boolean;
  order?: number;
}

export const getWhatsAppTemplates = createAsyncThunk<
  WhatsAppTemplate[],
  void,
  { rejectValue: string }
>("whatsappTemplates/getAll", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get("/settings/whatsapp/templates");
    return response.data.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to fetch WhatsApp templates"
    );
  }
});

export const getWhatsAppTemplateByName = createAsyncThunk<
  WhatsAppTemplate,
  string,
  { rejectValue: string }
>("whatsappTemplates/getByName", async (name, { rejectWithValue }) => {
  try {
    const response = await axios.get(`/settings/whatsapp/templates/${name}`);
    return response.data.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to fetch WhatsApp template"
    );
  }
});

export const saveWhatsAppTemplate = createAsyncThunk<
  WhatsAppTemplate,
  Partial<WhatsAppTemplate>,
  { rejectValue: string }
>("whatsappTemplates/save", async (data, { rejectWithValue }) => {
  try {
    const response = await axios.post("/settings/whatsapp/templates", data);
    return response.data.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to save WhatsApp template"
    );
  }
});
