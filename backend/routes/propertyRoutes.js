const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/propertyController");
const { protect, admin, owner } = require("../middleware/authMiddleware");

// Routes accessible to everyone
router.get("/", propertyController.getProperties);
router.get("/nearby", propertyController.getNearbyProperties);
router.get("/:id", propertyController.getProperty);

// Admin routes
router.use(protect);
router.get("/admin/all", admin, propertyController.getProperties);
router.put("/:id/approve", admin, propertyController.approveProperty);

// Routes for owners (and admins) - create, update, delete properties
router.use(owner);
router.post("/", propertyController.createProperty);
router.get("/user/my-properties", propertyController.getMyProperties);
router.get("/:id/check-ownership", propertyController.checkPropertyOwnership);
router.put("/:id", propertyController.updateProperty);
router.delete("/:id", propertyController.deleteProperty);
router.post("/:id/images", propertyController.uploadPropertyImages);

module.exports = router;
