import { StudentMemberService } from "../services/studentMemberService.js";

const studentMemberService = new StudentMemberService();

// @desc    Get all student members
// @route   GET /api/student-members
// @access  Private (Admin, Moderator)
export const getMembers = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      assignedTeacherId: req.query.assignedTeacherId,
      governorate: req.query.governorate,
      packageId: req.query.packageId,
      search: req.query.search,
    };

    const options = {
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sort: req.query.sort || "-createdAt",
    };

    const result = await studentMemberService.getAllMembers(filters, options);

    res.status(200).json({
      success: true,
      data: result.members,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get member by ID
// @route   GET /api/student-members/:id
// @access  Private (Admin, Moderator, or Owner)
export const getMember = async (req, res, next) => {
  try {
    const member = await studentMemberService.getMemberById(req.params.id);

    // Check if the user is authorized to view this member
    if (
      req.user.role !== "admin" &&
      req.user.role !== "moderator" &&
      member.userId._id.toString() !== req.user._id.toString()
    ) {
      throw new ApiError(403, "Not authorized to access this member");
    }

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user subscriptions
// @route   GET /api/student-members/my
// @access  Private
export const getMySubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await studentMemberService.getSubscriptionsByUserId(
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new member
// @route   POST /api/student-members
// @access  Private (Admin, Moderator)
export const createMember = async (req, res, next) => {
  try {
    const member = await studentMemberService.createMember(
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: member,
      message: "Member created successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update member
// @route   PUT /api/student-members/:id
// @access  Private (Admin, Moderator)
export const updateMember = async (req, res, next) => {
  try {
    const member = await studentMemberService.updateMember(
      req.params.id,
      req.body,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: member,
      message: "Member updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete member
// @route   DELETE /api/student-members/:id
// @access  Private (Admin)
export const deleteMember = async (req, res, next) => {
  try {
    const result = await studentMemberService.deleteMember(req.params.id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Renew subscription
// @route   POST /api/student-members/:id/renew
// @access  Private (Admin, Moderator)
export const renewSubscription = async (req, res, next) => {
  try {
    const { note } = req.body;
    const member = await studentMemberService.renewSubscription(
      req.params.id,
      req.user._id,
      note
    );

    res.status(200).json({
      success: true,
      data: member,
      message: "Subscription renewed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get members due for renewal reminder
// @route   GET /api/student-members/due-soon
// @access  Private (Admin, Moderator)
export const getMembersDueSoon = async (req, res, next) => {
  try {
    const remindBeforeDays = req.query.remindBeforeDays || 2;

    const members = await studentMemberService.getMembersDueForReminder(
      parseInt(remindBeforeDays)
    );

    res.status(200).json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send WhatsApp reminder to member
// @route   POST /api/student-members/:id/whatsapp
// @access  Private (Admin, Moderator)
export const sendWhatsAppReminder = async (req, res, next) => {
  try {
    const messageTemplate = req.body.messageTemplate || null;

    const result = await studentMemberService.sendReminderToMember(
      req.params.id,
      messageTemplate
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send bulk WhatsApp reminders
// @route   POST /api/student-members/bulk-reminders
// @access  Private (Admin, Moderator)
export const sendBulkReminders = async (req, res, next) => {
  try {
    const remindBeforeDays = req.body.remindBeforeDays || 2;
    const messageTemplate = req.body.messageTemplate || null;
    const scope = req.body.scope || "due_soon";
    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];

    const results = await studentMemberService.sendBulkReminders({
      remindBeforeDays: parseInt(remindBeforeDays),
      messageTemplate,
      scope,
      memberIds,
    });

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Reminders sent: ${successCount} successful, ${failedCount} failed`,
      results,
      summary: {
        scope,
        total: results.length,
        successful: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update all member statuses
// @route   POST /api/student-members/update-statuses
// @access  Private (Admin)
export const updateStatuses = async (req, res, next) => {
  try {
    const remindBeforeDays = req.body.remindBeforeDays || 2;

    const result = await studentMemberService.updateAllStatuses(
      parseInt(remindBeforeDays)
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get statistics
// @route   GET /api/student-members/stats
// @access  Private (Admin, Moderator)
export const getStatistics = async (req, res, next) => {
  try {
    const stats = await studentMemberService.getStatistics();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Import members from CSV
// @route   POST /api/student-members/import
// @access  Private (Admin)
export const importMembers = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const sheetName = req.body?.sheetName?.trim();
    if (!sheetName) {
      throw new Error('Sheet name is required');
    }

    const result = await studentMemberService.importMembers(
      req.file.buffer,
      req.user._id,
      sheetName
    );

    res.status(200).json({
      success: true,
      message: `Import processed: ${result.success} succeeded, ${result.failed} failed`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import simple members from CSV (name + date only)
// @route   POST /api/student-members/import-simple
// @access  Private (Admin)
export const importSimpleMembers = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const sheetName = req.body?.sheetName?.trim();
    if (!sheetName) {
      throw new Error('Sheet name is required');
    }

    const result = await studentMemberService.importSimpleMembers(
      req.file.buffer,
      req.user._id,
      sheetName
    );

    res.status(200).json({
      success: true,
      message: `Import processed: ${result.success} succeeded, ${result.failed} failed`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export members to CSV
// @route   GET /api/student-members/export
// @access  Private (Admin, Moderator)
export const exportMembers = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      assignedTeacherId: req.query.assignedTeacherId,
      assignedTeacherName: req.query.assignedTeacherName,
      governorate: req.query.governorate,
      packageId: req.query.packageId,
      search: req.query.search,
    };

    const csvData = await studentMemberService.exportMembersToCSV(filters);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=student_members_export_${Date.now()}.csv`
    );
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};
