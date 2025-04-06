const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    checkIn: {
      type: Date,
      required: [true, "Check-in date is required"],
    },
    checkOut: {
      type: Date,
      required: [true, "Check-out date is required"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    guests: {
      adults: {
        type: Number,
        required: [true, "Number of adults is required"],
        min: 1,
      },
      children: {
        type: Number,
        default: 0,
      },
    },
    contactInfo: {
      name: {
        type: String,
        required: [true, "Contact name is required"],
      },
      email: {
        type: String,
        required: [true, "Contact email is required"],
      },
      phone: {
        type: String,
        required: [true, "Contact phone is required"],
      },
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial", "refunded", "failed"],
      default: "pending",
    },
    // Reference to property for population
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Check if check-out date is after check-in date
bookingSchema.pre("save", function (next) {
  if (this.checkOut < this.checkIn) {
    return next(new Error("Check-out date must be after check-in date"));
  }

  // Set property field as well when propertyId is provided
  if (this.propertyId && !this.property) {
    this.property = this.propertyId;
  }

  next();
});

// Add index for fast lookups by userId and propertyId
bookingSchema.index({ userId: 1, propertyId: 1 });
bookingSchema.index({ propertyId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
