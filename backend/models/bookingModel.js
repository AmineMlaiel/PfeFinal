const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property is required"],
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Tenant is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial", "refunded", "failed"],
      default: "pending",
    },
    paymentDetails: {
      transactionId: String,
      paymentMethod: String,
      paymentDate: Date,
    },
    additionalRequests: {
      type: String,
      trim: true,
    },
    documents: [
      {
        type: String, // Document URLs
      },
    ],
    reviewSubmitted: {
      type: Boolean,
      default: false,
    },
    // Admin or landlord notes (not visible to tenant)
    privateNotes: {
      type: String,
      trim: true,
    },
    // Message history related to this booking
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Check if end date is after start date
bookingSchema.pre("save", function (next) {
  if (this.endDate < this.startDate) {
    return next(new Error("End date must be after start date"));
  }
  next();
});

// Add index for fast lookups by tenant and property
bookingSchema.index({ tenant: 1, property: 1 });
bookingSchema.index({ property: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
