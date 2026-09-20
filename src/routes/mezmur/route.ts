import { Router } from "express";
import upload from "../../middleware/uploadToCloudinary.js";
import { checkAdmin } from "../../middleware/auth.middleware.js";
import {
  addMezmur,
  deleteMezmur,
  getMezmurById,
  getMezmurs,
  updateMezmur,
} from "../../modules/mezmur/mezmur.controller.js";

const router = Router();

router.get("/", getMezmurs);
router.get("/:id", getMezmurById);

router.post(
  "/",
  checkAdmin,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  addMezmur,
);

router.patch(
  "/:id",
  checkAdmin,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateMezmur,
);

router.delete("/:id", checkAdmin, deleteMezmur);

export default router;
