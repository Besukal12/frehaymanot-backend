import { Router } from "express";

import {
  addCourse,
  getCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../../modules/course/course.controller.js";

import upload from "../../middleware/uploadToCloudinary.js";
import { checkAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/", getCourse);
router.get("/:id", getCourseById);

router.post(
  "/",
  checkAuth,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  addCourse,
);

router.patch(
  "/:id",
  checkAuth,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  updateCourse,
);

router.delete("/:id", checkAuth, deleteCourse);

export default router;
