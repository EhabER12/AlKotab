import { UserRepository } from "../repositories/userRepository.js";
import { ApiError } from "../utils/apiError.js";
import {
  generateToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  generateSecureToken,
  hashToken,
} from "../utils/jwtUtils.js";
import emailTemplateService from "./emailTemplateService.js";
import { EmailService } from "./emailService.js";
import Settings from "../models/settingsModel.js";
import logger from "../utils/logger.js";

// Password reset token expiry (1 hour)
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000;
// Email verification token expiry (24 hours)
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000;

export class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
  }

  async isEmailVerificationRequired() {
    try {
      const settings = await Settings.findOne().select(
        "authSettings.requireEmailVerification"
      );
      const settingsValue = settings?.authSettings?.requireEmailVerification;
      if (typeof settingsValue === "boolean") {
        return settingsValue;
      }
    } catch (error) {
      logger.warn("Failed to read auth settings, using env fallback", {
        error: error.message,
      });
    }

    // Fallback for old environments that still use env-only control
    return process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
  }

  async register(userData) {
    const { email, password, confirmPassword, fullName, phone, role } = userData;

    // Check if passwords match
    if (password !== confirmPassword) {
      throw new ApiError(400, "Passwords do not match");
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError(400, "User already exists");
    }

    // Validate and set role (only allow 'user' or 'teacher' for public registration)
    let userRole = "user"; // default
    if (role && ["user", "teacher"].includes(role)) {
      userRole = role;
    }

    const requireEmailVerification = await this.isEmailVerificationRequired();
    const verificationToken = requireEmailVerification
      ? generateSecureToken(32)
      : null;
    const hashedVerificationToken =
      requireEmailVerification && verificationToken
        ? hashToken(verificationToken)
        : undefined;

    // Prepare user data
    const userPayload = {
      fullName,
      email,
      phone,
      password,
      role: userRole,
      isEmailVerified: !requireEmailVerification,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: requireEmailVerification
        ? new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY)
        : undefined,
    };

    // If registering as teacher, require approval
    if (userRole === "teacher") {
      userPayload.teacherInfo = {
        isApproved: false,
        bio: "",
        specialization: "",
      };
    }

    // Create user
    const user = await this.userRepository.create(userPayload);

    if (requireEmailVerification && verificationToken) {
      await this.sendVerificationEmail(user, verificationToken);
    }

    logger.info("New user registered", { userId: user._id, email: user.email });

    if (requireEmailVerification) {
      return {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: false,
        message: "Registration successful. Please check your email to verify your account.",
        requiresVerification: true // Flag for frontend
      };
    }

    // Generate tokens and allow immediate access if verification is disabled
    await this.sendStudentWelcomeEmail(user);
    const tokens = generateTokenPair(user._id);

    return {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      message: "Registration successful",
    };
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(user, token) {
    const verifyUrl = `${process.env.CLIENT_URL || process.env.WEBSITE_URL}/ar/verify-email?token=${token}`;

    try {
      await emailTemplateService.sendTemplatedEmail(
        user.email,
        "email_verification",
        {
          name: user.fullName?.ar || user.fullName?.en || user.fullName || user.name || "User",
          verifyUrl: verifyUrl,
          year: new Date().getFullYear(),
        },
        "ar"
      );
      logger.info("Verification email sent using template", { userId: user._id, email: user.email });
    } catch (error) {
      logger.error("Failed to send verification email using template", { error: error.message, userId: user._id });
      // Fallback to basic email if template fails (optional)
    }
  }

  async sendStudentWelcomeEmail(user, lang = "ar") {
    if (!user || user.role !== "user") return;

    const baseUrl = process.env.CLIENT_URL || process.env.WEBSITE_URL || "";
    const loginUrl = `${baseUrl}/ar/login`;

    try {
      await emailTemplateService.sendTemplatedEmail(
        user.email,
        "student_welcome",
        {
          name: user.fullName?.ar || user.fullName?.en || "Student",
          loginUrl,
          year: new Date().getFullYear(),
        },
        lang
      );
      logger.info("Student welcome email sent", { userId: user._id, email: user.email });
    } catch (error) {
      // Don't block auth flow if this email fails
      logger.warn("Failed to send student welcome email", {
        userId: user._id,
        error: error.message,
      });
    }
  }

  async login(email, password) {
    // Find user with password for authentication
    const user = await this.userRepository.findByEmail(email, true);

    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    // Check if user is active
    if (user.status !== "active") {
      throw new ApiError(401, "Your account is inactive");
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      throw new ApiError(401, "Invalid email or password");
    }

    const requireEmailVerification = await this.isEmailVerificationRequired();
    if (requireEmailVerification && !user.isEmailVerified) {
      throw new ApiError(403, "Please verify your email before logging in. Check your inbox or request a new verification email.");
    }

    // Generate token pair
    const tokens = generateTokenPair(user._id);

    logger.info("User logged in", { userId: user._id, email: user.email });

    // Prepare response data
    const responseData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };

    // Include teacherInfo for teachers
    if (user.role === "teacher" && user.teacherInfo) {
      responseData.teacherInfo = {
        isApproved: user.teacherInfo.isApproved,
        bio: user.teacherInfo.bio,
        specialization: user.teacherInfo.specialization,
        canPublishDirectly: user.teacherInfo.canPublishDirectly,
      };
    }

    if (user.role === "moderator") {
      responseData.employeeInfo = {
        dashboardAccess: Array.isArray(user.employeeInfo?.dashboardAccess)
          ? user.employeeInfo.dashboardAccess
          : undefined,
      };
    }

    return responseData;
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const profileData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
    };

    if (user.role === "moderator") {
      profileData.employeeInfo = {
        dashboardAccess: Array.isArray(user.employeeInfo?.dashboardAccess)
          ? user.employeeInfo.dashboardAccess
          : undefined,
      };
    }

    return profileData;
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token) {
    const hashedToken = hashToken(token);

    // Find user with this verification token
    const user = await this.userRepository.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    await this.sendStudentWelcomeEmail(user);

    logger.info("Email verified", { userId: user._id, email: user.email });

    return { success: true, email: user.email };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    const user = await this.userRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      logger.debug("Resend verification requested for non-existent email", { email });
      return { success: true };
    }

    // Check if already verified
    if (user.isEmailVerified) {
      throw new ApiError(400, "Email is already verified");
    }

    // Generate new verification token
    const verificationToken = generateSecureToken(32);
    const hashedVerificationToken = hashToken(verificationToken);

    // Update user with new token
    await this.userRepository.update(user._id, {
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY),
    });

    // Send verification email
    await this.sendVerificationEmail(user, verificationToken);

    return { success: true };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken, "refresh");

      // Get user
      const user = await this.userRepository.findById(decoded.id);

      if (!user || user.status !== "active") {
        throw new ApiError(401, "Invalid refresh token");
      }

      // Generate new token pair
      const tokens = generateTokenPair(user._id);

      logger.debug("Token refreshed", { userId: user._id });

      return {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      logger.warn("Token refresh failed", { error: error.message });
      throw new ApiError(401, "Invalid or expired refresh token");
    }
  }

  /**
   * Initiate password reset process
   */
  async forgotPassword(email, lang = "ar") {
    const user = await this.userRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      logger.debug("Password reset requested for non-existent email", { email });
      return { success: true };
    }

    // Generate reset token
    const resetToken = generateSecureToken(32);
    const hashedToken = hashToken(resetToken);

    // Save hashed token to user
    await this.userRepository.update(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_EXPIRY),
    });

    // Build reset URL
    const resetUrl = `${process.env.CLIENT_URL || process.env.WEBSITE_URL}/ar/reset-password?token=${resetToken}`;

    // Send email
    try {
      await emailTemplateService.sendTemplatedEmail(
        user.email,
        "password_reset",
        {
          name: user.fullName?.en || user.fullName?.ar || "User",
          resetUrl: resetUrl,
          year: new Date().getFullYear(),
        },
        lang
      );

      logger.info("Password reset email sent using template", { userId: user._id, email: user.email, lang });
    } catch (error) {
      // Clear the reset token if email fails
      await this.userRepository.update(user._id, {
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });

      logger.error("Failed to send password reset email", { error: error.message, userId: user._id });
      throw new ApiError(500, "Failed to send reset email. Please try again later.");
    }

    return { success: true };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token, newPassword, lang = "ar") {
    // Hash the provided token
    const hashedToken = hashToken(token);

    // Find user with this token that hasn't expired
    const user = await this.userRepository.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info("Password reset successful", { userId: user._id, email: user.email });

    // Optionally send confirmation email
    try {
      await emailTemplateService.sendTemplatedEmail(
        user.email,
        "password_reset_confirmation",
        {
          name: user.fullName?.en || user.fullName?.ar || "User",
          year: new Date().getFullYear(),
        },
        lang
      );
    } catch (error) {
      // Don't throw error if confirmation email fails
      logger.warn("Failed to send password change confirmation email using template", { error: error.message });
    }

    return { success: true };
  }

  async completeRegistration(token, name, password) {
    const hashedToken = hashToken(token);

    const user = await this.userRepository.findOne({
      verificationToken: hashedToken,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired token");
    }

    user.fullName = {
      ar: name,
      en: name,
    };
    user.password = password;
    user.status = "active";
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;

    await user.save();
    await this.sendStudentWelcomeEmail(user);

    const tokens = generateTokenPair(user._id);

    logger.info("User registration completed", { userId: user._id, email: user.email });

    return {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  // Update login tracking info for employees/admins
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
}
