import { Router } from "express";

import {
  addCourse,
  getCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../../modules/course/course.controller.js";
import {
  addCourseCategory,
  deleteCourseCategory,
  getCourseCategories,
  updateCourseCategory,
} from "../../modules/course/category.controller.js";

import upload from "../../middleware/uploadToCloudinary.js";
import { checkAdmin, checkAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/categories", getCourseCategories);
router.post(
  "/categories",
  checkAdmin,
  upload.fields([{ name: "image", maxCount: 1 }]),
  addCourseCategory,
);
router.patch(
  "/categories/:id",
  checkAdmin,
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateCourseCategory,
);
router.delete("/categories/:id", checkAdmin, deleteCourseCategory);

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
