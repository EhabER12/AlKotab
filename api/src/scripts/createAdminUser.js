import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

const args = process.argv.slice(2);

const getArgValue = (name) => {
  const flagIndex = args.findIndex((arg) => arg === `--${name}`);
  if (flagIndex !== -1) {
    return args[flagIndex + 1];
  }

  const inlineArg = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inlineArg) {
    return inlineArg.split("=").slice(1).join("=");
  }

  return undefined;
};

const maskMongoUri = (uri = "") =>
  uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");

const email = (getArgValue("email") || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = getArgValue("password") || process.env.ADMIN_PASSWORD || "";
const fullNameAr = (getArgValue("full-name-ar") || process.env.ADMIN_FULL_NAME_AR || "").trim();
const fullNameEn = (getArgValue("full-name-en") || process.env.ADMIN_FULL_NAME_EN || "").trim();
const phone = (getArgValue("phone") || process.env.ADMIN_PHONE || "").trim();
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

const printUsageAndExit = (message) => {
  if (message) {
    console.error(`ERROR: ${message}`);
  }

  console.log(`
Usage:
  node src/scripts/createAdminUser.js --email admin@example.com --password "StrongPass123!" --full-name-ar "اسم المدير" --full-name-en "Admin User" [--phone "201234567890"]

Environment variable alternatives:
  ADMIN_EMAIL
  ADMIN_PASSWORD
  ADMIN_FULL_NAME_AR
  ADMIN_FULL_NAME_EN
  ADMIN_PHONE
  MONGODB_URI
`);

  process.exit(1);
};

if (!mongoUri) {
  printUsageAndExit("MONGODB_URI is missing");
}

if (!email) {
  printUsageAndExit("email is required");
}

if (!password) {
  printUsageAndExit("password is required");
}

if (!fullNameAr || !fullNameEn) {
  printUsageAndExit("both full-name-ar and full-name-en are required");
}

const createOrPromoteAdmin = async () => {
  try {
    console.log("Connecting to MongoDB...");
    console.log(`URI: ${maskMongoUri(mongoUri)}`);
    await mongoose.connect(mongoUri);

    let user = await User.findOne({ email }).select("+password");
    const isExistingUser = Boolean(user);

    if (!user) {
      user = new User({
        fullName: {
          ar: fullNameAr,
          en: fullNameEn,
        },
        email,
        phone: phone || undefined,
        password,
        role: "admin",
        status: "active",
        isEmailVerified: true,
      });
    } else {
      user.fullName = {
        ar: fullNameAr || user.fullName?.ar || user.fullName?.en || "Admin",
        en: fullNameEn || user.fullName?.en || user.fullName?.ar || "Admin",
      };
      user.phone = phone || user.phone;
      user.role = "admin";
      user.status = "active";
      user.isEmailVerified = true;
      user.password = password;
    }

    await user.save();

    console.log(
      isExistingUser
        ? "Existing user updated and promoted to admin successfully."
        : "Admin user created successfully."
    );
    console.log(
      JSON.stringify(
        {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
        },
        null,
        2
      )
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Failed to create or promote admin user.");
    console.error(error?.message || error);

    if (error?.errors) {
      Object.entries(error.errors).forEach(([field, fieldError]) => {
        console.error(`- ${field}: ${fieldError.message}`);
      });
    }
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors during failure handling.
    }
    process.exit(1);
  }
};

createOrPromoteAdmin();
