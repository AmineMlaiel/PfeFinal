const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public routes
router.get("/calendar/:propertyId", bookingController.getBookingCalendar);

// Protected routes - require authentication
router.use(protect);

// User routes (tenants and landlords)
router.post("/", bookingController.createBooking);
router.get("/my-bookings", bookingController.getMyBookings);
router.get("/property/:propertyId", bookingController.getPropertyBookings);
router.get("/", bookingController.getBookings);
router.get("/:id", bookingController.getBooking);
router.put("/:id/status", bookingController.updateBookingStatus);
router.post("/:id/messages", bookingController.addBookingMessage);

module.exports = router; 