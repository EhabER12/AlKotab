import nodemailer from "nodemailer";
import { SettingsRepository } from "../repositories/settingsRepository.js";
import { ApiError } from "../utils/apiError.js";
import logger from "../utils/logger.js";
import communicationLogService from "./communicationLogService.js";

export class EmailService {
  constructor() {
    this.settingsRepository = new SettingsRepository();
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Fetch latest settings from DB
      const settings = await this.settingsRepository.getSettings();
      const emailSettings = settings.emailSettings;

      let transportConfig = {};

      if (emailSettings && emailSettings.enabled) {
        // Use DB settings
        transportConfig = {
          host: emailSettings.host,
          port: emailSettings.port,
          secure: emailSettings.secure,
          auth: {
            user: emailSettings.user,
            pass: emailSettings.pass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        };
        logger.info("EmailService: Using database configuration");
      } else {
        // Fallback to ENV variables
        transportConfig = {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: process.env.EMAIL_PORT === "465",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        };
        logger.info("EmailService: Using environment configuration");
      }

      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      logger.success("Email service initialized successfully");
    } catch (error) {
      logger.error("Email service initialization failed", { error: error.message });
      // Don't throw here to allow app to start, but log error
      // throw new ApiError(500, "Failed to initialize email service"); 
    }
  }

  async sendEmail(to, subject, html, attachments = [], logMeta = {}) {
    // Always re-initialize to ensure we have latest settings if they changed
    this.initialized = false;
    await this.initialize();

    if (!this.transporter) {
      await communicationLogService.recordEmail({
        to,
        subject,
        html,
        status: "failed",
        errorMessage: "Email service not initialized",
        ...logMeta,
        metadata: {
          attachmentsCount: Array.isArray(attachments) ? attachments.length : 0,
          ...(logMeta.metadata || {}),
        },
      });
      throw new ApiError(500, "Email service not initialized");
    }

    try {
      const settings = await this.settingsRepository.getSettings();
      const emailSettings = settings.emailSettings;

      const from = (emailSettings && emailSettings.enabled)
        ? `"${emailSettings.fromName}" <${emailSettings.fromEmail}>`
        : process.env.EMAIL_FROM;

      const mailOptions = {
        from,
        to,
        subject,
        html,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      await communicationLogService.recordEmail({
        to,
        subject,
        html,
        status: "success",
        messageId: info?.messageId || "",
        ...logMeta,
        metadata: {
          accepted: info?.accepted || [],
          rejected: info?.rejected || [],
          attachmentsCount: Array.isArray(attachments) ? attachments.length : 0,
          ...(logMeta.metadata || {}),
        },
      });
      return info;
    } catch (error) {
      logger.error("Failed to send email", { error: error.message });
      await communicationLogService.recordEmail({
        to,
        subject,
        html,
        status: "failed",
        errorMessage: error.message,
        ...logMeta,
        metadata: {
          attachmentsCount: Array.isArray(attachments) ? attachments.length : 0,
          ...(logMeta.metadata || {}),
        },
      });
      throw new ApiError(500, "Failed to send email");
    }
  }

  async sendFormNotification(formData) {
    const settings = await this.settingsRepository.getSettings();

    if (!settings.notifications.email.enabled) {
      return { success: false, message: "Email notifications are disabled" };
    }

    const recipients = settings.notifications.email.recipients;
    if (!recipients || recipients.length === 0) {
      return { success: false, message: "No email recipients configured" };
    }

    const template = settings.notifications.email.templates.newForm;
    const subject = template.subject;

    // Create HTML content from form data
    let formDetailsHtml = "<ul>";
    for (const [key, value] of Object.entries(formData)) {
      formDetailsHtml += `<li><strong>${key}:</strong> ${value}</li>`;
    }
    formDetailsHtml += "</ul>";

    const html = template.body.replace("{{formDetails}}", formDetailsHtml);

    await this.sendEmail(recipients.join(","), subject, html);
    return { success: true, message: "Form notification email sent" };
  }

  async sendPurchaseNotification(purchaseData) {
    const settings = await this.settingsRepository.getSettings();

    if (!settings.notifications.email.enabled) {
      return { success: false, message: "Email notifications are disabled" };
    }

    const recipients = settings.notifications.email.recipients;
    if (!recipients || recipients.length === 0) {
      return { success: false, message: "No email recipients configured" };
    }

    const template = settings.notifications.email.templates.newPurchase;
    const subject = template.subject;

    // Create HTML content from purchase data
    let purchaseDetailsHtml = "<ul>";
    for (const [key, value] of Object.entries(purchaseData)) {
      if (typeof value !== "object") {
        purchaseDetailsHtml += `<li><strong>${key}:</strong> ${value}</li>`;
      }
    }
    purchaseDetailsHtml += "</ul>";

    const html = template.body.replace(
      "{{purchaseDetails}}",
      purchaseDetailsHtml
    );

    await this.sendEmail(recipients.join(","), subject, html);
    return { success: true, message: "Purchase notification email sent" };
  }

  async sendMessageNotification(messageData) {
    const settings = await this.settingsRepository.getSettings();

    if (!settings.notifications.email.enabled) {
      return { success: false, message: "Email notifications are disabled" };
    }

    const recipients = settings.notifications.email.recipients;
    if (!recipients || recipients.length === 0) {
      return { success: false, message: "No email recipients configured" };
    }

    const template = settings.notifications.email.templates.newMessage;
    const subject = template.subject;

    // Create HTML content from message data
    let messageDetailsHtml = "<ul>";
    messageDetailsHtml += `<li><strong>From:</strong> ${messageData.fromName} (${messageData.fromEmail})</li>`;
    messageDetailsHtml += `<li><strong>Subject:</strong> ${messageData.subject}</li>`;
    messageDetailsHtml += `<li><strong>Message:</strong> ${messageData.content}</li>`;
    messageDetailsHtml += "</ul>";

    const html = template.body.replace(
      "{{messageDetails}}",
      messageDetailsHtml
    );

    await this.sendEmail(recipients.join(","), subject, html);
    return { success: true, message: "Message notification email sent" };
  }
}
