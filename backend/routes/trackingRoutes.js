import { Router } from "express";
import { param } from "express-validator";
import { getTrackingHandler } from "../controllers/trackingController.js";
import { validateRequest } from "../middleware/errorMiddleware.js";

const router = Router();

router.get("/:ticketId", [param("ticketId").isString()], validateRequest, getTrackingHandler);

export default router;
