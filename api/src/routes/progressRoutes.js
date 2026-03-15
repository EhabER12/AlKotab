import express from "express";
import {
  enrollInCourse,
  getUserProgress,
  getUserEnrollments,
  markLessonCompleted,
  updateCurrentLesson,
  resetProgress,
  getCourseProgressStats,
  getStudentsProgress,
} from "../controllers/progressController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Student routes
router.post("/enroll/:courseId", protect, enrollInCourse);
router.get("/course/:courseId", protect, getUserProgress);
router.get("/my-courses", protect, getUserEnrollments);
router.post(
  "/course/:courseId/lesson/:lessonId/complete",
  protect,
  markLessonCompleted
);
router.put(
  "/course/:courseId/current-lesson/:lessonId",
  protect,
  updateCurrentLesson
);
router.delete("/course/:courseId/reset", protect, resetProgress);

// Admin/Teacher routes
router.get(
  "/course/:courseId/stats",
  protect,
  authorize("admin", "moderator", "teacher"),
  getCourseProgressStats
);
router.get(
  "/course/:courseId/students",
  protect,
  authorize("admin", "moderator", "teacher"),
  getStudentsProgress
);

export default router;
