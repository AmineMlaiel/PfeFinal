const Booking = require("../models/bookingModel");
const Property = require("../models/propertyModel");
const User = require("../models/userModel");
const { sendMessageNotification } = require("../utils/mailSender")
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
      bookingMonth, // Expecting bookingMonth from frontend
      // checkIn, // No longer expecting checkIn from frontend for monthly booking
      // checkOut, // No longer expecting checkOut from frontend for monthly booking
      totalPrice,
      guests,
      contactInfo,
      specialRequests,
    } = req.body;

    // Validate required fields
    if (!propertyId || !bookingMonth  || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: "Missing required booking information (propertyId, bookingMonth, guests, contactInfo)",
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

    // Check if property is available (general availability flag)
    // This might be a separate flag on the property model, not related to specific dates
    if (propertyDetails.availability && !propertyDetails.availability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: "This property is not available for booking at the moment.",
      });
    }

    // Parse bookingMonth
    const bookingDate = new Date(bookingMonth); // bookingMonth should be in YYYY-MM format or a full date string for the first of the month
    if (isNaN(bookingDate.getTime())) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid bookingMonth format. Please use YYYY-MM or a valid date string."
        });
    }

   // Calculate first and last day of the month
    const firstDayOfMonth = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1);
    const lastDayOfMonth = new Date(bookingDate.getFullYear(), bookingDate.getMonth() + 1, 0);

    // Check if property is already booked for the requested month
    // The query for existingBooking needs to correctly use bookingMonth
    const existingBooking = await Booking.findOne({
      propertyId,
      status: { $in: ["confirmed", "pending"] },
      // Assuming bookingMonth in the DB stores the first day of the booked month
      bookingMonth: firstDayOfMonth 
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Property is already booked for the selected month. Please choose a different month.",
      });
    }

    // Create booking with all the fields from the request
    const bookingData = {
      propertyId,
      userId: req.user._id,
      bookingMonth: firstDayOfMonth, // Store the first day of the month
      checkIn :firstDayOfMonth, // For compatibility or specific needs
      checkOut: lastDayOfMonth, // For compatibility or specific needs
      totalPrice, // This should be calculated on the backend ideally
      guests,
      contactInfo,
      specialRequests,
      status: "pending",
      property: propertyId, // Redundant if propertyId is already there, but good for population
      // canDelete: true, // This field is not in your schema, remove or add to schema
    };

    // Create booking
    const booking = await Booking.create(bookingData);

    // Get more information about the property for the response
    const populatedBooking = await Booking.findById(booking._id).populate({
      path: "property",
      select: "title images address price host", // Add other relevant fields
    });

    res.status(201).json({
      success: true,
      data: populatedBooking,
    });
  } catch (error) {
    console.error("Error creating booking:", error); // Log the error for debugging
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin+owner
exports.getBookings = async (req, res) => {
  try {
    let query;
    const { _id, role } = req.user;

    // Admins can see all bookings
    if (role === 'admin') {
      query = Booking.find();
    } 
    // Owners can only see bookings for their properties
    else if (role === 'owner') {
      const properties = await Property.find({ owner: _id });
      const propertyIds = properties.map(p => p._id);
      query = Booking.find({ property: { $in: propertyIds } });
    }

    // Populate related data
    const bookings = await query
      .populate({
        path: 'property',
        select: 'title images address price'
      })
      .populate({
        path: 'userId',
        select: 'name email mobileNumber'
      })
      .sort({ createdAt: -1 }); // Newest first

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.error('Error getting bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
        select: "title images address price owner host", // Added host
        populate: {
          path: "owner", // Assuming 'owner' is the correct ref path in Property model
          select: "name email mobileNumber",
        },
      })
      .populate({
        path: "userId", 
        select: "name email mobileNumber",
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // The property might already be populated, or you might need to fetch it if only propertyId is stored sometimes.
    // Let's assume booking.property is populated or is an ID.
    const propertyOwnerId = booking.property.owner ? booking.property.owner.toString() : (booking.property.host ? booking.property.host.toString() : null);

    if (
      !booking.userId || 
      (booking.userId._id.toString() !== req.user.id &&
      propertyOwnerId !== req.user.id && // Check against property owner
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
    console.error("Error getting single booking:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to retrieve booking",
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
    const propertyOwnerId = property.owner ? property.owner.toString() : (property.host ? property.host.toString() : null);
    const isPropertyOwner = propertyOwnerId === req.user._id.toString();
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
      // For monthly booking, conflict is if the bookingMonth is the same
      const conflictingBookings = await Booking.findOne({
        propertyId: booking.propertyId,
        _id: { $ne: booking._id }, // Exclude current booking
        status: "confirmed",
        bookingMonth: booking.bookingMonth // Check against the stored bookingMonth
      });

      if (conflictingBookings) {
        return res.status(400).json({
          success: false,
          message: "There is a conflicting confirmed booking for this month.",
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
    // Tenant can cancel their own pending booking
    if (status === "cancelled" && booking.status === "pending" && !isTenant && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "You can only cancel your own pending bookings."
        });
    }
    if (status === "cancelled" && booking.status !== "pending" && !isPropertyOwner && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: "Only property owner or admin can cancel confirmed/completed bookings."
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
    console.error("Error updating booking status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update booking status",
    });
  }
};


// @desc    Add message to booking (This seems to be for a different feature, ensure messages array exists in bookingSchema if used)
// @route   POST /api/bookings/:id/messages
// @access  Private


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
    console.error("Error getting my bookings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve your bookings",
    });
  }
};

// @desc    Get bookings for a property (for property owner)
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

    const propertyOwnerId = property.owner ? property.owner.toString() : (property.host ? property.host.toString() : null);
    // Check if user is authorized to view these bookings
    if (
      propertyOwnerId !== req.user._id.toString() &&
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
        select: "name email phone", // Changed from mobileNumber to phone to match schema
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Error getting property bookings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve property bookings",
    });
  }
};

// Add message to a pending booking
exports.addBookingMessage = async (req, res) => {
  try {
    // Validate message content
    if (!req.body.message || typeof req.body.message !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Valid message content is required"
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      status: { $in: ['pending', 'confirmed', 'cancelled'] }
    }).populate('propertyId', 'owner'); // Populate owner for verification

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: "Pending booking not found" 
      });
    }

    // Verify user is either renter or owner
    const isRenter = booking.userId.toString() === req.user._id.toString();
    const isOwner = booking.propertyId.owner.toString() === req.user._id.toString();
    
    if (!isRenter && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to message this booking"
      });
    }

    const newMessage = {
      sender: req.user._id,
      message: req.body.message,
      attachments: req.body.attachments || []
    };

    booking.preBookingMessages.push(newMessage);
    await booking.save();

    // Populate sender info in response
    const populatedMessage = {
      ...newMessage,
      sender: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        profileImage: req.user.profileImage
      }
    };

    res.status(200).json({
      success: true,
      data: populatedMessage
    });

  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : "Failed to add message"
    });
  }
};

// Get all messages for a booking
exports.getBookingMessages = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'preBookingMessages.sender',
        select: 'name email profileImage'
      })
      .populate('propertyId', 'owner title');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: "Booking not found" 
      });
    }

    // Verify requester is either owner or renter
    const isAuthorized = req.user._id.toString() === booking.userId.toString() || 
                       req.user._id.toString() === booking.propertyId.owner.toString();

    if (!isAuthorized && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view these messages"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        messages: booking.preBookingMessages,
        propertyTitle: booking.propertyId.title
      }
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve messages"
    });
  }
};

// Negotiate booking terms
exports.negotiateBookingTerms = async (req, res) => {
  try {
    // Validate negotiation data
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Negotiation data is required"
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      status: 'pending'
    }).populate('propertyId', 'owner');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: "Pending booking not found" 
      });
    }

    // Verify requester is the property owner
    if (req.user._id.toString() !== booking.propertyId.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only property owner can negotiate terms"
      });
    }

    const validFields = ['price', 'checkIn', 'checkOut', 'guests'];
    const changes = [];
    const updatedFields = {};

    // Process each negotiable field
    for (const field of validFields) {
      if (req.body[field] !== undefined) {
        changes.push({
          changedField: field,
          oldValue: booking[field],
          newValue: req.body[field],
          changedBy: req.user._id,
          changedAt: new Date()
        });
        updatedFields[field] = req.body[field];
      }
    }

    if (changes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for negotiation"
      });
    }

    // Update booking and save history
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: updatedFields,
        $push: { negotiationHistory: { $each: changes } }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: {
        updatedFields,
        negotiationHistory: updatedBooking.negotiationHistory
      }
    });

  } catch (error) {
    console.error("Negotiation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process negotiation"
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
    }).select("bookingMonth checkIn checkOut"); // Select bookingMonth as well

    // Format dates for frontend calendar
    // For monthly bookings, you might want to return booked months
    const bookedPeriods = bookings.map((booking) => ({
      // If you store bookingMonth as the first day of the month:
      month: booking.bookingMonth ? booking.bookingMonth.toISOString().substring(0,7) : null, // YYYY-MM
      // Or if you are still using checkIn/checkOut for display:
      // startDate: booking.checkIn,
      // endDate: booking.checkOut,
    }));

    res.status(200).json({
      success: true,
      data: {
        property: {
          id: property._id,
          title: property.title,
          price: property.price, // Consider adding monthlyPrice here if you implement it
          isAvailable: property.availability ? property.availability.isAvailable : true, // Handle if availability is not set
        },
        bookedPeriods, // Changed from bookedDates
      },
    });
  } catch (error) {
    console.error("Error getting booking calendar:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve booking calendar",
    });
  }
};

// @desc    Check property availability for specific month
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
    if (property.availability && !property.availability.isAvailable) {
      return res.status(200).json({
        success: true, // Still a successful check, but property is unavailable
        isAvailable: false,
        message: "Property is generally not available for booking at the moment.",
      });
    }

    // Parse bookingMonth (expecting YYYY-MM from frontend or a full date string for the first of the month)
    const requestedMonthDate = new Date(bookingMonth);
    if (isNaN(requestedMonthDate.getTime())) {
        return res.status(400).json({ 
            success: false, 
            message: "Invalid bookingMonth format. Please use YYYY-MM or a valid date string."
        });
    }
    
    // Normalize to the first day of the month for consistent querying
    const firstDayOfRequestedMonth = new Date(requestedMonthDate.getFullYear(), requestedMonthDate.getMonth(), 1);

    // Check if property is already booked for the requested month
    const existingBooking = await Booking.findOne({
      propertyId,
      status: { $in: ["confirmed", "pending"] }, 
      bookingMonth: firstDayOfRequestedMonth // Compare against the stored first day of the month
    });

    // Return availability status
    const isAvailable = !existingBooking;
    res.status(200).json({
      success: true,
      isAvailable,
      message: isAvailable
        ? "This month is available."
        : "This month is not available. Please select a different month.",
    });
  } catch (error) {
    console.error("Error in checkAvailability:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error checking availability",
    });
  }
};

// @desc    Calculate booking price
// @route   POST /api/bookings/calculate
// @access  Public
exports.calculateBookingPrice = async (req, res) => {
  try {
    const { propertyId, bookingMonth, guests, bookingType, checkIn, checkOut } = req.body;

    // Validate required fields
    if (!propertyId || !guests || !bookingType) {
      return res.status(400).json({
        success: false,
        message: "Property ID, guests information, and booking type are required",
      });
    }

    // Validate guests structure
    if (!guests.adults || guests.adults < 1) {
      return res.status(400).json({
        success: false,
        message: "At least one adult is required",
      });
    }

    // Fetch the property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        message: "Property not found" 
      });
    }

    let basePrice = 0;
    let numberOfNights = 0;
    let daysInSelectedMonth = 0;

    if (bookingType === 'monthly') {
      // Monthly booking validation
      if (!bookingMonth) {
        return res.status(400).json({ 
          success: false, 
          message: "Booking month is required for monthly bookings" 
        });
      }
      
      if (!property.pricePerMonth) {
        return res.status(400).json({ 
          success: false, 
          message: "Monthly pricing is not available for this property" 
        });
      }

      const monthDate = new Date(bookingMonth);
      if (isNaN(monthDate.getTime())) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid booking month format" 
        });
      }

      daysInSelectedMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      numberOfNights = daysInSelectedMonth;
      basePrice = property.pricePerMonth;

    } else if (bookingType === 'nightly') {
      // Nightly booking validation
      if (!checkIn || !checkOut) {
        return res.status(400).json({ 
          success: false, 
          message: "Check-in and check-out dates are required for nightly bookings" 
        });
      }

      if (!property.pricePerNight) {
        return res.status(400).json({ 
          success: false, 
          message: "Nightly pricing is not available for this property" 
        });
      }

      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid check-in date format" 
        });
      }

      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid check-out date format" 
        });
      }

      if (endDate <= startDate) {
        return res.status(400).json({ 
          success: false, 
          message: "Check-out date must be after check-in date" 
        });
      }

      numberOfNights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      basePrice = property.pricePerNight * numberOfNights;

    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid booking type specified. Choose 'nightly' or 'monthly'" 
      });
    }

    // Calculate additional guest fee
    let additionalGuestFee = 0;
    const totalGuests = guests.adults + (guests.children || 0);
    
    if (property.additionalGuestFee && property.baseGuests && totalGuests > property.baseGuests) {
      const additionalGuests = totalGuests - property.baseGuests;
      additionalGuestFee = additionalGuests * property.additionalGuestFee * numberOfNights;
    }

    // Calculate other fees
    const cleaningFee = property.cleaningFee || 0;
    const serviceFeePercentage = property.serviceFeePercentage || 0.1; // Default to 10%
    const serviceFee = basePrice * serviceFeePercentage;

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
          numberOfNights,
          daysInSelectedMonth: bookingType === 'monthly' ? daysInSelectedMonth : null,
          bookingType,
        },
      },
    });

  } catch (error) {
    console.error("Error calculating booking price:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate price",
    });
  }
};

// @desc    Delete a booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user is authorized to delete this booking
    // Only the user who made the booking or an admin can delete
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this booking",
      });
    }

    // Optionally, add more conditions (e.g., can only delete 'pending' bookings)
    // if (booking.status !== 'pending') {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Only pending bookings can be deleted by the user.",
    //   });
    // }

    await booking.deleteOne(); // Changed from booking.remove()

    res.status(200).json({
      success: true,
      data: {},
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete booking",
    });
  }
};



exports.sendMessage = async (req, res) => {
  try {
    const { bookingId, messageContent, message } = req.body;
    const userId = req.user?.id;
    const actualMessage = messageContent || message;

    if (!bookingId || !actualMessage || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Processing message for booking:', bookingId);

    // Get booking without population first
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('Booking found:', {
      userId: booking.userId || booking.user,
      propertyId: booking.propertyId || booking.property
    });

    // Add message to booking
    booking.preBookingMessages.push({
      sender: userId,
      message: actualMessage,
      timestamp: new Date(),
      createdAt: new Date()
    });

    await booking.save();
    console.log('✓ Message saved successfully');

    // Now get the users and property separately to avoid population issues
    let bookingUser, property, propertyOwner;
    
    try {
      // Get booking user
      const bookingUserId = booking.userId || booking.user;
      if (bookingUserId) {
        bookingUser = await User.findById(bookingUserId);
        console.log('Booking user found:', bookingUser?.email);
      }

      // Get property and property owner
      const propertyId = booking.propertyId || booking.property;
      if (propertyId) {
        property = await Property.findById(propertyId).populate('owner');
        // OR if owner is not populated, try:
        // property = await Property.findById(propertyId);
        // propertyOwner = await User.findById(property.owner);
        
        propertyOwner = property?.owner;
        console.log('Property found:', property?.title);
        console.log('Property owner found:', propertyOwner?.email);
      }
    } catch (fetchError) {
      console.error('Error fetching related data:', fetchError);
      // Continue without email notification
      return res.status(200).json({ 
        message: 'Message sent but could not send email notification',
        messageId: booking.preBookingMessages[booking.preBookingMessages.length - 1]._id
      });
    }

    // Determine sender and receiver
    let sender, receiver, senderName;
    
    if (bookingUser && bookingUser._id.toString() === userId) {
      // Current user is the booking user, send email to property owner
      sender = bookingUser;
      receiver = propertyOwner;
      senderName = bookingUser.firstName || bookingUser.name || 'Guest';
      console.log('Booking user messaging property owner');
    } else if (propertyOwner && propertyOwner._id.toString() === userId) {
      // Current user is the property owner, send email to booking user
      sender = propertyOwner;
      receiver = bookingUser;
      senderName = propertyOwner.firstName || propertyOwner.name || 'Property Owner';
      console.log('Property owner messaging booking user');
    } else {
      console.log('Could not determine sender/receiver relationship');
      return res.status(200).json({ 
        message: 'Message sent but could not determine recipient for email',
        messageId: booking.preBookingMessages[booking.preBookingMessages.length - 1]._id
      });
    }

    if (!receiver || !receiver.email) {
      console.log('Receiver email not found');
      return res.status(200).json({ 
        message: 'Message sent but recipient email not available',
        messageId: booking.preBookingMessages[booking.preBookingMessages.length - 1]._id
      });
    }

    // Send email notification
    try {
      console.log(`Sending email to: ${receiver.email}`);
      console.log(`From: ${senderName}`);
      console.log(`Property: ${property?.title || 'Property'}`);
      
      await sendMessageNotification(
        receiver.email,
        senderName,
        property?.title || 'Property',
        actualMessage
      );
      
      console.log('✓ Email notification sent successfully');
      
      res.status(200).json({ 
        message: 'Message sent and notification email delivered',
        messageId: booking.preBookingMessages[booking.preBookingMessages.length - 1]._id,
        emailSentTo: receiver.email
      });
      
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(200).json({ 
        message: 'Message sent but email notification failed',
        messageId: booking.preBookingMessages[booking.preBookingMessages.length - 1]._id,
        emailError: emailError.message
      });
    }

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ 
      error: 'Something went wrong while sending the message.',
      details: err.message
    });
  }
};