import { Server } from "http";
import app from "./app";
import config from "./config";
import prisma from "./lib/prisma";
import { scheduleDailyMidnightBackup } from "./modules/Backup/backup.scheduler";

let server: Server;

async function bootstrap() {
  try {
    // ── Stripe environment checks ─────────────────────────────────────────────
    if (config.stripe.secret_key.startsWith("sk_test_")) {
      console.warn(
        "⚠️  [STRIPE_TEST_MODE] Test Stripe key (sk_test_*) detected. " +
        "Operating in Stripe Sandbox / Test mode. Live payments cannot be processed until set to sk_live_*.",
      );
    }
    if (!config.stripe.webhook_secret) {
      console.warn(
        "⚠️  [STRIPE_WARNING] STRIPE_WEBHOOK_SECRET is not configured. Webhook events cannot be verified.",
      );
    }

    server = app.listen(config.port, () => {
      console.log(
        `🚀 [AdSkill PayTrack AI Server] running on http://localhost:${config.port}`,
      );
      console.log(
        `🩺 Health check available at http://localhost:${config.port}/api/v1/health`,
      );
    });

    // Start automated midnight backup scheduler
    scheduleDailyMidnightBackup();
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Graceful shutdown handling
const exitHandler = async () => {
  if (server) {
    server.close(async () => {
      console.log("HTTP server closed.");
      await prisma.$disconnect();
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

const unexpectedErrorHandler = (error: unknown) => {
  console.error("Unexpected Error:", error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  exitHandler();
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  exitHandler();
});

bootstrap();
