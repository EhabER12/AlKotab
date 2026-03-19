import { SettingsRepository } from "../repositories/settingsRepository.js";
import { EmailService } from "./emailService.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SettingsService {
  constructor() {
    this.settingsRepository = new SettingsRepository();
    this.emailService = new EmailService();
    this.uploadsDir = path.resolve(__dirname, "../../uploads");
    // Encryption settings for API keys
    this.algorithm = "aes-256-cbc";
    this.encryptionKey = this.getEncryptionKey();
  }

  getEncryptionKey() {
    // Use JWT_SECRET as base for encryption key, or generate a default one
    const secret = process.env.JWT_SECRET || "default-encryption-key-change-in-production";
    // Create a 32-byte key from the secret
    return crypto.createHash("sha256").update(secret).digest();
  }

  encryptApiKey(text) {
    if (!text) return "";
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      // Return IV + encrypted data
      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      console.error("Error encrypting API key:", error);
      return "";
    }
  }

  decryptApiKey(encryptedText) {
    if (!encryptedText) return "";
    try {
      const parts = encryptedText.split(":");
      if (parts.length !== 2) return "";
      
      const iv = Buffer.from(parts[0], "hex");
      const encryptedData = parts[1];
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("Error decrypting API key:", error);
      return "";
    }
  }

  async getSettings() {
    return this.settingsRepository.getSettings();
  }

  async getPublicSettings() {
    return this.settingsRepository.getPublicSettings();
  }

  fileExists(filePath) {
    try {
      if (!filePath) return false;
      return fs.existsSync(filePath);
    } catch (error) {
      console.error(`Error checking if file exists: ${filePath}`, error);
      return false;
    }
  }

  safeDeleteFile(filePath) {
    try {
      if (this.fileExists(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting file: ${filePath}`, error);
      return false;
    }
  }

  ensureUploadsDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  getPublicUrl(filePath) {
    if (!filePath) return null;

    const filename = path.basename(filePath);

    return `/uploads/${filename}`;
  }

  async updateSettings(
    settingsData,
    userId,
    logoFile,
    faviconFile,
    logoArFile,
    heroBackgroundFile
  ) {
    // Ensure uploads directory exists
    this.ensureUploadsDirectory();

    const jsonFields = [
      "socialLinks",
      "notifications",
      "paymentGateways",
      "headerDisplay",
      "marketingBanners",
      "theme",
      "navbarLinks",
      "homepageSections",
      "promoModal",
      "homepageBanner",
      "homepageCourses",
      "coursesPageHero",
      "booksPageHero",
      "productsPageHero",
      "articlesPageHero",
      "homepageArticlesSection",
      "emailSettings",
      "authSettings",
      "authorityBar",
      "reviewsSettings",
      "whyGenounSettings",
      "financeSettings",
      "apiKeys",
      "whatsappSettings",
      "whatsappTemplates",
      "subscriptionTeachers",
      "subscriptionStudentProfitSettings",
      "heroStats",
    ];
    for (const field of jsonFields) {
      if (typeof settingsData[field] === "string") {
        try {
          settingsData[field] = JSON.parse(settingsData[field]);
        } catch (error) {
          console.error(`Error parsing ${field}:`, error);
          throw new Error(`Invalid ${field} format`);
        }
      }
    }

    // Sanitize marketing banners to remove temporary IDs
    if (
      settingsData.marketingBanners &&
      Array.isArray(settingsData.marketingBanners.banners)
    ) {
      settingsData.marketingBanners.banners =
        settingsData.marketingBanners.banners.map((banner) => {
          const { _id, ...rest } = banner;
          // If _id is a temporary string (starts with 'temp-'), remove it entirely so Mongoose generates a new ObjectId
          // If it's a valid ObjectId string, keep it (or let Mongoose handle it)
          if (_id && typeof _id === "string" && _id.startsWith("temp-")) {
            return rest;
          }
          return banner;
        });
    }

    if (settingsData.whatsappSettings) {
      settingsData.whatsappSettings = {
        ...settingsData.whatsappSettings,
        lastUpdated: new Date(),
      };
    }

    // Get current settings
    const currentSettings = await this.settingsRepository.getSettings();

    // Handle logo file if provided
    if (logoFile) {
      // Delete old logo if exists
      if (currentSettings.logo) {
        // Remove the base URL part to get the actual file path
        const oldLogoPath = currentSettings.logo.startsWith("/uploads/")
          ? path.join(this.uploadsDir, path.basename(currentSettings.logo))
          : currentSettings.logo;

        this.safeDeleteFile(oldLogoPath);
      }

      // Store the public URL path instead of the file system path
      settingsData.logo = this.getPublicUrl(logoFile.path);
    }

    // Handle ARABIC logo file if provided
    if (logoArFile) {
      // Delete old logo_ar if exists
      if (currentSettings.logo_ar) {
        const oldLogoArPath = currentSettings.logo_ar.startsWith("/uploads/")
          ? path.join(this.uploadsDir, path.basename(currentSettings.logo_ar))
          : currentSettings.logo_ar;

        this.safeDeleteFile(oldLogoArPath);
      }

      settingsData.logo_ar = this.getPublicUrl(logoArFile.path);
    }

    if (faviconFile) {
      if (currentSettings.favicon) {
        const oldFaviconPath = currentSettings.favicon.startsWith("/uploads/")
          ? path.join(this.uploadsDir, path.basename(currentSettings.favicon))
          : currentSettings.favicon;

        this.safeDeleteFile(oldFaviconPath);
      }

      settingsData.favicon = this.getPublicUrl(faviconFile.path);
    }

    // Handle Hero Background file if provided
    if (heroBackgroundFile) {
      // Initialize homepageSections if not exists in settingsData
      if (!settingsData.homepageSections) {
        settingsData.homepageSections = currentSettings.homepageSections || {};
      }
      if (!settingsData.homepageSections.hero) {
        settingsData.homepageSections.hero = currentSettings.homepageSections?.hero || {};
      }

      // Delete old background if exists
      const oldBg = currentSettings.homepageSections?.hero?.backgroundImage;
      if (oldBg) {
        const oldBgPath = oldBg.startsWith("/uploads/")
          ? path.join(this.uploadsDir, path.basename(oldBg))
          : oldBg;
        this.safeDeleteFile(oldBgPath);
      }

      settingsData.homepageSections.hero.backgroundImage = this.getPublicUrl(heroBackgroundFile.path);
    }

    // Handle API keys encryption
    if (settingsData.apiKeys) {
      const apiKeys = { ...settingsData.apiKeys };
      
      // Encrypt Gemini API key if provided
      if (apiKeys.geminiApiKey && apiKeys.geminiApiKey.trim()) {
        apiKeys.geminiApiKey = this.encryptApiKey(apiKeys.geminiApiKey.trim());
      }
      
      // Encrypt Google Cloud credentials if provided
      if (apiKeys.googleCloudCredentials && apiKeys.googleCloudCredentials.trim()) {
        apiKeys.googleCloudCredentials = this.encryptApiKey(apiKeys.googleCloudCredentials.trim());
      }
      
      apiKeys.lastUpdated = new Date();
      settingsData.apiKeys = apiKeys;
    }

    return this.settingsRepository.updateSettings(settingsData, userId);
  }

  async getDecryptedApiKeys() {
    const settings = await this.settingsRepository.getSettings();
    if (!settings || !settings.apiKeys) {
      return {
        geminiApiKey: "",
        googleCloudCredentials: "",
      };
    }

    return {
      geminiApiKey: this.decryptApiKey(settings.apiKeys.geminiApiKey || ""),
      googleCloudCredentials: this.decryptApiKey(settings.apiKeys.googleCloudCredentials || ""),
    };
  }
}
