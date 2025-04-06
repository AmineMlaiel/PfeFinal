const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, admin, verified } = require("../middleware/authMiddleware");
const {
  validateUserRegistration,
  validateLogin,
  validatePasswordReset,
} = require("../middleware/validationMiddleware");

// Public routes
router.post("/register", validateUserRegistration, userController.registerUser);
router.post("/login", validateLogin, userController.login);
router.get("/confirm-email", userController.confirmEmail);
router.post("/forgot-password", userController.forgotPassword);
router.post(
  "/reset-password",
  validatePasswordReset,
  userController.resetPassword
);

// Protected routes - require authentication
router.use(protect);

// User profile routes - for authenticated users
router.get("/profile", userController.getUserProfile);
router.put("/profile", userController.updateUserProfile);
router.delete("/profile", userController.deleteUserProfile);

// Admin routes - require admin role
router.use(admin);

// User management routes - for admins only
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.put("/:id/validate", userController.validateUser);

module.exports = router;
