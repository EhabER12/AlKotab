import TeacherProfit from "../models/teacherProfitModel.js";
import Payment from "../models/paymentModel.js";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";
import Settings from "../models/settingsModel.js";
import { ApiError } from "../utils/apiError.js";

export class TeacherProfitService {
  // Calculate profit percentage for a specific transaction
  async calculateProfitPercentage(teacherId, revenueType, courseId = null) {
    const settings = await Settings.findOne();
    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.role !== "teacher") {
      throw new ApiError(404, "Teacher not found");
    }

    // Priority: Course-specific > Teacher-specific > Global default
    let percentage = 0;

    if (revenueType === "course_sale" && courseId) {
      const course = await Course.findById(courseId);
      if (course?.teacherProfitPercentage !== undefined) {
        percentage = course.teacherProfitPercentage;
      } else if (teacher.teacherInfo?.customProfitPercentages?.courseSales !== undefined) {
        percentage = teacher.teacherInfo.customProfitPercentages.courseSales;
      } else {
        percentage = settings?.teacherProfitSettings?.courseSalesPercentage || 40;
      }
    } else if (revenueType === "subscription") {
      if (teacher.teacherInfo?.customProfitPercentages?.subscriptions !== undefined) {
        percentage = teacher.teacherInfo.customProfitPercentages.subscriptions;
      } else {
        percentage = settings?.teacherProfitSettings?.subscriptionPercentage || 35;
      }
    }

    return percentage;
  }

  // Record profit from a successful payment
  async recordProfit(paymentId) {
    const payment = await Payment.findById(paymentId)
      .populate("courseId")
      .populate("productId")
      .populate("studentMemberId");

    if (!payment || payment.status !== "success") {
      return null;
    }

    // Determine revenue type and teacher
    let teacherId, revenueType, sourceId, sourceModel, courseId;

    // Check if this is a course sale (paid course enrollment)
    if (payment.courseId) {
      const course = payment.courseId._id ? payment.courseId : await Course.findById(payment.courseId);
      if (course && course.accessType === "paid" && course.instructorId) {
        teacherId = course.instructorId;
        revenueType = "course_sale";
        sourceId = course._id;
        sourceModel = "Course";
        courseId = course._id;
      }
    }
    // Fallback: Check if productId actually refers to a Course (for backward compatibility)
    else if (payment.productId && !teacherId) {
      try {
        const course = await Course.findById(payment.productId._id || payment.productId);
        if (course && course.accessType === "paid" && course.instructorId) {
          teacherId = course.instructorId;
          revenueType = "course_sale";
          sourceId = course._id;
          sourceModel = "Course";
          courseId = course._id;
        }
      } catch (err) {
        // Not a course, continue to check other options
      }
    }

    // Check if this is a subscription payment linked to a teacher
    if (payment.studentMemberId && !teacherId) {
      // First check if student member is directly assigned to a teacher
      const StudentMember = (await import("../models/studentMemberModel.js")).default;
      const studentMember = await StudentMember.findById(
        payment.studentMemberId._id || payment.studentMemberId
      );
      
      if (studentMember && studentMember.assignedTeacherId) {
        teacherId = studentMember.assignedTeacherId;
        revenueType = "subscription";
        sourceId = studentMember._id;
        sourceModel = "StudentMember";
      } else {
        // Fallback: Check TeacherGroup if not directly assigned
        const TeacherGroup = (await import("../models/teacherGroupModel.js")).default;
        const group = await TeacherGroup.findOne({
          "students.studentId": payment.studentMemberId._id || payment.studentMemberId,
        });
        if (group) {
          teacherId = group.teacherId;
          revenueType = "subscription";
          sourceId = group._id;
          sourceModel = "TeacherGroup";
        }
      }
    }

    if (!teacherId || !revenueType) {
      return null; // No teacher profit applicable
    }

    // Check if profit already recorded
    const existing = await TeacherProfit.findOne({ paymentId: payment._id });
    if (existing) {
      return existing;
    }

    // Calculate profit
    const profitPercentage = await this.calculateProfitPercentage(
      teacherId,
      revenueType,
      courseId
    );
    const profitAmount = (payment.amount * profitPercentage) / 100;

    // Create profit record
    const profit = await TeacherProfit.create({
      teacherId,
      paymentId: payment._id,
      revenueType,
      sourceId,
      sourceModel,
      totalAmount: payment.amount,
      profitPercentage,
      profitAmount,
      currency: payment.currency,
      transactionDate: payment.createdAt,
      status: "pending",
    });

    return profit;
  }

  // Get teacher profit statistics
  async getTeacherProfitStats(teacherId, filters = {}) {
    const { startDate, endDate, revenueType, status } = filters;

    const matchQuery = { teacherId };

    if (startDate || endDate) {
      matchQuery.transactionDate = {};
      if (startDate) matchQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) matchQuery.transactionDate.$lte = new Date(endDate);
    }

    if (revenueType) {
      matchQuery.revenueType = revenueType;
    }

    if (status) {
      matchQuery.status = status;
    }

    const [stats, recentTransactions] = await Promise.all([
      TeacherProfit.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$revenueType",
            totalProfit: { $sum: "$profitAmount" },
            count: { $sum: 1 },
            avgPercentage: { $avg: "$profitPercentage" },
          },
        },
      ]),
      TeacherProfit.find(matchQuery)
        .populate("sourceId")
        .populate("paymentId")
        .sort({ transactionDate: -1 })
        .limit(10),
    ]);

    // Calculate totals
    const courseSalesStats = stats.find((s) => s._id === "course_sale") || {
      totalProfit: 0,
      count: 0,
      avgPercentage: 0,
    };
    const subscriptionStats = stats.find((s) => s._id === "subscription") || {
      totalProfit: 0,
      count: 0,
      avgPercentage: 0,
    };

    return {
      courseSales: {
        totalProfit: courseSalesStats.totalProfit,
        transactionCount: courseSalesStats.count,
        avgPercentage: courseSalesStats.avgPercentage,
      },
      subscriptions: {
        totalProfit: subscriptionStats.totalProfit,
        transactionCount: subscriptionStats.count,
        avgPercentage: subscriptionStats.avgPercentage,
      },
      totalProfit: courseSalesStats.totalProfit + subscriptionStats.totalProfit,
      totalTransactions: courseSalesStats.count + subscriptionStats.count,
      recentTransactions,
      currency: "EGP", // Primary currency
    };
  }

  // Get all teachers with profit statistics (admin view)
  async getAllTeachersProfitStats(filters = {}) {
    const teachers = await User.find({ role: "teacher", "teacherInfo.isApproved": true })
      .select("fullName email teacherInfo")
      .lean();

    const teacherStats = await Promise.all(
      teachers.map(async (teacher) => {
        const stats = await this.getTeacherProfitStats(teacher._id, filters);
        return {
          teacherId: teacher._id,
          teacherName: teacher.fullName,
          email: teacher.email,
          ...stats,
        };
      })
    );

    return teacherStats;
  }

  // Get profit transactions (admin view)
  async getProfitTransactions(filters = {}, options = {}) {
    const { teacherId, startDate, endDate, revenueType, status } = filters;
    const { page = 1, limit = 10 } = options;

    const matchQuery = {};

    if (teacherId) {
      matchQuery.teacherId = teacherId;
    }

    if (startDate || endDate) {
      matchQuery.transactionDate = {};
      if (startDate) matchQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) matchQuery.transactionDate.$lte = new Date(endDate);
    }

    if (revenueType) {
      matchQuery.revenueType = revenueType;
    }

    if (status) {
      matchQuery.status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [results, total] = await Promise.all([
      TeacherProfit.find(matchQuery)
        .populate("teacherId", "fullName email profilePic")
        .populate("sourceId")
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      TeacherProfit.countDocuments(matchQuery),
    ]);

    return {
      results,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    };
  }

  // Update profit status (for payout tracking)
  async updateProfitStatus(profitId, status, options = {}) {
    const { notes = null, payoutProofUrl = null } = options;
    const profit = await TeacherProfit.findById(profitId);
    if (!profit) {
      throw new ApiError(404, "Profit record not found");
    }

    profit.status = status;
    if (status === "paid") {
      profit.paidAt = new Date();
    }
    if (notes) {
      profit.notes = notes;
    }
    if (payoutProofUrl) {
      profit.payoutProofUrl = payoutProofUrl;
    }

    await profit.save();
    return profit;
  }
}
