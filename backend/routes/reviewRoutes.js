const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public routes
router.get("/property/:propertyId", reviewController.getPropertyReviews);
router.get("/:id", reviewController.getReview);

// Protected routes - require authentication
router.use(protect);

// User routes
router.post("/", reviewController.createReview);
router.put("/:id", reviewController.updateReview);
router.delete("/:id", reviewController.deleteReview);
router.post("/:id/response", reviewController.addReviewResponse);

// Admin only routes
router.use(admin);
router.put("/:id/approve", reviewController.approveReview);

module.exports = router;
