import { Router } from "express";
import { getAuditLog } from "../controllers/auditController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authenticate, authorize("admin", "officer"), getAuditLog);

export default router;
