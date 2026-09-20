import multer from "multer";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { UPLOAD_ALLOWED_MIME_TYPES } from "./upload.constant";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.r2.max_file_size_mb * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, callback) => {
    if (!UPLOAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Only PDF, JPG, and PNG files are allowed",
        ),
      );
    }

    callback(null, true);
  },
});

export default upload;
