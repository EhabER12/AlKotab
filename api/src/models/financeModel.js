import mongoose from "mongoose";

/**
 * Exchange rates to USD (approximate, can be updated)
 * These are fallback rates - ideally fetch from API
 */
const EXCHANGE_RATES_TO_USD = {
  USD: 1,
  EGP: 0.0203, // 1 EGP = ~0.02 USD
  SAR: 0.2666, // 1 SAR = ~0.27 USD
};

const financeSchema = new mongoose.Schema(
  {
    // Transaction type
    type: {
      type: String,
      enum: ["income", "expense", "adjustment"],
      required: [true, "Transaction type is required"],
    },

    // Amount in original currency (positive for income, negative for expense)
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },

    // Original currency
    currency: {
      type: String,
      enum: ["EGP", "SAR", "USD"],
      default: "EGP",
    },

    // Amount converted to USD at time of transaction
    amountInUSD: {
      type: Number,
      required: true,
    },

    // Exchange rate used for conversion (stored for audit)
    exchangeRate: {
      type: Number,
      required: true,
    },

    // Category for organization
    category: {
      type: String,
      enum: [
        // Income categories
        "product_sale",
        "service_payment",
        "subscription",
        "commission",
        // Expense categories
        "refund",
        "salary",
        "rent",
        "utilities",
        "marketing",
        "software",
        "equipment",
        "taxes",
        // Other
        "adjustment",
        "other",
      ],
      default: "other",
    },

    // Description/note about the transaction
    description: {
      type: String,
      maxlength: 500,
    },

    // Date of the transaction (can be different from createdAt)
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Reference to related entity
    reference: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "reference.model",
      },
      model: {
        type: String,
        enum: ["Payment", "User", "Product", "Service", null],
      },
      displayId: {
        type: String, // e.g., order ID, invoice number
      },
    },

    // Source of the transaction
    source: {
      type: String,
      enum: ["manual", "payment_manual", "payment_auto", "refund_auto", "system"],
      default: "manual",
    },

    // Admin who created this entry
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // For financial reconciliation
    isReconciled: {
      type: Boolean,
      default: false,
    },

    // Optional attachment (receipt, invoice, etc.)
    attachmentUrl: {
      type: String,
    },

    // Tags for better filtering
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

// Indexes for common queries
financeSchema.index({ type: 1, transactionDate: -1 });
financeSchema.index({ category: 1, transactionDate: -1 });
financeSchema.index({ source: 1 });
financeSchema.index({ isDeleted: 1 });
financeSchema.index({ "reference.id": 1 });

// Pre-save middleware to calculate USD amount
financeSchema.pre("save", function (next) {
  if (this.isModified("amount") || this.isModified("currency")) {
    // Get exchange rate
    const rate = this.exchangeRate || EXCHANGE_RATES_TO_USD[this.currency] || 1;
    this.exchangeRate = rate;

    // Calculate USD amount (keep sign for income/expense)
    this.amountInUSD = Number((this.amount * rate).toFixed(2));
  }
  next();
});

// Static method to get exchange rate (can be extended to use API)
financeSchema.statics.getExchangeRate = function (currency) {
  return EXCHANGE_RATES_TO_USD[currency] || 1;
};

// Static method to convert to USD
financeSchema.statics.convertToUSD = function (amount, currency) {
  const rate = EXCHANGE_RATES_TO_USD[currency] || 1;
  return Number((amount * rate).toFixed(2));
};

// Query helper to exclude deleted
financeSchema.query.notDeleted = function () {
  return this.where({ isDeleted: { $ne: true } });
};

const Finance = mongoose.model("Finance", financeSchema);

export default Finance;
