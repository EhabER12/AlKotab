import { BaseRepository } from "./baseRepository.js";
import Settings from "../models/settingsModel.js";

export class SettingsRepository extends BaseRepository {
  constructor() {
    super(Settings);
  }

  async getSettings() {
    const settings = await this.model.findOne();
    if (settings) {
      return settings;
    }

    // Create default settings if none exist
    return this.model.create({
      siteName: "Genoun LLC",
      siteDescription: "Your next adventure starts here",
      contactEmail: "info@travelagency.com",
      contactPhone: "+1234567890",
      address: "123 Travel Street, Adventure City",
    });
  }

  async updateSettings(data, userId) {
    const settings = await this.getSettings();

    Object.assign(settings, data);
    settings.updatedBy = userId;

    return settings.save();
  }

  async getPublicSettings() {
    const settings = await this.model
      .findOne()
      .select(
        "-_id -__v -updatedAt -createdAt -whatsappConnected -whatsappQrCode -whatsappConnectionStatus -whatsappPhoneNumber -whatsappDisplayName -whatsappLastError -whatsappLastConnectedAt -notifications -updatedBy -paymentGateways -subscriptionTeachers -subscriptionStudentProfitSettings -authSettings"
      );
    if (settings) {
      return settings;
    }

    // Create default settings if none exist
    return this.model.create({
      siteName: "Genoun LLC",
      siteDescription: "Your next adventure starts here",
      contactEmail: "info@travelagency.com",
      contactPhone: "+1234567890",
      address: "123 Travel Street, Adventure City",
      isPublic: true,
    });
    return settings;
  }
}
