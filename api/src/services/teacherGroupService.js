import TeacherGroup from "../models/teacherGroupModel.js";
import User from "../models/userModel.js";
import StudentMember from "../models/studentMemberModel.js";
import Course from "../models/courseModel.js";
import Settings from "../models/settingsModel.js";
import { ApiError } from "../utils/apiError.js";
import { WhatsappNotificationService } from "./whatsappNotificationService.js";
import logger from "../utils/logger.js";

class TeacherGroupService {
  constructor() {
    this.whatsappService = new WhatsappNotificationService();
  }

  async getSubscriptionTeachersMap() {
    const settings = await Settings.findOne().select("subscriptionTeachers").lean();
    const map = new Map();
    (settings?.subscriptionTeachers || []).forEach((teacher) => {
      if (teacher?._id) {
        map.set(String(teacher._id), teacher);
      }
    });
    return map;
  }

  async getSubscriptionTeacherById(subscriptionTeacherId) {
    if (!subscriptionTeacherId) return null;
    const settings = await Settings.findOne().select("subscriptionTeachers");
    const teacher = settings?.subscriptionTeachers?.id(subscriptionTeacherId);
    return teacher ? teacher.toObject() : null;
  }

  attachSubscriptionTeacher(group, subscriptionTeacherMap) {
    if (!group) return group;
    const normalizedGroup = group.teacherType
      ? group
      : { ...group, teacherType: "course" };
    if (normalizedGroup.teacherType !== "subscription") return normalizedGroup;
    const teacher = subscriptionTeacherMap.get(
      String(normalizedGroup.subscriptionTeacherId || "")
    );
    if (!teacher) {
      return { ...normalizedGroup, subscriptionTeacher: null };
    }
    return {
      ...normalizedGroup,
      subscriptionTeacher: {
        ...teacher,
        id: String(teacher._id || teacher.id || ""),
      },
    };
  }

  // Create a new teacher group
  async createTeacherGroup(data, creatorId) {
    const {
      teacherId,
      subscriptionTeacherId,
      teacherType,
      groupName,
      students,
      groupType,
      pricing,
      permissions,
      schedule,
      notes,
    } = data;

    const resolvedTeacherType = teacherType === "subscription" ? "subscription" : "course";

    if (resolvedTeacherType === "course") {
      if (!teacherId) {
        throw new ApiError(400, "Teacher is required");
      }
      // Verify teacher exists and has teacher role
      const teacher = await User.findById(teacherId);
      if (!teacher) {
        throw new ApiError(404, "Teacher not found");
      }
      if (teacher.role !== "teacher") {
        throw new ApiError(400, "User is not a teacher");
      }
    } else {
      if (!subscriptionTeacherId) {
        throw new ApiError(400, "Subscription teacher is required");
      }
      const subscriptionTeacher = await this.getSubscriptionTeacherById(subscriptionTeacherId);
      if (!subscriptionTeacher) {
        throw new ApiError(404, "Subscription teacher not found");
      }
    }

    // Verify all students exist
    if (students && students.length > 0) {
      const studentIds = students.map((s) => s.studentId);
      const existingStudents = await StudentMember.find({ _id: { $in: studentIds } });
      if (existingStudents.length !== studentIds.length) {
        throw new ApiError(400, "One or more students not found");
      }
    }

    const teacherGroup = new TeacherGroup({
      teacherType: resolvedTeacherType,
      teacherId: resolvedTeacherType === "course" ? teacherId : undefined,
      subscriptionTeacherId:
        resolvedTeacherType === "subscription" ? subscriptionTeacherId : undefined,
      groupName,
      students: students || [],
      groupType: groupType || "individual",
      pricing: pricing || {},
      permissions: permissions || {},
      schedule: schedule || [],
      notes,
      createdBy: creatorId,
    });

    await teacherGroup.save();

    // Update teacher's teacherInfo (course teachers only)
    if (resolvedTeacherType === "course") {
      await this.updateTeacherInfo(teacherId);
    }

    return this.getTeacherGroupById(teacherGroup._id);
  }

  // Get all teacher groups
  async getAllTeacherGroups(filters = {}) {
    const query = {};

    if (filters.teacherId) {
      query.teacherId = filters.teacherId;
    }

    if (filters.subscriptionTeacherId) {
      query.subscriptionTeacherId = filters.subscriptionTeacherId;
    }

    if (filters.teacherType) {
      query.$and = query.$and || [];
      if (filters.teacherType === "course") {
        query.$and.push({
          $or: [{ teacherType: "course" }, { teacherType: { $exists: false } }],
        });
      } else if (filters.teacherType === "subscription") {
        query.$and.push({
          $or: [
            { teacherType: "subscription" },
            { teacherType: { $exists: false } },
          ],
        });
      }
    }

    if (filters.groupType) {
      query.groupType = filters.groupType;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const teacherGroups = await TeacherGroup.find(query)
      .populate("teacherId", "fullName email profilePic teacherInfo")
      .populate("students.studentId", "name phone whatsappNumber packageId status")
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    const subscriptionTeacherMap = await this.getSubscriptionTeachersMap();
    return teacherGroups.map((group) =>
      this.attachSubscriptionTeacher(group.toObject(), subscriptionTeacherMap)
    );
  }

  // Get teacher group by ID
  async getTeacherGroupById(id) {
    const teacherGroup = await TeacherGroup.findById(id)
      .populate("teacherId", "fullName email profilePic teacherInfo")
      .populate({
        path: "students.studentId",
        select: "name phone whatsappNumber packageId status subscriptionStartDate subscriptionEndDate",
        populate: {
          path: "packageId",
          select: "name price",
        },
      })
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    if (!teacherGroup) {
      throw new ApiError(404, "Teacher group not found");
    }

    const subscriptionTeacherMap = await this.getSubscriptionTeachersMap();
    return this.attachSubscriptionTeacher(teacherGroup.toObject(), subscriptionTeacherMap);
  }

  // Update teacher group
  async updateTeacherGroup(id, data, updaterId) {
    const teacherGroup = await TeacherGroup.findById(id);

    if (!teacherGroup) {
      throw new ApiError(404, "Teacher group not found");
    }

    // Update fields
    if (data.groupName) teacherGroup.groupName = data.groupName;
    if (data.groupType) teacherGroup.groupType = data.groupType;
    if (data.pricing) teacherGroup.pricing = { ...teacherGroup.pricing, ...data.pricing };
    if (data.permissions) teacherGroup.permissions = { ...teacherGroup.permissions, ...data.permissions };
    if (data.schedule) teacherGroup.schedule = data.schedule;
    if (data.notes !== undefined) teacherGroup.notes = data.notes;
    if (data.isActive !== undefined) teacherGroup.isActive = data.isActive;

    teacherGroup.updatedBy = updaterId;

    await teacherGroup.save();

    // Update teacher's permissions in User model if changed
    if (data.permissions && teacherGroup.teacherType !== "subscription" && teacherGroup.teacherId) {
      await User.findByIdAndUpdate(teacherGroup.teacherId, {
        "teacherInfo.canPublishDirectly": data.permissions.canPublishDirectly,
      });
    }

    return this.getTeacherGroupById(id);
  }

  // Add student to teacher group
  async addStudent(groupId, studentId, addedBy) {
    const teacherGroup = await TeacherGroup.findById(groupId);
    if (!teacherGroup) {
      throw new ApiError(404, "Teacher group not found");
    }

    // Check if student exists
    const student = await StudentMember.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found");
    }

    // Check if student already in group
    const existingStudent = teacherGroup.students.find(
      (s) => s.studentId.toString() === studentId
    );
    if (existingStudent) {
      throw new ApiError(400, "Student already in this group");
    }

    if (student.memberType !== "group") {
      student.memberType = "group";
      student.updatedBy = addedBy;
      await student.save();
    }

    teacherGroup.students.push({
      studentId,
      assignedDate: new Date(),
      status: "active",
    });

    teacherGroup.updatedBy = addedBy;
    await teacherGroup.save();

    // Send WhatsApp notification (reuse student object from above)
    try {
      let teacherName = "";
      if (teacherGroup.teacherType === "subscription") {
        const subscriptionTeacher = await this.getSubscriptionTeacherById(
          teacherGroup.subscriptionTeacherId
        );
        teacherName =
          subscriptionTeacher?.name?.ar ||
          subscriptionTeacher?.name?.en ||
          subscriptionTeacher?.email ||
          "";
      } else if (teacherGroup.teacherId) {
        const teacher = await User.findById(teacherGroup.teacherId);
        teacherName =
          teacher?.fullName?.ar || teacher?.fullName?.en || teacher?.email || "";
      }

      if (student && student.phone && this.whatsappService.isConfigured()) {
        const groupName =
          teacherGroup.groupName?.ar ||
          teacherGroup.groupName?.en ||
          "تعليمية";
        const teacherLine = teacherName ? `مع المعلم ${teacherName}` : "";

        await this.whatsappService.sendTemplateMessage(
          student.phone,
          "welcome_message",
          {
            name: student.name?.ar || student.name?.en || "",
            groupLine: ` في مجموعة "${groupName}"`,
            teacherLine,
            data: "يسعدنا انضمامك معنا.",
          },
          {
            recipientName: student.name?.ar || student.name?.en || "",
            lang: "ar",
          }
        );
      }

      if (false && student && student.phone && this.whatsappService.isConfigured()) {
        const teacherLabel = teacherName ? `مع المعلم ${teacherName}` : "مع المعلم";
        const message = `مرحباً ${student.name.ar}، لقد تمت إضافتك إلى مجموعة "${teacherGroup.groupName?.ar || teacherGroup.groupName?.en || 'تعليمية'}" ${teacherLabel}. بالتوفيق! 🌟`;
        await this.whatsappService.sendMessage(student.phone, message);
      }
    } catch (err) {
      logger.error("Failed to send WhatsApp notification for added student", { error: err.message });
    }

    // Update teacher info
    if (teacherGroup.teacherType !== "subscription" && teacherGroup.teacherId) {
      await this.updateTeacherInfo(teacherGroup.teacherId);
    }

    return this.getTeacherGroupById(groupId);
  }

  // Remove student from teacher group
  async removeStudent(groupId, studentId, removedBy) {
    const teacherGroup = await TeacherGroup.findById(groupId);
    if (!teacherGroup) {
      throw new ApiError(404, "Teacher group not found");
    }

    teacherGroup.students = teacherGroup.students.filter(
      (s) => s.studentId.toString() !== studentId
    );

    teacherGroup.updatedBy = removedBy;
    await teacherGroup.save();

    // Update teacher info
    if (teacherGroup.teacherType !== "subscription" && teacherGroup.teacherId) {
      await this.updateTeacherInfo(teacherGroup.teacherId);
    }

    return this.getTeacherGroupById(groupId);
  }

  // Update student status in group
  async updateStudentStatus(groupId, studentId, status, updaterId) {
    const teacherGroup = await TeacherGroup.findById(groupId);
    if (!teacherGroup) {
      throw new ApiError(404, "Teacher group not found");
    }

    const student = teacherGroup.students.find(
      (s) => s.studentId.toString() === studentId
    );
    if (!student) {
      throw new ApiError(404, "Student not found in this group");
    }

    student.status = status;
    teacherGroup.updatedBy = updaterId;
    await teacherGroup.save();

    // Send WhatsApp notification if completed
    if (status === 'completed' || status === 'active') {
      try {
        const studentMember = await StudentMember.findById(studentId);
        if (studentMember && studentMember.phone && this.whatsappService.isConfigured()) {
          const groupName =
            teacherGroup.groupName?.ar ||
            teacherGroup.groupName?.en ||
            "التعليمية";
          if (status === 'active') {
            await this.whatsappService.sendTemplateMessage(
              studentMember.phone,
              "welcome_message",
              {
                name: studentMember.name?.ar || studentMember.name?.en || "",
                groupLine: ` في مجموعة "${groupName}"`,
                teacherLine: "",
                data: "تم تفعيل حالتك وننتظر رؤيتك في الحصص القادمة.",
              },
              {
                recipientName:
                  studentMember.name?.ar || studentMember.name?.en || "",
                lang: "ar",
              }
            );
          } else if (status === 'completed') {
            const completionMessage = `تهانينا ${studentMember.name?.ar || studentMember.name?.en || ""}! لقد أتممت دراستك في مجموعة "${groupName}". نتمنى لك دوام التوفيق والنجاح!`;
            await this.whatsappService.sendMessage(
              studentMember.phone,
              completionMessage,
              {
                recipientName:
                  studentMember.name?.ar || studentMember.name?.en || "",
                lang: "ar",
              }
            );
          }
        }

        if (false && studentMember && studentMember.phone && this.whatsappService.isConfigured()) {
          let message = "";
          if (status === 'completed') {
            message = `تهانينا ${studentMember.name.ar}! لقد أتممت دراستك في مجموعة "${teacherGroup.groupName?.ar || teacherGroup.groupName?.en || 'التعليمية'}". نتمنى لك دوام التوفيق والنجاح! 🎓✨`;
          } else if (status === 'active') {
            message = `مرحباً ${studentMember.name.ar}، تم تفعيل حالتك في مجموعة "${teacherGroup.groupName?.ar || teacherGroup.groupName?.en || 'التعليمية'}". نتطلع لرؤيتك في الحصص القادمة! 📚`;
          }

          if (message) {
            await this.whatsappService.sendMessage(studentMember.phone, message);
          }
        }
      } catch (err) {
        logger.error("Failed to send WhatsApp notification for student status update", { error: err.message });
      }
    }

    return this.getTeacherGroupById(groupId);
  }

  // Delete teacher group
  async deleteTeacherGroup(id) {
    const teacherGroup = await TeacherGroup.findById(id);
    if (!teacherGroup) {
      throw new ApiError(404, "Teacher group not found");
    }

    const teacherId = teacherGroup.teacherId;
    const teacherType = teacherGroup.teacherType;
    await TeacherGroup.findByIdAndDelete(id);

    // Update teacher info
    if (teacherType !== "subscription" && teacherId) {
      await this.updateTeacherInfo(teacherId);
    }

    return { message: "Teacher group deleted successfully" };
  }

  // Get teacher statistics
  async getTeacherStatistics(teacherId) {
    const groups = await TeacherGroup.find({
      teacherId,
      isActive: true,
      $or: [{ teacherType: "course" }, { teacherType: { $exists: false } }],
    });

    const totalStudents = groups.reduce((sum, g) => sum + g.stats.totalStudents, 0);
    const activeStudents = groups.reduce((sum, g) => sum + g.stats.activeStudents, 0);
    const completedStudents = groups.reduce((sum, g) => sum + g.stats.completedStudents, 0);

    // Get courses count if teacher can upload
    const coursesCount = await Course.countDocuments({ instructor: teacherId });

    // Calculate expected revenue
    let expectedRevenue = 0;
    groups.forEach((group) => {
      const activeCount = group.students.filter((s) => s.status === "active").length;
      if (group.groupType === "group") {
        expectedRevenue += group.pricing.groupRate || 0;
      } else {
        const studentsPerRate = group.pricing.studentsPerIndividual || 12;
        const individualRate = group.pricing.individualRate || 0;
        expectedRevenue += Math.ceil(activeCount / studentsPerRate) * individualRate;
      }
    });

    return {
      teacherId,
      totalGroups: groups.length,
      totalStudents,
      activeStudents,
      completedStudents,
      coursesCreated: coursesCount,
      expectedRevenue,
      groups: groups.map((g) => ({
        id: g._id,
        groupName: g.groupName,
        groupType: g.groupType,
        studentsCount: g.stats.totalStudents,
        activeStudentsCount: g.stats.activeStudents,
      })),
    };
  }

  // Update teacher info in User model
  async updateTeacherInfo(teacherId) {
    const groups = await TeacherGroup.find({
      teacherId,
      isActive: true,
      $or: [{ teacherType: "course" }, { teacherType: { $exists: false } }],
    });
    const totalStudents = groups.reduce((sum, g) => sum + g.stats.totalStudents, 0);
    const coursesCount = await Course.countDocuments({ instructor: teacherId });

    await User.findByIdAndUpdate(teacherId, {
      "teacherInfo.studentsCount": totalStudents,
      "teacherInfo.coursesCount": coursesCount,
    });
  }

  // Get all teachers with their statistics
  async getAllTeachersWithStats() {
    const teachers = await User.find({ role: "teacher", "teacherInfo.isApproved": true })
      .select("fullName email profilePic teacherInfo")
      .lean();

    const teachersWithStats = await Promise.all(
      teachers.map(async (teacher) => {
        const stats = await this.getTeacherStatistics(teacher._id);
        return {
          ...teacher,
          statistics: stats,
        };
      })
    );

    return teachersWithStats;
  }
}

export default new TeacherGroupService();
