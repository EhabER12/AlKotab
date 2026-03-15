import express from "express";
import {
  issueCertificate,
  bulkIssueCertificates,
  getCertificateById,
  getAllCertificates,
  verifyCertificate,
  getCertificatesByEmail,
  downloadCertificatePublic,
  getUserCertificates,
  getCourseCertificates,
  revokeCertificate,
  reissueCertificate,
  downloadCertificate,
  generateCertificatePDF,
  regenerateAllCertificatesPDFs,
  getCertificateTemplateInfo,
  createTemplate,
  getTemplateById,
  getAllTemplates,
  updateTemplate,
  deleteTemplate,
  getMyCertificatesEligibility,
  claimCertificate,
  bulkIssuePackageCertificates,
  deleteCertificate,
} from "../controllers/certificateController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ============ CERTIFICATE ROUTES ============

// Admin route to get all certificates
router.get(
  "/",
  protect,
  authorize("admin", "moderator"),
  getAllCertificates
);

// Public routes
router.get("/verify/:certificateNumber", verifyCertificate);
router.post("/by-email", getCertificatesByEmail);
router.get("/download/:certificateNumber", downloadCertificatePublic);

// Student routes
router.get("/my-certificates", protect, getUserCertificates);
router.get("/my-eligibility", protect, getMyCertificatesEligibility);
router.post("/claim", protect, claimCertificate);

// Admin bulk operations (must be before /:id routes)
router.post(
  "/regenerate-all-pdfs",
  protect,
  authorize("admin", "moderator"),
  regenerateAllCertificatesPDFs
);
router.post(
  "/issue",
  protect,
  authorize("admin", "moderator"),
  issueCertificate
);
router.post(
  "/bulk-issue",
  protect,
  authorize("admin", "moderator"),
  bulkIssueCertificates
);

router.post(
  "/bulk-package-issue",
  protect,
  authorize("admin", "moderator"),
  bulkIssuePackageCertificates
);

// ============ CERTIFICATE TEMPLATE ROUTES ============

// Admin/Moderator routes
router.post(
  "/templates",
  protect,
  authorize("admin", "moderator"),
  createTemplate
);
router.get(
  "/templates",
  protect,
  authorize("admin", "moderator", "teacher"),
  getAllTemplates
);
router.get(
  "/templates/:id",
  protect,
  authorize("admin", "moderator", "teacher"),
  getTemplateById
);
router.put(
  "/templates/:id",
  protect,
  authorize("admin", "moderator"),
  updateTemplate
);
router.delete(
  "/templates/:id",
  protect,
  authorize("admin", "moderator"),
  deleteTemplate
);

// Certificate detail routes (placed after templates to avoid conflict)
router.get("/:id", protect, getCertificateById);
router.get("/:id/download", protect, downloadCertificate);
router.get("/:id/template-info", protect, getCertificateTemplateInfo);

// Admin/Moderator routes
router.get(
  "/course/:courseId",
  protect,
  authorize("admin", "moderator", "teacher"),
  getCourseCertificates
);
router.get(
  "/user/:userId",
  protect,
  authorize("admin", "moderator"),
  getUserCertificates
);
router.post(
  "/:id/revoke",
  protect,
  authorize("admin", "moderator"),
  revokeCertificate
);
router.post(
  "/:id/reissue",
  protect,
  authorize("admin", "moderator"),
  reissueCertificate
);
router.post(
  "/:id/generate-pdf",
  protect,
  authorize("admin", "moderator"),
  generateCertificatePDF
);
router.delete(
  "/:id",
  protect,
  authorize("admin", "moderator"),
  deleteCertificate
);

export default router;
