import { Server } from "http";
import app from "./app";
import config from "./config";
import prisma from "./lib/prisma";

let server: Server;

async function bootstrap() {
  try {
    server = app.listen(config.port, () => {
      console.log(
        `🚀 [AdSkill PayTrack AI Server] running on http://localhost:${config.port}`,
      );
      console.log(
        `🩺 Health check available at http://localhost:${config.port}/api/v1/health`,
      );
    });
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
