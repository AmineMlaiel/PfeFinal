const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property is required"],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
    },
    images: [
      {
        type: String, // Image URLs
      },
    ],
    isApproved: {
      type: Boolean,
      default: true,
    },
    // If the review has a response from the owner
    ownerResponse: {
      text: String,
      date: Date,
    },
    // Specific ratings for different aspects
    specificRatings: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5,
      },
      location: {
        type: Number,
        min: 1,
        max: 5,
      },
      value: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      accuracy: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one review per booking
reviewSchema.index({ booking: 1 }, { unique: true });

// Add index for fast property reviews lookup
reviewSchema.index({ property: 1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
