import { Router } from "express";

import {
  addAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
} from "../../modules/announcements/announcement.controller.js";

import upload from "../../middleware/uploadToCloudinary.js";
import { checkAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/", getAnnouncements);
router.get("/:id", getAnnouncementById);

router.post(
  "/",
  checkAuth,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  addAnnouncement,
);

router.patch(
  "/:id",
  checkAuth,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateAnnouncement,
);

router.delete("/:id", checkAuth, deleteAnnouncement);

export default router;
