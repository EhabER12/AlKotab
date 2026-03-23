import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      ar: {
        type: String,
        required: [true, "Arabic name is required"],
      },
      en: {
        type: String,
        required: [true, "English name is required"],
      },
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [
        function () {
          return this.status === "active";
        },
        "Password is required",
      ],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin", "teacher"],
      default: "user",
    },
    // Teacher-specific info
    teacherInfo: {
      isApproved: { type: Boolean, default: false },
      bio: { type: String },
      specialization: { type: String },
      approvedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      // New fields for LMS
      canPublishDirectly: { type: Boolean, default: false },
      coursesCount: { type: Number, default: 0 },
      studentsCount: { type: Number, default: 0 },
      // Custom profit percentages (overrides global defaults)
      customProfitPercentages: {
        courseSales: {
          type: Number,
          min: 0,
          max: 100,
        },
        subscriptions: {
          type: Number,
          min: 0,
          max: 100,
        },
      },
    },
    // Student-specific info (for Tahfeez subscription)
    studentInfo: {
      age: { type: Number },
      assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      startDate: { type: Date },
      billingDay: { type: Number, min: 1, max: 28 }, // Day of month for renewal
      nextDueDate: { type: Date },
      subscriptionStatus: {
        type: String,
        enum: ["active", "due_soon", "overdue", "paused"],
        default: "active",
      },
      subscriptionType: { type: String, default: "tahfeez" },
      renewalHistory: [
        {
          renewedAt: { type: Date, default: Date.now },
          nextDueDate: { type: Date },
          renewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          note: { type: String },
        },
      ],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "invited"],
      default: "active",
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpire: {
      type: Date,
      select: false,
    },
    // Password Reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    // Email Verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    // Employee Information (for moderators/employees)
    employeeInfo: {
      salary: {
        amount: { type: Number, default: 0 },
        currency: { type: String, enum: ["EGP", "SAR", "USD"], default: "EGP" },
        paymentSchedule: {
          type: String,
          enum: ["monthly", "weekly", "biweekly"],
          default: "monthly",
        },
      },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        postalCode: { type: String },
      },
      emergencyContact: {
        name: { type: String },
        phone: { type: String },
        relationship: { type: String },
      },
      hireDate: { type: Date },
      department: { type: String },
      position: { type: String },
      dashboardAccess: [{ type: String }],
    },
    // Activity Tracking
    activityInfo: {
      lastActivityAt: { type: Date },
      lastLoginAt: { type: Date },
      lastIpAddress: { type: String },
      loginCount: { type: Number, default: 0 },
    },
    // Admin Notes
    adminNotes: [
      {
        note: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
