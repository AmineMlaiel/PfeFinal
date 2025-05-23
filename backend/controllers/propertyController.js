const Property = require("../models/propertyModel");
const Booking = require("../models/bookingModel");
const Review = require("../models/reviewModel");
const fs = require("fs");
const path = require("path");

// @desc    Create a new property
// @route   POST /api/properties
// @access  Private (Owners and Admins)
exports.createProperty = async (req, res) => {
  try {
    // Assuming your authentication middleware (e.g., authMiddleware) adds the user object to req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated. Please log in to create a property.",
      });
    }

    const {
      title,
      description,
      address,
      propertyType,
      pricePerNight, // Required
      pricePerMonth, // Optional
      bedrooms,
      bathrooms,
      area,
      // images will be handled in a separate upload step usually, or passed as URLs if already uploaded
      features,
      availability,
      location, // Expecting { type: "Point", coordinates: [longitude, latitude] }
      cleaningFee,
      additionalGuestFee,
      baseGuests,
      // other fields from your schema like isApproved, isActive, status might be set by admin or have defaults
    } = req.body;

    // Basic validation for required fields not covered by Mongoose schema defaults or explicit requirements
    // Mongoose schema validation will handle most of this, but early checks can be useful.
    if (!title || !description || !address || !propertyType || pricePerNight === undefined || !bedrooms || !bathrooms || !area || !availability || !location) {
        let missingFields = [];
        if (!title) missingFields.push("title");
        if (!description) missingFields.push("description");
        if (!address) missingFields.push("address (street, city, state, zipCode, country)");
        if (!propertyType) missingFields.push("propertyType");
        if (pricePerNight === undefined) missingFields.push("pricePerNight");
        if (!bedrooms) missingFields.push("bedrooms");
        if (!bathrooms) missingFields.push("bathrooms");
        if (!area) missingFields.push("area");
        if (!availability) missingFields.push("availability (availableFrom)");
        if (!location) missingFields.push("location (coordinates)");

      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const propertyData = {
      title,
      description,
      address,
      propertyType,
      pricePerNight,
      bedrooms,
      bathrooms,
      area,
      features: features || [],
      availability,
      location,
      owner: req.user.id, // Set the owner from the authenticated user
      // Optional fields - only add them if they are provided and valid
      ...(pricePerMonth !== undefined && pricePerMonth !== null && !isNaN(parseFloat(pricePerMonth)) && parseFloat(pricePerMonth) > 0 && { pricePerMonth: parseFloat(pricePerMonth) }),
      ...(cleaningFee !== undefined && !isNaN(parseFloat(cleaningFee)) && { cleaningFee: parseFloat(cleaningFee) }),
      ...(additionalGuestFee !== undefined && !isNaN(parseFloat(additionalGuestFee)) && { additionalGuestFee: parseFloat(additionalGuestFee) }),
      ...(baseGuests !== undefined && !isNaN(parseInt(baseGuests)) && { baseGuests: parseInt(baseGuests) }),
      // Default status for new properties, e.g., "pending" for admin approval
      status: "pending", // Or whatever your default status is
      isApproved: false, // Typically new properties require approval
      isActive: true, // Can be set to true by default
    };

    const newProperty = new Property(propertyData);
    const savedProperty = await newProperty.save(); // Mongoose handles schema validation here

    res.status(201).json({
      success: true,
      message: "Property created successfully. It may require admin approval before being listed.",
      data: savedProperty,
    });

  } catch (error) {
    console.error("Error creating property:", error);

    if (error.name === "ValidationError") {
      // Construct a user-friendly error message from Mongoose validation errors
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed. Please check your input.",
        errors: messages,
      });
    }

    // Handle other potential errors (e.g., database connection issues)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create property due to a server error. Please try again later.",
    });
  }
};

// @desc    Get all properties with filtering, pagination, etc.
// @route   GET /api/properties
// @access  Public
exports.getProperties = async (req, res) => {
  try {
    // Copy req.query to avoid modifying original
    const reqQuery = { ...req.query };

    // Fields to exclude from filter
    const removeFields = ["select", "sort", "page", "limit"];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create our query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Parse the query string back to an object
    let parsedQuery = JSON.parse(queryStr);

    // If not explicitly requesting all properties (admin function), only show approved ones
    if (req.user && req.user.role === "admin") {
      // Admin can see all properties, regardless of approval status
      console.log("Admin user is viewing properties - showing all properties");
    } else if (parsedQuery.isApproved === undefined) {
      // Regular users only see approved properties by default
      parsedQuery.isApproved = true;
      console.log("Regular user view - filtering to only approved properties");
    }

    // Finding properties based on query
    let query = Property.find(parsedQuery);

    // Select specific fields
    if (req.query.select) {
      const fields = req.query.select.split(",").join(" ");
      query = query.select(fields);
    }

    // Sort by fields
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt"); // Default sort by newest first
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Property.countDocuments(parsedQuery);

    query = query.skip(startIndex).limit(limit);

    // Execute the query
    const properties = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: properties.length,
      pagination,
      data: properties,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Get related reviews
    const reviews = await Review.find({ property: req.params.id })
      .populate("reviewer", "name")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      data: property,
      reviews,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Owner of property or Admin)
exports.updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Make sure user is property owner or admin
    if (
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this property",
      });
    }

    property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Owner of property or Admin)
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Make sure user is property owner or admin
    if (
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this property",
      });
    }

    // Check if there are active bookings for this property
    const activeBookings = await Booking.countDocuments({
      property: req.params.id,
      status: { $in: ["approved", "pending"] },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This property has active bookings and cannot be deleted. Deactivate it instead.",
      });
    }

    await property.deleteOne();

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

// @desc    Get properties by current user (my listings)
// @route   GET /api/properties/my-properties
// @access  Private
exports.getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.id });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload property images
// @route   POST /api/properties/:id/images
// @access  Private (Owner of property or Admin)
exports.uploadPropertyImages = async (req, res) => {
  try {
    console.log("Upload request received");

    if (!req.files) {
      console.log("No req.files object found");
    } else {
      console.log(`Files object keys: ${Object.keys(req.files)}`);
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Make sure user is property owner or admin
    if (
      property.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this property",
      });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      console.log("No files were uploaded or req.files is empty");
      return res.status(400).json({
        success: false,
        message: "No files were uploaded",
      });
    }

    const files = req.files.images;
    console.log(
      `Found ${Array.isArray(files) ? files.length : 1} file(s) to process`
    );
    const images = [];

    // Create upload directory if it doesn't exist
    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    const propertyUploadDir = path.join(uploadDir, "properties");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (!fs.existsSync(propertyUploadDir)) {
      fs.mkdirSync(propertyUploadDir, { recursive: true });
    }

    // Handle multiple or single file upload
    const filesToProcess = Array.isArray(files) ? files : [files];

    for (const file of filesToProcess) {
      // Check file type
      if (!file.mimetype.startsWith("image")) {
        return res.status(400).json({
          success: false,
          message: "Please upload an image file",
        });
      }

      // Check file size
      const maxSize = process.env.MAX_FILE_SIZE || 5000000; // 5MB default
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `Please upload an image less than ${maxSize / 1000000}MB`,
        });
      }

      // Create custom filename
      const fileName = `property_${property._id}_${Date.now()}${
        file.name.match(/\.[0-9a-z]+$/i)[0]
      }`;

      // Upload to server/cloud storage (implementation will vary)
      // This is a placeholder - actual implementation depends on your setup
      const filePath = path.join(propertyUploadDir, fileName);

      await file.mv(filePath);

      // Add to images array - construct URL path for easy frontend access
      const baseUrl = process.env.BASE_URL || "http://localhost:3900";
      const imageUrl = `${baseUrl}/${uploadDir}/properties/${fileName}`;
      images.push(imageUrl);
    }

    // Add images to property
    await Property.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { $each: images } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: images,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Approve/disapprove property (admin only)
// @route   PUT /api/properties/:id/approve
// @access  Private (Admin only)
exports.approveProperty = async (req, res) => {
  try {
    const { approved, rejectionReason } = req.body;

    if (typeof approved !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Approved status must be a boolean",
      });
    }

    // Prepare update data
    const updateData = {
      isApproved: approved,
      status: approved ? "approved" : "rejected",
    };

    // If rejecting, add rejection reason
    if (!approved && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get nearby properties
// @route   GET /api/properties/nearby
// @access  Public
exports.getNearbyProperties = async (req, res) => {
  try {
    const { lat, lng, distance = 10, unit = "km" } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Please provide latitude and longitude",
      });
    }

    // Calculate radius using radians
    // Earth radius: 3,963 miles / 6,378 kilometers
    const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

    const properties = await Property.find({
      location: {
        $geoWithin: { $centerSphere: [[lng, lat], radius] },
      },
    });

    res.status(200).json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Check if current user is the owner of a property
// @route   GET /api/properties/:id/check-ownership
// @access  Private
exports.checkPropertyOwnership = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    console.log("Checking property ownership:");
    console.log("Property owner:", property.owner);
    console.log("Current user:", req.user._id);
    console.log(
      "String comparison:",
      property.owner.toString() === req.user._id.toString()
    );

    // Check if current user is the owner
    const isOwner = property.owner.toString() === req.user._id.toString();

    res.status(200).json({
      success: true,
      isOwner,
    });
  } catch (error) {
    console.error("Error checking property ownership:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
