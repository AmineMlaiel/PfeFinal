const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fileUpload = require("express-fileupload");
require("dotenv").config();

// Import routes
const userRoutes = require("./routes/userRoute");
const propertyRoutes = require("./routes/propertyRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

// Import utilities
const connectDB = require("./config/db");
const { errorHandler } = require("./utils/errorHandler");
const { notFound } = require("./utils/errorHandler");

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

//checking the mode 
console.log("Current environment:", process.env.NODE_ENV);

// Connect to MongoDB
connectDB()
  .then(() => console.log("Database connection established"))
  .catch((err) => console.error("Database connection error:", err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// File Upload middleware
app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB default
    },
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Static folder for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------- API Routes ----------------
app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
// ---------------- API Routes ----------------

app.use((req, res, next) => {
  next(notFound(`Resource not found - ${req.originalUrl}`));
});

app.use(errorHandler);

// Start the server
app
  .listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  })
  .on("error", (error) => {
    console.error("Error starting server:", error.message);
  });
