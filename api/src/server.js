import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import { imagePathMiddleware } from "./middlewares/imagePathMiddleware.js";
import xssSanitize from "./middlewares/xssSanitizeMiddleware.js";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import logger from "./utils/logger.js";
import authRoutes from "./routes/authRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import manualPaymentMethodRoutes from "./routes/manualPaymentMethodRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import cartSessionRoutes from "./routes/cartSessionRoutes.js";
import staticPageRoutes from "./routes/staticPageRoutes.js";
import aiArticleRoutes from "./routes/aiArticleRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import seoRoutes from "./routes/seoRoutes.js";
import financeRoutes from "./routes/financeRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import studentMemberRoutes from "./routes/studentMemberRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import sectionLessonRoutes from "./routes/sectionLessonRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import teacherGroupRoutes from "./routes/teacherGroupRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import communicationLogRoutes from "./routes/communicationLogRoutes.js";
import paymentMethodRoutes from "./routes/paymentMethodRoutes.js";
import teacherProfitRoutes from "./routes/teacherProfitRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import { FormService } from "./services/formService.js";
import { AiArticleSchedulerService } from "./services/aiArticleSchedulerService.js";
import { StudentMemberSchedulerService } from "./services/studentMemberSchedulerService.js";
import whatsappService from "./services/whatsappNotificationService.js";
import User from "./models/userModel.js";
import Certificate from "./models/certificateModel.js";
import mongoose from "mongoose";

dotenv.config();

// Initialize system forms (consultation, etc.)
const initializeSystemForms = async () => {
  try {
    const formService = new FormService();

    // Check if consultation form exists (check both current and legacy slugs)
    let consultationForm = await formService.getFormBySlug(
      "consultation-request"
    );
    if (!consultationForm) {
      consultationForm = await formService.getFormBySlug("consultation");
    }

    if (!consultationForm) {
      logger.info("Creating consultation form...");

      // Find an admin user to be the creator
      const adminUser = await User.findOne({ role: "admin" }).sort({
        createdAt: 1,
      });

      if (!adminUser) {
        logger.warn(
          "No admin user found. Consultation form will be created on first admin login."
        );
        return;
      }

      const consultationFormData = {
        title: "Consultation Request",
        slug: "consultation-request", // Explicitly set to prevent auto-generation mismatch
        description: "Consultation requests from customers",
        status: "published",
        fields: [
          { id: "name", type: "text", label: "Full Name", required: true },
          { id: "email", type: "email", label: "Email", required: true },
          { id: "phone", type: "tel", label: "Phone Number", required: true },
          {
            id: "service",
            type: "select",
            label: "Service of Interest",
            required: false,
            options: [
              "General Consultation",
              "Travel Planning",
              "Custom Package",
              "Other",
            ],
          },
          {
            id: "preferredDate",
            type: "date",
            label: "Preferred Consultation Date",
            required: false,
          },
          {
            id: "message",
            type: "textarea",
            label: "How can we help you?",
            required: false,
          },
        ],
        successMessage:
          "Thank you for your consultation request! We'll get back to you soon.",
        redirectUrl: "",
      };

      await formService.createForm(consultationFormData, adminUser._id);
      logger.success("Consultation form created successfully");
    } else {
      logger.success("Consultation form already exists");
    }
  } catch (error) {
    logger.error("Error initializing system forms", { error: error.message });
  }
};

const initializeAiScheduler = async () => {
  try {
    const scheduler = new AiArticleSchedulerService();
    await scheduler.initialize();
    logger.info("AI Article Scheduler initialized");
  } catch (error) {
    logger.error("Failed to initialize AI Article Scheduler", { error: error.message });
    // Don't exit, scheduler is optional
  }
};

const initializeStudentMemberScheduler = async () => {
  try {
    const scheduler = new StudentMemberSchedulerService();
    await scheduler.initialize();
    logger.info("Student Member Scheduler initialized");
  } catch (error) {
    logger.error("Failed to initialize Student Member Scheduler", { error: error.message });
    // Don't exit, scheduler is optional
  }
};

const initializeWhatsApp = async () => {
  try {
    const status = await whatsappService.restoreSession();

    logger.info("WhatsApp service state restored", {
      status: status.status,
      connected: status.connected,
      sessionExists: status.sessionExists,
    });
  } catch (error) {
    logger.warn("Failed to restore WhatsApp service state", {
      error: error.message,
    });
  }
};

// Rebuild certificate indexes to fix unique constraint issues
const rebuildCertificateIndexes = async () => {
  try {
    logger.info("Checking certificate indexes...");
    
    // Get current indexes
    const indexes = await Certificate.collection.getIndexes();
    const indexNames = Object.keys(indexes);
    
    // Check if we need to rebuild (look for old indexes without $ne: null)
    const needsRebuild = indexNames.some(name => 
      name.includes('userId_1') && !indexes[name].partialFilterExpression?.userId?.$ne
    );
    
    if (needsRebuild) {
      logger.info("Rebuilding certificate indexes to fix unique constraints...");
      
      // Drop old indexes (keep _id)
      for (const indexName of indexNames) {
        if (indexName !== '_id_') {
          try {
            await Certificate.collection.dropIndex(indexName);
            logger.info(`Dropped index: ${indexName}`);
          } catch (err) {
            logger.warn(`Could not drop index ${indexName}:`, err.message);
          }
        }
      }
      
      // Rebuild with new definitions
      await Certificate.syncIndexes();
      logger.success("Certificate indexes rebuilt successfully");
    } else {
      logger.success("Certificate indexes are up to date");
    }
  } catch (error) {
    logger.warn("Could not rebuild certificate indexes:", error.message);
    // Don't exit, this is not critical
  }
};

const initializeApp = async () => {
  try {
    await connectDB();
    await rebuildCertificateIndexes(); // Fix certificate indexes
    await initializeSystemForms();
    await initializeAiScheduler();
    await initializeStudentMemberScheduler();
    await initializeWhatsApp();
    logger.success("Application initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize application", { error: error.message });
    process.exit(1);
  }
};

initializeApp();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (required for rate limiting behind nginx/reverse proxy)
app.set("trust proxy", 1);

// Middleware
const extraOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

const normalizeOrigin = (origin = "") => origin.replace(/\/$/, "");

const allowedOrigins = Array.from(
  new Set([
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    process.env.WEBSITE_URL,
    "https://med-side.net",
    "https://www.med-side.net",
    ...extraOrigins,
  ])
)
  .filter(Boolean)
  .map(normalizeOrigin);

const allowFallbackForDev = process.env.NODE_ENV !== "production";

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded from other domains
  })
);

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // If no origin (like mobile apps or curl requests) or in development, allow it
    if (!origin || allowFallbackForDev) {
      return callback(null, true);
    }

    const normalizedInbound = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedInbound)) {
      callback(null, true);
    } else {
      logger.warn("CORS: blocked origin", { origin });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  maxAge: 86400,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Explicit OPTIONS preflight handling for Safari
app.options("*", cors(corsOptions));

// HTTP Request Logging
if (process.env.NODE_ENV === "production") {
  // Combined format for production: detailed logs including user-agent
  app.use(morgan("combined"));
} else {
  // Dev format for development: colored, concise output
  app.use(morgan("dev"));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 300, // Increased limit for browsing + checkout flow
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Disable validations since we use Cloudflare headers for client IP
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  // Use Cloudflare's real client IP header
  keyGenerator: (req) => {
    return (
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip
    );
  },
  // Skip rate limiting for critical checkout paths
  skip: (req) => {
    const skipPaths = ["/api/payments/customer-manual", "/api/payments/manual"];
    return skipPaths.some((path) => req.path.includes(path));
  },
});

// Apply rate limiting to all requests
app.use(limiter);

// Data Sanitization
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xssSanitize({
  skipPaths: ["/api/upload"],
  richTextFields: ["content", "description", "body", "message", "bio"],
})); // Prevent XSS attacks
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Get directory name using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/settings", imagePathMiddleware, settingsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", imagePathMiddleware, paymentRoutes);
app.use("/api/settings/manual-payment-methods", manualPaymentMethodRoutes);
app.use("/api/services", imagePathMiddleware, serviceRoutes);
app.use("/api/products", imagePathMiddleware, productRoutes);
app.use("/api/books", imagePathMiddleware, bookRoutes);
app.use("/api/categories", imagePathMiddleware, categoryRoutes);
app.use("/api/upload", imagePathMiddleware, uploadRoutes);
app.use("/api/cart-sessions", cartSessionRoutes);
app.use("/api/static-pages", staticPageRoutes);
app.use("/api/ai-articles", aiArticleRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/seo", seoRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/courses", imagePathMiddleware, courseRoutes);
app.use("/api/student-members", studentMemberRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/lms", sectionLessonRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/teacher-groups", teacherGroupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/communication-logs", communicationLogRoutes);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/teacher-profit", imagePathMiddleware, teacherProfitRoutes);
app.use("/api/coupons", couponRoutes);

// Health check route (enhanced)
app.get("/health", async (req, res) => {
  const healthCheck = {
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  };

  // Check database connection
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    healthCheck.database = {
      status: dbState === 1 ? "ok" : "error",
      state: dbStates[dbState] || "unknown",
    };
  } catch (error) {
    healthCheck.database = {
      status: "error",
      message: error.message,
    };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  healthCheck.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
  };

  // Determine overall status
  const isHealthy = healthCheck.database?.status === "ok";
  healthCheck.status = isHealthy ? "ok" : "degraded";

  res.status(isHealthy ? 200 : 503).json(healthCheck);
});

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.success(`Server running on port ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV || "development"
  });
});

export default app;
