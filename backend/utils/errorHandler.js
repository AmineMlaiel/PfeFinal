/**
 * Custom Error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a 400 Bad Request error
 * @param {string} message - Error message
 * @param {Array} errors - List of validation errors
 * @returns {ApiError} Bad request error
 */
const badRequest = (message = "Bad Request", errors = []) => {
  return new ApiError(message, 400, errors);
};

/**
 * Create a 401 Unauthorized error
 * @param {string} message - Error message
 * @returns {ApiError} Unauthorized error
 */
const unauthorized = (message = "Unauthorized") => {
  return new ApiError(message, 401);
};

/**
 * Create a 403 Forbidden error
 * @param {string} message - Error message
 * @returns {ApiError} Forbidden error
 */
const forbidden = (message = "Forbidden") => {
  return new ApiError(message, 403);
};

/**
 * Create a 404 Not Found error
 * @param {string} message - Error message
 * @returns {ApiError} Not found error
 */
const notFound = (message = "Resource not found") => {
  return new ApiError(message, 404);
};

/**
 * Create a 500 Internal Server error
 * @param {string} message - Error message
 * @returns {ApiError} Server error
 */
const serverError = (message = "Internal Server Error") => {
  return new ApiError(message, 500);
};

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let errors = err.errors || [];

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((val) => val.message);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
    const field = Object.keys(err.keyValue)[0];
    errors = [`${field} already exists`];
  }

  // Handle Mongoose cast errors
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid input data";
    errors = [`Invalid ${err.path}: ${err.value}`];
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      errors: [],
    });
  }

  // Handle JWT expiration
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      errors: [],
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  errorHandler,
};
