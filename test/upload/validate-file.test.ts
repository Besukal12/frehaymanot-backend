import { describe, expect, it } from "vitest";
import { validateFileType } from "../../src/middleware/uploadToCloudinary.js";
import { PDF_BYTES, PNG_BYTES } from "../helpers/files.js";

describe("validateFileType", () => {
  it("detects PDFs from magic bytes", async () => {
    await expect(validateFileType(PDF_BYTES)).resolves.toBe("application/pdf");
  });

  it("detects PNG images", async () => {
    await expect(validateFileType(PNG_BYTES)).resolves.toBe("image/png");
  });

  it("rejects unknown binary", async () => {
    await expect(
      validateFileType(Buffer.from("not a real file")),
    ).rejects.toThrow();
  });
});
