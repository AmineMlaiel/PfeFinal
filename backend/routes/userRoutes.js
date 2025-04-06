const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, admin } = require("../middleware/authMiddleware");

// Auth routes (public)
router.post("/register", userController.registerUser);
router.post("/login", userController.login);
router.get("/confirm-email", userController.confirmEmail);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

// Protected routes
router.use(protect);
router.get("/profile", userController.getUserProfile);
router.put("/profile", userController.updateUserProfile);
router.post("/upgrade-to-owner", userController.upgradeToOwner);

// Admin routes
router.use(admin);
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);
router.put("/:id/upgrade-to-owner", userController.upgradeToOwner);

module.exports = router; 