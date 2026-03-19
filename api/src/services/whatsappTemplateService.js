import Settings from "../models/settingsModel.js";
import { ApiError } from "../utils/apiError.js";
import logger from "../utils/logger.js";

const DEFAULT_DELIVERY_SETTINGS = {
  messageDelayMs: 3000,
  messageDelayJitterMs: 1000,
  messageWrapperEnabled: false,
  messageWrapper: {
    ar: "{data}",
    en: "{data}",
  },
};

const DEFAULT_TEMPLATES = [
  {
    name: "general_broadcast",
    label: {
      ar: "رسالة عامة",
      en: "General Broadcast",
    },
    type: "broadcast",
    order: 1,
    isActive: true,
    content: {
      ar: "السلام عليكم {name}\n\n{data}",
      en: "Hello {name},\n\n{data}",
    },
    variables: [
      { name: "name", description: "Recipient name" },
      { name: "data", description: "Main message content" },
    ],
  },
  {
    name: "subscription_reminder",
    label: {
      ar: "تذكير الاشتراك",
      en: "Subscription Reminder",
    },
    type: "subscription",
    order: 2,
    isActive: true,
    content: {
      ar: "السلام عليكم {name}،\n\nنذكركم بأن موعد تجديد الاشتراك {statusLabel}.\nتاريخ الاستحقاق: {dueDate}\n{daysSummary}\n{teacherLine}\n{packageLine}\n\nللتجديد أو الاستفسار يمكنكم التواصل معنا على هذا الرقم.\nمع خالص التحية",
      en: "Hello {name},\n\nThis is a reminder that your subscription renewal is {statusLabel}.\nDue date: {dueDate}\n{daysSummary}\n{teacherLine}\n{packageLine}\n\nFor renewal or support, please reply to this number.",
    },
    variables: [
      { name: "name", description: "Member name" },
      { name: "dueDate", description: "Renewal due date" },
      { name: "statusLabel", description: "Reminder status label" },
      { name: "daysSummary", description: "Renewal days summary" },
      { name: "teacherLine", description: "Teacher line if available" },
      { name: "packageLine", description: "Package line if available" },
      { name: "teacherName", description: "Teacher name only" },
      { name: "packageName", description: "Package name only" },
      { name: "phone", description: "Recipient phone number" },
    ],
  },
  {
    name: "student_added_to_group",
    label: {
      ar: "إضافة طالب إلى مجموعة",
      en: "Student Added To Group",
    },
    type: "group",
    order: 3,
    isActive: true,
    content: {
      ar: "مرحباً {name}، لقد تمت إضافتك إلى مجموعة \"{groupName}\" {teacherLine}. بالتوفيق!",
      en: "Hello {name}, you have been added to the \"{groupName}\" group {teacherLine}. Best of luck!",
    },
    variables: [
      { name: "name", description: "Student name" },
      { name: "groupName", description: "Group name" },
      { name: "teacherLine", description: "Teacher phrase with name" },
      { name: "teacherName", description: "Teacher name only" },
    ],
  },
  {
    name: "student_group_active",
    label: {
      ar: "تفعيل طالب في المجموعة",
      en: "Student Group Activated",
    },
    type: "group_status",
    order: 4,
    isActive: true,
    content: {
      ar: "مرحباً {name}، تم تفعيل حالتك في مجموعة \"{groupName}\". نتطلع لرؤيتك في الحصص القادمة!",
      en: "Hello {name}, your status in the \"{groupName}\" group is now active. We look forward to seeing you soon!",
    },
    variables: [
      { name: "name", description: "Student name" },
      { name: "groupName", description: "Group name" },
    ],
  },
  {
    name: "student_group_completed",
    label: {
      ar: "إكمال الطالب للمجموعة",
      en: "Student Group Completed",
    },
    type: "group_status",
    order: 5,
    isActive: true,
    content: {
      ar: "تهانينا {name}! لقد أتممت دراستك في مجموعة \"{groupName}\". نتمنى لك دوام التوفيق والنجاح!",
      en: "Congratulations {name}! You have completed your journey in the \"{groupName}\" group. Wishing you continued success!",
    },
    variables: [
      { name: "name", description: "Student name" },
      { name: "groupName", description: "Group name" },
    ],
  },
  {
    name: "new_form_submission",
    label: {
      ar: "إشعار نموذج جديد",
      en: "New Form Submission",
    },
    type: "form",
    order: 6,
    isActive: true,
    content: {
      ar: "تم استلام طلب جديد من نموذج {formTitle}.\n\n{nameLine}{emailLine}{phoneLine}{data}",
      en: "A new submission was received from {formTitle}.\n\n{nameLine}{emailLine}{phoneLine}{data}",
    },
    variables: [
      { name: "formTitle", description: "Form title" },
      { name: "nameLine", description: "Submitter name line" },
      { name: "emailLine", description: "Submitter email line" },
      { name: "phoneLine", description: "Submitter phone line" },
      { name: "data", description: "Submission summary lines" },
    ],
  },
];

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTextValue = (value) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null && item !== "")
      .join(", ");
  }
  return String(value);
};

class WhatsAppTemplateService {
  mergeLocalizedText(currentValue = {}, incomingValue) {
    if (!incomingValue) {
      return {
        ar: currentValue?.ar || "",
        en: currentValue?.en || "",
      };
    }

    if (typeof incomingValue === "string") {
      return {
        ar: incomingValue,
        en: incomingValue,
      };
    }

    return {
      ar: incomingValue.ar ?? currentValue?.ar ?? "",
      en: incomingValue.en ?? currentValue?.en ?? "",
    };
  }

  normalizeVariables(variables, fallback = []) {
    if (!Array.isArray(variables)) {
      return Array.isArray(fallback) ? fallback : [];
    }

    return variables
      .filter((variable) => variable?.name)
      .map((variable) => ({
        name: String(variable.name).trim(),
        description: String(variable.description || "").trim(),
      }));
  }

  getDefaultTemplate(name) {
    return DEFAULT_TEMPLATES.find((template) => template.name === name) || null;
  }

  buildTemplatePayload(existingTemplate, patch = {}) {
    const defaultTemplate = this.getDefaultTemplate(
      patch.name || existingTemplate?.name
    );

    return {
      name: patch.name || existingTemplate?.name || defaultTemplate?.name || "",
      label: this.mergeLocalizedText(
        existingTemplate?.label || defaultTemplate?.label,
        patch.label
      ),
      type:
        patch.type ||
        existingTemplate?.type ||
        defaultTemplate?.type ||
        "custom",
      content: this.mergeLocalizedText(
        existingTemplate?.content || defaultTemplate?.content,
        patch.content
      ),
      variables: this.normalizeVariables(
        patch.variables,
        existingTemplate?.variables || defaultTemplate?.variables || []
      ),
      isActive:
        patch.isActive ??
        existingTemplate?.isActive ??
        defaultTemplate?.isActive ??
        true,
      order:
        patch.order ??
        existingTemplate?.order ??
        defaultTemplate?.order ??
        0,
    };
  }

  normalizeDeliverySettings(currentSettings = {}) {
    return {
      messageDelayMs:
        currentSettings?.messageDelayMs ??
        DEFAULT_DELIVERY_SETTINGS.messageDelayMs,
      messageDelayJitterMs:
        currentSettings?.messageDelayJitterMs ??
        DEFAULT_DELIVERY_SETTINGS.messageDelayJitterMs,
      messageWrapperEnabled:
        currentSettings?.messageWrapperEnabled ??
        DEFAULT_DELIVERY_SETTINGS.messageWrapperEnabled,
      messageWrapper: this.mergeLocalizedText(
        DEFAULT_DELIVERY_SETTINGS.messageWrapper,
        currentSettings?.messageWrapper
      ),
      lastUpdated: currentSettings?.lastUpdated || new Date(),
    };
  }

  async ensureDefaults() {
    const settings = await Settings.findOneOrCreate();
    let hasChanges = false;

    const normalizedDeliverySettings = this.normalizeDeliverySettings(
      settings.whatsappSettings?.toObject?.() || settings.whatsappSettings || {}
    );

    if (
      JSON.stringify(settings.whatsappSettings?.toObject?.() || settings.whatsappSettings || {}) !==
      JSON.stringify(normalizedDeliverySettings)
    ) {
      settings.whatsappSettings = normalizedDeliverySettings;
      hasChanges = true;
    }

    if (!Array.isArray(settings.whatsappTemplates)) {
      settings.whatsappTemplates = [];
      hasChanges = true;
    }

    for (const template of DEFAULT_TEMPLATES) {
      const existingTemplate = settings.whatsappTemplates.find(
        (currentTemplate) => currentTemplate.name === template.name
      );

      if (!existingTemplate) {
        settings.whatsappTemplates.push(template);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      settings.markModified("whatsappSettings");
      settings.markModified("whatsappTemplates");
      await settings.save();
    }

    return settings;
  }

  async getAllTemplates() {
    try {
      const settings = await this.ensureDefaults();
      return [...settings.whatsappTemplates].sort(
        (left, right) =>
          (left.order || 0) - (right.order || 0) ||
          String(left.name || "").localeCompare(String(right.name || ""))
      );
    } catch (error) {
      logger.error("Failed to load WhatsApp templates", {
        error: error.message,
      });
      throw error;
    }
  }

  async getTemplateByName(name) {
    const settings = await this.ensureDefaults();
    const template = settings.whatsappTemplates.find(
      (currentTemplate) => currentTemplate.name === name
    );

    if (!template) {
      throw new ApiError(404, `WhatsApp template '${name}' not found`);
    }

    return template;
  }

  async saveTemplate(data = {}) {
    if (!data.name) {
      throw new ApiError(400, "Template name is required");
    }

    const settings = await this.ensureDefaults();
    const existingTemplate = settings.whatsappTemplates.find(
      (currentTemplate) => currentTemplate.name === data.name
    );
    const payload = this.buildTemplatePayload(
      existingTemplate?.toObject?.() || existingTemplate,
      data
    );

    if (existingTemplate) {
      Object.assign(existingTemplate, payload);
    } else {
      settings.whatsappTemplates.push(payload);
    }

    settings.whatsappSettings = {
      ...this.normalizeDeliverySettings(
        settings.whatsappSettings?.toObject?.() || settings.whatsappSettings || {}
      ),
      lastUpdated: new Date(),
    };
    settings.markModified("whatsappTemplates");
    settings.markModified("whatsappSettings");
    await settings.save();

    return settings.whatsappTemplates.find(
      (currentTemplate) => currentTemplate.name === data.name
    );
  }

  renderText(content, variables = {}) {
    let renderedContent = String(content || "");

    for (const [key, rawValue] of Object.entries(variables).sort(
      (left, right) => right[0].length - left[0].length
    )) {
      const value = normalizeTextValue(rawValue);
      const escapedKey = escapeRegExp(key);

      renderedContent = renderedContent.replace(
        new RegExp(`{{\\s*${escapedKey}\\s*}}`, "g"),
        value
      );
      renderedContent = renderedContent.replace(
        new RegExp(`{\\s*${escapedKey}\\s*}`, "g"),
        value
      );
    }

    return renderedContent.replace(/\r\n/g, "\n").trim();
  }

  async renderTemplateMessage(name, variables = {}, lang = "ar") {
    const template = await this.getTemplateByName(name);

    if (!template.isActive) {
      return null;
    }

    const content =
      template.content?.[lang] ||
      template.content?.en ||
      template.content?.ar ||
      "";

    return this.renderText(content, variables);
  }

  async getDeliverySettings() {
    const settings = await this.ensureDefaults();

    return this.normalizeDeliverySettings(
      settings.whatsappSettings?.toObject?.() || settings.whatsappSettings || {}
    );
  }
}

export default new WhatsAppTemplateService();
