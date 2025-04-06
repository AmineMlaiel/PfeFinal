const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Property title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Property description is required"],
      trim: true,
    },
    address: {
      street: {
        type: String,
        required: [true, "Street address is required"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State/Province is required"],
        trim: true,
      },
      zipCode: {
        type: String,
        required: [true, "Zip/Postal code is required"],
        trim: true,
      },
      country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
      },
    },
    propertyType: {
      type: String,
      required: [true, "Property type is required"],
      enum: [
        "apartment",
        "house",
        "condo",
        "villa",
        "townhouse",
        "studio",
        "office",
        "commercial",
        "other",
      ],
    },
    price: {
      type: Number,
      required: [true, "Rental price is required"],
      min: [0, "Price cannot be negative"],
    },
    bedrooms: {
      type: Number,
      required: [true, "Number of bedrooms is required"],
      min: [0, "Number of bedrooms cannot be negative"],
    },
    bathrooms: {
      type: Number,
      required: [true, "Number of bathrooms is required"],
      min: [0, "Number of bathrooms cannot be negative"],
    },
    area: {
      type: Number,
      required: [true, "Property area is required"],
      min: [0, "Area cannot be negative"],
    },
    images: [
      {
        type: String,
        required: [true, "At least one image is required"],
      },
    ],
    features: [
      {
        type: String,
        enum: [
          "parking",
          "furnished",
          "airConditioning",
          "heating",
          "internet",
          "elevator",
          "balcony",
          "pool",
          "gym",
          "security",
          "petFriendly",
          "garden",
          "laundry",
        ],
      },
    ],
    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      availableFrom: {
        type: Date,
        required: [true, "Available from date is required"],
      },
      minimumStay: {
        type: Number, // in months
        default: 1,
        min: [0, "Minimum stay cannot be negative"],
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Property owner is required"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for location-based queries
propertySchema.index({ location: "2dsphere" });

// Add text index for search functionality
propertySchema.index(
  {
    title: "text",
    description: "text",
    "address.city": "text",
    "address.state": "text",
    "address.country": "text",
  },
  {
    weights: {
      title: 5,
      "address.city": 3,
      "address.state": 2,
      description: 1,
    },
  }
);

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
