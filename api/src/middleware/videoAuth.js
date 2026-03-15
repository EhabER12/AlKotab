import { ApiError } from "../utils/apiError.js";
import Course from "../models/courseModel.js";
import Lesson from "../models/lessonModel.js";
import StudentMember from "../models/studentMemberModel.js";

/**
 * Middleware to protect video streaming endpoints
 * Ensures only authorized users can access lesson videos
 */
export const protectVideo = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user?.id;

        // Find the lesson
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            throw new ApiError(404, "Lesson not found");
        }

        // Check if lesson is a free preview
        if (lesson.isPreview) {
            return next();
        }

        // Check if user is authenticated
        if (!userId) {
            throw new ApiError(401, "Authentication required to access this video");
        }

        // Check if user is admin or teacher
        if (
            req.user.role === "admin" ||
            req.user.role === "moderator" ||
            req.user.role === "teacher"
        ) {
            return next();
        }

        // For students, check course enrollment
        const courseId = lesson.courseId;

        // Check if user is enrolled in the course
        const enrollment = await StudentMember.findOne({
            userId: userId,
            courseId: courseId,
            status: { $in: ["active", "completed"] },
        });

        if (!enrollment) {
            throw new ApiError(
                403,
                "You must be enrolled in this course to access this video"
            );
        }

        // Check if enrollment is still valid (not expired)
        if (enrollment.expiresAt && new Date() > new Date(enrollment.expiresAt)) {
            throw new ApiError(403, "Your course enrollment has expired");
        }

        // Store lesson info in request for later use
        req.lesson = lesson;
        req.enrollment = enrollment;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Rate limiting middleware for video streaming
 * Prevents abuse by limiting requests per user
 */
const videoAccessLog = new Map(); // userId -> { count, resetTime }
const RATE_LIMIT = 100; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

export const rateLimitVideo = (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();

    if (!videoAccessLog.has(userId)) {
        videoAccessLog.set(userId, {
            count: 1,
            resetTime: now + RATE_WINDOW,
        });
        return next();
    }

    const userLog = videoAccessLog.get(userId);

    // Reset if window has passed
    if (now > userLog.resetTime) {
        videoAccessLog.set(userId, {
            count: 1,
            resetTime: now + RATE_WINDOW,
        });
        return next();
    }

    // Check if limit exceeded
    if (userLog.count >= RATE_LIMIT) {
        throw new ApiError(
            429,
            "Too many video requests. Please try again later."
        );
    }

    // Increment count
    userLog.count++;
    next();
};

// Clean up old entries periodically (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [userId, log] of videoAccessLog.entries()) {
        if (now > log.resetTime) {
            videoAccessLog.delete(userId);
        }
    }
}, 10 * 60 * 1000);
