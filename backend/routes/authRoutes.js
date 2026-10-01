import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import { forgotPassword, login, logout, me, refresh, resetPassword, signup } from "../controllers/authController.js";

const router = Router();

router.post("/signup", [
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters."),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),
  body("role")
    .optional()
    .isIn(["citizen", "admin", "officer", "worker"])
    .withMessage("Role must be citizen, admin, officer, or worker."),
  body("adminInviteCode")
    .optional()
    .isString()
    .withMessage("Admin invite code must be text."),
  body("workerId")
    .if(body("role").equals("worker"))
    .trim()
    .matches(/^worker@\d+$/)
    .withMessage("Worker ID must use the worker@123 format."),
], validateRequest, signup);

router.post("/login", [
  body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required."),
], validateRequest, login);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.post("/forgot-password", [body("email").isEmail()], validateRequest, forgotPassword);
router.post("/reset-password", [
  body("token").isString().notEmpty().withMessage("Reset token is required."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),
], validateRequest, resetPassword);
router.get("/me", authenticate, me);

export default router;
