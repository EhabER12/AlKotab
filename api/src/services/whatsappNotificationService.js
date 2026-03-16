import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import Settings from "../models/settingsModel.js";
import { ApiError } from "../utils/apiError.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppWebManager {
  constructor() {
    this.client = null;
    this.status = "disconnected";
    this.qrCode = "";
    this.phoneNumber = "";
    this.displayName = "";
    this.lastError = "";
    this.lastConnectedAt = null;
    this.initializationPromise = null;
    this.modulesPromise = null;
    this.isDisconnecting = false;
    this.clientId = process.env.WHATSAPP_CLIENT_ID || "genoun-admin";
    this.authPath = path.resolve(
      process.env.WHATSAPP_AUTH_PATH ||
        path.join(process.cwd(), ".wwebjs_auth") ||
        path.join(os.tmpdir(), "genoun-whatsapp-auth")
    );
    this.sessionPath = path.join(this.authPath, `session-${this.clientId}`);
  }

  buildConnectError(error, executablePath) {
    if (error instanceof ApiError) {
      return error;
    }

    const message = String(error?.message || error || "");
    const details = {
      originalError: message,
      authPath: this.authPath,
      executablePath: executablePath || null,
    };

    if (/Could not find Chrome|Could not find expected browser/i.test(message)) {
      return new ApiError(
        500,
        "Chrome or Chromium is not available on the server. Install it or set PUPPETEER_EXECUTABLE_PATH.",
        details
      );
    }

    if (/EACCES|EPERM|permission denied/i.test(message)) {
      return new ApiError(
        500,
        "WhatsApp session storage is not writable. Set WHATSAPP_AUTH_PATH to a writable directory.",
        details
      );
    }

    if (/ENOENT/i.test(message) && executablePath) {
      return new ApiError(
        500,
        `Configured Chrome path was not found: ${executablePath}`,
        details
      );
    }

    return new ApiError(500, "Failed to initialize WhatsApp client", details);
  }

  getBrowserExecutablePath() {
    const configuredPath =
      process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;

    if (configuredPath && fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    const candidates = [
      process.env.LOCALAPPDATA
        ? path.join(
            process.env.LOCALAPPDATA,
            "Google",
            "Chrome",
            "Application",
            "chrome.exe"
          )
        : null,
      process.env.ProgramFiles
        ? path.join(
            process.env.ProgramFiles,
            "Google",
            "Chrome",
            "Application",
            "chrome.exe"
          )
        : null,
      process.env["ProgramFiles(x86)"]
        ? path.join(
            process.env["ProgramFiles(x86)"],
            "Google",
            "Chrome",
            "Application",
            "chrome.exe"
          )
        : null,
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ].filter(Boolean);

    return candidates.find((candidate) => fs.existsSync(candidate));
  }

  async loadDependencies() {
    try {
      const whatsappModule = await import("whatsapp-web.js");
      const qrModule = await import("qrcode");

      const Client =
        whatsappModule.Client || whatsappModule.default?.Client || null;
      const LocalAuth =
        whatsappModule.LocalAuth || whatsappModule.default?.LocalAuth || null;
      const MessageMedia =
        whatsappModule.MessageMedia ||
        whatsappModule.default?.MessageMedia ||
        null;
      const QRCode = qrModule.default || qrModule;

      if (!Client || !LocalAuth || !MessageMedia || !QRCode?.toDataURL) {
        throw new Error("Invalid whatsapp-web.js or qrcode exports");
      }

      return { Client, LocalAuth, MessageMedia, QRCode };
    } catch (error) {
      throw new ApiError(
        500,
        "WhatsApp dependencies are missing. Install whatsapp-web.js and qrcode in the api package first.",
        { originalError: error.message }
      );
    }
  }

  async getModules() {
    if (!this.modulesPromise) {
      this.modulesPromise = this.loadDependencies().catch((error) => {
        this.modulesPromise = null;
        throw error;
      });
    }

    return this.modulesPromise;
  }

  sessionExists() {
    return fs.existsSync(this.sessionPath);
  }

  async persistState(patch = {}) {
    try {
      const settings = await Settings.findOneOrCreate();
      Object.assign(settings, patch);
      await settings.save();
    } catch (error) {
      logger.error("Failed to persist WhatsApp settings state", {
        error: error.message,
      });
    }
  }

  formatPhoneNumber(number) {
    const defaultCountryCode =
      String(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "20").replace(
        /\D/g,
        ""
      ) || "20";

    let cleaned = String(number || "").replace(/\D/g, "");

    if (!cleaned) return "";

    if (cleaned.startsWith("00")) {
      cleaned = cleaned.slice(2);
    }

    if (cleaned.startsWith("0")) {
      cleaned = `${defaultCountryCode}${cleaned.slice(1)}`;
    } else if (
      defaultCountryCode &&
      cleaned.length <= 11 &&
      !cleaned.startsWith(defaultCountryCode)
    ) {
      cleaned = `${defaultCountryCode}${cleaned}`;
    }

    return cleaned;
  }

  getChatId(number) {
    const formatted = this.formatPhoneNumber(number);

    if (!formatted) {
      throw new ApiError(400, "A valid phone number is required");
    }

    return `${formatted}@c.us`;
  }

  async waitForStatus(targetStatuses = [], timeoutMs = 15000) {
    if (targetStatuses.includes(this.status)) {
      return this.status;
    }

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        if (targetStatuses.includes(this.status)) {
          clearInterval(interval);
          resolve(this.status);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          clearInterval(interval);
          reject(new Error("Timed out waiting for WhatsApp state change"));
        }
      }, 500);
    });
  }

  attachListeners(client, QRCode) {
    client.on("qr", async (qr) => {
      try {
        this.qrCode = await QRCode.toDataURL(qr);
      } catch (error) {
        this.qrCode = "";
        this.lastError = error.message;
      }

      this.status = "qr";
      this.lastError = "";

      await this.persistState({
        whatsappConnected: false,
        whatsappQrCode: this.qrCode,
        whatsappConnectionStatus: "qr",
        whatsappPhoneNumber: "",
        whatsappDisplayName: "",
        whatsappLastError: "",
      });
    });

    client.on("authenticated", async () => {
      this.status = "authenticated";
      this.lastError = "";

      await this.persistState({
        whatsappConnected: false,
        whatsappConnectionStatus: "authenticated",
        whatsappLastError: "",
      });
    });

    client.on("ready", async () => {
      const info = client.info || {};

      this.status = "connected";
      this.qrCode = "";
      this.phoneNumber = info.wid?.user || "";
      this.displayName = info.pushname || info.platform || "";
      this.lastError = "";
      this.lastConnectedAt = new Date();

      await this.persistState({
        whatsappConnected: true,
        whatsappQrCode: "",
        whatsappConnectionStatus: "connected",
        whatsappPhoneNumber: this.phoneNumber,
        whatsappDisplayName: this.displayName,
        whatsappLastError: "",
        whatsappLastConnectedAt: this.lastConnectedAt,
      });
    });

    client.on("auth_failure", async (message) => {
      this.status = "auth_failure";
      this.lastError = message || "WhatsApp authentication failed";
      this.qrCode = "";
      this.phoneNumber = "";
      this.displayName = "";

      await this.persistState({
        whatsappConnected: false,
        whatsappQrCode: "",
        whatsappConnectionStatus: "auth_failure",
        whatsappPhoneNumber: "",
        whatsappDisplayName: "",
        whatsappLastError: this.lastError,
      });
    });

    client.on("disconnected", async (reason) => {
      this.client = null;
      this.status = "disconnected";
      this.qrCode = "";
      this.phoneNumber = "";
      this.displayName = "";
      this.initializationPromise = null;
      this.lastError =
        this.isDisconnecting || !reason ? "" : String(reason || "");

      await this.persistState({
        whatsappConnected: false,
        whatsappQrCode: "",
        whatsappConnectionStatus: "disconnected",
        whatsappPhoneNumber: "",
        whatsappDisplayName: "",
        whatsappLastError: this.lastError,
      });
    });
  }

  async initialize({ forceNew = false } = {}) {
    if (forceNew) {
      await this.disconnect({ clearSession: true });
    }

    if (
      this.client &&
      ["initializing", "qr", "authenticated", "connected"].includes(
        this.status
      )
    ) {
      return this.getStatus();
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.getStatus();
    }

    this.initializationPromise = (async () => {
      const executablePath = this.getBrowserExecutablePath();
      try {
        const { Client, LocalAuth, QRCode } = await this.getModules();

        fs.mkdirSync(this.authPath, { recursive: true });

        this.status = "initializing";
        this.qrCode = "";
        this.lastError = "";

        await this.persistState({
          whatsappConnected: false,
          whatsappQrCode: "",
          whatsappConnectionStatus: "initializing",
          whatsappLastError: "",
        });

        const client = new Client({
          authStrategy: new LocalAuth({
            clientId: this.clientId,
            dataPath: this.authPath,
          }),
          puppeteer: {
            headless: true,
            executablePath,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
            ],
          },
        });

        this.attachListeners(client, QRCode);
        this.client = client;
        await client.initialize();
      } catch (error) {
        this.client = null;
        this.status = "error";
        const apiError = this.buildConnectError(error, executablePath);
        this.lastError = apiError.message;

        await this.persistState({
          whatsappConnected: false,
          whatsappQrCode: "",
          whatsappConnectionStatus: "error",
          whatsappLastError: this.lastError,
        });

        throw apiError;
      }
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }

    try {
      await this.waitForStatus(
        ["qr", "authenticated", "connected", "auth_failure", "error"],
        15000
      );
    } catch (error) {
      logger.warn("WhatsApp initialization is still in progress", {
        error: error.message,
      });
    }

    return this.getStatus();
  }

  async restoreFromSession() {
    if (!this.sessionExists()) {
      return this.getStatus();
    }

    try {
      return await this.initialize();
    } catch (error) {
      logger.warn("Failed to restore WhatsApp session", {
        error: error.message,
      });
      return this.getStatus();
    }
  }

  async ensureReady() {
    if (this.client && this.status === "connected") {
      return this.client;
    }

    if (!this.client && !this.sessionExists()) {
      throw new ApiError(
        503,
        "WhatsApp is not connected yet. Open the dashboard settings and scan the QR code first."
      );
    }

    await this.initialize();

    try {
      await this.waitForStatus(["connected"], 15000);
    } catch (error) {
      throw new ApiError(
        503,
        this.lastError || "WhatsApp connection is not ready yet"
      );
    }

    if (!this.client || this.status !== "connected") {
      throw new ApiError(
        503,
        this.lastError || "WhatsApp connection is not available"
      );
    }

    return this.client;
  }

  removeSessionData() {
    fs.rmSync(this.sessionPath, { recursive: true, force: true });
  }

  async disconnect({ clearSession = true } = {}) {
    this.isDisconnecting = true;

    try {
      if (this.client) {
        try {
          await this.client.logout();
        } catch (error) {
          logger.warn("Failed to log out WhatsApp client cleanly", {
            error: error.message,
          });
        }

        try {
          await this.client.destroy();
        } catch (error) {
          logger.warn("Failed to destroy WhatsApp client cleanly", {
            error: error.message,
          });
        }
      }

      this.client = null;
      this.status = "disconnected";
      this.qrCode = "";
      this.phoneNumber = "";
      this.displayName = "";
      this.lastError = "";
      this.initializationPromise = null;

      if (clearSession) {
        this.removeSessionData();
      }

      await this.persistState({
        whatsappConnected: false,
        whatsappQrCode: "",
        whatsappConnectionStatus: "disconnected",
        whatsappPhoneNumber: "",
        whatsappDisplayName: "",
        whatsappLastError: "",
      });

      return this.getStatus();
    } finally {
      this.isDisconnecting = false;
    }
  }

  getStatus() {
    return {
      status: this.status,
      connected: this.status === "connected",
      qrCode: this.qrCode,
      phoneNumber: this.phoneNumber,
      displayName: this.displayName,
      lastError: this.lastError,
      lastConnectedAt: this.lastConnectedAt,
      sessionExists: this.sessionExists(),
    };
  }

  isConfigured() {
    return this.status === "connected";
  }

  async sendTextMessage(number, text) {
    if (!String(text || "").trim()) {
      throw new ApiError(400, "Message text is required");
    }

    const client = await this.ensureReady();
    const chatId = this.getChatId(number);

    try {
      const message = await client.sendMessage(chatId, text);

      return {
        success: true,
        data: {
          id: message.id?._serialized || message.id?.id || "",
          to: chatId,
        },
      };
    } catch (error) {
      throw new ApiError(500, "Failed to send WhatsApp message", {
        originalError: error.message,
      });
    }
  }

  async sendMediaMessage(number, mediaUrl, caption = "") {
    const { MessageMedia } = await this.getModules();
    const client = await this.ensureReady();
    const chatId = this.getChatId(number);

    try {
      const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
      const message = await client.sendMessage(chatId, media, { caption });

      return {
        success: true,
        data: {
          id: message.id?._serialized || message.id?.id || "",
          to: chatId,
        },
      };
    } catch (error) {
      logger.warn("Failed to send WhatsApp media message, falling back to text", {
        error: error.message,
        mediaUrl,
      });

      if (caption) {
        return this.sendTextMessage(number, caption);
      }

      throw new ApiError(500, "Failed to send WhatsApp media message", {
        originalError: error.message,
      });
    }
  }
}

const sharedWhatsAppManager = new WhatsAppWebManager();

export class WhatsappNotificationService {
  constructor() {
    this.manager = sharedWhatsAppManager;
  }

  isConfigured() {
    return this.manager.isConfigured();
  }

  formatPhoneNumber(number) {
    return this.manager.formatPhoneNumber(number);
  }

  async connect() {
    return this.manager.initialize();
  }

  async disconnect() {
    return this.manager.disconnect();
  }

  async restoreSession() {
    return this.manager.restoreFromSession();
  }

  getStatus() {
    return this.manager.getStatus();
  }

  async sendTextMessage(number, text) {
    return this.manager.sendTextMessage(number, text);
  }

  async sendMessage(number, text) {
    return this.sendTextMessage(number, text);
  }

  async sendMediaMessage(number, mediaUrl, caption = "") {
    return this.manager.sendMediaMessage(number, mediaUrl, caption);
  }

  async sendArticleCompletionNotification(numbers, articlesSummary) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return { success: false, error: "No phone numbers provided" };
    }

    const { generated, failed, total, articles } = articlesSummary;
    const message = this.buildNotificationMessage(
      generated,
      failed,
      total,
      articles
    );

    const results = [];

    for (const number of numbers) {
      try {
        const result = await this.sendTextMessage(number, message);
        results.push({ number, ...result });
        await this.delay(500);
      } catch (error) {
        results.push({
          number,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.some((result) => result.success),
      results,
    };
  }

  buildNotificationMessage(generated, failed, total, articles = []) {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `تقرير توليد المقالات اليومي\n`;
    message += `${dateStr}\n\n`;
    message += `المقالات المولدة: ${generated}\n`;

    if (failed > 0) {
      message += `المقالات الفاشلة: ${failed}\n`;
    }

    message += `إجمالي المستهدف: ${total}\n\n`;

    if (articles.length > 0) {
      message += `المقالات الجديدة:\n`;
      articles.forEach((article, index) => {
        message += `${index + 1}. ${article.title}\n`;
      });
      message += `\n`;
    }

    message += `تم الإرسال تلقائيًا من نظام Genoun`;

    return message;
  }

  async sendNotification(numbers, message) {
    if (!Array.isArray(numbers)) {
      numbers = [numbers];
    }

    const results = [];

    for (const number of numbers) {
      try {
        const result = await this.sendTextMessage(number, message);
        results.push({ number, ...result });
      } catch (error) {
        results.push({
          number,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async testConnection(testNumber) {
    try {
      return await this.sendTextMessage(
        testNumber,
        "رسالة اختبار من لوحة تحكم Genoun"
      );
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new WhatsappNotificationService();
