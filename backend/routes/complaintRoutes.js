import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import { uploadEvidence } from "../middleware/uploadMiddleware.js";
import {
  createComplaintHandler,
  createMyComplaintActionHandler,
  getCitizenProgressHandler,
  getComplaintByTicketHandler,
  getDashboardHandler,
  getMyComplaintTrackingHandler,
  getTimelineHandler,
  listComplaintsHandler,
  listMyComplaintsHandler,
  updateComplaintHandler,
  updateStatusHandler,
} from "../controllers/complaintController.js";

const router = Router();

router.get("/dashboard", getDashboardHandler);
router.get("/complaints", listComplaintsHandler);
router.get("/me/complaints", authenticate, listMyComplaintsHandler);
router.get("/me/complaints/:ticketId/tracking", authenticate, [param("ticketId").isString()], validateRequest, getMyComplaintTrackingHandler);
router.post(
  "/me/complaints/:ticketId/actions",
  authenticate,
  uploadEvidence.array("images", 5),
  [
    param("ticketId").isString(),
    body("action").isIn(["comment", "reopen", "confirm_resolution", "rate"]),
    body("note").optional().isString().isLength({ max: 1000 }),
    body("rating").optional().isInt({ min: 1, max: 5 }),
  ],
  validateRequest,
  createMyComplaintActionHandler,
);
router.get("/complaints/:id", [param("id").isString()], validateRequest, getComplaintByTicketHandler);
router.get("/tickets/:ticketId", [param("ticketId").isString()], validateRequest, getComplaintByTicketHandler);
router.get("/citizen/progress/:ticketId", [param("ticketId").isString()], validateRequest, getCitizenProgressHandler);
router.get("/complaints/:ticketId/timeline", [param("ticketId").isString()], validateRequest, getTimelineHandler);
router.get("/complaints/:ticketId/audit", [param("ticketId").isString()], validateRequest, getTimelineHandler);

router.post(
  "/complaints",
  optionalAuthenticate,
  uploadEvidence.array("images", 5),
  [
    body("complaint").optional().isString().isLength({ min: 8 }),
    body("description").optional().isString().isLength({ min: 8 }),
    body("summary").optional().isString().isLength({ min: 8 }),
    body("category").optional().isString(),
    body("location").optional().isString(),
    body("latitude").optional().isFloat({ min: -90, max: 90 }),
    body("longitude").optional().isFloat({ min: -180, max: 180 }),
  ],
  validateRequest,
  createComplaintHandler,
);

router.patch(
  "/complaints/:id",
  authenticate,
  authorize("admin", "officer", "worker"),
  uploadEvidence.array("images", 5),
  [
    param("id").isString(),
    body("status").optional().isIn(["Received", "Pending", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"]),
    body("complaint").optional().isString().isLength({ min: 8 }),
    body("description").optional().isString().isLength({ min: 8 }),
    body("summary").optional().isString().isLength({ min: 8 }),
    body("category").optional().isString(),
    body("location").optional().isString(),
    body("latitude").optional().isFloat({ min: -90, max: 90 }),
    body("longitude").optional().isFloat({ min: -180, max: 180 }),
  ],
  validateRequest,
  updateComplaintHandler,
);

router.patch(
  "/admin/complaints/:ticketId/status",
  authenticate,
  authorize("admin", "officer", "worker"),
  [param("ticketId").isString(), body("status").isIn(["Pending", "Under Review", "Assigned", "In Progress", "Resolved", "Rejected"])],
  validateRequest,
  updateStatusHandler,
);

export default router;
