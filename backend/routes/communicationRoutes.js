import { Router } from "express";
import { param } from "express-validator";
import {
  listTicketCommunicationsHandler,
  messageStatusWebhookHandler,
  retryTicketCommunicationsHandler,
  voiceStatusWebhookHandler,
} from "../controllers/communicationController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";

const router = Router();

router.post("/twilio/voice-status", voiceStatusWebhookHandler);
router.post("/twilio/message-status", messageStatusWebhookHandler);

router.get(
  "/tickets/:ticketId",
  authenticate,
  authorize("admin", "officer"),
  [param("ticketId").isString()],
  validateRequest,
  listTicketCommunicationsHandler,
);

router.post(
  "/tickets/:ticketId/retry",
  authenticate,
  authorize("admin", "officer"),
  [param("ticketId").isString()],
  validateRequest,
  retryTicketCommunicationsHandler,
);

export default router;
