import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

// ── JWT Secret resolution with safety warning ────────────────────────────────
const access_secret =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "dev_secret";
const refresh_secret =
  process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_REFRESH_TOKEN_SECRET ||
  "dev_refresh_secret";

if (!process.env.JWT_ACCESS_SECRET) {
  console.warn(
    "⚠️  [SECURITY WARNING] JWT_ACCESS_SECRET is not set in environment variables. Using dev fallback secret.",
  );
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.warn(
    "⚠️  [SECURITY WARNING] JWT_REFRESH_SECRET is not set in environment variables. Using dev fallback secret.",
  );
}

export default {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  client_url: process.env.CLIENT_URL || "http://localhost:5173",
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  jwt: {
    access_secret,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
    refresh_secret,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_BUCKET_NAME,
    access_key_id: process.env.R2_ACCESS_KEY_ID,
    secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
    public_base_url: process.env.R2_PUBLIC_BASE_URL,
    signed_url_expires_in: Number(process.env.R2_SIGNED_URL_EXPIRES_IN) || 300,
    max_file_size_mb: Number(process.env.R2_MAX_FILE_SIZE_MB) || 10,
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from_name: process.env.EMAIL_FROM_NAME || "AdSkill PayTrack AI",
    from_email:
      process.env.EMAIL_FROM_ADDRESS || "notifications@adskillconsultancy.com",
  },
  stripe: {
    secret_key: process.env.STRIPE_SECRET_KEY || "",
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || "",
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
};
