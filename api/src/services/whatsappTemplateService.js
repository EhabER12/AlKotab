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
    name: "welcome_message",
    label: {
      ar: "رسالة الترحيب",
      en: "Welcome Message",
    },
    type: "welcome",
    order: 1,
    isActive: true,
    content: {
      ar: "مرحباً {name}،\n\nأهلاً بك معنا{groupLine}{teacherLine}.\n{data}",
      en: "Hello {name},\n\nWelcome aboard{groupLine}{teacherLine}.\n{data}",
    },
    variables: [
      { name: "name", description: "Recipient name" },
      { name: "groupLine", description: "Optional group phrase" },
      { name: "teacherLine", description: "Optional teacher phrase" },
      { name: "data", description: "Additional message body" },
    ],
  },
  {
    name: "overdue_subscription",
    label: {
      ar: "الاشتراك المتأخر",
      en: "Overdue Subscription",
    },
    type: "subscription",
    order: 2,
    isActive: true,
    content: {
      ar: "السلام عليكم {name}،\n\nنذكركم بأن الاشتراك متأخر.\nتاريخ الاستحقاق: {dueDate}\n{daysSummary}\n{teacherLine}\n{packageLine}\n\nللتجديد أو الاستفسار يمكنكم التواصل معنا على هذا الرقم.\nمع خالص التحية",
      en: "Hello {name},\n\nThis is a reminder that your subscription is overdue.\nDue date: {dueDate}\n{daysSummary}\n{teacherLine}\n{packageLine}\n\nFor renewal or support, please reply to this number.",
    },
    variables: [
      { name: "name", description: "Member name" },
      { name: "dueDate", description: "Renewal due date" },
      { name: "daysSummary", description: "Overdue days summary" },
      { name: "teacherLine", description: "Teacher line if available" },
      { name: "packageLine", description: "Package line if available" },
      { name: "teacherName", description: "Teacher name only" },
      { name: "packageName", description: "Package name only" },
      { name: "phone", description: "Recipient phone number" },
    ],
  },
];

const LEGACY_TEMPLATE_FALLBACKS = {
  welcome_message: ["welcome_message", "student_added_to_group", "student_group_active"],
  overdue_subscription: ["overdue_subscription", "subscription_reminder"],
};

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

  isAllowedTemplateName(name) {
    return !!this.getDefaultTemplate(name);
  }

  buildTemplatePayload(existingTemplate, patch = {}) {
    const defaultTemplate = this.getDefaultTemplate(
      patch.name || existingTemplate?.name
    );

    if (!defaultTemplate) {
      throw new ApiError(400, "This WhatsApp template is not supported");
    }

    return {
      name: patch.name || existingTemplate?.name || defaultTemplate.name,
      label: this.mergeLocalizedText(
        existingTemplate?.label || defaultTemplate.label,
        patch.label
      ),
      type: defaultTemplate.type,
      content: this.mergeLocalizedText(
        existingTemplate?.content || defaultTemplate.content,
        patch.content
      ),
      variables: this.normalizeVariables(
        patch.variables,
        existingTemplate?.variables || defaultTemplate.variables || []
      ),
      isActive:
        patch.isActive ??
        existingTemplate?.isActive ??
        defaultTemplate.isActive ??
        true,
      order: defaultTemplate.order,
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

  toPlainTemplate(template) {
    if (!template) return null;
    if (typeof template.toObject === "function") {
      return template.toObject();
    }
    return {
      ...template,
      label: template.label || { ar: "", en: "" },
      content: template.content || { ar: "", en: "" },
      variables: Array.isArray(template.variables) ? template.variables : [],
    };
  }

  findLegacyTemplate(existingTemplates = [], targetTemplateName) {
    const candidateNames = LEGACY_TEMPLATE_FALLBACKS[targetTemplateName] || [
      targetTemplateName,
    ];

    for (const candidateName of candidateNames) {
      const match = existingTemplates.find(
        (template) => template?.name === candidateName
      );
      if (match) {
        return this.toPlainTemplate(match);
      }
    }

    return null;
  }

  async ensureDefaults() {
    const settings = await Settings.findOneOrCreate();
    const currentTemplates = Array.isArray(settings.whatsappTemplates)
      ? settings.whatsappTemplates.map((template) => this.toPlainTemplate(template))
      : [];

    const normalizedDeliverySettings = this.normalizeDeliverySettings(
      settings.whatsappSettings?.toObject?.() || settings.whatsappSettings || {}
    );

    const normalizedTemplates = DEFAULT_TEMPLATES.map((defaultTemplate) =>
      this.buildTemplatePayload(
        this.findLegacyTemplate(currentTemplates, defaultTemplate.name),
        { name: defaultTemplate.name }
      )
    );

    const existingDeliverySettings = JSON.stringify(
      settings.whatsappSettings?.toObject?.() || settings.whatsappSettings || {}
    );
    const nextDeliverySettings = JSON.stringify(normalizedDeliverySettings);
    const existingTemplatesJson = JSON.stringify(currentTemplates);
    const nextTemplatesJson = JSON.stringify(normalizedTemplates);
    const hasChanges =
      existingDeliverySettings !== nextDeliverySettings ||
      existingTemplatesJson !== nextTemplatesJson;

    if (hasChanges) {
      settings.whatsappSettings = normalizedDeliverySettings;
      settings.whatsappTemplates = normalizedTemplates;
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

    if (!this.isAllowedTemplateName(data.name)) {
      throw new ApiError(400, "Only the allowed WhatsApp templates can be edited");
    }

    const settings = await this.ensureDefaults();
    const existingTemplate = settings.whatsappTemplates.find(
      (currentTemplate) => currentTemplate.name === data.name
    );

    if (!existingTemplate) {
      throw new ApiError(404, `WhatsApp template '${data.name}' not found`);
    }

    Object.assign(
      existingTemplate,
      this.buildTemplatePayload(this.toPlainTemplate(existingTemplate), data)
    );

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
