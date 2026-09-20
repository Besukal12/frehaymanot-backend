import { Router } from "express";
import {
  addFeedback,
  getFeedback,
  getFeedbackById,
  deleteFeedback,
} from "../../modules/feedback/feedback.controller.js";
import { checkAdmin, checkAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/", addFeedback);
router.get("/", checkAuth, checkAdmin, getFeedback);
router.get("/:id", checkAuth, checkAdmin, getFeedbackById);
router.delete("/:id", checkAuth, checkAdmin, deleteFeedback);

export default router;
