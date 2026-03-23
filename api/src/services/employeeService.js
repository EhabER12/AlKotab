import { UserRepository } from "../repositories/userRepository.js";
import { EmployeeTaskRepository } from "../repositories/employeeTaskRepository.js";
import { EmployeeRecordRepository } from "../repositories/employeeRecordRepository.js";
import { SettingsRepository } from "../repositories/settingsRepository.js";
import { ApiError } from "../utils/apiError.js";
import EmployeeTask from "../models/employeeTaskModel.js";
import emailTemplateService from "./emailTemplateService.js";
import logger from "../utils/logger.js";

export class EmployeeService {
  constructor() {
    this.userRepository = new UserRepository();
    this.taskRepository = new EmployeeTaskRepository();
    this.recordRepository = new EmployeeRecordRepository();
    this.settingsRepository = new SettingsRepository();
  }

  getDisplayName(user) {
    if (!user) return "";
    return (
      user.fullName?.ar ||
      user.fullName?.en ||
      user.name ||
      user.email ||
      ""
    );
  }

  formatDateValue(dateValue) {
    if (!dateValue) return "-";
    try {
      return new Date(dateValue).toISOString().slice(0, 10);
    } catch {
      return "-";
    }
  }

  async getAdminRecipients() {
    try {
      const settings = await this.settingsRepository.getSettings();
      const recipients = [
        ...(settings?.notifications?.email?.recipients || []),
      ];
      if (recipients.length > 0) return recipients;
      if (process.env.EMAIL_USER) return [process.env.EMAIL_USER];
      return [];
    } catch (error) {
      logger.error("Failed to load admin email recipients", {
        error: error.message,
      });
      return [];
    }
  }

  async notifyEmployeeTaskAssigned(employee, task, assignedBy) {
    try {
      if (!employee?.email) return;

      const assignedByUser = assignedBy
        ? await this.userRepository.findById(assignedBy, {
            select: "fullName email",
          })
        : null;

      const adminUrl = process.env.ADMIN_URL || "http://localhost:3001";
      const tasksUrl = `${adminUrl}/dashboard/my-tasks`;

      const variables = {
        employeeName: this.getDisplayName(employee),
        taskTitle: task?.title?.ar || task?.title?.en || "-",
        taskDescription: task?.description?.ar || task?.description?.en || "-",
        dueDate: this.formatDateValue(task?.dueDate),
        priority: task?.priority || "-",
        assignedBy: this.getDisplayName(assignedByUser) || "Admin",
        tasksUrl,
        year: new Date().getFullYear(),
      };

      await emailTemplateService.sendTemplatedEmail(
        employee.email,
        "employee_task_assigned",
        variables
      );
    } catch (error) {
      logger.error("Failed to send task assigned email to employee", {
        error: error.message,
        taskId: task?._id || task?.id,
      });
    }
  }

  async notifyAdminTaskCompleted(task) {
    try {
      const recipients = await this.getAdminRecipients();
      if (!recipients.length) return;

      const employee = await this.userRepository.findById(task.employeeId, {
        select: "fullName email",
      });

      const adminUrl = process.env.ADMIN_URL || "http://localhost:3001";
      const tasksUrl = `${adminUrl}/dashboard/employees/${task.employeeId}`;

      const variables = {
        employeeName: this.getDisplayName(employee),
        taskTitle: task?.title?.ar || task?.title?.en || "-",
        status: task?.status || "completed",
        completedAt: this.formatDateValue(task?.completedAt || new Date()),
        tasksUrl,
        year: new Date().getFullYear(),
      };

      await emailTemplateService.sendTemplatedEmail(
        recipients.join(","),
        "admin_task_completed",
        variables
      );
    } catch (error) {
      logger.error("Failed to send task completion email to admin", {
        error: error.message,
        taskId: task?._id || task?.id,
      });
    }
  }

  // Get all employees (users with moderator role)
  async getAllEmployees(queryParams = {}) {
    const { page, limit, search, status } = queryParams;

    const filter = { role: "moderator" };
    if (status) {
      filter.status = status;
    }

    const options = {
      page,
      limit,
      filter,
      select: "-password -verificationToken -verificationTokenExpire",
    };

    if (search) {
      return this.userRepository.search(search, { ...options, filter });
    }

    return this.userRepository.findAll(options);
  }

  // Get single employee with full details (for admin viewing any employee)
  async getEmployeeById(id) {
    const employee = await this.userRepository.findById(id, {
      select: "-password -verificationToken -verificationTokenExpire",
    });

    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    if (employee.role !== "moderator") {
      throw new ApiError(400, "User is not an employee/moderator");
    }

    // Get task stats
    const taskStats = await this.taskRepository.getStats(id);

    // Get recent records
    const records = await this.recordRepository.getEmployeeRecords(id, 6);

    return {
      ...employee.toObject(),
      taskStats,
      recentRecords: records,
    };
  }

  // Get own profile (for self-service, works for both moderator and admin)
  async getEmployeeProfile(userId) {
    const user = await this.userRepository.findById(userId, {
      select:
        "-password -verificationToken -verificationTokenExpire -adminNotes",
    });

    if (!user) {
      throw new ApiError(404, "Profile not found");
    }

    // Get task stats
    const taskStats = await this.taskRepository.getStats(userId);

    return {
      ...user.toObject(),
      taskStats,
    };
  }

  // Update own task status (self-service)
  async updateOwnTaskStatus(userId, taskId, status) {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    // Verify the task belongs to this employee
    if (task.employeeId.toString() !== userId.toString()) {
      throw new ApiError(403, "You can only update your own tasks");
    }

    // Only allow valid status transitions
    const validStatuses = ["pending", "in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status");
    }

    const isCompleting = status === "completed" && task.status !== "completed";

    if (isCompleting) {
      await this.recordRepository.incrementMetric(userId, "tasksCompleted");
    }

    const updateData = { status };
    if (isCompleting) {
      updateData.completedAt = new Date();
    }

    const updatedTask = await this.taskRepository.update(taskId, updateData);

    if (isCompleting) {
      await this.notifyAdminTaskCompleted(updatedTask);
    }

    return updatedTask;
  }

  // Update employee info
  async updateEmployee(id, updateData) {
    const employee = await this.userRepository.findById(id);

    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    if (employee.role !== "moderator") {
      throw new ApiError(400, "User is not an employee/moderator");
    }

    // Build update object for nested fields
    const update = {};

    if (updateData.employeeInfo) {
      Object.keys(updateData.employeeInfo).forEach((key) => {
        const value = updateData.employeeInfo[key];

        if (Array.isArray(value)) {
          update[`employeeInfo.${key}`] = value;
        } else if (value && typeof value === "object") {
          Object.keys(value).forEach((subKey) => {
            update[`employeeInfo.${key}.${subKey}`] =
              value[subKey];
          });
        } else {
          update[`employeeInfo.${key}`] = value;
        }
      });
    }

    // Allow updating basic info
    if (updateData.name) update.name = updateData.name;
    if (updateData.phone) update.phone = updateData.phone;
    if (updateData.status) update.status = updateData.status;

    return this.userRepository.update(id, update);
  }

  // Add admin note to employee
  async addNote(employeeId, note, adminId) {
    const employee = await this.userRepository.findById(employeeId);

    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    const newNote = {
      note,
      createdBy: adminId,
      createdAt: new Date(),
    };

    employee.adminNotes = employee.adminNotes || [];
    employee.adminNotes.push(newNote);

    await employee.save();

    return employee;
  }

  // Delete admin note
  async deleteNote(employeeId, noteId) {
    const employee = await this.userRepository.findById(employeeId);

    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }

    employee.adminNotes = employee.adminNotes.filter(
      (note) => note._id.toString() !== noteId
    );

    await employee.save();

    return employee;
  }

  // Update activity info (called from auth middleware)
  async updateActivity(userId, ipAddress) {
    const update = {
      "activityInfo.lastActivityAt": new Date(),
      "activityInfo.lastIpAddress": ipAddress,
    };

    return this.userRepository.update(userId, update);
  }

  // Update login info
  async updateLoginInfo(userId, ipAddress) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const update = {
      "activityInfo.lastLoginAt": new Date(),
      "activityInfo.lastIpAddress": ipAddress,
      "activityInfo.loginCount": (user.activityInfo?.loginCount || 0) + 1,
    };

    return this.userRepository.update(userId, update);
  }

  // ==================== TASK MANAGEMENT ====================

  // Get employee tasks
  async getEmployeeTasks(employeeId, queryParams = {}) {
    const { page, limit, status, weekOnly } = queryParams;

    const options = {
      page,
      limit,
      sort: { dueDate: 1, priority: -1 },
    };

    if (status) {
      options.filter = { status };
    }

    if (weekOnly) {
      const weekStart = EmployeeTask.getWeekStart();
      return this.taskRepository.findByEmployeeAndWeek(
        employeeId,
        weekStart,
        options
      );
    }

    return this.taskRepository.findByEmployeeId(employeeId, options);
  }

  // Create task for employee
  async createTask(employeeId, taskData, assignedBy) {
    const employee = await this.userRepository.findById(employeeId);

    if (!employee || employee.role !== "moderator") {
      throw new ApiError(404, "Employee not found");
    }

    const weekStart = EmployeeTask.getWeekStart(taskData.dueDate || new Date());

    const task = await this.taskRepository.create({
      ...taskData,
      employeeId,
      assignedBy,
      weekStart,
    });

    // Increment tasks assigned metric
    await this.recordRepository.incrementMetric(employeeId, "tasksAssigned");

    await this.notifyEmployeeTaskAssigned(employee, task, assignedBy);

    return task;
  }

  // Update task
  async updateTask(taskId, updateData) {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    const isCompleting =
      updateData.status === "completed" && task.status !== "completed";

    if (isCompleting) {
      updateData.completedAt = new Date();
      await this.recordRepository.incrementMetric(
        task.employeeId,
        "tasksCompleted"
      );
    }

    const updatedTask = await this.taskRepository.update(taskId, updateData);

    if (isCompleting) {
      await this.notifyAdminTaskCompleted(updatedTask);
    }

    return updatedTask;
  }

  // Delete task
  async deleteTask(taskId) {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    return this.taskRepository.delete(taskId);
  }

  // Get task statistics
  async getTaskStats(employeeId) {
    return this.taskRepository.getStats(employeeId);
  }

  // ==================== RECORD MANAGEMENT ====================

  // Get employee records
  async getEmployeeRecords(employeeId, limit = 12) {
    return this.recordRepository.getEmployeeRecords(employeeId, limit);
  }

  // Get specific month record
  async getMonthRecord(employeeId, year, month) {
    let record = await this.recordRepository.findByEmployeeAndMonth(
      employeeId,
      year,
      month
    );

    if (!record) {
      // Create it if it doesn't exist
      record = await this.recordRepository.create({
        employeeId,
        year,
        month,
      });
    }

    return record;
  }

  // Update/review record
  async updateRecord(recordId, updateData, reviewerId) {
    const record = await this.recordRepository.findById(recordId);

    if (!record) {
      throw new ApiError(404, "Record not found");
    }

    if (updateData.status === "reviewed" || updateData.status === "approved") {
      updateData.reviewedBy = reviewerId;
      updateData.reviewedAt = new Date();
    }

    return this.recordRepository.update(recordId, updateData);
  }

  // Generate monthly records for all employees
  async generateMonthlyRecords() {
    return this.recordRepository.generateMonthlyRecords();
  }
}
