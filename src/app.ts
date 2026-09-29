import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import config from "./config";
import { swaggerDocument } from "./docs/swagger";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import notFound from "./middlewares/notFound";
import router from "./routes";

const app: Application = express();

// Middlewares & Parsers
const allowedOrigins = [
  config.client_url,
  "https://paytrack.adskillconsultancy.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Only allow explicit configured client URLs or exact AdSkill PayTrack deployments
    const isExplicitAllowed = allowedOrigins.includes(origin);
    const isProjectDeploy =
      origin === "https://paytrack.adskillconsultancy.com" ||
      /^https:\/\/([a-z0-9-]+\.)?adskillconsultancy\.com$/.test(origin);

    if (
      isExplicitAllowed ||
      isProjectDeploy ||
      process.env.NODE_ENV !== "production"
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "x-cron-secret",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Interactive Swagger API Documentation
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to AdSkill PayTrack AI API Server",
    version: "1.0.0",
    docs: "/api/v1/docs",
    health: "/api/v1/health",
  });
});

// Master Application Routes
app.use("/api/v1", router);

// Error Handling Middleware Pipeline
app.use(globalErrorHandler);

// Not Found Handler
app.use(notFound);

export default app;
