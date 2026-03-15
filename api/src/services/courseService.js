import Course from "../models/courseModel.js";
import Section from "../models/sectionModel.js";
import Lesson from "../models/lessonModel.js";
import Progress from "../models/progressModel.js";
import User from "../models/userModel.js";
import Quiz from "../models/quizModel.js";
import QuizAttempt from "../models/quizAttemptModel.js";
import Certificate from "../models/certificateModel.js";
import { EmailService } from "./emailService.js";
import { ApiError } from "../utils/apiError.js";
import logger from "../utils/logger.js";

export class CourseService {
  constructor() {
    this.emailService = new EmailService();
  }

  // Get all courses with filters
  async getAllCourses(filters = {}, options = {}) {
    const {
      categoryId,
      instructorId,
      accessType,
      isPublished,
      isFeatured,
      search,
    } = filters;

    const query = {};

    if (categoryId) query.categoryId = categoryId;
    if (instructorId) query.instructorId = instructorId;
    if (accessType) query.accessType = accessType;
    if (typeof isPublished !== "undefined") query.isPublished = isPublished;
    if (typeof isFeatured !== "undefined") query.isFeatured = isFeatured;

    if (search) {
      query.$or = [
        { "title.ar": { $regex: search, $options: "i" } },
        { "title.en": { $regex: search, $options: "i" } },
        { "description.ar": { $regex: search, $options: "i" } },
        { "description.en": { $regex: search, $options: "i" } },
        { "seo.keywords": { $in: [new RegExp(search, "i")] } },
      ];
    }

    const { page = 1, limit = 10, sort = "-createdAt" } = options;
    const skip = (page - 1) * limit;

    const courses = await Course.find(query)
      .populate("categoryId", "name")
      .populate("instructorId", "fullName email teacherInfo")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    return {
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get course by ID with full details
  // Get course by ID
  async getCourseById(courseId, userId = null) {
    const course = await Course.findById(courseId)
      .populate("categoryId", "name")
      .populate("instructorId", "fullName email teacherInfo");

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    // Check if user is admin, teacher (owner), or enrolled to show unpublished content
    let showUnpublished = false;
    let isEnrolled = null;
    if (userId) {
      const user = await User.findById(userId);
      isEnrolled = await Progress.findOne({ userId, courseId: course._id });
      
      const isOwner = course.instructorId._id.toString() === userId.toString();
      const isAdmin = user?.role === 'admin';
      
      showUnpublished = isAdmin || isOwner || !!isEnrolled;
      
      logger.info('Course access check', { 
        userId, 
        courseId: course._id, 
        showUnpublished, 
        isEnrolled: !!isEnrolled, 
        userRole: user?.role,
        isOwner
      });
    }

    // Get sections and lessons
    const sectionQuery = { courseId: course._id };
    // If user is not admin/teacher/enrolled AND the course is NOT published, only show published sections
    // If the course IS published, show all sections by default (since there's no UI to hide them yet)
    if (!showUnpublished && !course.isPublished) {
      sectionQuery.isPublished = true;
    }

    const sections = await Section.find(sectionQuery)
      .sort({ order: 1 });

    logger.info('Sections found', { courseId: course._id, sectionsCount: sections.length, showUnpublished });

    // For paid/package courses, strip sensitive content (videoUrl, resources) for non-enrolled users
    const shouldStripContent = !isEnrolled && !showUnpublished && 
      (course.accessType === 'paid' || course.accessType === 'byPackage');

    const sectionsWithItems = await Promise.all(
      sections.map(async (section) => {
        const lessonQuery = { sectionId: section._id };
        const quizQuery = { sectionId: section._id, linkedTo: "section" };
        
        if (!showUnpublished && !course.isPublished) {
          lessonQuery.isPublished = true;
          quizQuery.isPublished = true;
        }

        const lessons = await Lesson.find(lessonQuery).sort({ order: 1 });
        const quizzes = await Quiz.find(quizQuery).sort({ order: 1 });
        
        logger.info('Items found for section', { 
          sectionId: section._id, 
          lessonsCount: lessons.length,
          quizzesCount: quizzes.length 
        });

        // Strip video URLs and resources for non-enrolled users on paid courses
        const sanitizedLessons = shouldStripContent
          ? lessons.map(lesson => {
              const obj = lesson.toObject();
              return {
                ...obj,
                videoUrl: undefined,
                videoSource: obj.videoSource ? 'hidden' : undefined,
                resources: [],
              };
            })
          : lessons;

        return {
          ...section.toObject(),
          lessons: sanitizedLessons,
          quizzes,
        };
      })
    );

    // If user is logged in, get their progress
    let progress = null;
    if (userId) {
      progress = await Progress.findOne({ userId, courseId });
    }

    return {
      ...course.toObject(),
      sections: sectionsWithItems,
      userProgress: progress,
    };
  }

  // Get course by slug
  async getCourseBySlug(slug, userId = null) {
    const course = await Course.findOne({ slug })
      .populate("categoryId", "name")
      .populate("instructorId", "fullName email teacherInfo");

    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    // Reuse the same logic as getCourseById
    return this.getCourseById(course._id, userId);
  }

  // Create new course
  async createCourse(courseData, userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Check if user is teacher or admin
    if (!["teacher", "admin", "moderator"].includes(user.role)) {
      throw new ApiError(
        403,
        "Only teachers, moderators, and admins can create courses"
      );
    }

    courseData.instructorId = userId;
    courseData.isDraft = true;
    courseData.isPublished = false;

    const course = await Course.create(courseData);

    // Update teacher's course count
    if (user.role === "teacher") {
      await User.findByIdAndUpdate(userId, {
        $inc: { "teacherInfo.coursesCount": 1 },
      });
    }

    logger.info("Course created", { courseId: course._id, userId });

    return course;
  }

  // Update course
  async updateCourse(courseId, updateData, userId) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    const user = await User.findById(userId);

    // Check permissions
    const isOwner = course.instructorId.toString() === userId;
    const isAdmin = user.role === "admin" || user.role === "moderator";

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "Not authorized to update this course");
    }

    // Teachers cannot change published status
    if (user.role === "teacher" && "isPublished" in updateData) {
      delete updateData.isPublished;
    }

    Object.assign(course, updateData);
    await course.save();

    logger.info("Course updated", { courseId, userId });

    return course;
  }

  // Delete course
  async deleteCourse(courseId, userId) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    const user = await User.findById(userId);
    const isOwner = course.instructorId.toString() === userId;
    const isAdmin = user.role === "admin" || user.role === "moderator";

    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "Not authorized to delete this course");
    }

    // Delete related sections and lessons
    const sections = await Section.find({ courseId });
    for (const section of sections) {
      await Lesson.deleteMany({ sectionId: section._id });
      await Quiz.deleteMany({ sectionId: section._id, linkedTo: "section" });
    }
    
    // Delete course-level quizzes
    await Quiz.deleteMany({ courseId, linkedTo: "course" });

    // Delete quiz attempts
    await QuizAttempt.deleteMany({ courseId });

    // Delete progress records
    await Progress.deleteMany({ courseId });

    // Delete certificates? 
    // Usually we keep certificates as history, but if a course is deleted, 
    // maybe we should at least nullify the course link or keep them.
    // For now, let's keep certificates but delete the others.

    await Section.deleteMany({ courseId });
    await course.deleteOne();

    // Update teacher's course count
    if (user.role === "teacher") {
      await User.findByIdAndUpdate(userId, {
        $inc: { "teacherInfo.coursesCount": -1 },
      });
    }

    logger.info("Course deleted", { courseId, userId });

    return { message: "Course deleted successfully" };
  }

  // Request publish (for teachers)
  async requestPublish(courseId, userId) {
    const course = await Course.findById(courseId).populate("instructorId", "fullName email");
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    if (course.instructorId._id.toString() !== userId) {
      throw new ApiError(403, "Not authorized");
    }

    course.publishRequestedAt = new Date();
    course.approvalStatus = {
      status: "pending",
      updatedAt: new Date(),
    };
    await course.save();

    // Send notification to admin
    try {
      const adminUrl = process.env.ADMIN_URL || "http://localhost:3001";
      const courseLink = `${adminUrl}/dashboard/courses/${courseId}/edit`;
      
      const subject = "طلب نشر دورة جديدة - New Course Publication Request";
      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #04524B; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Genoun LMS</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #04524B;">طلب نشر دورة جديدة</h2>
    <p>لقد طلب المعلم <strong>${course.instructorId.fullName?.ar || course.instructorId.fullName?.en}</strong> نشر دورة جديدة:</p>
    <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-weight: bold; font-size: 18px;">
      ${course.title?.ar || course.title?.en}
    </p>
    
    <div style="margin: 20px 0; border-top: 1px solid #eee; padding-top: 20px;" dir="ltr">
      <h2 style="color: #04524B;">New Course Publication Request</h2>
      <p>Teacher <strong>${course.instructorId.fullName?.en || course.instructorId.fullName?.ar}</strong> has requested to publish a new course:</p>
      <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-weight: bold; font-size: 18px;">
        ${course.title?.en || course.title?.ar}
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${courseLink}" style="background-color: #FB9903; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        مراجعة الدورة - Review Course
      </a>
    </div>
  </div>
</body>
</html>
      `;

      // Get admin email from settings or env
      const settingsRepo = new (await import("../repositories/settingsRepository.js")).SettingsRepository();
      const settings = await settingsRepo.getSettings();
      const recipients = settings.notifications.email.recipients || [process.env.EMAIL_USER];
      
      await this.emailService.sendEmail(recipients.join(","), subject, html);
    } catch (err) {
      logger.error("Failed to send course publish request email to admin", { error: err.message });
    }

    logger.info("Publish requested", { courseId, userId });

    return course;
  }

  // Approve publish (admin only)
  async approvePublish(courseId, userId) {
    const course = await Course.findById(courseId).populate("instructorId", "fullName email");
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    course.isPublished = true;
    course.isDraft = false;
    course.publishedAt = new Date();
    course.publishApprovedBy = userId;
    course.approvalStatus = {
      status: "approved",
      updatedAt: new Date(),
      updatedBy: userId,
    };
    await course.save();

    // Send notification to teacher
    try {
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const courseLink = `${clientUrl}/courses/${course.slug}`;
      
      const subject = "تمت الموافقة على نشر دورتك - Your Course is Now Published!";
      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #04524B; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Genoun LMS</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #04524B;">مبروك! تم نشر دورتك 🎉</h2>
    <p>يسعدنا إبلاغك أنه تمت الموافقة على نشر دورتك:</p>
    <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-weight: bold; font-size: 18px;">
      ${course.title?.ar || course.title?.en}
    </p>
    
    <div style="margin: 20px 0; border-top: 1px solid #eee; padding-top: 20px;" dir="ltr">
      <h2 style="color: #04524B;">Congratulations! Your course is published 🎉</h2>
      <p>We are happy to inform you that your course has been approved and published:</p>
      <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-weight: bold; font-size: 18px;">
        ${course.title?.en || course.title?.ar}
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${courseLink}" style="background-color: #04524B; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        عرض الدورة - View Course
      </a>
    </div>
  </div>
</body>
</html>
      `;
      
      await this.emailService.sendEmail(course.instructorId.email, subject, html);
    } catch (err) {
      logger.error("Failed to send course approval email to teacher", { error: err.message });
    }

    logger.info("Course published", { courseId, approvedBy: userId });

    return course;
  }

  // Reject publish (admin only)
  async rejectPublish(courseId, reason, userId) {
    const course = await Course.findById(courseId).populate("instructorId", "fullName email");
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    course.isPublished = false;
    course.isDraft = true;
    course.approvalStatus = {
      status: "rejected",
      reason: reason || "",
      updatedAt: new Date(),
      updatedBy: userId,
    };
    await course.save();

    // Send notification to teacher
    try {
      const adminUrl = process.env.ADMIN_URL || "http://localhost:3001";
      const courseLink = `${adminUrl}/dashboard/courses/${courseId}/edit`;
      
      const subject = "تحديث بخصوص طلب نشر دورتك - Update regarding your course publish request";
      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #04524B; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Genoun LMS</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #d32f2f;">تحديث بخصوص طلب نشر الدورة</h2>
    <p>نأسف لإبلاغك أنه تم رفض طلب نشر دورتك حالياً:</p>
    <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-weight: bold;">
      ${course.title?.ar || course.title?.en}
    </p>
    
    <div style="background-color: #fff4f4; border-right: 4px solid #d32f2f; padding: 15px; margin: 15px 0;">
      <strong>السبب:</strong> ${reason || "لم يتم ذكر سبب"}
    </div>

    <div style="margin: 20px 0; border-top: 1px solid #eee; padding-top: 20px;" dir="ltr">
      <h2 style="color: #d32f2f;">Update regarding your course publish request</h2>
      <p>We regret to inform you that your course publish request has been rejected for now:</p>
      <p style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-weight: bold;">
        ${course.title?.en || course.title?.ar}
      </p>
      <div style="background-color: #fff4f4; border-left: 4px solid #d32f2f; padding: 15px; margin: 15px 0;">
        <strong>Reason:</strong> ${reason || "No reason specified"}
      </div>
    </div>

    <p>يرجى إجراء التعديلات المطلوبة ثم إعادة طلب النشر.</p>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${courseLink}" style="background-color: #FB9903; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        تعديل الدورة - Edit Course
      </a>
    </div>
  </div>
</body>
</html>
      `;
      
      await this.emailService.sendEmail(course.instructorId.email, subject, html);
    } catch (err) {
      logger.error("Failed to send course rejection email to teacher", { error: err.message });
    }

    logger.info("Course publish rejected", { courseId, rejectedBy: userId });

    return course;
  }

  // Enroll student in course
  // skipPaymentCheck: set to true when calling after successful payment (payment already verified)
  async enrollStudent(courseId, userId, skipPaymentCheck = false) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Admins and teachers can always access (but teachers should only access their own or if explicitly enrolled)
    // For simplicity, let's allow admins full access
    const isAdmin = user.role === "admin";

    if (!course.isPublished && !isAdmin) {
      throw new ApiError(400, "Course is not published yet");
    }

    // Check if already enrolled
    const existingProgress = await Progress.findOne({ userId, courseId });
    if (existingProgress) {
      return existingProgress;
    }

    // Access check - bypass for admins or when payment is already verified
    if (!isAdmin && !skipPaymentCheck && (course.accessType === "paid" || course.accessType === "byPackage")) {
      // If access type is byPackage, check for active StudentMember subscription
      if (course.accessType === "byPackage") {
        const { StudentMemberService } = await import("./studentMemberService.js");
        const studentMemberService = new StudentMemberService();
        const subscriptions = await studentMemberService.getSubscriptionsByUserId(userId);
        
        const hasActiveSubscription = subscriptions.some(sub => sub.status === 'active');
        
        if (!hasActiveSubscription) {
          throw new ApiError(
            403,
            "This course requires an active subscription package. Please subscribe to a package first."
          );
        }
        // If they have an active subscription, they can enroll!
      } else {
        // For 'paid' courses, they must have paid specifically for this course
        // Check if there is a successful payment for this course by this user
        const { PaymentRepository } = await import("../repositories/paymentRepository.js");
        const paymentRepo = new PaymentRepository();
        
        // Check both courseId and productId for backward compatibility
        const hasPaid = await paymentRepo.model.findOne({
          userId,
          $or: [
            { courseId: courseId },
            { productId: courseId }
          ],
          status: { $in: ['success', 'delivered'] }
        });

        if (!hasPaid) {
          throw new ApiError(
            403,
            "This course requires payment. Please complete the payment process first."
          );
        }
      }
    }

    // Get total published lessons and quizzes count
    const totalLessons = await Lesson.countDocuments({
      courseId,
      isPublished: true,
    });

    const totalQuizzes = await Quiz.countDocuments({
      courseId,
      isPublished: true,
    });

    const totalItemsCount = totalLessons + totalQuizzes;

    // Create progress record
    const progress = await Progress.create({
      userId,
      courseId,
      totalLessonsCount: totalLessons,
      totalQuizzesCount: totalQuizzes,
      totalItemsCount,
      enrolledAt: new Date(),
    });

    // Update course enrollment stats
    await Course.findByIdAndUpdate(courseId, {
      $inc: { "stats.enrolledCount": 1 },
    });

    logger.info("Student enrolled", { courseId, userId });

    return progress;
  }

  // Get my courses (as teacher)
  async getMyCourses(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const query = { instructorId: userId };
    if (status === "published") query.isPublished = true;
    if (status === "draft") query.isDraft = true;

    const courses = await Course.find(query)
      .populate("categoryId", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    return {
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get enrolled courses (as student)
  async getEnrolledCourses(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const progressRecords = await Progress.find({ userId })
      .populate({
        path: "courseId",
        populate: {
          path: "instructorId categoryId",
          select: "fullName email name",
        },
      })
      .sort("-lastAccessedAt");

    // Filter out progress records where course was deleted
    const validProgressRecords = progressRecords.filter(p => p.courseId != null);
    
    const total = validProgressRecords.length;
    const paginatedRecords = validProgressRecords.slice(skip, skip + limit);

    return {
      courses: paginatedRecords.map((p) => ({
        ...p.courseId.toObject(),
        progress: {
          percentage: p.percentage,
          completedLessons: p.completedLessonsCount,
          totalLessons: p.totalLessonsCount,
          completedQuizzes: p.completedQuizzesCount,
          totalQuizzes: p.totalQuizzesCount,
          totalItems: p.totalItemsCount,
          isCompleted: p.isCompleted,
          lastAccessedAt: p.lastAccessedAt,
        },
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
