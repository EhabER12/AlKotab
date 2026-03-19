import { createSlice } from "@reduxjs/toolkit";
import {
  WhatsAppTemplate,
  getWhatsAppTemplateByName,
  getWhatsAppTemplates,
  saveWhatsAppTemplate,
} from "../services/whatsappTemplateService";

interface WhatsAppTemplateState {
  templates: WhatsAppTemplate[];
  currentTemplate: WhatsAppTemplate | null;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

const initialState: WhatsAppTemplateState = {
  templates: [],
  currentTemplate: null,
  isLoading: false,
  error: null,
  success: false,
};

const whatsappTemplateSlice = createSlice({
  name: "whatsappTemplates",
  initialState,
  reducers: {
    resetWhatsAppTemplateStatus: (state) => {
      state.isLoading = false;
      state.error = null;
      state.success = false;
    },
    clearCurrentWhatsAppTemplate: (state) => {
      state.currentTemplate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getWhatsAppTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getWhatsAppTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates = action.payload;
      })
      .addCase(getWhatsAppTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getWhatsAppTemplateByName.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getWhatsAppTemplateByName.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTemplate = action.payload;
      })
      .addCase(getWhatsAppTemplateByName.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveWhatsAppTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(saveWhatsAppTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = true;
        const index = state.templates.findIndex(
          (template) => template.name === action.payload.name
        );

        if (index !== -1) {
          state.templates[index] = action.payload;
        } else {
          state.templates.unshift(action.payload);
        }

        state.currentTemplate = action.payload;
      })
      .addCase(saveWhatsAppTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.success = false;
      });
  },
});

export const {
  resetWhatsAppTemplateStatus,
  clearCurrentWhatsAppTemplate,
} = whatsappTemplateSlice.actions;

export default whatsappTemplateSlice.reducer;
