import Payment from "../models/paymentModel.js";
import CartSession from "../models/cartSessionModel.js";
import Article from "../models/articleModel.js";
import Product from "../models/productModel.js";
import Service from "../models/serviceModel.js";
import User from "../models/userModel.js";
import Review from "../models/reviewModel.js";
import GeoSuggestion from "../models/geoSuggestionModel.js";
import AiArticleJob from "../models/aiArticleJobModel.js";
import Course from "../models/courseModel.js";
import Progress from "../models/progressModel.js";
import StudentMember from "../models/studentMemberModel.js";
import Certificate from "../models/certificateModel.js";
import TeacherGroup from "../models/teacherGroupModel.js";
import AnalyticsService from "../services/analyticsService.js";

/**
 * @desc    Get comprehensive dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      // Revenue stats
      revenueToday,
      revenueWeek,
      revenueMonth,
      revenueTotal,
      // Revenue Chart Data
      revenueChartData,
      // Order counts by status
      ordersByStatus,
      // Cart stats
      cartStats,
      // Content counts
      articleStats,
      productCount,
      serviceCount,
      // User stats
      userStats,
      newUsersWeek,
      // Review stats
      pendingReviews,
      avgRating,
      // SEO stats
      seoSuggestionsPending,
      // AI Article stats
      aiArticlesScheduled,
      // LMS Stats
      coursesCount,
      publishedCoursesCount,
      totalEnrollments,
      completedCoursesCount,
      certificatesIssued,
      activeStudentMembers,
      // Teacher stats
      teacherGroupsCount,
      teachersCount,
      totalStudentsInGroups,
      teacherGroupsData,
      // GA4 Analytics
      analyticsOverview,
      realtimeUsers,
      topCountries,
      topPages,
    ] = await Promise.all([
      // Revenue calculations
      // Revenue calculations
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Daily revenue for chart (last 30 days)
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Orders by status
      Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      // Cart stats (use built-in method if available)
      CartSession.getStats
        ? CartSession.getStats()
        : {
          total: { abandoned: 0, converted: 0 },
          potentialRevenue: 0,
          conversionRate: 0,
        },
      // Article stats
      Article.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalViews: { $sum: "$views" },
          },
        },
      ]),
      Product.countDocuments({ isActive: true }),
      Service.countDocuments({ isActive: true }),
      // User stats
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      // Reviews
      Review.countDocuments({ status: "pending" }),
      Review.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]),
      // SEO
      GeoSuggestion.countDocuments({ status: "pending" }),
      // AI Articles
      AiArticleJob.countDocuments({
        status: "pending",
        scheduledFor: { $gte: new Date() },
      }),
      // LMS Queries
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Progress.countDocuments(),
      Progress.countDocuments({ isCompleted: true }),
      Certificate.countDocuments({ status: "issued" }),
      StudentMember.countDocuments({ status: { $in: ["active", "due_soon", "overdue"] } }),
      // Teacher Queries
      TeacherGroup.countDocuments(),
      User.countDocuments({ role: "teacher", "teacherInfo.isApproved": true }),
      TeacherGroup.aggregate([
        { $unwind: "$students" },
        { $match: { "students.status": "active" } },
        { $count: "count" }
      ]),
      TeacherGroup.find({ isActive: true }).select("students groupType pricing"),
      // GA4 Analytics (Users, Sessions, Views)
      // GA4 Analytics (Users, Sessions, Views)
      AnalyticsService.getOverviewMetrics("30daysAgo", "today"),
      AnalyticsService.getRealtimeActiveUsers(),
      AnalyticsService.getTopCountries(5, "30daysAgo", "today"),
      AnalyticsService.getTopPages(5, "30daysAgo", "today"),
    ]);

    // Format order statuses
    const orders = ordersByStatus.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      { pending: 0, processing: 0, success: 0, delivered: 0, failed: 0 }
    );

    // Format article stats
    const articles = articleStats.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        acc.totalViews = (acc.totalViews || 0) + (item.totalViews || 0);
        return acc;
      },
      { published: 0, draft: 0, archived: 0, totalViews: 0 }
    );

    // Format user stats
    const users = userStats.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        acc.total = (acc.total || 0) + item.count;
        return acc;
      },
      { admin: 0, moderator: 0, teacher: 0, user: 0, total: 0 }
    );

    // Calculate teacher expected revenue
    let teacherExpectedRevenue = 0;
    teacherGroupsData.forEach((group) => {
      const activeCount = group.students.filter((s) => s.status === "active").length;
      if (group.groupType === "group") {
        teacherExpectedRevenue += group.pricing.groupRate || 0;
      } else {
        const studentsPerRate = group.pricing.studentsPerIndividual || 12;
        const individualRate = group.pricing.individualRate || 0;
        teacherExpectedRevenue += Math.ceil(activeCount / studentsPerRate) * individualRate;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        revenue: {
          today: revenueToday[0]?.total || 0,
          week: revenueWeek[0]?.total || 0,
          month: revenueMonth[0]?.total || 0,
          total: revenueTotal[0]?.total || 0,
          currency: "EGP",
          history: revenueChartData,
        },
        orders: {
          pending: orders.pending,
          processing: orders.processing,
          completed: orders.success,
          delivered: orders.delivered,
          failed: orders.failed,
        },
        carts: {
          abandoned: cartStats.total?.abandoned || 0,
          converted: cartStats.total?.converted || 0,
          potentialRevenue: cartStats.potentialRevenue || 0,
          conversionRate: cartStats.conversionRate || 0,
        },
        content: {
          articles: {
            published: articles.published,
            draft: articles.draft,
            total: articles.published + articles.draft + articles.archived,
            totalViews: articles.totalViews,
          },
          products: productCount,
          services: serviceCount,
        },
        users: {
          total: users.total,
          newThisWeek: newUsersWeek,
          byRole: {
            admin: users.admin,
            moderator: users.moderator,
            teacher: users.teacher,
            user: users.user,
          },
        },
        reviews: {
          pending: pendingReviews,
          avgRating: avgRating[0]?.avg?.toFixed(1) || "0.0",
        },
        seo: {
          suggestionsPending: seoSuggestionsPending,
        },
        aiArticles: {
          scheduled: aiArticlesScheduled,
        },
        lms: {
          courses: {
            total: coursesCount,
            published: publishedCoursesCount,
            draft: coursesCount - publishedCoursesCount,
          },
          enrollments: {
            total: totalEnrollments,
            completed: completedCoursesCount,
            completionRate: totalEnrollments > 0 ? ((completedCoursesCount / totalEnrollments) * 100).toFixed(1) : 0,
          },
          certificates: certificatesIssued,
          studentMembers: {
            active: activeStudentMembers,
          },
          teachers: {
            total: teachersCount,
            groups: teacherGroupsCount,
            activeStudents: totalStudentsInGroups[0]?.count || 0,
            expectedRevenue: teacherExpectedRevenue,
          },
        },
        analytics: analyticsOverview
          ? {
            ...analyticsOverview,
            realtimeUsers,
            topCountries,
            topPages,
          }
          : {
            users: 0,
            sessions: 0,
            pageViews: 0,
            avgSessionDuration: 0,
            realtimeUsers: 0,
            topCountries: [],
            topPages: [],
          },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent activity for dashboard
 * @route   GET /api/dashboard/activity
 * @access  Private/Admin
 */
export const getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const [recentPayments, recentReviews, recentUsers] = await Promise.all([
      Payment.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("amount status billingInfo createdAt currency")
        .lean(),
      Review.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("name rating status createdAt")
        .lean(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("fullName email role createdAt")
        .lean(),
    ]);

    // Combine and sort by date
    const activities = [
      ...recentPayments.map((p) => ({
        type: "payment",
        title: `New payment: ${p.amount} ${p.currency || "EGP"}`,
        subtitle: p.billingInfo?.name || "Guest",
        status: p.status,
        timestamp: p.createdAt,
      })),
      ...recentReviews.map((r) => ({
        type: "review",
        title: `New review from ${r.name}`,
        subtitle: `${r.rating} stars`,
        status: r.status,
        timestamp: r.createdAt,
      })),
      ...recentUsers.map((u) => ({
        type: "user",
        title: `New user: ${u.fullName?.en || u.fullName?.ar || 'User'}`,
        subtitle: u.email,
        status: u.role,
        timestamp: u.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed analytics data with filters
 * @route   GET /api/dashboard/analytics
 * @access  Private/Admin
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const { startDate = "30daysAgo", endDate = "today" } = req.query;

    // Fetch all analytics data in parallel
    const [
      overview,
      realtimeUsers,
      topCountries,
      topPages,
      trafficSources,
      devices,
      browsers,
    ] = await Promise.all([
      AnalyticsService.getOverviewMetrics(startDate, endDate),
      AnalyticsService.getRealtimeActiveUsers(),
      AnalyticsService.getTopCountries(10, startDate, endDate),
      AnalyticsService.getTopPages(20, startDate, endDate),
      AnalyticsService.getTrafficSources(10, startDate, endDate),
      AnalyticsService.getDeviceBreakdown(startDate, endDate),
      AnalyticsService.getBrowserBreakdown(5, startDate, endDate),
    ]);

    res.status(200).json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        overview: {
          ...overview,
          realtimeUsers,
        },
        topCountries,
        topPages,
        trafficSources,
        devices,
        browsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard statistics for a teacher
 * @route   GET /api/dashboard/teacher-stats
 * @access  Private/Teacher
 */
export const getTeacherStats = async (req, res, next) => {
  try {
    const teacherId = req.user._id;

    const [
      courses,
      publishedCoursesCount,
      pendingCoursesCount,
      teacherGroups,
      directStudents,
      subscriptionStudents,
    ] = await Promise.all([
      Course.find({ instructorId: teacherId }),
      Course.countDocuments({ instructorId: teacherId, isPublished: true }),
      Course.countDocuments({ instructorId: teacherId, isPublished: false, "approvalStatus.status": "pending" }),
      TeacherGroup.find({ teacherId, isActive: true })
        .select("students groupType pricing groupName")
        .populate("students.studentId", "studentName name fullName email"), // Populate student details
      User.find({ "studentInfo.assignedTeacher": teacherId })
        .select("fullName email studentInfo createdAt"),
      StudentMember.find({ assignedTeacherId: teacherId })
        .select("name email phone status createdAt")
    ]);

    const totalCourses = courses.length;

    // Aggregated stats from courses
    const totalEnrollments = courses.reduce((acc, c) => acc + (c.stats.enrolledCount || 0), 0);
    const completedCourses = courses.reduce((acc, c) => acc + (c.stats.completedCount || 0), 0);

    // Group & Student stats
    const totalGroups = teacherGroups.length;

    // Calculate active students in groups
    const activeStudentsInGroups = teacherGroups.reduce((acc, g) =>
      acc + g.students.filter(s => s.status === 'active').length, 0
    );

    // Calculate direct students count
    const directStudentsCount = directStudents.length;

    // Combined active students
    const subscriptionStudentsCount = subscriptionStudents.length;
    const totalActiveStudents = activeStudentsInGroups + directStudentsCount + subscriptionStudents.filter(s => s.status === 'active').length;

    // Get recent students from groups
    let recentStudentsList = [];

    // 1. Add students from groups
    const studentIdsInGroups = new Set();
    teacherGroups.forEach(group => {
      group.students.forEach(student => {
        if (student.studentId) {
          studentIdsInGroups.add(student.studentId._id ? student.studentId._id.toString() : student.studentId.toString());
          // Handle different name fields
          // StudentMember uses 'name' as { ar: string, en: string }
          // Other models might use 'fullName' or 'studentName'
          let name;
          const sid = student.studentId;
          
          if (sid.name && typeof sid.name === 'object' && (sid.name.ar || sid.name.en)) {
            // StudentMember model - name is already bilingual
            name = sid.name;
          } else if (sid.studentName && typeof sid.studentName === 'object') {
            name = sid.studentName;
          } else if (sid.fullName && typeof sid.fullName === 'object') {
            name = sid.fullName;
          } else if (typeof sid.name === 'string') {
            name = { ar: sid.name, en: sid.name };
          } else if (typeof sid.fullName === 'string') {
            name = { ar: sid.fullName, en: sid.fullName };
          } else {
            name = { ar: 'طالب', en: 'Student' };
          }

          recentStudentsList.push({
            name: name,
            email: student.studentId.email,
            status: student.status,
            groupName: group.groupName || { en: "Group", ar: "مجموعة" },
            addedAt: student.assignedDate || student.addedAt || group.createdAt,
            type: 'group'
          });
        }
      });
    });

    // 2. Add direct students
    directStudents.forEach(student => {
      recentStudentsList.push({
        name: student.fullName,
        email: student.email,
        status: student.studentInfo?.subscriptionStatus || 'active',
        groupName: { en: "Direct Student", ar: "طالب مباشر" },
        addedAt: student.createdAt,
        type: 'direct'
      });
    });

    // 3. Add subscription students not in groups
    subscriptionStudents.forEach(student => {
      const sid = student._id ? student._id.toString() : student.id;
      if (!studentIdsInGroups.has(sid)) {
        recentStudentsList.push({
          name: student.name,
          email: student.email || student.phone, // StudentMember might not have email
          status: student.status,
          groupName: { en: "Subscription", ar: "اشتراك" },
          addedAt: student.createdAt,
          type: 'subscription'
        });
      }
    });

    // Sort and take top 5
    recentStudentsList.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    const latestStudents = recentStudentsList.slice(0, 5);

    // Calculate expected revenue for this specific teacher
    let expectedRevenue = 0;
    teacherGroups.forEach((group) => {
      const activeCount = group.students.filter((s) => s.status === "active").length;
      if (group.groupType === "group") {
        expectedRevenue += group.pricing.groupRate || 0;
      } else {
        const studentsPerRate = group.pricing.studentsPerIndividual || 12;
        const individualRate = group.pricing.individualRate || 0;
        expectedRevenue += Math.ceil(activeCount / studentsPerRate) * individualRate;
      }
    });

    // Get teacher profit statistics
    const { TeacherProfitService } = await import("../services/teacherProfitService.js");
    const profitService = new TeacherProfitService();
    let profitStats = null;
    try {
      profitStats = await profitService.getTeacherProfitStats(teacherId);
    } catch (profitError) {
      console.error("Failed to load teacher profit stats:", profitError);
      // Set default empty stats if fetch fails
      profitStats = {
        courseSales: { totalProfit: 0, transactionCount: 0, avgPercentage: 0 },
        subscriptions: { totalProfit: 0, transactionCount: 0, avgPercentage: 0 },
        totalProfit: 0,
        totalTransactions: 0,
        recentTransactions: [],
        currency: "EGP",
      };
    }

    res.status(200).json({
      success: true,
      data: {
        courses: {
          total: totalCourses,
          published: publishedCoursesCount,
          pending: pendingCoursesCount,
          draft: totalCourses - publishedCoursesCount,
        },
        enrollments: {
          total: totalEnrollments,
          completed: completedCourses,
          completionRate: totalEnrollments > 0 ? ((completedCourses / totalEnrollments) * 100).toFixed(1) : 0,
        },
        groups: {
          total: totalGroups,
          activeStudents: totalActiveStudents,
        },
        revenue: {
          expected: expectedRevenue,
          currency: "EGP",
        },
        profit: {
          courseSales: {
            total: profitStats.courseSales.totalProfit,
            count: profitStats.courseSales.transactionCount,
            percentage: profitStats.courseSales.avgPercentage,
          },
          subscriptions: {
            total: profitStats.subscriptions.totalProfit,
            count: profitStats.subscriptions.transactionCount,
            percentage: profitStats.subscriptions.avgPercentage,
          },
          total: profitStats.totalProfit,
          currency: profitStats.currency,
          recentTransactions: profitStats.recentTransactions,
        },
        recentCourses: courses.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
        recentStudents: latestStudents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed metrics for a specific page
 * @route   GET /api/dashboard/analytics/page
 * @access  Private/Admin
 */
export const getPageAnalytics = async (req, res, next) => {
  try {
    const { path, startDate = "30daysAgo", endDate = "today" } = req.query;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: "Page path is required",
      });
    }

    const pageDetails = await AnalyticsService.getPageDetails(
      path,
      startDate,
      endDate
    );

    if (!pageDetails) {
      return res.status(404).json({
        success: false,
        message: "No data found for this page",
      });
    }

    res.status(200).json({
      success: true,
      data: pageDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get product analytics (sales, revenue, refunds per product)
 * @route   GET /api/dashboard/products/analytics
 * @access  Private/Admin
 */
export const getProductAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = {
        ...dateFilter.createdAt,
        $lte: new Date(endDate),
      };
    }

    // Get all products first
    const products = await Product.find({ isActive: true })
      .select("_id name slug seoData")
      .lean();

    // Get sales stats per product (success + refunded, since refunded were originally paid)
    const salesStats = await Payment.aggregate([
      {
        $match: {
          productId: { $ne: null },
          status: { $in: ["success", "refunded", "delivered"] },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$productId",
          salesCount: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
    ]);

    // Get refund stats per product
    const refundStats = await Payment.aggregate([
      {
        $match: {
          productId: { $ne: null },
          status: "refunded",
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$productId",
          refundsCount: { $sum: 1 },
          refundAmount: { $sum: "$amount" },
        },
      },
    ]);

    // Convert to maps for quick lookup
    const salesMap = salesStats.reduce((acc, s) => {
      acc[s._id.toString()] = s;
      return acc;
    }, {});

    const refundMap = refundStats.reduce((acc, r) => {
      acc[r._id.toString()] = r;
      return acc;
    }, {});

    // Combine product data with analytics
    const productAnalytics = products.map((product) => {
      const productId = product._id.toString();
      const sales = salesMap[productId] || { salesCount: 0, revenue: 0 };
      const refunds = refundMap[productId] || {
        refundsCount: 0,
        refundAmount: 0,
      };

      return {
        id: product._id,
        title: product.name, // name is {ar: "...", en: "..."}
        slug: product.slug,
        views: product.seoData?.views30d || 0,
        salesCount: sales.salesCount,
        revenue: sales.revenue,
        refundsCount: refunds.refundsCount,
        refundAmount: refunds.refundAmount,
        netRevenue: sales.revenue - refunds.refundAmount,
      };
    });

    // Sort by revenue (top sellers first)
    productAnalytics.sort((a, b) => b.revenue - a.revenue);

    // Calculate totals
    const totals = productAnalytics.reduce(
      (acc, p) => {
        acc.totalSales += p.salesCount;
        acc.totalRevenue += p.revenue;
        acc.totalRefunds += p.refundsCount;
        acc.totalRefundAmount += p.refundAmount;
        acc.totalViews += p.views;
        return acc;
      },
      {
        totalSales: 0,
        totalRevenue: 0,
        totalRefunds: 0,
        totalRefundAmount: 0,
        totalViews: 0,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        products: productAnalytics,
        totals,
      },
    });
  } catch (error) {
    next(error);
  }
};
