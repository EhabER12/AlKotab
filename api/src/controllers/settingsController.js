import { SettingsService } from "../services/settingsService.js";
import emailTemplateService from "../services/emailTemplateService.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { EmailService } from "../services/emailService.js";
import whatsappService from "../services/whatsappNotificationService.js";
import whatsappTemplateService from "../services/whatsappTemplateService.js";

const settingsService = new SettingsService();
const emailService = new EmailService();
const MODERATOR_ALLOWED_SETTINGS_FIELDS = ["subscriptionTeachers"];

const pickAllowedSettingsFields = (settingsData = {}, allowedFields = []) =>
  allowedFields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(settingsData, field)) {
      acc[field] = settingsData[field];
    }
    return acc;
  }, {});

// @desc    Get website settings
// @route   GET /api/settings
// @access  Public
export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return ApiResponse.success(res, settings);
  } catch (error) {
    next(error);
  }
};

// @desc    Get public website settings
// @route   GET /api/settings/public
// @access  Public
export const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getPublicSettings();
    
    // Set cache headers to prevent aggressive caching
    res.set({
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30',
      'CDN-Cache-Control': 'max-age=60',
      'Vercel-CDN-Cache-Control': 'max-age=60',
    });
    
    return ApiResponse.success(res, settings);
  } catch (error) {
    next(error);
  }
};

// @desc    Update website settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = async (req, res, next) => {
  try {
    let settingsData = req.body;
    const files = req.files || {};
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === "moderator") {
      settingsData = pickAllowedSettingsFields(
        settingsData,
        MODERATOR_ALLOWED_SETTINGS_FIELDS
      );

      if (Object.keys(settingsData).length === 0) {
        throw new ApiError(
          403,
          "Moderators can only update subscription teachers"
        );
      }
    }

    const settings = await settingsService.updateSettings(
      settingsData,
      userId,
      files.logo && files.logo.length > 0 ? files.logo[0] : null,
      files.favicon && files.favicon.length > 0 ? files.favicon[0] : null,
      files.logo_ar && files.logo_ar.length > 0 ? files.logo_ar[0] : null,
      files.heroBackground && files.heroBackground.length > 0 ? files.heroBackground[0] : null
    );

    // Trigger revalidation of homepage cache
    try {
      const webUrl = process.env.WEB_URL || 'http://localhost:3000';
      const revalidateSecret = process.env.REVALIDATE_SECRET || 'genoun-revalidate-secret';
      
      console.log('🔄 Triggering cache revalidation...');
      const revalidateResponse = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: revalidateSecret,
          all: true
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });
      
      const revalidateResult = await revalidateResponse.json();
      console.log('✅ Cache revalidation result:', revalidateResult);
      
      if (!revalidateResult.success) {
        console.error('⚠️ Cache revalidation failed:', revalidateResult.message);
      }
    } catch (revalidateError) {
      // Log but don't fail the request if revalidation fails
      console.error('❌ Failed to trigger cache revalidation:', revalidateError.message || revalidateError);
    }

    return ApiResponse.success(res, settings, "Settings updated successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Connect WhatsApp client and generate QR code if needed
// @route   POST /api/settings/whatsapp/connect
// @access  Private/Admin
export const connectWhatsApp = async (req, res, next) => {
  try {
    const status = await whatsappService.connect();

    return ApiResponse.success(
      res,
      status,
      status.connected
        ? "WhatsApp is already connected"
        : status.qrCode
          ? "Scan the QR code to connect WhatsApp"
          : "WhatsApp connection has been initialized"
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Disconnect WhatsApp client and clear local session
// @route   POST /api/settings/whatsapp/disconnect
// @access  Private/Admin
export const disconnectWhatsApp = async (req, res, next) => {
  try {
    const status = await whatsappService.disconnect();

    return ApiResponse.success(res, status, "WhatsApp disconnected successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Send WhatsApp test message
// @route   POST /api/settings/whatsapp/test-message
// @access  Private/Admin
export const sendWhatsAppTestMessage = async (req, res, next) => {
  try {
    const { number, message } = req.body;

    if (!number) {
      throw new ApiError(400, "Phone number is required");
    }

    const result = await whatsappService.sendMessage(
      number,
      message || "رسالة اختبار من إعدادات لوحة تحكم Genoun"
    );

    return ApiResponse.success(
      res,
      result.data || result,
      "Test WhatsApp message sent successfully"
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Test email connection
// @route   POST /api/settings/email/test-connection
// @access  Private/Admin
export const testEmailConnection = async (req, res, next) => {
  try {
    await emailService.initialize();
    return ApiResponse.success(res, null, "Email connection successful");
  } catch (error) {
    next(error);
  }
};

// @desc    Test email notification
// @route   POST /api/settings/email/test-notification
// @access  Private/Admin
export const testEmailNotification = async (req, res, next) => {
  try {
    const { email } = req.body;
    await emailService.sendEmail(
      email,
      "Test Notification",
      "<h1>Success!</h1><p>Your email configuration is working correctly.</p>"
    );
    return ApiResponse.success(res, null, "Test email sent successfully");
  } catch (error) {
    next(error);
  }
};

// Email Template methods
export const getAllTemplates = async (req, res, next) => {
  try {
    const templates = await emailTemplateService.getAllTemplates();
    return ApiResponse.success(res, templates, "Email templates retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const getTemplateByName = async (req, res, next) => {
  try {
    const template = await emailTemplateService.getTemplateByName(req.params.name);
    return ApiResponse.success(res, template, "Email template retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const saveTemplate = async (req, res, next) => {
  try {
    const template = await emailTemplateService.saveTemplate(req.body);
    return ApiResponse.success(res, template, "Email template saved successfully");
  } catch (error) {
    next(error);
  }
};

export const getAllWhatsAppTemplates = async (req, res, next) => {
  try {
    const templates = await whatsappTemplateService.getAllTemplates();
    return ApiResponse.success(
      res,
      templates,
      "WhatsApp templates retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const getWhatsAppTemplateByName = async (req, res, next) => {
  try {
    const template = await whatsappTemplateService.getTemplateByName(
      req.params.name
    );
    return ApiResponse.success(
      res,
      template,
      "WhatsApp template retrieved successfully"
    );
  } catch (error) {
    next(error);
  }
};

export const saveWhatsAppTemplate = async (req, res, next) => {
  try {
    const template = await whatsappTemplateService.saveTemplate(req.body);
    return ApiResponse.success(
      res,
      template,
      "WhatsApp template saved successfully"
    );
  } catch (error) {
    next(error);
  }
};
