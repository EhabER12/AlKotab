import express from "express";
import {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  getQuizzesByCourse,
  getQuizzesBySection,
  getMyQuizzes,
  updateQuiz,
  deleteQuiz,
  submitQuizAttempt,
  getUserAttempts,
  getUserBestAttempt,
  checkCertificateEligibility,
  getQuizStatistics,
  getAllQuizAttempts,
  getQuizBySlug,
} from "../controllers/quizController.js";
import { protect, authorize, optionalAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin route to get all quizzes
router.get(
  "/",
  protect,
  authorize("admin", "moderator", "teacher"),
  getAllQuizzes
);

// Public/Student routes
router.get("/public/:slug", optionalAuth, getQuizBySlug);
router.get("/my/all", protect, getMyQuizzes);
router.get("/course/:courseId", protect, getQuizzesByCourse);
router.get("/section/:sectionId", protect, getQuizzesBySection);
router.get("/:id", optionalAuth, getQuizById);
router.post("/:quizId/attempt", optionalAuth, submitQuizAttempt);
router.get("/:quizId/attempts/me", protect, getUserAttempts);
router.get("/:quizId/attempts/me/best", protect, getUserBestAttempt);
router.get(
  "/certificate-eligibility/:courseId",
  protect,
  checkCertificateEligibility
);

// Admin/Teacher routes
router.post(
  "/",
  protect,
  authorize("admin", "moderator", "teacher"),
  createQuiz
);
router.put(
  "/:id",
  protect,
  authorize("admin", "moderator", "teacher"),
  updateQuiz
);
router.delete(
  "/:id",
  protect,
  authorize("admin", "moderator", "teacher"),
  deleteQuiz
);
router.get(
  "/:id/statistics",
  protect,
  authorize("admin", "moderator", "teacher"),
  getQuizStatistics
);
router.get(
  "/:quizId/attempts/all",
  protect,
  authorize("admin", "moderator", "teacher"),
  getAllQuizAttempts
);

export default router;
