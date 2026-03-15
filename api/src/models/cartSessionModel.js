import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      ar: String,
      en: String,
    },
    productSlug: String,
    productImage: String,
    variantId: String,
    variantName: {
      ar: String,
      en: String,
    },
    variantPrice: Number,
    addons: [
      {
        addonId: String,
        name: { ar: String, en: String },
        price: Number,
      },
    ],
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const cartSessionSchema = new mongoose.Schema(
  {
    // Unique session identifier (stored in browser)
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Session status
    status: {
      type: String,
      enum: ["active", "abandoned", "converted", "recovered"],
      default: "active",
      index: true,
    },

    // Customer information (captured at checkout)
    customerInfo: {
      name: String,
      email: {
        type: String,
        lowercase: true,
        trim: true,
        index: true,
      },
      phone: String,
    },

    // Cart items snapshot
    cartItems: [cartItemSchema],

    // Cart totals
    cartTotal: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "EGP",
    },

    // Optional: linked user if logged in
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Device/browser info for analytics
    deviceInfo: {
      userAgent: String,
      ip: String,
      language: String,
    },

    // Activity tracking
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    checkoutStartedAt: Date,
    abandonedAt: Date,
    convertedAt: Date,
    recoveredAt: Date,

    // Linked payment if converted
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    // Recovery tracking
    recoveryAttempts: {
      type: Number,
      default: 0,
    },
    lastRecoveryAttemptAt: Date,

    // Notes for admin
    adminNotes: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for finding abandoned sessions
cartSessionSchema.index({ status: 1, lastActivityAt: 1 });
cartSessionSchema.index({ status: 1, createdAt: -1 });

// Virtual for time since last activity
cartSessionSchema.virtual("timeSinceActivity").get(function () {
  if (!this.lastActivityAt) return null;
  return Date.now() - this.lastActivityAt.getTime();
});

// Virtual for time since abandoned
cartSessionSchema.virtual("timeSinceAbandoned").get(function () {
  if (!this.abandonedAt) return null;
  return Date.now() - this.abandonedAt.getTime();
});

// Static method to mark old sessions as abandoned
cartSessionSchema.statics.markAbandonedSessions = async function (
  inactivityMinutes = 30
) {
  const cutoffTime = new Date(Date.now() - inactivityMinutes * 60 * 1000);

  const result = await this.updateMany(
    {
      status: "active",
      lastActivityAt: { $lt: cutoffTime },
    },
    {
      $set: {
        status: "abandoned",
        abandonedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

// Static method to get abandoned cart statistics
cartSessionSchema.statics.getStats = async function () {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totals, today, thisWeek, thisMonth, potentialRevenue] =
    await Promise.all([
      // Total counts by status
      this.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

      // Abandoned today
      this.countDocuments({
        status: "abandoned",
        abandonedAt: { $gte: oneDayAgo },
      }),

      // Abandoned this week
      this.countDocuments({
        status: "abandoned",
        abandonedAt: { $gte: sevenDaysAgo },
      }),

      // Abandoned this month
      this.countDocuments({
        status: "abandoned",
        abandonedAt: { $gte: thirtyDaysAgo },
      }),

      // Potential revenue from abandoned carts
      this.aggregate([
        { $match: { status: "abandoned" } },
        { $group: { _id: null, total: { $sum: "$cartTotal" } } },
      ]),
    ]);

  const statusCounts = totals.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return {
    total: {
      active: statusCounts.active || 0,
      abandoned: statusCounts.abandoned || 0,
      converted: statusCounts.converted || 0,
      recovered: statusCounts.recovered || 0,
    },
    abandoned: {
      today,
      thisWeek,
      thisMonth,
    },
    potentialRevenue: potentialRevenue[0]?.total || 0,
    conversionRate:
      statusCounts.converted && statusCounts.abandoned
        ? (
            (statusCounts.converted /
              (statusCounts.converted + statusCounts.abandoned)) *
            100
          ).toFixed(1)
        : 0,
  };
};

const CartSession = mongoose.model("CartSession", cartSessionSchema);

export default CartSession;
