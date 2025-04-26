const Booking = require("../models/bookingModel");
const Property = require("../models/propertyModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");



// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    // Set userId to currently logged in user
    req.body.userId = req.user._id;

    const {
      propertyId,
      checkIn,
      checkOut,
      totalPrice,
      guests,
      contactInfo,
      specialRequests,
    } = req.body;

    // Validate required fields
    if (!propertyId || !checkIn || !checkOut || !guests || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking information",
      });
    }

    // Check if property exists
    const propertyDetails = await Property.findById(propertyId);
    if (!propertyDetails) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check if property is available
    if (!propertyDetails.availability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "This property is not available for booking",
      });
    }

    // Parse dates
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const bookingDate = new Date(bookingMonth);

   // Calculate first and last day of the month for compatibility
    const firstDate =new Date(bookingDate.getFullYear(),bookingDate.getMonth(),1);
    const lastDate = newDate(bookingDate.getFullYear(),bookingDate.getMonth(),+ 1,0);




    // Validate dates
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date",
      });
    }

    // Check if property is already booked for the requested dates
    const existingBooking = await Booking.findOne({
      propertyId,
      status: { $in: ["confirmed", "pending"] },
      bookingMonth : {
        $gte : new Date(bookingDate.getFullYear(), bookingDate.getMonth(),1),
        $lt : new Date(bookingDate.getFullYear(), bookingDate.getmonth() +1, 1)
      }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Property is already booked for the selected dates",
      });
    }

    // Create booking with all the fields from the request
    const bookingData = {
      propertyId,
      userId: req.user._id,
      bookingMonth: bookingDate,
      checkIn :firstDate,
      checkOut: lastDate,
      totalPrice,
      guests,
      contactInfo,
      specialRequests,
      status: "pending",
      property: propertyId,
      canDelete: true, // Setting both propertyId and property fields
    };

    // Create booking
    const booking = await Booking.create(bookingData);

    // Get more information about the property for the response
    const populatedBooking = await Booking.findById(booking._id).populate({
      path: "property",
      select: "title images address price host",
    });

    res.status(201).json({
      success: true,
      data: populatedBooking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
exports.getBookings = async (req, res) => {
  try {
    let query;

    // If user is admin, get all bookings
    if (req.user.role === "admin") {
      query = Booking.find();
    } else {
      // If user is not admin, only get bookings where user is the tenant
      // or user is the owner of the property
      const properties = await Property.find({ owner: req.user._id });
      const propertyIds = properties.map((property) => property._id);

      query = Booking.find({
        $or: [{ tenant: req.user._id }, { property: { $in: propertyIds } }],
      });
    }

    // Add references
    query = query
      .populate({
        path: "property",
        select: "title images address price",
      })
      .populate({
        path: "tenant",
        select: "name email mobileNumber",
      });

    // Execute query
    const bookings = await query;

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: "property",
        select: "title images address price owner",
        populate: {
          path: "owner",
          select: "name email mobileNumber",
        },
      })
      .populate({
        path: "userId", // Use correct field name
        select: "name email mobileNumber",
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const property = await Property.findById(booking.property);

    if (
      !booking.userId || 
      (booking.userId._id.toString() !== req.user.id &&
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin")
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this booking",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Check if a valid status is provided
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status provided",
      });
    }

    // Find booking
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Find property
    const property = await Property.findById(booking.propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Associated property not found",
      });
    }

    // Check authorization
    const isPropertyOwner =
      property.host.toString() === req.user._id.toString();
    const isTenant = booking.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isPropertyOwner && !isTenant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this booking",
      });
    }

    // If status is being set to confirmed, check for conflicts
    if (status === "confirmed" && booking.status !== "confirmed") {
      // Check for conflicting bookings
      const conflictingBookings = await Booking.findOne({
        propertyId: booking.propertyId,
        _id: { $ne: booking._id }, // Exclude current booking
        status: "confirmed",
        $or: [
          {
            checkIn: { $lte: booking.checkOut },
            checkOut: { $gte: booking.checkIn },
          },
        ],
      });

      if (conflictingBookings) {
        return res.status(400).json({
          success: false,
          message: "There is a conflicting confirmed booking for these dates",
        });
      }
    }

    // Only property owner or admin can confirm a booking
    if (status === "confirmed" && !isPropertyOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the property owner or admin can confirm bookings",
      });
    }

    // Update booking status
    booking.status = status;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// @desc    Add message to booking
// @route   POST /api/bookings/:id/messages
// @access  Private
exports.addBookingMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Get the property to check ownership
    const property = await Property.findById(booking.property);

    // Check if user is authorized to add messages
    if (
      booking.tenant.toString() !== req.user.id &&
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to add messages to this booking",
      });
    }

    // Add message to booking
    const newMessage = {
      sender: req.user._id,
      message,
      timestamp: new Date(),
      isRead: false,
    };

    booking.messages.push(newMessage);
    await booking.save();

    res.status(200).json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get bookings for logged in tenant
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate({
        path: "property",
        select: "title images address price host",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get bookings for a property
// @route   GET /api/bookings/property/:propertyId
// @access  Private
exports.getPropertyBookings = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check if user is authorized to view these bookings
    if (
      property.host.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view bookings for this property",
      });
    }

    const bookings = await Booking.find({ propertyId: req.params.propertyId })
      .populate({
        path: "userId",
        select: "name email phone",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get booking calendar for a property (available/booked dates)
// @route   GET /api/bookings/calendar/:propertyId
// @access  Public
exports.getBookingCalendar = async (req, res) => {
  try {
    // Check if property exists
    const property = await Property.findById(req.params.propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Get confirmed bookings for the property
    const bookings = await Booking.find({
      propertyId: req.params.propertyId,
      status: "confirmed",
    }).select("checkIn checkOut");

    // Format dates for frontend calendar
    const bookedDates = bookings.map((booking) => ({
      startDate: booking.checkIn,
      endDate: booking.checkOut,
    }));

    res.status(200).json({
      success: true,
      data: {
        property: {
          id: property._id,
          title: property.title,
          price: property.price,
          isAvailable: property.availability.isAvailable,
        },
        bookedDates,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Check property availability for specific dates
// @route   POST /api/bookings/check-availability
// @access  Public
exports.checkAvailability = async (req, res) => {
  try {
    const { propertyId, bookingMonth } = req.body;

    // Validate required fields
    if (!propertyId || !bookingMonth) {
      return res.status(400).json({
        success: false,
        message: "Property ID and booking month are required",
      });
    }

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check if property is available for booking in general
    if (!property.availability.isAvailable) {
      return res.status(200).json({
        success: true,
        isAvailable: false,
        message: "Property is not available for booking",
      });
    }

    // Parse dates
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const bookingDate = new Date(bookingMonth);

    // Validate dates
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date",
      });
    }

    // Check if property is already booked for the requested dates
    const existingBooking = await Booking.findOne({
      propertyId,
      status: { $in: ["confirmed", "pending"] },
      bookingMonth: {
        $gte: new Date(bookingDate.getFullYear(),bookingDate.getMonth(),1),
        $lt: new Date(bookingDate.getFullYear(),bookingMonth.getMonth(), +1 ,1)
      }
    });

    // Return availability status
    const isAvailable = !existingBooking;
    res.status(200).json({
      success: true,
      isAvailable,
      message: isAvailable
        ? "Property is available for the selected dates"
        : "Property is not available for the selected dates",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Calculate booking price
// @route   POST /api/bookings/calculate
// @access  Public
exports.calculateBookingPrice = async (req, res) => {
  try {
    const { propertyId, bookingMonth, guests } = req.body;

    // Validate required fields
    if (!propertyId || !bookingMonth || !guests) {
      return res.status(400).json({
        success: false,
        message: "Property ID, booking month, and guests information are required",
      });
    }

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Calculate monthly price (assuming property.price is daily rate)
    const daysInMonth = new Date(
      new Date(bookingMonth).getFullYear(),
      new Date(bookingMonth).getMonth() + 1,
      0
    ).getDate();
    
    // Apply a monthly discount (e.g., 15% off daily rate)
    const monthlyDiscount = 0.15;
    const basePrice = property.price * daysInMonth * (1 - monthlyDiscount);

    // Calculate additional guest fee if applicable
    let additionalGuestFee = 0;
    const totalGuests = guests.adults + (guests.children || 0);

    if (property.additionalGuestFee && totalGuests > property.baseGuests) {
      const additionalGuests = totalGuests - property.baseGuests;
      additionalGuestFee = additionalGuests * property.additionalGuestFee * daysInMonth;
    }

    // Calculate cleaning fee (one-time)
    const cleaningFee = property.cleaningFee || 0;

    // Calculate service fee (e.g., 10% of base price)
    const serviceFee = basePrice * 0.1;

    // Calculate total price
    const totalPrice = basePrice + additionalGuestFee + cleaningFee + serviceFee;

    res.status(200).json({
      success: true,
      data: {
        breakdown: {
          basePrice,
          additionalGuestFee,
          cleaningFee,
          serviceFee,
          totalPrice,
          daysInMonth,
          monthlyDiscount: `${monthlyDiscount * 100}%`,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Delete booking by ID
exports.deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Ensure the ID format is valid (optional, but good practice)
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Attempt to delete the booking
    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Send success response
    return res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
