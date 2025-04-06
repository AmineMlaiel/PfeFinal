const Review = require("../models/reviewModel");
const Booking = require("../models/bookingModel");
const Property = require("../models/propertyModel");

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { booking, rating, comment, specificRatings } = req.body;

    // Check if booking exists and belongs to user
    const bookingData = await Booking.findById(booking);
    if (!bookingData) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user is the tenant who made the booking
    if (bookingData.tenant.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "You can only review properties you have booked",
      });
    }

    // Check if booking is completed
    if (bookingData.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review completed bookings",
      });
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ booking });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this booking",
      });
    }

    // Create review
    const review = await Review.create({
      property: bookingData.property,
      booking,
      reviewer: req.user._id,
      rating,
      comment,
      specificRatings,
    });

    // Mark booking as reviewed
    bookingData.reviewSubmitted = true;
    await bookingData.save();

    // Update property rating
    const property = await Property.findById(bookingData.property);
    const reviews = await Review.find({ property: bookingData.property });

    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    property.rating = averageRating;
    property.reviewCount = reviews.length;
    await property.save();

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all reviews for a property
// @route   GET /api/reviews/property/:propertyId
// @access  Public
exports.getPropertyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      property: req.params.propertyId,
      isApproved: true,
    })
      .populate({
        path: "reviewer",
        select: "name",
      })
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
exports.getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate({
        path: "reviewer",
        select: "name",
      })
      .populate({
        path: "property",
        select: "title images address",
      });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if user is the reviewer or admin
    if (
      review.reviewer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }

    // Update review
    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // If rating was updated, recalculate property average rating
    if (req.body.rating) {
      const property = await Property.findById(review.property);
      const reviews = await Review.find({ property: review.property });

      const totalRating = reviews.reduce(
        (acc, review) => acc + review.rating,
        0
      );
      const averageRating = totalRating / reviews.length;

      property.rating = averageRating;
      await property.save();
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if user is the reviewer or admin
    if (
      review.reviewer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    await review.deleteOne();

    // Update booking to allow new review
    const booking = await Booking.findById(review.booking);
    if (booking) {
      booking.reviewSubmitted = false;
      await booking.save();
    }

    // Recalculate property rating
    const property = await Property.findById(review.property);
    const reviews = await Review.find({ property: review.property });

    if (reviews.length === 0) {
      property.rating = 0;
      property.reviewCount = 0;
    } else {
      const totalRating = reviews.reduce(
        (acc, review) => acc + review.rating,
        0
      );
      const averageRating = totalRating / reviews.length;

      property.rating = averageRating;
      property.reviewCount = reviews.length;
    }

    await property.save();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add owner response to review
// @route   POST /api/reviews/:id/response
// @access  Private (Property Owner or Admin)
exports.addReviewResponse = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Response text is required",
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if user is the property owner or admin
    const property = await Property.findById(review.property);

    if (
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to respond to this review",
      });
    }

    // Add owner response
    review.ownerResponse = {
      text,
      date: new Date(),
    };

    await review.save();

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Approve/disapprove review (admin only)
// @route   PUT /api/reviews/:id/approve
// @access  Private (Admin only)
exports.approveReview = async (req, res) => {
  try {
    const { approved } = req.body;

    if (typeof approved !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Approved status must be a boolean",
      });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved: approved },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // If disapproving, recalculate property rating without this review
    if (!approved) {
      const property = await Property.findById(review.property);
      const approvedReviews = await Review.find({
        property: review.property,
        isApproved: true,
      });

      if (approvedReviews.length === 0) {
        property.rating = 0;
        property.reviewCount = 0;
      } else {
        const totalRating = approvedReviews.reduce(
          (acc, review) => acc + review.rating,
          0
        );
        const averageRating = totalRating / approvedReviews.length;

        property.rating = averageRating;
        property.reviewCount = approvedReviews.length;
      }

      await property.save();
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
