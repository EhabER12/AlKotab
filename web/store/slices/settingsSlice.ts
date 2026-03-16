import { createSlice } from "@reduxjs/toolkit";
import {
  getWebsiteSettingsThunk,
  updateWebsiteSettingsThunk,
  connectWhatsAppThunk,
  disconnectWhatsAppThunk,
  sendWhatsAppTestMessageThunk,
  getPublicWebsiteSettingsThunk,
  getManualPaymentMethodsThunk,
  createManualPaymentMethodThunk,
  updateManualPaymentMethodThunk,
  toggleManualPaymentMethodThunk,
  deleteManualPaymentMethodThunk,
  WebsiteSettingsData,
  PublicWebsiteSettingsData,
  ManualPaymentMethod,
} from "../services/settingsService";

interface SettingsState {
  settings: WebsiteSettingsData | null;
  publicSettings: PublicWebsiteSettingsData | null;
  manualPaymentMethods: ManualPaymentMethod[];
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string | null;
}

const initialState: SettingsState = {
  settings: null,
  publicSettings: null,
  manualPaymentMethods: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: null,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    resetSettingsStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Website Settings
      .addCase(getWebsiteSettingsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getWebsiteSettingsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.settings = action.payload.data;
      })
      .addCase(getWebsiteSettingsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Get Public Website Settings
      .addCase(getPublicWebsiteSettingsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPublicWebsiteSettingsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.publicSettings = action.payload.data;
      })
      .addCase(getPublicWebsiteSettingsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Update Website Settings
      .addCase(updateWebsiteSettingsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateWebsiteSettingsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.settings = action.payload.data;
        state.message = "Settings updated successfully!";
      })
      .addCase(updateWebsiteSettingsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Connect WhatsApp
      .addCase(connectWhatsAppThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(connectWhatsAppThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message =
          "WhatsApp connection initiated. Please scan the QR code.";
        if (state.settings) {
          state.settings.whatsappConnected = !!action.payload.data.connected;
          state.settings.whatsappConnectionStatus =
            action.payload.data.status as WebsiteSettingsData["whatsappConnectionStatus"];
          state.settings.whatsappQrCode = action.payload.data.qrCode;
          state.settings.whatsappPhoneNumber = action.payload.data.phoneNumber;
          state.settings.whatsappDisplayName = action.payload.data.displayName;
          state.settings.whatsappLastError = action.payload.data.lastError;
        }
      })
      .addCase(connectWhatsAppThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Disconnect WhatsApp
      .addCase(disconnectWhatsAppThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(disconnectWhatsAppThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "WhatsApp successfully disconnected.";
        if (state.settings) {
          state.settings.whatsappConnected = false;
          state.settings.whatsappQrCode = undefined;
          state.settings.whatsappConnectionStatus =
            action.payload.data.status as WebsiteSettingsData["whatsappConnectionStatus"];
          state.settings.whatsappPhoneNumber = "";
          state.settings.whatsappDisplayName = "";
          state.settings.whatsappLastError = "";
        }
      })
      .addCase(disconnectWhatsAppThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Send Test Message
      .addCase(sendWhatsAppTestMessageThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(sendWhatsAppTestMessageThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Test message sent successfully.";
      })
      .addCase(sendWhatsAppTestMessageThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Get Manual Payment Methods
      .addCase(getManualPaymentMethodsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getManualPaymentMethodsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.manualPaymentMethods = action.payload.methods;
      })
      .addCase(getManualPaymentMethodsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Create Manual Payment Method
      .addCase(createManualPaymentMethodThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createManualPaymentMethodThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.manualPaymentMethods.push(action.payload.method);
        state.message = action.payload.message;
      })
      .addCase(createManualPaymentMethodThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Update Manual Payment Method
      .addCase(updateManualPaymentMethodThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateManualPaymentMethodThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.manualPaymentMethods.findIndex(
          (m) => m._id === action.payload.method._id
        );
        if (index !== -1) {
          state.manualPaymentMethods[index] = action.payload.method;
        }
        state.message = action.payload.message;
      })
      .addCase(updateManualPaymentMethodThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Toggle Manual Payment Method
      .addCase(toggleManualPaymentMethodThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(toggleManualPaymentMethodThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        const index = state.manualPaymentMethods.findIndex(
          (m) => m._id === action.payload.method._id
        );
        if (index !== -1) {
          state.manualPaymentMethods[index] = action.payload.method;
        }
        state.message = action.payload.message;
      })
      .addCase(toggleManualPaymentMethodThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // Delete Manual Payment Method
      .addCase(deleteManualPaymentMethodThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteManualPaymentMethodThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(deleteManualPaymentMethodThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      });
  },
});

export const { resetSettingsStatus } = settingsSlice.actions;
export default settingsSlice.reducer;
