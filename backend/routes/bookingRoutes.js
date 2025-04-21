const express = require("express");
const {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  addBookingMessage,
  getMyBookings,
  getPropertyBookings,
  getBookingCalendar,
  checkAvailability,
  calculateBookingPrice,
  deleteBooking,
} = require("../controllers/bookingController");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.get("/calendar/:propertyId", getBookingCalendar);
router.post("/check-availability", checkAvailability);
router.post("/calculate", calculateBookingPrice);

// Protected routes (require authentication)
router.post("/", protect, createBooking);
router.get("/", protect, admin, getBookings);
router.get("/my-bookings", protect, getMyBookings);
router.get("/property/:propertyId", protect, getPropertyBookings);
router.get("/:id", protect, getBooking);
router.put("/:id/status", protect, updateBookingStatus);
router.post("/:id/messages", protect, addBookingMessage);

router.delete("/:id", protect, deleteBooking);



module.exports = router;
