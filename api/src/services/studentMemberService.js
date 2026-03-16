import StudentMember from "../models/studentMemberModel.js";
import { ApiError } from "../utils/apiError.js";
import { WhatsappNotificationService } from "./whatsappNotificationService.js";
import logger from "../utils/logger.js";
import {
  addDays,
  differenceInDays,
  endOfDay,
  isValid,
  startOfDay,
} from "date-fns";
import Package from "../models/packageModel.js";
import TeacherGroup from "../models/teacherGroupModel.js";
import Settings from "../models/settingsModel.js";
import teacherGroupService from "./teacherGroupService.js";
import { parse } from 'csv-parse/sync';

export class StudentMemberService {
  constructor() {
    this.whatsappService = new WhatsappNotificationService();
  }

  // Import members from CSV
  async importMembers(fileBuffer, createdBy, sheetName = "") {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: []
    };

    const packages = await Package.find({});
    const teacherGroups = await TeacherGroup.find({ groupType: "group", isActive: true })
      .populate("teacherId", "fullName email");
    const settings = await Settings.findOne().select("subscriptionTeachers").lean();
    const subscriptionTeachersMap = new Map();
    (settings?.subscriptionTeachers || []).forEach((teacher) => {
      if (teacher?._id) {
        subscriptionTeachersMap.set(String(teacher._id), teacher);
      }
    });
    const affectedTeacherIds = new Set();
    for (const [index, record] of records.entries()) {
      try {
        // Validation
        const nameValue = record.name?.trim();
        if (!nameValue) {
          throw new Error('Missing required field: name');
        }

        // Find package or group (case insensitive and trimmed)
        const normalize = (str) => str?.trim().toLowerCase() || "";
        const groupValue =
          record.group ||
          record.groupName ||
          record["group name"] ||
          record.group_name ||
          "";
        const groupIdValue =
          record.groupId ||
          record.group_id ||
          record["group id"] ||
          record["groupId"] ||
          "";
        const teacherValue =
          record.teacher ||
          record.teacherName ||
          record["teacher name"] ||
          record.teacher_name ||
          "";

        const groupQuery = normalize(groupValue);
        const groupIdQuery = String(groupIdValue || "").trim();
        const teacherQuery = normalize(teacherValue);

        let selectedGroup = null;
        const matchesTeacher = (group) => {
          if (group?.teacherType === "subscription") {
            const subscriptionTeacher = subscriptionTeachersMap.get(
              String(group.subscriptionTeacherId || "")
            );
            const nameAr = normalize(subscriptionTeacher?.name?.ar);
            const nameEn = normalize(subscriptionTeacher?.name?.en);
            const email = normalize(subscriptionTeacher?.email);
            const phone = normalize(subscriptionTeacher?.phone);
            return (
              nameAr === teacherQuery ||
              nameEn === teacherQuery ||
              email === teacherQuery ||
              phone === teacherQuery
            );
          }

          const teacher = group.teacherId;
          const nameAr = normalize(teacher?.fullName?.ar);
          const nameEn = normalize(teacher?.fullName?.en);
          const email = normalize(teacher?.email);
          return nameAr === teacherQuery || nameEn === teacherQuery || email === teacherQuery;
        };

        if (groupIdQuery) {
          selectedGroup = teacherGroups.find((g) => {
            const groupId = String(g._id || g.id || "");
            return groupId === groupIdQuery;
          });
          if (!selectedGroup) {
            throw new Error(`Group not found: ${groupIdValue}`);
          }
          if (teacherQuery && !matchesTeacher(selectedGroup)) {
            throw new Error(`Teacher does not match group: ${teacherValue}`);
          }
          if (groupQuery) {
            const nameAr = normalize(selectedGroup.groupName?.ar);
            const nameEn = normalize(selectedGroup.groupName?.en);
            if (nameAr !== groupQuery && nameEn !== groupQuery) {
              throw new Error(`Group name does not match groupId: ${groupValue}`);
            }
          }
        } else if (groupQuery) {
          let matchingGroups = teacherGroups.filter((g) => {
            const nameAr = normalize(g.groupName?.ar);
            const nameEn = normalize(g.groupName?.en);
            return nameAr === groupQuery || nameEn === groupQuery;
          });

          if (teacherQuery) {
            matchingGroups = matchingGroups.filter(matchesTeacher);
          }

          if (matchingGroups.length === 0) {
            throw new Error(`Group not found: ${groupValue}`);
          }
          if (matchingGroups.length > 1) {
            throw new Error(`Multiple groups found for "${groupValue}". Please provide the teacher name.`);
          }

          selectedGroup = matchingGroups[0];
        } else if (teacherQuery) {
          const matchingGroups = teacherGroups.filter(matchesTeacher);
          if (matchingGroups.length === 0) {
            throw new Error(`Teacher not found: ${teacherValue}`);
          }
          if (matchingGroups.length > 1) {
            throw new Error(`Multiple groups found for "${teacherValue}". Please provide the group name or groupId.`);
          }
          selectedGroup = matchingGroups[0];
        }

        let pkg = null;
        if (!selectedGroup && record.plan) {
          const recordPlan = normalize(record.plan);
          pkg = packages.find(p =>
            normalize(p.name?.ar) === recordPlan ||
            normalize(p.name?.en) === recordPlan
          );

          if (!pkg) {
            throw new Error(`Package not found: ${record.plan}`);
          }
        }

        // Helper to parse date
        const parseDateValue = (dateStr) => {
          if (!dateStr) return null;
          const raw = String(dateStr).trim();
          if (!raw) return null;

          // Try standard Date constructor first (YYYY-MM-DD)
          let date = new Date(raw);
          if (isValid(date)) return date;

          // Try DD/MM/YYYY or DD-MM-YYYY
          // Split by / or -
          const parts = raw.split(/[/-]/);
          if (parts.length === 3) {
            // Assume Day Month Year where Year is 4 digits
            let day, month, year;
            if (parts[0].length === 4) {
              // YYYY/MM/DD
              year = parseInt(parts[0]);
              month = parseInt(parts[1]) - 1;
              day = parseInt(parts[2]);
            } else {
              // DD/MM/YYYY
              day = parseInt(parts[0]);
              month = parseInt(parts[1]) - 1;
              year = parseInt(parts[2]);
            }
            date = new Date(year, month, day);
            if (isValid(date)) return date;
          }

          return null;
        };

        const startDateInput =
          record['start time'] ||
          record['start time (YYYY-MM-DD)'] ||
          record['start date'] ||
          record.startDate ||
          record.start_date ||
          "";
        const startDate = parseDateValue(startDateInput);
        const startDateRaw = String(startDateInput || "").trim();
        if (startDateRaw && !startDate) {
          throw new Error(`Invalid start date: ${startDateInput}`);
        }

        // Handle end date / nextDueDate
        const endDateInput =
          record['end_date'] ||
          record['end_date (YYYY-MM-DD)'] ||
          record['end date'] ||
          record.endDate ||
          record.nextDueDate ||
          record.next_due_date ||
          "";
        const endDate = parseDateValue(endDateInput);
        const endDateRaw = String(endDateInput || "").trim();
        if (endDateRaw && !endDate) {
          throw new Error(`Invalid end date: ${endDateInput}`);
        }

        // Handle billingDay: usually 1-28. If they provided a date, extract the day.
        let billingDay;
        if (record.billingDay !== undefined && record.billingDay !== null) {
          const rawBilling = String(record.billingDay).trim();
          if (!rawBilling) {
            if (startDate) {
              billingDay = Math.min(startDate.getDate(), 28);
            } else {
              billingDay = 1;
            }
          } else {
            const parsedBilling = parseInt(rawBilling);
            // If it's a simple number like "5"
            if (!isNaN(parsedBilling) && parsedBilling >= 1 && parsedBilling <= 31) {
              billingDay = Math.min(parsedBilling, 28); // Cap at 28 for safety
            } else {
              // Maybe it's a date string
              const bDate = parseDateValue(rawBilling);
              if (isValid(bDate)) {
                billingDay = Math.min(bDate.getDate(), 28);
              } else {
                throw new Error(`Invalid billing day: ${record.billingDay}`);
              }
            }
          }
        } else if (startDate) {
          billingDay = Math.min(startDate.getDate(), 28);
        } else {
          billingDay = 1;
        }

        // Prepare data
        const memberData = {
          name: { ar: nameValue, en: nameValue },
          phone: record.phone || "",
          governorate: record.governorate || record.province || "", // Support both column names
        };
        if (startDate) {
          memberData.startDate = startDate;
        }
        // If end date is provided, use it directly
        if (endDate) {
          memberData.nextDueDate = endDate;
        }
        // Handle billingDay for backward compatibility (only if no end date)
        if (!endDate && billingDay) {
          memberData.billingDay = billingDay;
        }

        if (sheetName) {
          memberData.sheetName = sheetName;
        }

        if (pkg) {
          memberData.packageId = pkg._id;
          memberData.packagePrice = pkg.price;
        }

        // Create member
        if (selectedGroup) {
          if (selectedGroup.teacherType === "subscription") {
            const subscriptionTeacher = subscriptionTeachersMap.get(
              String(selectedGroup.subscriptionTeacherId || "")
            );
            memberData.assignedTeacherName =
              subscriptionTeacher?.name?.ar ||
              subscriptionTeacher?.name?.en ||
              subscriptionTeacher?.email ||
              "";
          } else if (selectedGroup?.teacherId?._id || selectedGroup?.teacherId?.id) {
            memberData.assignedTeacherId = selectedGroup.teacherId._id || selectedGroup.teacherId.id;
          }
        }

        const createdMember = await this.createMember(memberData, createdBy);

        if (selectedGroup && createdMember?._id) {
          const alreadyInGroup = selectedGroup.students?.some(
            (s) => s.studentId?.toString() === createdMember._id.toString()
          );
          if (!alreadyInGroup) {
            selectedGroup.students.push({
              studentId: createdMember._id,
              assignedDate: new Date(),
              status: "active",
            });
            selectedGroup.updatedBy = createdBy;
            await selectedGroup.save();
            const teacherId = selectedGroup.teacherId?._id || selectedGroup.teacherId?.id || selectedGroup.teacherId;
            if (teacherId) {
              affectedTeacherIds.add(String(teacherId));
            }
          }
        }
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: index + 2, // 1-based index + header
          name: record.name,
          error: error.message
        });
      }
    }

    if (affectedTeacherIds.size > 0) {
      try {
        await Promise.all(
          Array.from(affectedTeacherIds).map((id) => teacherGroupService.updateTeacherInfo(id))
        );
      } catch (err) {
        logger.error("Failed to update teacher info after import", { error: err.message });
      }
    }

    return results;
  }

  // Import simple members from CSV (name + date only)
  async importSimpleMembers(fileBuffer, createdBy, sheetName = "") {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: []
    };

    const parseDateValue = (dateStr) => {
      if (!dateStr) return null;
      const raw = String(dateStr).trim();
      if (!raw) return null;
      let date = new Date(raw);
      if (isValid(date)) return date;
      const parts = raw.split(/[/-]/);
      if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) {
          year = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1;
          day = parseInt(parts[2]);
        } else {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1;
          year = parseInt(parts[2]);
        }
        date = new Date(year, month, day);
        if (isValid(date)) return date;
      }
      return null;
    };

    for (const [index, record] of records.entries()) {
      try {
        const nameValue = (record.name || record.الاسم || "").trim();
        if (!nameValue) {
          throw new Error('Missing required field: name');
        }

        const dateInput =
          record.date ||
          record.التاريخ ||
          record['start date'] ||
          record['start time'] ||
          record.startDate ||
          "";

        const issuedDate = parseDateValue(dateInput);
        const dateRaw = String(dateInput || "").trim();
        if (dateRaw && !issuedDate) {
          throw new Error(`Invalid date: ${dateInput}`);
        }

        const startDate = issuedDate || new Date();
        // For simple sheets, nextDueDate = startDate (no renewal logic needed)
        const nextDueDate = issuedDate || new Date();

        const memberData = {
          name: { ar: nameValue, en: nameValue },
          phone: "",
          governorate: "",
          startDate,
          nextDueDate,
          billingDay: Math.min(startDate.getDate(), 28),
          sheetName: sheetName || "",
          // Mark as simple sheet via notes
          notes: `simple_sheet:${sheetName}`,
        };

        await this.createMember(memberData, createdBy);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: index + 2,
          name: record.name || record.الاسم || "",
          error: error.message
        });
      }
    }

    return results;
  }

  // Get all student members with filters
  async getAllMembers(filters = {}, options = {}) {
    const { status, assignedTeacherId, governorate, packageId, search } = filters;

    const query = {};

    if (status) query.status = status;
    if (assignedTeacherId) query.assignedTeacherId = assignedTeacherId;
    if (governorate) query.governorate = governorate;
    if (packageId) query.packageId = packageId;

    if (search) {
      query.$or = [
        { "name.ar": { $regex: search, $options: "i" } },
        { "name.en": { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const { page = 1, limit = 10, sort = "-createdAt" } = options;
    const skip = (page - 1) * limit;

    const members = await StudentMember.find(query)
      .populate("assignedTeacherId", "fullName email")
      .populate("userId", "fullName email")
      .populate("packageId", "name type")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await StudentMember.countDocuments(query);

    return {
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get member by ID
  async getMemberById(memberId) {
    const member = await StudentMember.findById(memberId)
      .populate("assignedTeacherId", "name email phone")
      .populate("userId", "name email phone")
      .populate("renewalHistory.renewedBy", "name email")
      .populate("packageId", "name type description");

    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    return member;
  }

  // Get subscriptions by user ID
  async getSubscriptionsByUserId(userId) {
    const subscriptions = await StudentMember.find({ userId })
      .populate("assignedTeacherId", "name email phone")
      .populate("packageId", "name type description")
      .sort("-createdAt");

    return subscriptions;
  }

  // Create new member
  async createMember(memberData, createdBy) {
    const startDate = memberData.startDate || new Date();

    // Use provided endDate/nextDueDate directly, or calculate if not provided
    let nextDueDate = memberData.nextDueDate || memberData.endDate;

    const member = new StudentMember({
      ...memberData,
      startDate,
      createdBy,
    });

    // If nextDueDate is provided directly, use it; otherwise calculate it
    if (nextDueDate) {
      member.nextDueDate = new Date(nextDueDate);
    } else {
      // Fallback: calculate based on package duration or default to 1 month
      member.nextDueDate = member.calculateNextDueDate(startDate);
    }

    // Set billingDay from the nextDueDate day for backward compatibility
    if (!member.billingDay && member.nextDueDate) {
      member.billingDay = Math.min(member.nextDueDate.getDate(), 28);
    }

    await member.save();

    logger.info("Student member created", { memberId: member._id, createdBy });

    return member;
  }

  // Update member
  async updateMember(memberId, updateData, updatedBy) {
    const member = await StudentMember.findById(memberId);
    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    Object.assign(member, updateData);
    member.updatedBy = updatedBy;
    await member.save();

    logger.info("Student member updated", { memberId, updatedBy });

    return member;
  }

  // Delete member
  async deleteMember(memberId) {
    const member = await StudentMember.findById(memberId);
    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    await member.deleteOne();

    logger.info("Student member deleted", { memberId });

    return { message: "Member deleted successfully" };
  }

  // Renew subscription
  async renewSubscription(memberId, renewedBy, note = "") {
    const member = await StudentMember.findById(memberId);
    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    await member.renew(renewedBy, note);

    logger.info("Subscription renewed", { memberId, renewedBy });

    return member;
  }

  // Get members due for renewal reminder
  async getMembersDueForReminder(remindBeforeDays = 2) {
    const members = await StudentMember.findDueForReminder(remindBeforeDays);

    return members.map((member) => ({
      ...member.toObject(),
      daysLeft: member.daysLeft,
    }));
  }

  async getMembersForReminder({
    remindBeforeDays = 2,
    scope = "due_soon",
    memberIds = [],
  } = {}) {
    const query = {
      status: { $in: ["active", "due_soon", "overdue"] },
    };

    if (Array.isArray(memberIds) && memberIds.length > 0) {
      query._id = { $in: memberIds };
    } else {
      const today = startOfDay(new Date());
      const dueThreshold = endOfDay(addDays(today, remindBeforeDays));

      if (scope === "overdue") {
        query.$or = [
          { status: "overdue" },
          { nextDueDate: { $lt: today } },
        ];
      } else if (scope === "all_due") {
        query.nextDueDate = { $lte: dueThreshold };
      } else {
        query.status = { $in: ["active", "due_soon"] };
        query.nextDueDate = {
          $gte: today,
          $lte: dueThreshold,
        };
      }
    }

    return StudentMember.find(query)
      .populate("assignedTeacherId", "fullName name email")
      .populate("packageId", "name")
      .sort({ nextDueDate: 1 });
  }

  getLocalizedValue(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value.ar || value.en || "";
  }

  getTeacherName(member) {
    if (!member) return "";

    if (member.assignedTeacherId?.fullName) {
      return this.getLocalizedValue(member.assignedTeacherId.fullName);
    }

    if (member.assignedTeacherId?.name) {
      return this.getLocalizedValue(member.assignedTeacherId.name);
    }

    return member.assignedTeacherName || "";
  }

  // Send WhatsApp reminder to a member
  async sendReminderToMember(memberId, messageTemplate) {
    const member = await StudentMember.findById(memberId)
      .populate("assignedTeacherId", "fullName name email")
      .populate("packageId", "name");

    if (!member) {
      throw new ApiError(404, "Member not found");
    }

    if (!member.phone) {
      throw new ApiError(400, "Member has no phone number");
    }

    // Build message from template
    const message = this.buildEnhancedReminderMessage(member, messageTemplate);

    // Send WhatsApp message
    try {
      await this.whatsappService.sendMessage(member.phone, message);

      // Update reminder tracking
      member.lastReminderSent = new Date();
      member.reminderCount += 1;
      await member.save();

      logger.info("WhatsApp reminder sent", {
        memberId,
        phone: member.phone,
      });

      return {
        success: true,
        message: "Reminder sent successfully",
        phone: member.phone,
      };
    } catch (error) {
      logger.error("Failed to send WhatsApp reminder", {
        memberId,
        error: error.message,
      });
      throw new ApiError(500, "Failed to send WhatsApp message");
    }
  }

  // Send bulk reminders to all due members
  async sendBulkReminders({
    remindBeforeDays = 2,
    messageTemplate = null,
    scope = "due_soon",
    memberIds = [],
  } = {}) {
    const members = await this.getMembersForReminder({
      remindBeforeDays,
      scope,
      memberIds,
    });

    const results = [];

    for (const member of members) {
      try {
        const result = await this.sendReminderToMember(member.id, messageTemplate);
        results.push({
          memberId: member.id,
          name: member.name,
          phone: member.phone,
          success: true,
        });
      } catch (error) {
        results.push({
          memberId: member.id,
          name: member.name,
          phone: member.phone,
          success: false,
          error: error.message,
        });
      }
    }

    logger.info("Bulk reminders sent", {
      total: members.length,
      scope,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }

  buildEnhancedReminderMessage(member, template) {
    const fallbackTemplate = `السلام عليكم {{name}}،

نذكركم بأن موعد تجديد الاشتراك {{statusLabel}}.
تاريخ الاستحقاق: {{dueDate}}
{{daysSummary}}
{{teacherLine}}
{{packageLine}}

للتجديد أو الاستفسار يمكنكم التواصل معنا على هذا الرقم.
مع خالص التحية`;

    const messageTemplate = template || fallbackTemplate;
    const dueDate = new Date(member.nextDueDate).toLocaleDateString("ar-EG");
    const rawDaysLeft = differenceInDays(
      startOfDay(new Date(member.nextDueDate)),
      startOfDay(new Date())
    );
    const teacherName = this.getTeacherName(member);
    const packageName = this.getLocalizedValue(member.packageId?.name);
    const statusLabel =
      rawDaysLeft < 0
        ? "متأخر"
        : rawDaysLeft === 0
          ? "اليوم"
          : "قريب";
    const daysSummary =
      rawDaysLeft < 0
        ? `الاشتراك متأخر منذ ${Math.abs(rawDaysLeft)} يوم`
        : rawDaysLeft === 0
          ? "موعد التجديد اليوم"
          : `متبقي ${rawDaysLeft} يوم على موعد التجديد`;
    const teacherLine = teacherName ? `المعلم/المعلمة: ${teacherName}` : "";
    const packageLine = packageName ? `الباقة: ${packageName}` : "";
    const memberName = this.getLocalizedValue(member.name);

    return messageTemplate
      .replace(/{{name}}/g, memberName)
      .replace(/{{dueDate}}/g, dueDate)
      .replace(/{{daysLeft}}/g, String(Math.max(rawDaysLeft, 0)))
      .replace(
        /{{daysOverdue}}/g,
        String(rawDaysLeft < 0 ? Math.abs(rawDaysLeft) : 0)
      )
      .replace(/{{daysSummary}}/g, daysSummary)
      .replace(/{{statusLabel}}/g, statusLabel)
      .replace(/{{teacherLine}}/g, teacherLine)
      .replace(/{{teacherName}}/g, teacherName)
      .replace(/{{packageLine}}/g, packageLine)
      .replace(/{{packageName}}/g, packageName)
      .replace(/{{phone}}/g, member.phone);
  }

  // Build reminder message from template
  buildReminderMessage(member, template) {
    if (!template) {
      // Default template
      template = `مرحباً {{name}}،

نذكرك بأن موعد تجديد اشتراكك في البرنامج سيكون في {{dueDate}}.

الأيام المتبقية: {{daysLeft}} يوم

يرجى التواصل معنا للتجديد.

شكراً لك 🌟`;
    }

    const dueDate = new Date(member.nextDueDate).toLocaleDateString("ar-SA");
    const daysLeft = member.daysLeft || 0;
    const teacherName = member.assignedTeacherId?.name || member.assignedTeacherName || "";

    return template
      .replace(/{{name}}/g, member.name.ar)
      .replace(/{{dueDate}}/g, dueDate)
      .replace(/{{daysLeft}}/g, daysLeft)
      .replace(/{{teacherName}}/g, teacherName)
      .replace(/{{phone}}/g, member.phone);
  }

  // Update all member statuses
  async updateAllStatuses(remindBeforeDays = 2) {
    const updatedCount = await StudentMember.updateAllStatuses(remindBeforeDays);

    logger.info("Member statuses updated", { updatedCount });

    return {
      message: "Statuses updated successfully",
      updatedCount,
    };
  }

  // Get statistics
  async getStatistics() {
    const [
      totalMembers,
      activeMembers,
      dueSoonMembers,
      overdueMembers,
      pausedMembers,
    ] = await Promise.all([
      StudentMember.countDocuments(),
      StudentMember.countDocuments({ status: "active" }),
      StudentMember.countDocuments({ status: "due_soon" }),
      StudentMember.countDocuments({ status: "overdue" }),
      StudentMember.countDocuments({ status: "paused" }),
    ]);

    // Get members by teacher
    const membersByTeacher = await StudentMember.aggregate([
      {
        $group: {
          _id: "$assignedTeacherId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
      {
        $unwind: "$teacher",
      },
      {
        $project: {
          teacherId: "$_id",
          teacherName: "$teacher.name",
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return {
      total: totalMembers,
      byStatus: {
        active: activeMembers,
        dueSoon: dueSoonMembers,
        overdue: overdueMembers,
        paused: pausedMembers,
      },
      byTeacher: membersByTeacher,
    };
  }

  // Export members to CSV
  async exportMembersToCSV(filters = {}) {
    const { status, assignedTeacherId, assignedTeacherName, governorate, packageId, search } = filters;

    const query = {};

    if (status) query.status = status;
    if (assignedTeacherId) query.assignedTeacherId = assignedTeacherId;
    if (assignedTeacherName) query.assignedTeacherName = assignedTeacherName;
    if (governorate) query.governorate = governorate;
    if (packageId) query.packageId = packageId;

    if (search) {
      query.$or = [
        { "name.ar": { $regex: search, $options: "i" } },
        { "name.en": { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const members = await StudentMember.find(query)
      .populate("assignedTeacherId", "fullName email")
      .populate("userId", "fullName email")
      .populate("packageId", "name")
      .sort("-createdAt");

    // Build CSV content
    const headers = [
      "Name (AR)",
      "Name (EN)",
      "Phone",
      "Governorate",
      "Package",
      "Teacher",
      "Start Date",
      "Next Due Date",
      "Status",
      "Notes"
    ];

    const rows = members.map(member => {
      const teacherName = member.assignedTeacherId
        ? (member.assignedTeacherId.fullName?.ar || member.assignedTeacherId.fullName?.en || member.assignedTeacherId.email || "")
        : (member.assignedTeacherName || "");

      const packageName = member.packageId
        ? (member.packageId.name?.ar || member.packageId.name?.en || "")
        : "";

      return [
        member.name?.ar || "",
        member.name?.en || "",
        member.phone || "",
        member.governorate || "",
        packageName,
        teacherName,
        member.startDate ? new Date(member.startDate).toISOString().split('T')[0] : "",
        member.nextDueDate ? new Date(member.nextDueDate).toISOString().split('T')[0] : "",
        member.status || "",
        (member.notes || "").replace(/[\r\n]+/g, " ").replace(/"/g, '""')
      ];
    });

    // Escape CSV values
    const escapeCSV = (value) => {
      if (typeof value !== 'string') return value;
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV string
    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ];

    return csvLines.join('\n');
  }
}
