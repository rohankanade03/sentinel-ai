import { Router } from "express";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.get("/", authenticate, authorize("admin", "officer"), getAnalytics);

export default router;
