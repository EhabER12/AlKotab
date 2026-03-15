import sectionService from "../services/sectionService.js";
import lessonService from "../services/lessonService.js";
import fs from "fs";
import path from "path";
import { deleteVideoFile } from "../middleware/videoUpload.js";

// ============ SECTION CONTROLLERS ============

export const createSection = async (req, res, next) => {
  try {
    const section = await sectionService.createSection(req.body);

    res.status(201).json({
      success: true,
      message: "Section created successfully",
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

export const getSectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const includeUnpublished =
      req.user &&
      ["admin", "moderator", "teacher"].includes(req.user.role);

    const section = await sectionService.getSectionById(id, includeUnpublished);

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

export const getSectionsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const includeUnpublished =
      req.user &&
      ["admin", "moderator", "teacher"].includes(req.user.role);

    const sections = await sectionService.getSectionsByCourse(
      courseId,
      includeUnpublished
    );

    res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const section = await sectionService.updateSection(id, req.body);

    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: section,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await sectionService.deleteSection(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const reorderSections = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { sectionsOrder } = req.body;

    const result = await sectionService.reorderSections(
      courseId,
      sectionsOrder
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ============ LESSON CONTROLLERS ============

export const createLesson = async (req, res, next) => {
  try {
    const lesson = await lessonService.createLesson(req.body);

    res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

export const getLessonById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const includeUnpublished =
      req.user &&
      ["admin", "moderator", "teacher"].includes(req.user.role);

    const lesson = await lessonService.getLessonById(id, includeUnpublished);

    res.status(200).json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

export const getLessonsBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const includeUnpublished =
      req.user &&
      ["admin", "moderator", "teacher"].includes(req.user.role);

    const lessons = await lessonService.getLessonsBySection(
      sectionId,
      includeUnpublished
    );

    res.status(200).json({
      success: true,
      data: lessons,
    });
  } catch (error) {
    next(error);
  }
};

export const getLessonsByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const includeUnpublished =
      req.user &&
      ["admin", "moderator", "teacher"].includes(req.user.role);

    const lessons = await lessonService.getLessonsByCourse(
      courseId,
      includeUnpublished
    );

    res.status(200).json({
      success: true,
      data: lessons,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lesson = await lessonService.updateLesson(id, req.body);

    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await lessonService.deleteLesson(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const reorderLessons = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { lessonsOrder } = req.body;

    const result = await lessonService.reorderLessons(sectionId, lessonsOrder);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseStructure = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const includeUnpublished =
      req.user && (req.user.role === "admin" || req.user.role === "teacher");

    const structure = await lessonService.getCourseStructure(
      courseId,
      includeUnpublished
    );

    res.status(200).json({
      success: true,
      data: structure,
    });
  } catch (error) {
    next(error);
  }
};

// ============ VIDEO UPLOAD/STREAM CONTROLLERS ============

/**
 * Upload video file for a lesson
 * POST /api/lessons/:id/upload-video
 */
export const uploadLessonVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video file uploaded",
      });
    }

    const lesson = await lessonService.uploadVideo(id, req.file);

    res.status(200).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        lesson,
        videoInfo: {
          filename: req.file.filename,
          size: req.file.size,
          path: lesson.videoUrl,
        },
      },
    });
  } catch (error) {
    // Clean up uploaded file if database update fails
    if (req.file && req.file.path) {
      deleteVideoFile(req.file.path);
    }
    next(error);
  }
};

/**
 * Delete uploaded video for a lesson
 * DELETE /api/lessons/:id/video
 */
export const deleteLessonVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get video path before deletion
    const videoPath = await lessonService.getVideoPath(id);

    // Delete from database
    const lesson = await lessonService.deleteVideo(id);

    // Delete file from disk
    deleteVideoFile(videoPath);

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      data: lesson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream video file with range support (for seeking)
 * GET /api/lessons/:lessonId/video/stream
 * Protected by videoAuth middleware
 */
export const streamLessonVideo = async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    // Get video file path
    const videoPath = await lessonService.getVideoPath(lessonId);

    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        message: "Video file not found",
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range request (for video seeking)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });

      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // No range request - stream entire video
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      };

      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};
