import express from "express";
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  requestPublish,
  approvePublish,
  rejectPublish,
  enrollCourse,
  getMyCourses,
  getEnrolledCourses,
} from "../controllers/courseController.js";
import { protect, authorize, optionalAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes (but with optional auth to detect enrollment)
router.get("/", getCourses);
router.get("/slug/:slug", optionalAuth, getCourse); // Get by slug with optional auth
router.get("/:id", optionalAuth, getCourse); // Get by ID with optional auth

// Protected routes - My courses
router.get("/my/teaching", protect, authorize("teacher", "admin"), getMyCourses);
router.get("/my/enrolled", protect, getEnrolledCourses);

// Protected routes - Course management
router.post("/", protect, authorize("teacher", "admin", "moderator"), createCourse);
router.put("/:id", protect, authorize("teacher", "admin", "moderator"), updateCourse);
router.delete("/:id", protect, authorize("teacher", "admin", "moderator"), deleteCourse);

// Publishing workflow
router.post("/:id/publish-request", protect, authorize("teacher"), requestPublish);
router.post("/:id/publish", protect, authorize("admin", "moderator"), approvePublish);
router.post("/:id/reject", protect, authorize("admin", "moderator"), rejectPublish);

// Enrollment
router.post("/:id/enroll", protect, enrollCourse);

export default router;
