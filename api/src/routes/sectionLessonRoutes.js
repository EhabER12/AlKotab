import express from "express";
import {
  createSection,
  getSectionById,
  getSectionsByCourse,
  updateSection,
  deleteSection,
  reorderSections,
  createLesson,
  getLessonById,
  getLessonsBySection,
  getLessonsByCourse,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getCourseStructure,
  uploadLessonVideo,
  deleteLessonVideo,
  streamLessonVideo,
} from "../controllers/sectionLessonController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { handleVideoUpload } from "../middleware/videoUpload.js";
import { protectVideo, rateLimitVideo } from "../middleware/videoAuth.js";

const router = express.Router();

// ============ SECTION ROUTES ============

// Public/Student routes
router.get("/sections/:id", protect, getSectionById);
router.get("/sections/course/:courseId", protect, getSectionsByCourse);

// Admin/Teacher routes
router.post(
  "/sections",
  protect,
  authorize("admin", "moderator", "teacher"),
  createSection
);
router.put(
  "/sections/:id",
  protect,
  authorize("admin", "moderator", "teacher"),
  updateSection
);
router.delete(
  "/sections/:id",
  protect,
  authorize("admin", "moderator", "teacher"),
  deleteSection
);
router.post(
  "/sections/course/:courseId/reorder",
  protect,
  authorize("admin", "moderator", "teacher"),
  reorderSections
);

// ============ LESSON ROUTES ============

// Public/Student routes
router.get("/lessons/:id", protect, getLessonById);
router.get("/lessons/section/:sectionId", protect, getLessonsBySection);
router.get("/lessons/course/:courseId", protect, getLessonsByCourse);
router.get(
  "/course-structure/:courseId",
  protect,
  getCourseStructure
);

// Admin/Teacher routes
router.post(
  "/lessons",
  protect,
  authorize("admin", "moderator", "teacher"),
  createLesson
);
router.put(
  "/lessons/:id",
  protect,
  authorize("admin", "moderator", "teacher"),
  updateLesson
);
router.delete(
  "/lessons/:id",
  protect,
  authorize("admin", "moderator", "teacher"),
  deleteLesson
);
router.post(
  "/lessons/section/:sectionId/reorder",
  protect,
  authorize("admin", "moderator", "teacher"),
  reorderLessons
);

// ============ VIDEO UPLOAD/STREAM ROUTES ============

// Upload video for lesson (Admin/Teacher only)
router.post(
  "/lessons/:id/upload-video",
  protect,
  authorize("admin", "moderator", "teacher"),
  handleVideoUpload,
  uploadLessonVideo
);

// Delete video for lesson (Admin/Teacher only)
router.delete(
  "/lessons/:id/video",
  protect,
  authorize("admin", "moderator", "teacher"),
  deleteLessonVideo
);

// Stream video (Protected - requires enrollment or admin/teacher)
router.get(
  "/lessons/:lessonId/video/stream",
  protect,
  protectVideo,
  rateLimitVideo,
  streamLessonVideo
);

export default router;
