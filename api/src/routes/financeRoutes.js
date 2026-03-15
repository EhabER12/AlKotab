import express from "express";
import {
  getAllTransactions,
  getFinancialSummary,
  getMonthlyBreakdown,
  getCategoryBreakdown,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  adjustBalance,
  exportTransactions,
  getFinanceSettings,
  updateFinanceSettings,
} from "../controllers/financeController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { uploadSingle } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// All finance routes require authentication
router.use(protect);

// Finance settings are admin-only
router.get("/settings", authorize("admin"), getFinanceSettings);
router.put("/settings", authorize("admin"), updateFinanceSettings);

// Admin only routes below
router.use(authorize("admin"));

// Summary and analytics endpoints
router.get("/summary", getFinancialSummary);
router.get("/monthly", getMonthlyBreakdown);
router.get("/categories", getCategoryBreakdown);

// Balance adjustment
router.post("/adjust", adjustBalance);

// Export
router.post("/export", exportTransactions);

// CRUD operations
router.get("/", getAllTransactions);
router.get("/:id", getTransactionById);
router.post("/", uploadSingle("attachment"), createTransaction);
router.put("/:id", uploadSingle("attachment"), updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;
