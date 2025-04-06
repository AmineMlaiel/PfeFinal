const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Import routes
const userRoutes = require("./routes/userRoute");

// Import utilities
const connectDB = require("./config/db");
const { errorHandler } = require("./utils/errorHandler");
const { notFound } = require("./utils/errorHandler");

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB()
  .then(() => console.log("Database connection established"))
  .catch((err) => console.error("Database connection error:", err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// ---------------- API Routes ----------------
app.use("/api/users", userRoutes);

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
