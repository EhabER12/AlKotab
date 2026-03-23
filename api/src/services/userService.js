import { UserRepository } from "../repositories/userRepository.js";
import StudentMember from "../models/studentMemberModel.js";
import { ApiError } from "../utils/apiError.js";
import crypto from "crypto";
import { EmailService } from "./emailService.js"; // Keep this just in case other methods use it directly, though we prefer template service
import emailTemplateService from "./emailTemplateService.js";
import logger from "../utils/logger.js";

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
  }

  async createUser(userData) {
    const { name, email, password, role = "user" } = userData;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError(400, "User with this email already exists");
    }

    // Validate role
    if (!["admin", "moderator", "user", "teacher"].includes(role)) {
      throw new ApiError(400, "Invalid role");
    }

    let userPayload = {
      fullName: {
        ar: name || "مستخدم جديد",
        en: name || "New User",
      },
      email,
      role,
    };

    if (password) {
      userPayload.password = password;
      userPayload.status = "active";
    } else {
      // Invitation flow
      userPayload.status = "invited";
      const verificationToken = crypto.randomBytes(32).toString("hex");
      userPayload.verificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");
      userPayload.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      // Send invitation email
      const clientUrl = process.env.CLIENT_URL || process.env.WEBSITE_URL || "http://localhost:3000";
      const invitationLink = `${clientUrl}/complete-registration?token=${verificationToken}`;

      const roleArabic = {
        admin: "مدير",
        moderator: "مشرف",
        user: "مستخدم",
        teacher: "مدرس",
      };

      try {
        await emailTemplateService.sendTemplatedEmail(
          email,
          "user_invitation",
          {
            role: roleArabic[role] || role,
            inviteUrl: invitationLink,
            year: new Date().getFullYear()
          },
          "ar"
        );
        logger.info("Invitation email sent", { email });
      } catch (error) {
        logger.error("Failed to send invitation email", { email, error: error.message });
      }
    }

    // Create user
    const user = await this.userRepository.create(userPayload);

    return user;
  }

  async getAllUsers(queryParams) {
    const { page, limit, role, search } = queryParams;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    const options = {
      page,
      limit,
      filter,
      select: "-password",
      populate: "studentInfo.assignedTeacher",
    };

    if (search) {
      return this.userRepository.search(search, options);
    }

    return this.userRepository.findAll(options);
  }

  async getUserById(id) {
    const user = await this.userRepository.findById(id, {
      select: "-password",
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  }

  async updateUser(id, userData) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Don't allow role update through this endpoint
    if (userData.role) {
      delete userData.role;
    }

    // Map single 'name' field to fullName structure (ar & en)
    if (userData.name) {
      userData.fullName = {
        ar: userData.name,
        en: userData.name,
      };
      delete userData.name;
    }

    if (userData.employeeInfo && typeof userData.employeeInfo === "object") {
      if (
        Object.prototype.hasOwnProperty.call(
          userData.employeeInfo,
          "dashboardAccess"
        )
      ) {
        userData["employeeInfo.dashboardAccess"] = Array.isArray(
          userData.employeeInfo.dashboardAccess
        )
          ? userData.employeeInfo.dashboardAccess
          : [];

        delete userData.employeeInfo;
      }
    }

    return this.userRepository.update(id, userData);
  }

  async updatePassword(id, password) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    user.password = password;
    await user.save(); // Triggers pre('save') hook for hashing

    return user;
  }

  async updateUserRole(id, role) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!["admin", "moderator", "user", "teacher"].includes(role)) {
      throw new ApiError(400, "Invalid role");
    }

    return this.userRepository.updateRole(id, role);
  }

  async deleteUser(id) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return this.userRepository.delete(id);
  }

  // Teacher approval methods
  async approveTeacher(id, approverData = {}) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.role !== "teacher") {
      throw new ApiError(400, "User is not a teacher");
    }

    const updateData = {
      "teacherInfo.isApproved": true,
      "teacherInfo.approvedAt": new Date(),
      "teacherInfo.approvedBy": approverData.approverId || null,
    };

    const updatedUser = await this.userRepository.update(id, updateData);

    // Send approval email
    try {
      const clientUrl = process.env.ADMIN_URL || "http://localhost:3000";
      const dashboardLink = `${clientUrl}/dashboard`;

      // We should probably convert this to template too later, but keeping it for now to minimize changes scope
      const subject = "تم تفعيل حسابك كمعلم - Teacher Account Approved";
      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #04524B 0%, #033D38 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #FB9903; margin: 0; font-size: 32px; font-weight: bold;">Genoun</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">لوحة التحكم - Dashboard</p>
    </div>
    
    <div style="padding: 40px 30px; text-align: right;" dir="rtl">
      <h2 style="color: #04524B; margin: 0 0 20px; font-size: 24px;">مبروك! تم تفعيل حسابك 🎉</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        مرحباً <strong style="color: #04524B;">${user.fullName?.ar || user.fullName?.en || user.email}</strong>,
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        يسعدنا إبلاغك بأنه تم <strong style="color: #10b981;">الموافقة على حسابك كمعلم</strong> في منصة Genoun.
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 30px;">
        يمكنك الآن الدخول إلى لوحة التحكم وإدارة دوراتك ومجموعاتك.
      </p>
    </div>

    <div style="padding: 0 30px 40px; text-align: left;" dir="ltr">
      <h2 style="color: #04524B; margin: 0 0 20px; font-size: 24px;">Congratulations! Your account is active 🎉</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        Hello <strong style="color: #04524B;">${user.fullName?.en || user.fullName?.ar || user.email}</strong>,
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        We are happy to inform you that your <strong style="color: #10b981;">teacher account has been approved</strong> on Genoun platform.
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 30px;">
        You can now access the dashboard and manage your courses and groups.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #FB9903 0%, #d98102 100%); color: #1a1a1a; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(251, 153, 3, 0.3);">
        الدخول للوحة التحكم - Access Dashboard
      </a>
    </div>
    
    <div style="background-color: #04524B; padding: 30px; text-align: center;">
      <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px; font-size: 14px;">
        فريق Genoun Team
      </p>
      <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} Genoun. جميع الحقوق محفوظة - All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      await this.emailService.sendEmail(user.email, subject, html);
      logger.info("Teacher approval email sent", { email: user.email });
    } catch (error) {
      logger.error("Failed to send teacher approval email", {
        email: user.email,
        error: error.message,
      });
    }

    return updatedUser;
  }

  async rejectTeacher(id, rejectData = {}) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.role !== "teacher") {
      throw new ApiError(400, "User is not a teacher");
    }

    const updateData = {
      "teacherInfo.isApproved": false,
      "teacherInfo.rejectedAt": new Date(),
      "teacherInfo.rejectedBy": rejectData.rejectorId || null,
      "teacherInfo.rejectionReason": rejectData.reason || "",
    };

    const updatedUser = await this.userRepository.update(id, updateData);

    // Send rejection email
    if (rejectData.sendEmail !== false) {
      try {
        const subject = "تحديث بخصوص طلب التسجيل كمعلم - Teacher Registration Update";
        const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #04524B 0%, #033D38 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #FB9903; margin: 0; font-size: 32px; font-weight: bold;">Genoun</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">لوحة التحكم - Dashboard</p>
    </div>
    
    <div style="padding: 40px 30px; text-align: right;" dir="rtl">
      <h2 style="color: #04524B; margin: 0 0 20px; font-size: 24px;">تحديث بخصوص طلب التسجيل</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        مرحباً <strong style="color: #04524B;">${user.fullName?.ar || user.fullName?.en || user.email}</strong>,
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        شكراً لاهتمامك بالانضمام لمنصة Genoun كمعلم. نأسف لإبلاغك أنه لا يمكننا الموافقة على طلبك في الوقت الحالي.
      </p>
    </div>

    <div style="padding: 0 30px 40px; text-align: left;" dir="ltr">
      <h2 style="color: #04524B; margin: 0 0 20px; font-size: 24px;">Update regarding your registration</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        Hello <strong style="color: #04524B;">${user.fullName?.en || user.fullName?.ar || user.email}</strong>,
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px; margin: 0 0 20px;">
        Thank you for your interest in joining Genoun as a teacher. We regret to inform you that we cannot approve your request at this time.
      </p>
    </div>
      
    ${rejectData.reason ? `
    <div style="margin: 0 30px 30px; background-color: #fef2f2; border-radius: 12px; border-right: 4px solid #ef4444; padding: 20px;">
      <p style="color: #04524B; font-weight: bold; margin: 0 0 10px; font-size: 14px;">السبب - Reason:</p>
      <p style="color: #666; margin: 0; font-size: 14px;">${rejectData.reason}</p>
    </div>
    ` : ""}
    
    <div style="padding: 0 30px 40px; text-align: center;">
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
        إذا كان لديك أي استفسارات، يرجى التواصل معنا.<br>
        If you have any questions, please contact us.
      </p>
    </div>
    
    <div style="background-color: #04524B; padding: 30px; text-align: center;">
      <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px; font-size: 14px;">
        فريق Genoun Team
      </p>
      <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 12px;">
        © ${new Date().getFullYear()} Genoun. جميع الحقوق محفوظة - All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
        `;

        await this.emailService.sendEmail(user.email, subject, html);
        logger.info("Teacher rejection email sent", { email: user.email });
      } catch (error) {
        logger.error("Failed to send teacher rejection email", {
          email: user.email,
          error: error.message,
        });
      }
    }

    return updatedUser;
  }

  async assignStudentToTeacher(studentId, teacherId) {
    const student = await this.userRepository.findById(studentId);
    if (!student) throw new ApiError(404, "Student not found");

    const teacher = await this.userRepository.findById(teacherId);
    if (!teacher) throw new ApiError(404, "Teacher not found");
    if (teacher.role !== "teacher") throw new ApiError(400, "Assigned user is not a teacher");

    return this.userRepository.update(studentId, {
      "studentInfo.assignedTeacher": teacherId
    });
  }

  async removeStudentFromTeacher(studentId) {
    const student = await this.userRepository.findById(studentId);
    if (!student) throw new ApiError(404, "Student not found");

    return this.userRepository.update(studentId, {
      "studentInfo.assignedTeacher": null
    });
  }

  async getTeacherStudents(teacherId, queryParams = {}) {
    const teacher = await this.userRepository.findById(teacherId);
    if (!teacher) throw new ApiError(404, "Teacher not found");

    const { page = 1, limit = 10, search } = queryParams;
    const skip = (page - 1) * limit;

    // 1. Get direct students from User model
    const directStudentsFilter = {
      "studentInfo.assignedTeacher": teacherId
    };
    
    // 2. Get subscription students from StudentMember model
    const subscriptionStudentsFilter = {
      assignedTeacherId: teacherId
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      directStudentsFilter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
      subscriptionStudentsFilter.$or = [
        { "name.ar": searchRegex },
        { "name.en": searchRegex },
        { phone: searchRegex }
      ];
    }

    // Fetch both in parallel
    const [directStudentsRes, subscriptionStudents] = await Promise.all([
      this.userRepository.findAll({ 
        filter: directStudentsFilter,
        select: "-password",
        limit: 1000 // Large limit to handle merging
      }),
      StudentMember.find(subscriptionStudentsFilter).limit(1000)
    ]);

    // Normalize and merge
    const normalizedDirect = directStudentsRes.results.map(s => ({
      id: s._id || s.id,
      _id: s._id || s.id,
      fullName: s.fullName || s.name,
      name: s.fullName || s.name,
      email: s.email,
      phone: s.phone || (s.studentInfo && s.studentInfo.whatsappNumber),
      whatsappNumber: s.studentInfo && s.studentInfo.whatsappNumber,
      status: s.status,
      type: 'direct',
      createdAt: s.createdAt
    }));

    const normalizedSubscription = subscriptionStudents.map(s => ({
      id: s._id || s.id,
      _id: s._id || s.id,
      fullName: s.name,
      name: s.name,
      email: s.email,
      phone: s.phone,
      whatsappNumber: s.phone,
      status: s.status,
      type: 'subscription',
      createdAt: s.createdAt
    }));

    // Combine and handle duplicates (a user might be in both collections if they have a full account)
    // We'll use a Set to track IDs, prioritizing User records if they exist
    const mergedStudents = [...normalizedDirect];
    const existingIds = new Set(mergedStudents.map(s => s.id.toString()));

    normalizedSubscription.forEach(s => {
      if (!existingIds.has(s.id.toString())) {
        mergedStudents.push(s);
        existingIds.add(s.id.toString());
      }
    });

    // Sort by createdAt desc
    mergedStudents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate merged results
    const paginatedResults = mergedStudents.slice(skip, skip + parseInt(limit));

    return {
      results: paginatedResults,
      totalResults: mergedStudents.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(mergedStudents.length / limit)
    };
  }
}
