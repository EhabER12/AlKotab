import CommunicationLog from "../models/communicationLogModel.js";
import logger from "../utils/logger.js";

const MAX_CONTENT_LENGTH = 10000;
const MAX_ERROR_LENGTH = 1000;

class CommunicationLogService {
  normalizeRecipients(value) {
    if (Array.isArray(value)) {
      return value
        .flatMap((entry) => String(entry || "").split(","))
        .map((entry) => entry.trim())
        .filter(Boolean);
    }

    return String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  truncate(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
  }

  async recordLog(payload) {
    try {
      const recipients = this.normalizeRecipients(
        payload.recipients?.length ? payload.recipients : payload.recipient
      );

      await CommunicationLog.create({
        channel: payload.channel,
        status: payload.status || "success",
        provider: payload.provider || "",
        recipient: recipients[0] || "",
        recipients,
        recipientText: recipients.join(", "),
        subject: this.truncate(payload.subject, 500),
        content: this.truncate(payload.content, MAX_CONTENT_LENGTH),
        templateName: payload.templateName || "",
        source: payload.source || "",
        relatedModel: payload.relatedModel || "",
        relatedId: payload.relatedId ? String(payload.relatedId) : "",
        messageId: payload.messageId || "",
        errorMessage: this.truncate(payload.errorMessage, MAX_ERROR_LENGTH),
        metadata: payload.metadata || {},
      });
    } catch (error) {
      logger.error("Failed to persist communication log", {
        error: error.message,
        channel: payload.channel,
        status: payload.status,
      });
    }
  }

  async recordEmail({
    to,
    subject = "",
    html = "",
    status = "success",
    provider = "smtp",
    messageId = "",
    errorMessage = "",
    templateName = "",
    source = "email_service",
    relatedModel = "",
    relatedId = "",
    metadata = {},
  }) {
    return this.recordLog({
      channel: "email",
      status,
      provider,
      recipient: to,
      subject,
      content: html,
      messageId,
      errorMessage,
      templateName,
      source,
      relatedModel,
      relatedId,
      metadata,
    });
  }

  async recordWhatsApp({
    number,
    text = "",
    status = "success",
    provider = "whatsapp-web",
    messageId = "",
    errorMessage = "",
    templateName = "",
    source = "whatsapp_service",
    relatedModel = "",
    relatedId = "",
    metadata = {},
  }) {
    return this.recordLog({
      channel: "whatsapp",
      status,
      provider,
      recipient: number,
      content: text,
      messageId,
      errorMessage,
      templateName,
      source,
      relatedModel,
      relatedId,
      metadata,
    });
  }

  async getLogs(filters = {}, options = {}) {
    const query = {};

    if (filters.channel) {
      query.channel = filters.channel;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      const regex = { $regex: filters.search, $options: "i" };
      query.$or = [
        { recipientText: regex },
        { subject: regex },
        { content: regex },
        { templateName: regex },
        { source: regex },
        { errorMessage: regex },
      ];
    }

    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
    const sort = options.sort || "-createdAt";
    const skip = (page - 1) * limit;

    const [logs, total, summaryRows] = await Promise.all([
      CommunicationLog.find(query).sort(sort).skip(skip).limit(limit),
      CommunicationLog.countDocuments(query),
      CommunicationLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            email: {
              $sum: {
                $cond: [{ $eq: ["$channel", "email"] }, 1, 0],
              },
            },
            whatsapp: {
              $sum: {
                $cond: [{ $eq: ["$channel", "whatsapp"] }, 1, 0],
              },
            },
            success: {
              $sum: {
                $cond: [{ $eq: ["$status", "success"] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
              },
            },
            skipped: {
              $sum: {
                $cond: [{ $eq: ["$status", "skipped"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary:
        summaryRows[0] || {
          total: 0,
          email: 0,
          whatsapp: 0,
          success: 0,
          failed: 0,
          skipped: 0,
        },
    };
  }
}

export default new CommunicationLogService();
