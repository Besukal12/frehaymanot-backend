import { Router } from "express";
import upload from "../../middleware/uploadToCloudinary.js";
import { checkAdmin } from "../../middleware/auth.middleware.js";
import {
  addMezmurCategory,
  deleteMezmurCategory,
  getMezmurCategories,
  updateMezmurCategory,
} from "../../modules/mezmur/category.controller.js";
import {
  addMezmur,
  deleteMezmur,
  getMezmurById,
  getMezmurs,
  updateMezmur,
} from "../../modules/mezmur/mezmur.controller.js";

const router = Router();

router.get("/categories", getMezmurCategories);
router.post(
  "/categories",
  checkAdmin,
  upload.fields([{ name: "image", maxCount: 1 }]),
  addMezmurCategory,
);
router.patch(
  "/categories/:id",
  checkAdmin,
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateMezmurCategory,
);
router.delete("/categories/:id", checkAdmin, deleteMezmurCategory);

router.get("/", getMezmurs);
router.get("/:id", getMezmurById);

router.post("/", checkAdmin, addMezmur);

router.patch("/:id", checkAdmin, updateMezmur);

router.delete("/:id", checkAdmin, deleteMezmur);

export default router;
