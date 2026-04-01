import mongoose from "mongoose";
import { addDays, addMonths, addWeeks, addYears, differenceInDays, startOfDay } from "date-fns";

const studentMemberSchema = new mongoose.Schema(
  {
    // Link to User account (optional)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Basic Info
    name: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    phone: {
      type: String,
      index: true,
    },
    governorate: {
      type: String,
      index: true,
    },
    sheetName: {
      type: String,
      index: true,
    },
    age: {
      type: Number,
      min: 3,
      max: 100,
    },

    // Student category in subscription dashboard
    memberType: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      index: true,
    },

    // Assigned Teacher
    assignedTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    assignedTeacherName: {
      type: String, // Fallback if not linked to user
    },

    // Package
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      index: true,
    },
    packagePrice: {
      type: Number, // Store price at time of enrollment
    },

    // Subscription Info
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      default: Date.now,
    },
    billingDay: {
      type: Number, // 1-28 (day of month) - Optional, kept for backward compatibility
      min: 1,
      max: 28,
    },
    nextDueDate: {
      type: Date,
      required: [true, "End date is required"],
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "due_soon", "overdue", "paused", "cancelled"],
      default: "active",
      index: true,
    },

    // Renewal History
    renewalHistory: [
      {
        renewedAt: {
          type: Date,
          default: Date.now,
        },
        previousDueDate: {
          type: Date,
        },
        nextDueDate: {
          type: Date,
        },
        renewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        note: {
          type: String,
        },
        reminderSent: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Notes
    notes: {
      type: String,
    },

    // WhatsApp Reminder
    lastReminderSent: {
      type: Date,
    },
    reminderCount: {
      type: Number,
      default: 0,
    },

    // Management
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
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
    toObject: {
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

// Indexes
studentMemberSchema.index({ status: 1, nextDueDate: 1 });
studentMemberSchema.index({ assignedTeacherId: 1, status: 1 });
studentMemberSchema.index({ governorate: 1, status: 1 });
studentMemberSchema.index({ packageId: 1, governorate: 1 });

// Virtual: Days left until renewal
studentMemberSchema.virtual("daysLeft").get(function () {
  if (!this.nextDueDate) return 0;
  const days = differenceInDays(this.nextDueDate, new Date());
  return Math.max(0, days);
});

// Method: Calculate next due date based on billing day and package duration
studentMemberSchema.methods.calculateNextDueDate = function (fromDate = new Date()) {
  const targetDay = this.billingDay || fromDate.getDate();
  let nextDate = new Date(fromDate);
  
  // If we have a package, use its duration
  if (this.packageId && typeof this.packageId === 'object' && this.packageId.duration) {
    const { value, unit } = this.packageId.duration;
    
    switch (unit) {
      case 'day':
        nextDate = addDays(nextDate, value);
        break;
      case 'week':
        nextDate = addWeeks(nextDate, value);
        break;
      case 'month':
        nextDate = addMonths(nextDate, value);
        break;
      case 'year':
        nextDate = addYears(nextDate, value);
        break;
      default:
        nextDate = addMonths(nextDate, 1);
    }
  } else {
    // Default fallback to monthly based on billing day
    nextDate.setDate(targetDay);
    if (nextDate <= fromDate) {
      nextDate = addMonths(nextDate, 1);
    }
  }
  
  return startOfDay(nextDate);
};

// Method: Renew subscription
studentMemberSchema.methods.renew = async function (renewedBy, note = "") {
  // Ensure package is populated to calculate duration
  if (this.packageId && typeof this.packageId !== 'object') {
    await this.populate('packageId');
  }

  const previousDueDate = this.nextDueDate;
  const newDueDate = this.calculateNextDueDate(this.nextDueDate);
  
  this.nextDueDate = newDueDate;
  this.status = "active";
  
  // Add to renewal history
  this.renewalHistory.push({
    renewedAt: new Date(),
    previousDueDate,
    nextDueDate: newDueDate,
    renewedBy,
    note,
  });
  
  await this.save();
  return this;
};

// Method: Update status based on due date
studentMemberSchema.methods.updateStatus = async function (remindBeforeDays = 2) {
  const today = startOfDay(new Date());
  const dueDate = startOfDay(this.nextDueDate);
  const daysUntilDue = differenceInDays(dueDate, today);
  
  let newStatus = this.status;
  
  if (daysUntilDue < 0) {
    newStatus = "overdue";
  } else if (daysUntilDue <= remindBeforeDays) {
    newStatus = "due_soon";
  } else if (this.status !== "paused" && this.status !== "cancelled") {
    newStatus = "active";
  }
  
  if (this.status !== newStatus) {
    this.status = newStatus;
    await this.save();
  }
  
  return this;
};

// Static method: Find members due for renewal reminder
studentMemberSchema.statics.findDueForReminder = async function (remindBeforeDays = 2) {
  const targetDate = addDays(new Date(), remindBeforeDays);
  const startDate = startOfDay(targetDate);
  const endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);
  
  return this.find({
    status: { $in: ["active", "due_soon"] },
    nextDueDate: {
      $gte: startDate,
      $lte: endDate,
    },
  })
    .populate("assignedTeacherId", "name")
    .sort({ nextDueDate: 1 });
};

// Static method: Update all statuses
studentMemberSchema.statics.updateAllStatuses = async function (remindBeforeDays = 2) {
  const members = await this.find({
    status: { $in: ["active", "due_soon"] },
  });
  
  let updatedCount = 0;
  
  for (const member of members) {
    const oldStatus = member.status;
    await member.updateStatus(remindBeforeDays);
    if (member.status !== oldStatus) {
      updatedCount++;
    }
  }
  
  return updatedCount;
};

const StudentMember = mongoose.model("StudentMember", studentMemberSchema);

export default StudentMember;
