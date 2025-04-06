const Booking = require("../models/bookingModel");
const Property = require("../models/propertyModel");
const User = require("../models/userModel");

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    // Set tenant to currently logged in user
    req.body.tenant = req.user._id;

    const { property, startDate, endDate } = req.body;

    // Check if property exists
    const propertyDetails = await Property.findById(property);
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

    // Check if property is already booked for the requested dates
    const existingBooking = await Booking.findOne({
      property,
      status: { $in: ["approved", "pending"] },
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      ],
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Property is already booked for the selected dates",
      });
    }

    // Calculate total price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationInDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (durationInDays < 1) {
      return res.status(400).json({
        success: false,
        message: "Booking duration must be at least 1 day",
      });
    }

    const totalPrice = durationInDays * propertyDetails.price;
    req.body.totalPrice = totalPrice;

    // Create booking
    const booking = await Booking.create(req.body);

    res.status(201).json({
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
        path: "tenant",
        select: "name email mobileNumber",
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Make sure user is booking owner, property owner, or admin
    const property = await Property.findById(booking.property);

    if (
      booking.tenant._id.toString() !== req.user.id &&
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
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
// @access  Private (Property Owner or Admin)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "cancelled",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
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

    // Check authorization: only property owner can approve/reject
    // tenant can cancel their own booking
    if (status === "cancelled") {
      // Tenant can cancel their own booking
      if (
        booking.tenant.toString() !== req.user.id &&
        property.owner.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(401).json({
          success: false,
          message: "Not authorized to cancel this booking",
        });
      }
    } else {
      // For other status changes, only property owner or admin can update
      if (
        property.owner.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(401).json({
          success: false,
          message: "Not authorized to update this booking",
        });
      }
    }

    // If approving, check for conflicting bookings
    if (status === "approved") {
      const conflictingBooking = await Booking.findOne({
        property: booking.property,
        _id: { $ne: booking._id }, // Exclude current booking
        status: "approved",
        $or: [
          {
            startDate: { $lte: booking.endDate },
            endDate: { $gte: booking.startDate },
          },
        ],
      });

      if (conflictingBooking) {
        return res.status(400).json({
          success: false,
          message: "There is already an approved booking for these dates",
        });
      }
    }

    // Update booking status
    booking.status = status;
    await booking.save();

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

// @desc    Get my bookings (as tenant)
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ tenant: req.user._id })
      .populate({
        path: "property",
        select: "title images address price",
      })
      .sort({ createdAt: -1 });

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

// @desc    Get property bookings (as owner)
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

    // Check if user is the property owner or admin
    if (
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to view these bookings",
      });
    }

    const bookings = await Booking.find({ property: req.params.propertyId })
      .populate({
        path: "tenant",
        select: "name email mobileNumber",
      })
      .sort({ createdAt: -1 });

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

// @desc    Get booking calendar data (availability for property)
// @route   GET /api/bookings/calendar/:propertyId
// @access  Public
exports.getBookingCalendar = async (req, res) => {
  try {
    const property = await Property.findById(req.params.propertyId);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Get approved bookings for the property
    const bookings = await Booking.find({
      property: req.params.propertyId,
      status: "approved",
    }).select("startDate endDate");

    // Format as calendar data
    const bookedDates = bookings.map((booking) => ({
      start: booking.startDate,
      end: booking.endDate,
      bookingId: booking._id,
    }));

    res.status(200).json({
      success: true,
      data: {
        property: {
          id: property._id,
          title: property.title,
          availableFrom: property.availability.availableFrom,
          isAvailable: property.availability.isAvailable,
        },
        bookedDates,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
