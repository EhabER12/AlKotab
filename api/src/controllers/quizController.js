import quizService from "../services/quizService.js";
import Quiz from "../models/quizModel.js";

// Get all quizzes (Admin)
export const getAllQuizzes = async (req, res, next) => {
  try {
    const { courseId, sectionId, isPublished } = req.query;
    
    const query = {};
    if (courseId) query.courseId = courseId;
    if (sectionId) query.sectionId = sectionId;
    if (isPublished !== undefined) query.isPublished = isPublished === "true";

    const quizzes = await Quiz.find(query)
      .populate("courseId", "title slug")
      .populate("sectionId", "title")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

// Create Quiz (Admin/Teacher)
export const createQuiz = async (req, res, next) => {
  try {
    const quiz = await quizService.createQuiz(req.body, req.user._id);

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// Get Quiz by Slug (Public)
export const getQuizBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const includeAnswers =
      req.user &&
      ["admin", "moderator", "teacher"].includes(req.user.role);

    const quiz = await quizService.getQuizBySlug(slug, includeAnswers);

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// Get Quiz by ID
export const getQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const includeAnswers =
      req.user &&
      ["admin", "moderator", "teacher"].includes(req.user.role);

    const quiz = await quizService.getQuizById(id, includeAnswers);

    // If quiz is not public and no user is logged in
    if (!quiz.isPublic && !req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// Get all quizzes for a course
export const getQuizzesByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const quizzes = await quizService.getQuizzesByCourse(courseId);

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

// Get all quizzes for a section
export const getQuizzesBySection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const quizzes = await quizService.getQuizzesBySection(sectionId);

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

// Get all available quizzes for current user
export const getMyQuizzes = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const quizzes = await quizService.getMyQuizzes(userId);

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    next(error);
  }
};

// Update Quiz
export const updateQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await quizService.updateQuiz(id, req.body, req.user._id);

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Quiz
export const deleteQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await quizService.deleteQuiz(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// Submit Quiz Attempt (Student)
export const submitQuizAttempt = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Answers array is required",
      });
    }

    const quiz = await Quiz.findById(quizId).select("linkedTo requiresRegistration");
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    if (!req.user && (quiz.linkedTo !== "general" || quiz.requiresRegistration)) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to take this quiz",
      });
    }

    const attempt = await quizService.submitQuizAttempt(
      req.user?._id,
      quizId,
      answers
    );

    res.status(201).json({
      success: true,
      message: attempt.passed
        ? "Quiz passed successfully!"
        : "Quiz completed. Try again to improve your score.",
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's attempts for a quiz
export const getUserAttempts = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const attempts = await quizService.getUserAttempts(userId, quizId);

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's best attempt
export const getUserBestAttempt = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const bestAttempt = await quizService.getUserBestAttempt(userId, quizId);

    res.status(200).json({
      success: true,
      data: bestAttempt,
    });
  } catch (error) {
    next(error);
  }
};

// Check if user can get certificate
export const checkCertificateEligibility = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const result = await quizService.canUserGetCertificate(userId, courseId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get quiz statistics (Admin/Teacher)
export const getQuizStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await quizService.getQuizStatistics(id);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// Get all attempts for a quiz (Admin/Teacher)
export const getAllQuizAttempts = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const QuizAttempt = (await import("../models/quizAttemptModel.js")).default;

    const skip = (page - 1) * limit;
    const attempts = await QuizAttempt.find({ quizId })
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await QuizAttempt.countDocuments({ quizId });

    res.status(200).json({
      success: true,
      data: attempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
