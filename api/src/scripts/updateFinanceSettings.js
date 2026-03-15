import mongoose from "mongoose";
import dotenv from "dotenv";
import Settings from "../models/settingsModel.js";

// Load environment variables
dotenv.config();

/**
 * Update Finance Settings with proper exchange rates
 */
async function updateFinanceSettings() {
  try {
    console.log(" Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(" Connected to database");

    // Get or create settings
    let settings = await Settings.findOne();
    
    if (!settings) {
      console.log("⚠️ No settings found, creating new settings document...");
      settings = await Settings.create({
        siteName: "Genoun LLC",
        siteDescription: "We Build Your Future",
        contactEmail: "info@genoun.com",
        contactPhone: "+1234567890",
        address: "123 Street, Riyadh, Saudi Arabia",
      });
      console.log("✅ Settings created");
    }

    // Update or create financeSettings
    if (!settings.financeSettings) {
      settings.financeSettings = {};
    }

    settings.financeSettings.baseCurrency = settings.financeSettings.baseCurrency || "EGP";
    settings.financeSettings.exchangeRates = {
      USD: 1,
      SAR: 3.75,  // 3.75 SAR = 1 USD
      EGP: 50.0,  // 50 EGP = 1 USD
      EGPtoSAR: 13.33, // 13.33 EGP = 1 SAR (for PayPal conversion)
    };
    settings.financeSettings.lastRatesUpdate = new Date();

    await settings.save();

    console.log("✅ Finance settings updated successfully:");
    console.log(JSON.stringify({
      baseCurrency: settings.financeSettings.baseCurrency,
      exchangeRates: settings.financeSettings.exchangeRates,
      lastRatesUpdate: settings.financeSettings.lastRatesUpdate,
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating finance settings:", error);
    process.exit(1);
  }
}

// Run the update
updateFinanceSettings();
