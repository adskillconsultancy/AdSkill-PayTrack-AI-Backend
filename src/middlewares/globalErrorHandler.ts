import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import httpStatus from "http-status";
import config from "../config";
import AppError from "../errors/AppError";
import handleZodError from "../errors/handleZodError";
import handlePrismaError from "../errors/handlePrismaError";
import { handleJWTError } from "../errors/handleJWTError";
import { TErrorSource } from "../interface/error";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";
  let errorSources: TErrorSource[] = [
    {
      path: "",
      message: "Something went wrong",
    },
  ];

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const formatted = handleZodError(err);
    statusCode = formatted.statusCode;
    message = formatted.message;
    errorSources = formatted.errorSources;
  }
  // 2. Prisma Known Request Error (Unique constraint, foreign key, etc.)
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const formatted = handlePrismaError(err);
    statusCode = formatted.statusCode;
    message = formatted.message;
    errorSources = formatted.errorSources;
  }
  // 3. Prisma Schema Validation Error
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Database validation error";
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }
  // 4. Prisma Connection / Initialization Error
  else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = httpStatus.SERVICE_UNAVAILABLE;
    message = "Database Connection Failed";
    errorSources = [
      {
        path: "",
        message: "Unable to connect to the database. Please try again later.",
      },
    ];
  }
  // 5. JWT Auth Errors (Expired or Malformed)
  else if (
    err instanceof JsonWebTokenError ||
    err instanceof TokenExpiredError
  ) {
    const formatted = handleJWTError(err);
    statusCode = formatted.statusCode;
    message = formatted.message;
    errorSources = formatted.errorSources;
  }
  // 6. Custom Operational AppError
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }
  // 7. General JavaScript Error
  else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  // Sanitized response envelope
  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    ...(config.env === "development" && { stack: err?.stack }),
  });
};

export default globalErrorHandler;
