import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    slug: { type: String, required: true, unique: true },
    shortDescription: {
      ar: { type: String },
      en: { type: String },
    },
    description: {
      ar: { type: String },
      en: { type: String },
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    coverImage: { type: String },
    gallery: [{ type: String }],
    basePrice: { type: Number, required: true },
    compareAtPrice: { type: Number },
    currency: { type: String, default: "EGP" },
    productType: {
      type: String,
      enum: ["default", "digital_book"],
      default: "default",
    },
    author: {
      ar: { type: String },
      en: { type: String },
    },
    bookFilePath: { type: String },
    bookCoverPath: { type: String },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    submittedByRole: {
      type: String,
      enum: ["admin", "moderator", "teacher", "system"],
      default: "admin",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    variants: [
      {
        name: {
          ar: { type: String },
          en: { type: String },
        },
        price: { type: Number },
        isDefault: { type: Boolean, default: false },
      },
    ],
    addons: [
      {
        name: {
          ar: { type: String },
          en: { type: String },
        },
        price: { type: Number },
      },
    ],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    customFields: [
      {
        label: {
          ar: { type: String },
          en: { type: String },
        },
        type: {
          type: String,
          enum: ["text", "textarea", "url", "file", "number", "email", "date"],
          default: "text",
        },
        required: { type: Boolean, default: false },
        placeholder: {
          ar: { type: String },
          en: { type: String },
        },
      },
    ],
    order: { type: Number, default: 0 },
    seoData: {
      views30d: { type: Number, default: 0 },
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

productSchema.index({ categoryId: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ productType: 1, approvalStatus: 1, isActive: 1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
