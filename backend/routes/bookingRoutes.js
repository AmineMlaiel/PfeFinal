const express = require("express");
const {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  addBookingMessage,
  getBookingMessages,
  negotiateBookingTerms,
  getMyBookings,
  getPropertyBookings,
  getBookingCalendar,
  checkAvailability,
  calculateBookingPrice,
  deleteBooking,
} = require("../controllers/bookingController");
const { protect, admin ,authorize} = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.get("/calendar/:propertyId", getBookingCalendar);
router.post("/check-availability", checkAvailability);
router.post("/calculate", calculateBookingPrice);

// Protected routes (require authentication)
router.post("/", protect, createBooking);
router.get("/", protect, authorize('admin', 'owner'), getBookings);
router.get("/my-bookings", protect, getMyBookings);
router.get("/property/:propertyId", protect, getPropertyBookings);
router.get("/:id", protect, getBooking);
router.put("/:id/status", protect, updateBookingStatus);
router.post("/:id/messages", protect, addBookingMessage);
router.get("/:id/messages", protect, getBookingMessages);
router.post("/:id/negotiate", protect, negotiateBookingTerms);

router.delete("/:id", protect, deleteBooking);



module.exports = router;
