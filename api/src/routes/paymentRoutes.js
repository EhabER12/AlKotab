import express from "express";
import {
  getAllPayments,
  getPaymentById,
  getPaymentStatus,
  getUserPaymentHistory,
  createManualPayment,
  createCustomerManualPayment,
  getRevenueStatistics,
  updatePaymentStatus,
  updateAdminNotes,
  cancelPayment,
  createPaypalPayment,
  capturePaypalOrder,
  createCashierPayment,
  cashierCallback,
  kashierWebhook,
  paypalWebhook,
} from "../controllers/paymentController.js";
import {
  protect,
  authorize,
  optionalAuth,
} from "../middlewares/authMiddleware.js";
import { uploadSingle } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("admin"), getAllPayments);
router.get("/history", protect, getUserPaymentHistory);
router.get("/status/:id", getPaymentStatus); // Public - for payment result pages
router.get(
  "/statistics/revenue",
  protect,
  authorize("admin"),
  getRevenueStatistics
);
router.get("/:id", protect, authorize("admin"), getPaymentById);
router.put("/:id/status", protect, authorize("admin"), updatePaymentStatus);
router.put("/:id/notes", protect, authorize("admin"), updateAdminNotes);
router.post("/:id/cancel", protect, cancelPayment);

router.post(
  "/manual",
  protect,
  uploadSingle("paymentProof"),
  createManualPayment
);

router.post(
  "/customer-manual",
  optionalAuth,
  uploadSingle("paymentProof"),
  createCustomerManualPayment
);

// ==================== PayPal ====================
router.post("/paypal/create", optionalAuth, createPaypalPayment);
router.post("/paypal/capture/:orderId", optionalAuth, capturePaypalOrder);
router.post("/paypal/webhook", paypalWebhook); // Public

// ==================== Kashier (Modern Payment Sessions API) ====================
router.post("/kashier/create", optionalAuth, createCashierPayment);
router.post("/kashier/webhook", kashierWebhook); // Public - Primary webhook handler

// ==================== Cashier (Deprecated - Backward Compatibility) ====================
router.post("/cashier/create", optionalAuth, createCashierPayment); // Alias for kashier
router.post("/cashier/callback", cashierCallback); // Deprecated callback handler

export default router;
