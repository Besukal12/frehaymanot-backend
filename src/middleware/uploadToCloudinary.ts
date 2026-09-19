import multer from "multer";
import { FileFilterCallback } from "multer";
import { Request } from "express";
import { fileTypeFromBuffer } from "file-type";
import cloudinary from "../config/cloudinary.js";
import { v4 as uuidv4 } from "uuid";

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC = Buffer.from("%PDF");

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg",
  "image/svg+xml",
  "image/tiff",
  "image/jpg",
];
const allowedPdfTypes = [
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "application/octet-stream",
];
const genericBinaryType = "application/octet-stream";

const checkFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) => {
  if (
    file.fieldname === "thumbnail" &&
    (allowedImageTypes.includes(file.mimetype) ||
      file.mimetype === genericBinaryType)
  ) {
    return callback(null, true);
  }

  if (file.fieldname === "pdf" && allowedPdfTypes.includes(file.mimetype)) {
    return callback(null, true);
  }

  return callback(
    new Error(
      `Unsupported file type for ${file.fieldname}: ${file.mimetype}`,
    ),
  );
};

const upload = multer({
  storage,
  fileFilter: checkFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2,
  },
});

function looksLikePdf(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC);
}

export const validateFileType = async (buffer: Buffer): Promise<string> => {
  if (looksLikePdf(buffer)) {
    return "application/pdf";
  }

  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    throw new Error("Could not determine file type");
  }

  if (
    !allowedImageTypes.includes(detected.mime) &&
    detected.mime !== "application/pdf"
  ) {
    throw new Error("Invalid file type");
  }

  return detected.mime;
};

function mimeTypesCompatible(detected: string, claimed: string): boolean {
  if (detected === claimed) return true;
  if (claimed === genericBinaryType) return true;
  if (detected === "application/pdf" && allowedPdfTypes.includes(claimed)) {
    return true;
  }
  if (
    detected.startsWith("image/") &&
    (claimed.startsWith("image/") || claimed === "image/jpg")
  ) {
    return true;
  }
  return false;
}

export type CloudinaryUploadOptions = {
  filename?: string;
};

export default upload;

export const uploadToCloudinary = async (
  buffer: Buffer,
  mimeType: string,
  options: CloudinaryUploadOptions = {},
) => {
  const detectedMimeType = await validateFileType(buffer);

  if (!mimeTypesCompatible(detectedMimeType, mimeType)) {
    throw new Error("File type mismatch");
  }

  const isPdf = detectedMimeType === "application/pdf";
  const publicId = uuidv4();

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    resource_type: string;
    format?: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      isPdf
        ? {
            folder: "frehaymanot",
            public_id: publicId,
            resource_type: "raw",
            type: "upload",
            format: "pdf",
            use_filename: Boolean(options.filename),
            unique_filename: true,
            filename_override: options.filename
              ?.replace(/\.[^/.]+$/, "")
              .slice(0, 80),
          }
        : {
            folder: "frehaymanot",
            public_id: publicId,
            resource_type: "image",
            type: "upload",
          },
      (error, uploaded) => {
        if (error) {
          reject(error);
        } else if (!uploaded?.secure_url || !uploaded.public_id) {
          reject(new Error("Cloudinary did not return a file URL"));
        } else {
          resolve({
            secure_url: uploaded.secure_url,
            public_id: uploaded.public_id,
            resource_type: uploaded.resource_type,
            format: uploaded.format,
          });
        }
      },
    );

    stream.end(buffer);
  });

  if (isPdf && result.secure_url && !/\.pdf($|\?)/i.test(result.secure_url)) {
    const [base, query] = result.secure_url.split("?");
    result.secure_url = query ? `${base}.pdf?${query}` : `${base}.pdf`;
  }

  return result;
};
