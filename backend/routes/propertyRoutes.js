const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");
const { protect, admin } = require("../middleware/authMiddleware");

// Routes accessible to everyone
router.get("/", propertyController.getProperties);
router.get("/nearby", propertyController.getNearbyProperties);
router.get("/:id", propertyController.getProperty);

// Protected routes - require authentication
router.use(protect);

// Property owner or admin routes
router.post("/", propertyController.createProperty);
router.get("/user/my-properties", propertyController.getMyProperties);
router.put("/:id", propertyController.updateProperty);
router.delete("/:id", propertyController.deleteProperty);
router.post("/:id/images", propertyController.uploadPropertyImages);

// Admin only routes
router.use(admin);
router.put("/:id/approve", propertyController.approveProperty);

module.exports = router;
