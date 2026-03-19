import { FormRepository } from "../repositories/formRepository.js";
import { ApiError } from "../utils/apiError.js";
import { v4 as uuidv4 } from "uuid";
import slugify from "../utils/slugify.js";
import { SettingsRepository } from "../repositories/settingsRepository.js";
import emailTemplateService from "./emailTemplateService.js";
import logger from "../utils/logger.js";
import { WhatsappNotificationService } from "./whatsappNotificationService.js";

export class FormService {
  constructor() {
    this.formRepository = new FormRepository();
    this.settingsRepository = new SettingsRepository();
    this.whatsappService = new WhatsappNotificationService();
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  buildSubmissionSummaryHtml(summary = {}) {
    let html = "<ul>";

    Object.entries(summary).forEach(([label, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === "object") return;
      html += `<li><strong>${this.escapeHtml(label)}:</strong> ${this.escapeHtml(
        value
      )}</li>`;
    });

    html += "</ul>";
    return html;
  }

  async sendAdminNewRequestEmail(form, submissionSummary, submittedAt) {
    try {
      const settings = await this.settingsRepository.getSettings();
      const recipients = [
        ...(settings?.notifications?.email?.recipients || []),
      ];
      if (!recipients.length && process.env.EMAIL_USER) {
        recipients.push(process.env.EMAIL_USER);
      }

      if (!recipients.length) return;

      const adminUrl = process.env.ADMIN_URL || "http://localhost:3001";
      const submissionsUrl = `${adminUrl}/dashboard/submissions`;
      const submittedDate = submittedAt
        ? new Date(submittedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const variables = {
        formTitle: form?.title || "New Request",
        submittedAt: submittedDate,
        submissionSummary: this.buildSubmissionSummaryHtml(submissionSummary),
        submissionsUrl,
        year: new Date().getFullYear(),
      };

      await emailTemplateService.sendTemplatedEmail(
        recipients.join(","),
        "admin_new_request",
        variables
      );
    } catch (error) {
      logger.error("Failed to send new request email to admin", {
        error: error.message,
      });
    }
  }

  ensureValidSlug(formData) {
    if (formData.status === "published") {
      if (!formData.slug && formData.title) {
        formData.slug = slugify(formData.title, { lower: true, strict: true });
      } else if (!formData.slug) {
        formData.slug = `form-${Date.now()}-${Math.floor(
          Math.random() * 1000
        )}`;
      }
    }
    return formData;
  }

  async getAllForms(queryParams) {
    const { page, limit, status } = queryParams;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const options = {
      page,
      limit,
      filter,
      populate: "createdBy",
    };

    return this.formRepository.findAll(options);
  }

  async getFormById(id) {
    const form = await this.formRepository.findById(id, {
      populate: "createdBy",
    });

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    return form;
  }

  async createForm(formData, userId) {
    // Generate IDs for fields if not provided
    if (formData.fields && formData.fields.length > 0) {
      formData.fields = formData.fields.map((field) => ({
        ...field,
        id: field.id || uuidv4(),
      }));
    }

    // Add user as creator
    formData.createdBy = userId;

    // Ensure valid slug if publishing
    formData = this.ensureValidSlug(formData);

    return this.formRepository.create(formData);
  }

  async updateForm(id, formData) {
    const form = await this.formRepository.findById(id);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    // Generate IDs for new fields if not provided
    if (formData.fields && formData.fields.length > 0) {
      formData.fields = formData.fields.map((field) => ({
        ...field,
        id: field.id || uuidv4(),
      }));
    }

    // Ensure valid slug if publishing
    formData = this.ensureValidSlug(formData);

    return this.formRepository.update(id, formData);
  }

  async deleteForm(id) {
    const form = await this.formRepository.findById(id);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    return this.formRepository.delete(id);
  }

  async submitForm(id, submissionData) {
    const form = await this.formRepository.findById(id);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    if (form.status !== "published") {
      throw new ApiError(400, "This form is not accepting submissions");
    }

    // Validate required fields
    const requiredFields = form.fields
      .filter((field) => field.required)
      .map((field) => field.id);

    const missingFields = requiredFields.filter(
      (fieldId) =>
        !submissionData[fieldId] &&
        submissionData[fieldId] !== false &&
        submissionData[fieldId] !== 0
    );

    if (missingFields.length > 0) {
      throw new ApiError(400, "Missing required fields", missingFields);
    }

    // Create an enhanced submission data object with both values and field labels
    const enhancedSubmissionData = {
      raw: submissionData, // Keep original data
      mapped: {}, // Add field label mapped data
      summary: {}, // Add a simpler summary with human-readable labels
    };

    // Create field ID to label map
    const fieldMap = {};
    form.fields.forEach((field) => {
      fieldMap[field.id] = field.label;
      // Add field labels to the mapped data
      if (submissionData[field.id] !== undefined) {
        enhancedSubmissionData.mapped[field.id] = {
          label: field.label,
          type: field.type,
          value: submissionData[field.id],
        };

        // Also add to summary with label as key
        enhancedSubmissionData.summary[field.label] = submissionData[field.id];
      }
    });

    // Save the submission with enhanced data
    const submission = await this.formRepository.addSubmission(
      id,
      enhancedSubmissionData
    );

    // Send WhatsApp notification (non-blocking)
    this.sendWhatsAppNotification(
      form.title,
      enhancedSubmissionData.summary
    ).catch((error) => {});

    // Send admin email notification (non-blocking)
    this.sendAdminNewRequestEmail(
      form,
      enhancedSubmissionData.summary,
      submission?.submittedAt
    ).catch((error) => {});

    return submission;
  }

  async submitFormFlexible(id, submissionData) {
    const form = await this.formRepository.findById(id);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    if (form.status !== "published") {
      throw new ApiError(400, "This form is not accepting submissions");
    }

    // NO required field validation - accept data as-is
    // This ensures the submission works regardless of form field changes

    // Create an enhanced submission data object with both values and field labels
    const enhancedSubmissionData = {
      raw: submissionData, // Keep original data
      mapped: {}, // Add field label mapped data
      summary: {}, // Add a simpler summary with human-readable labels
    };

    // Create field ID to label map
    const fieldMap = {};
    form.fields.forEach((field) => {
      fieldMap[field.id] = field.label;
      // Add field labels to the mapped data
      if (submissionData[field.id] !== undefined) {
        enhancedSubmissionData.mapped[field.id] = {
          label: field.label,
          type: field.type,
          value: submissionData[field.id],
        };

        // Also add to summary with label as key
        enhancedSubmissionData.summary[field.label] = submissionData[field.id];
      }
    });

    // For fields sent from frontend that don't match form schema,
    // add them to summary with their original field names
    Object.keys(submissionData).forEach((key) => {
      if (!fieldMap[key] && submissionData[key] !== undefined) {
        enhancedSubmissionData.summary[key] = submissionData[key];
      }
    });

    // Save the submission with enhanced data
    const submission = await this.formRepository.addSubmission(
      id,
      enhancedSubmissionData
    );

    // Send WhatsApp notification (non-blocking)
    this.sendWhatsAppNotification(
      form.title,
      enhancedSubmissionData.summary
    ).catch((error) => {});

    // Send admin email notification (non-blocking)
    this.sendAdminNewRequestEmail(
      form,
      enhancedSubmissionData.summary,
      submission?.submittedAt
    ).catch((error) => {});

    return submission;
  }

  async sendWhatsAppNotification(formTitle, submissionData) {
    try {
      // Get the settings to check if WhatsApp notifications are enabled
      const settings = await this.settingsRepository.getSettings();

      if (
        !settings.notifications?.whatsapp?.enabled ||
        !settings.whatsappConnected
      ) {
        return { success: false, reason: "disabled" };
      }

      const numbers = settings.notifications?.whatsapp?.numbers;
      if (!numbers || numbers.length === 0) {
        return { success: false, reason: "no_numbers" };
      }

      let form = await this.formRepository.findOne({ title: formTitle });
      if (!form) {
        const formById = await this.formRepository.findById(formTitle);
        if (formById) {
          form = formById;
        }
      }

      const fieldMap = {};
      if (form && form.fields) {
        form.fields.forEach((field) => {
          fieldMap[field.id] = field.label || field.id;
        });
      } else {
      }

      // Prepare the message content
      let message = `📝 *New Form Submission*\n\n*Form:* ${formTitle}\n\n`;

      const name =
        submissionData.name ||
        submissionData.fullName ||
        submissionData.full_name ||
        null;
      const email =
        submissionData.email ||
        submissionData.emailAddress ||
        submissionData.email_address ||
        null;
      const phone =
        submissionData.phone ||
        submissionData.phoneNumber ||
        submissionData.phone_number ||
        submissionData.mobile ||
        null;

      if (name || email || phone) {
        message += "*Submitter Details:*\n";
        if (name) message += `*Name:* ${name}\n`;
        if (email) message += `*Email:* ${email}\n`;
        if (phone) message += `*Phone:* ${phone}\n`;
        message += "\n";
      }

      message += "*Form Data:*\n";
      for (const [fieldId, value] of Object.entries(submissionData)) {
        if (
          [
            "name",
            "fullName",
            "full_name",
            "email",
            "emailAddress",
            "email_address",
            "phone",
            "phoneNumber",
            "phone_number",
            "mobile",
          ].includes(fieldId) ||
          typeof value === "object"
        )
          continue;

        // Use field label if available, otherwise use ID
        const fieldLabel = fieldMap[fieldId] || fieldId;
        message += `*${fieldLabel}:* ${value}\n`;
      }

      // Track notification results
      const results = [];
      const nameLine = name ? `الاسم: ${name}\n` : "";
      const emailLine = email ? `البريد الإلكتروني: ${email}\n` : "";
      const phoneLine = phone ? `الهاتف: ${phone}\n` : "";

      for (const number of numbers) {
        try {
          const result = await this.whatsappService.sendMessage(
            number,
            message,
            {
              lang: "ar",
            }
          );

          results.push({ number, ...result });
        } catch (sendError) {
          results.push({
            number,
            success: false,
            error: sendError.message,
          });
        }
      }

      return {
        success: results.some((result) => result.success),
        results,
      };
    } catch (error) {
      // Don't throw error to avoid affecting the form submission flow
      return { success: false, error: error.message };
    }
  }

  async getFormBySlug(slug) {
    const form = await this.formRepository.findOne({
      slug,
    });

    return form;
  }

  async getPublicFormBySlug(slug) {
    const form = await this.formRepository.findOne({
      slug,
      status: "published",
    });

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    return form;
  }

  async markSubmissionAsRead(formId, submissionId) {
    const form = await this.formRepository.findById(formId);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    // Find the submission in the form's submissions array
    const submissionIndex = form.submissions.findIndex(
      (sub) => sub._id.toString() === submissionId
    );

    if (submissionIndex === -1) {
      throw new ApiError(404, "Submission not found");
    }

    // Update the isRead status
    return this.formRepository.markSubmissionAsRead(formId, submissionId);
  }

  async deleteSubmission(formId, submissionId) {
    const form = await this.formRepository.findById(formId);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    // Find the submission in the form's submissions array
    const submissionIndex = form.submissions.findIndex(
      (sub) => sub._id.toString() === submissionId
    );

    if (submissionIndex === -1) {
      throw new ApiError(404, "Submission not found");
    }

    // Delete the submission
    return this.formRepository.deleteSubmission(formId, submissionId);
  }

  async updateSubmissionNotes(formId, submissionId, notes) {
    const form = await this.formRepository.findById(formId);

    if (!form) {
      throw new ApiError(404, "Form not found");
    }

    // Find the submission in the form's submissions array
    const submissionIndex = form.submissions.findIndex(
      (sub) => sub._id.toString() === submissionId
    );

    if (submissionIndex === -1) {
      throw new ApiError(404, "Submission not found");
    }

    // Update the admin notes
    return this.formRepository.updateSubmissionNotes(
      formId,
      submissionId,
      notes
    );
  }
}
