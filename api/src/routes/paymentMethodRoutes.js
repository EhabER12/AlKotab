import express from "express";
import {
    getAllPaymentMethods,
    getPaymentMethodById,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    togglePaymentMethod,
} from "../controllers/paymentMethodController.js";
import { protect, authorize, optionalAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public route to get active payment methods
router.get("/", optionalAuth, getAllPaymentMethods);

// Admin routes
router.use(protect);
router.use(authorize("admin"));

router.post("/", createPaymentMethod);
router.get("/:id", getPaymentMethodById);
router.put("/:id", updatePaymentMethod);
router.delete("/:id", deletePaymentMethod);
router.patch("/:id/toggle", togglePaymentMethod);

export default router;
