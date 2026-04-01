import mongoose from "mongoose";

const communicationLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["email", "whatsapp"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "skipped"],
      default: "success",
      index: true,
    },
    provider: {
      type: String,
      default: "",
      trim: true,
    },
    recipient: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    recipients: {
      type: [String],
      default: [],
    },
    recipientText: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    templateName: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    relatedModel: {
      type: String,
      default: "",
      trim: true,
    },
    relatedId: {
      type: String,
      default: "",
      trim: true,
    },
    messageId: {
      type: String,
      default: "",
      trim: true,
    },
    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

communicationLogSchema.index({ createdAt: -1 });
communicationLogSchema.index({ channel: 1, createdAt: -1 });
communicationLogSchema.index({ status: 1, createdAt: -1 });

const CommunicationLog = mongoose.model(
  "CommunicationLog",
  communicationLogSchema
);

export default CommunicationLog;
