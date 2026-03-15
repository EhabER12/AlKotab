import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/productModel.js";
import BookDownloadGrant from "../models/bookDownloadGrantModel.js";
import { ApiError } from "../utils/apiError.js";
import slugify from "../utils/slugify.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const normalizeBookResponse = (book, options = {}) => {
  const { includeFilePath = false } = options;
  const base = book.toObject ? book.toObject() : book;

  if (!includeFilePath) {
    delete base.bookFilePath;
  }

  return {
    ...base,
    id: base.id || base._id?.toString?.() || base._id,
    category: base.categoryId,
  };
};

export class BookController {
  async getBooks(req, res, next) {
    try {
      const { page, limit, category, search } = req.query;

      const filter = {
        productType: "digital_book",
        approvalStatus: "approved",
        isActive: true,
      };

      if (category) {
        filter.categoryId = category;
      }

      if (search && typeof search === "string") {
        filter.$or = [
          { "name.ar": { $regex: search, $options: "i" } },
          { "name.en": { $regex: search, $options: "i" } },
          { "author.ar": { $regex: search, $options: "i" } },
          { "author.en": { $regex: search, $options: "i" } },
        ];
      }

      const pageNum = Number.parseInt(page, 10) || 1;
      const limitNum = Number.parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [books, total] = await Promise.all([
        Product.find(filter)
          .sort({ isFeatured: -1, order: 1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("categoryId", "name")
          .populate("createdBy", "fullName email role"),
        Product.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        books: books.map((book) => normalizeBookResponse(book)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const book = await Product.findOne({
        slug,
        productType: "digital_book",
        approvalStatus: "approved",
        isActive: true,
      })
        .populate("categoryId", "name")
        .populate("createdBy", "fullName email role");

      if (!book) {
        throw new ApiError(404, "Book not found");
      }

      res.status(200).json({
        success: true,
        book: normalizeBookResponse(book),
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyBooks(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const userRole = req.user?.role;
      const userId = req.user?._id;

      const filter = { productType: "digital_book" };
      if (status && ["pending", "approved", "rejected"].includes(status)) {
        filter.approvalStatus = status;
      }

      if (userRole !== "admin") {
        filter.createdBy = userId;
      }

      const pageNum = Number.parseInt(page, 10) || 1;
      const limitNum = Number.parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [books, total] = await Promise.all([
        Product.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate("categoryId", "name")
          .populate("createdBy", "fullName email role")
          .populate("approvedBy", "fullName email role"),
        Product.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        books: books.map((book) =>
          normalizeBookResponse(book, { includeFilePath: true })
        ),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingBooks(req, res, next) {
    try {
      const books = await Product.find({
        productType: "digital_book",
        approvalStatus: "pending",
      })
        .sort({ createdAt: -1 })
        .populate("categoryId", "name")
        .populate("createdBy", "fullName email role");

      res.status(200).json({
        success: true,
        books: books.map((book) =>
          normalizeBookResponse(book, { includeFilePath: true })
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  async createBook(req, res, next) {
    try {
      const user = req.user;
      if (!user) {
        throw new ApiError(401, "Not authorized");
      }

      const data = req.body || {};

      const name = parseJsonField(data.name, null);
      const shortDescription = parseJsonField(data.shortDescription, {
        ar: "",
        en: "",
      });
      const description = parseJsonField(data.description, { ar: "", en: "" });
      const author = parseJsonField(data.author, { ar: "", en: "" });

      if (!name?.ar && !name?.en) {
        throw new ApiError(400, "Book title is required");
      }

      const normalizedName = {
        ar: String(name?.ar || name?.en || "").trim(),
        en: String(name?.en || name?.ar || "").trim(),
      };

      const normalizedShortDescription = {
        ar: String(shortDescription?.ar || shortDescription?.en || "").trim(),
        en: String(shortDescription?.en || shortDescription?.ar || "").trim(),
      };

      const normalizedDescription = {
        ar: String(description?.ar || description?.en || "").trim(),
        en: String(description?.en || description?.ar || "").trim(),
      };

      const normalizedAuthor = {
        ar: String(author?.ar || author?.en || "").trim(),
        en: String(author?.en || author?.ar || "").trim(),
      };

      const price = Number(data.basePrice);
      if (!Number.isFinite(price) || price <= 0) {
        throw new ApiError(400, "Valid book price is required");
      }

      const pdfFile = req.files?.pdf?.[0];
      const coverFile = req.files?.cover?.[0];
      if (!pdfFile) {
        throw new ApiError(400, "Book PDF is required");
      }

      const baseSlug = data.slug
        ? String(data.slug).trim()
        : slugify(normalizedName.en || normalizedName.ar || `book-${Date.now()}`);
      if (!baseSlug) {
        throw new ApiError(400, "A valid slug is required");
      }

      const isAdmin = user.role === "admin";
      const approvalStatus = isAdmin ? "approved" : "pending";
      const isActive = isAdmin ? toBoolean(data.isActive, true) : false;

      const createdBook = await Product.create({
        name: normalizedName,
        slug: baseSlug,
        shortDescription: normalizedShortDescription,
        description: normalizedDescription,
        author: normalizedAuthor,
        categoryId: data.categoryId || undefined,
        basePrice: price,
        compareAtPrice: Number(data.compareAtPrice) || undefined,
        currency: data.currency || "EGP",
        coverImage: coverFile ? `/uploads/book-covers/${coverFile.filename}` : "",
        bookCoverPath: coverFile
          ? `/uploads/book-covers/${coverFile.filename}`
          : "",
        bookFilePath: `/uploads/books/${pdfFile.filename}`,
        productType: "digital_book",
        approvalStatus,
        approvedBy: isAdmin ? user._id : undefined,
        approvedAt: isAdmin ? new Date() : undefined,
        submittedByRole: user.role,
        createdBy: user._id,
        isActive,
        isFeatured: isAdmin ? toBoolean(data.isFeatured, false) : false,
        variants: [],
        addons: [],
        customFields: [],
        order: Number(data.order) || 0,
      });

      res.status(201).json({
        success: true,
        message: isAdmin
          ? "Book created and published successfully"
          : "Book submitted for admin approval",
        book: normalizeBookResponse(createdBook, { includeFilePath: true }),
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(new ApiError(400, "A book with this slug already exists"));
      }
      next(error);
    }
  }

  async reviewBook(req, res, next) {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.body;

      if (!["approve", "reject"].includes(action)) {
        throw new ApiError(400, "Action must be either approve or reject");
      }

      const book = await Product.findOne({
        _id: id,
        productType: "digital_book",
      });

      if (!book) {
        throw new ApiError(404, "Book not found");
      }

      if (action === "approve") {
        book.approvalStatus = "approved";
        book.approvedBy = req.user._id;
        book.approvedAt = new Date();
        book.rejectionReason = "";
        book.isActive = true;
      } else {
        book.approvalStatus = "rejected";
        book.rejectionReason = String(rejectionReason || "").slice(0, 500);
        book.isActive = false;
      }

      await book.save();

      res.status(200).json({
        success: true,
        message:
          action === "approve"
            ? "Book approved and published successfully"
            : "Book rejected successfully",
        book: normalizeBookResponse(book, { includeFilePath: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadBook(req, res, next) {
    try {
      const { token } = req.params;

      const grant = await BookDownloadGrant.findOne({
        token,
        isActive: true,
      }).populate("productId", "name slug productType bookFilePath");

      if (!grant) {
        logger.warn("Invalid book download token used", { token });
        throw new ApiError(404, "Invalid download link");
      }

      const book = grant.productId;
      if (!book || book.productType !== "digital_book" || !book.bookFilePath) {
        logger.warn("Book download grant points to invalid book", {
          token,
          productId: grant.productId?._id || grant.productId,
        });
        throw new ApiError(404, "Book file not found");
      }

      const relativeFilePath = String(book.bookFilePath).replace(/^\/+/, "");
      const filePath = path.resolve(__dirname, "../../", relativeFilePath);

      if (!fs.existsSync(filePath)) {
        logger.error("Book file missing on disk for download grant", {
          token,
          productId: book._id,
          filePath,
        });
        throw new ApiError(404, "Book file not found");
      }

      await BookDownloadGrant.findByIdAndUpdate(grant._id, {
        $inc: { downloadsCount: 1 },
      });

      const safeFileName = `${book.slug || "book"}.pdf`;
      logger.info("Book download started", {
        token,
        productId: book._id,
        paymentId: grant.paymentId,
        email: grant.email,
      });

      res.download(filePath, safeFileName, (error) => {
        if (error) {
          logger.error("Book download failed while sending file", {
            token,
            productId: book._id,
            error: error.message,
          });
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
