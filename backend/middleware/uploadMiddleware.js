import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.memoryStorage();
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export const uploadEvidence = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter(_request, file, callback) {
    if (!allowed.has(file.mimetype)) {
      callback(new ApiError(415, "Only JPEG, PNG, and WEBP evidence images are allowed."));
      return;
    }
    callback(null, true);
  },
});
