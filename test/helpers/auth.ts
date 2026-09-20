import { vi } from "vitest";

export const mockAuth = {
  userId: null as string | null,
  orgRole: null as string | null,
};

export function setAuth(userId: string | null, orgRole: string | null = null) {
  mockAuth.userId = userId;
  mockAuth.orgRole = orgRole;
}

export function clearAuth() {
  mockAuth.userId = null;
  mockAuth.orgRole = null;
}

vi.mock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  getAuth: () => ({
    userId: mockAuth.userId,
    orgRole: mockAuth.orgRole,
  }),
}));

vi.mock(
  "../../src/middleware/uploadToCloudinary.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../src/middleware/uploadToCloudinary.js")
      >();
    return {
      ...actual,
      uploadToCloudinary: vi.fn(async () => ({
        secure_url: "https://res.cloudinary.com/test/image/upload/v1/test.jpg",
        public_id: "frehaymanot/test-id",
      })),
    };
  },
);

vi.mock("../../src/config/cloudinary.js", () => ({
  default: {
    uploader: {
      destroy: vi.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));
