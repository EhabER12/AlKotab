import express from "express";
import {
  getSettings,
  updateSettings,
  connectWhatsApp,
  disconnectWhatsApp,
  sendWhatsAppTestMessage,
  testEmailConnection,
  testEmailNotification,
  getPublicSettings,
  getAllTemplates,
  getTemplateByName,
  saveTemplate,
  getAllWhatsAppTemplates,
  getWhatsAppTemplateByName,
  saveWhatsAppTemplate,
} from "../controllers/settingsController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import {
  upload,
  ensureUploadDirectories,
} from "../middlewares/uploadMiddleware.js";
import { ApiError } from "../utils/apiError.js";
import { imagePathMiddleware } from "../middlewares/imagePathMiddleware.js";

const router = express.Router();

router.use(imagePathMiddleware);

router.get("/", getSettings);
router.get("/public", getPublicSettings);

router.put(
  "/",
  protect,
  authorize("admin", "moderator"),
  (req, res, next) => {
    if (
      req.user?.role === "moderator" &&
      req.is("multipart/form-data")
    ) {
      return next(
        new ApiError(
          403,
          "Moderators can only update subscription teachers"
        )
      );
    }

    next();
  },
  ensureUploadDirectories,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "logo_ar", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
    { name: "heroBackground", maxCount: 1 },
  ]),
  // Middleware to parse JSON strings from FormData
  (req, res, next) => {
    const fieldsToparse = [
      'socialLinks', 'theme', 'navbarLinks', 'homepageSections',
      'promoModal', 'homepageBanner', 'homepageCourses', 'coursesPageHero', 'booksPageHero', 'productsPageHero', 'articlesPageHero', 'homepageArticlesSection', 'emailSettings', 'authSettings',
      'authorityBar', 'reviewsSettings', 'whyGenounSettings',
      'headerDisplay', 'marketingBanners', 'notifications', 'paymentGateways',
      'financeSettings', 'apiKeys', 'teacherProfitSettings',
      'whatsappSettings', 'whatsappTemplates',
      'subscriptionStudentProfitSettings', 'heroStats'
    ];

    fieldsToparse.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          // If parsing fails, leave as is
        }
      }
    });
    next();
  },
  updateSettings
);

router.post(
  "/whatsapp/connect",
  protect,
  authorize("admin"),
  connectWhatsApp
);

router.post(
  "/whatsapp/disconnect",
  protect,
  authorize("admin"),
  disconnectWhatsApp
);

router.post(
  "/whatsapp/test-message",
  protect,
  authorize("admin"),
  sendWhatsAppTestMessage
);

// Email routes
router.post(
  "/email/test-connection",
  protect,
  authorize("admin", "moderator"),
  testEmailConnection
);
router.post(
  "/email/test-notification",
  protect,
  authorize("admin", "moderator"),
  testEmailNotification
);

// Email Templates
router.get(
  "/email/templates",
  protect,
  authorize("admin"),
  getAllTemplates
);

router.get(
  "/email/templates/:name",
  protect,
  authorize("admin"),
  getTemplateByName
);

router.post(
  "/email/templates",
  protect,
  authorize("admin"),
  saveTemplate
);

router.get(
  "/whatsapp/templates",
  protect,
  authorize("admin"),
  getAllWhatsAppTemplates
);

router.get(
  "/whatsapp/templates/:name",
  protect,
  authorize("admin"),
  getWhatsAppTemplateByName
);

router.post(
  "/whatsapp/templates",
  protect,
  authorize("admin"),
  saveWhatsAppTemplate
);

export default router;
