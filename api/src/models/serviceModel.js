import mongoose from "mongoose";

// Bilingual text schema for AR/EN support
const bilingualTextSchema = new mongoose.Schema(
  {
    ar: { type: String, required: true },
    en: { type: String, required: true },
  },
  { _id: false }
);

// Feature schema for service features
const featureSchema = new mongoose.Schema(
  {
    icon: { type: String, default: "check" },
    title: bilingualTextSchema,
    description: bilingualTextSchema,
  },
  { _id: false }
);

// Stat schema for performance metrics (e.g., "14 → 60" speed)
const statSchema = new mongoose.Schema(
  {
    value: { type: String, required: true }, // e.g., "14 → 60", "+300%", "100+"
    label: bilingualTextSchema,
    icon: { type: String, default: "trending-up" },
  },
  { _id: false }
);

// Pricing tier schema
const pricingTierSchema = new mongoose.Schema(
  {
    name: bilingualTextSchema,
    price: { type: Number }, // null for "Request Quote"
    currency: { type: String, default: "EGP" },
    description: bilingualTextSchema,
    features: [String],
    isPopular: { type: Boolean, default: false },
  },
  { _id: false }
);

// Main Service Schema
const serviceSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: bilingualTextSchema,
      required: [true, "Service title is required"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDescription: {
      type: bilingualTextSchema,
      required: [true, "Short description is required"],
    },
    description: {
      type: bilingualTextSchema,
      required: [true, "Full description is required"],
    },

    // Visual Assets
    icon: {
      type: String,
      default: "code", // lucide icon name
    },
    coverImage: {
      type: String,
      default: "",
    },
    gallery: [
      {
        url: String,
        alt: bilingualTextSchema,
      },
    ],

    // Category
    category: {
      type: String,
      enum: ["salla", "shopify", "websites", "seo", "branding", "other"],
      default: "other",
    },

    // Features List
    features: [featureSchema],

    // Performance Stats (for showcasing results)
    stats: [statSchema],

    // Pricing
    pricingType: {
      type: String,
      enum: ["fixed", "tiers", "quote"],
      default: "quote",
    },
    pricingTiers: [pricingTierSchema],
    startingPrice: {
      type: Number,
      default: null,
    },

    // Display Options
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // SEO
    seo: {
      title: bilingualTextSchema,
      description: bilingualTextSchema,
      keywords: [String],
    },
    seoData: {
      views30d: { type: Number, default: 0 },
    },

    // Related Services
    relatedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
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
        return ret;
      },
    },
  }
);

// Indexes (slug index is created automatically via unique: true)
serviceSchema.index({ category: 1 });
serviceSchema.index({ isActive: 1, isFeatured: 1 });
serviceSchema.index({ order: 1 });

// Pre-save: Generate slug if not provided
serviceSchema.pre("save", function (next) {
  if (!this.slug && this.title.en) {
    this.slug = this.title.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

const Service = mongoose.model("Service", serviceSchema);

export default Service;
