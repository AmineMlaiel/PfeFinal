const { badRequest } = require("../utils/errorHandler");

/**
 * Validate user registration data
 */
const validateUserRegistration = (req, res, next) => {
  const { name, lastName, email, password, mobileNumber } = req.body;
  const errors = [];

  // Validate name
  if (!name || name.trim() === "") {
    errors.push("Name is required");
  }

  // Validate last name
  if (!lastName || lastName.trim() === "") {
    errors.push("Last name is required");
  }

  // Validate email
  if (!email || !isValidEmail(email)) {
    errors.push("Valid email is required");
  }

  // Validate password
  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }

  // Validate mobile number
  if (!mobileNumber || !isValidMobileNumber(mobileNumber)) {
    errors.push("Valid mobile number is required");
  }

  if (errors.length > 0) {
    return next(badRequest("Validation failed", errors));
  }

  next();
};

/**
 * Validate login data
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !isValidEmail(email)) {
    errors.push("Valid email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return next(badRequest("Validation failed", errors));
  }

  next();
};

/**
 * Validate password reset request
 */
const validatePasswordReset = (req, res, next) => {
  const { token, password } = req.body;
  const errors = [];

  if (!token) {
    errors.push("Token is required");
  }

  if (!password || password.length < 6) {
    errors.push("New password must be at least 6 characters");
  }

  if (errors.length > 0) {
    return next(badRequest("Validation failed", errors));
  }

  next();
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate mobile number format
 */
const isValidMobileNumber = (number) => {
  // Simple regex for mobile number validation - can be adjusted based on requirements
  const mobileRegex = /^\d{8,15}$/;
  return mobileRegex.test(number.toString());
};

module.exports = {
  validateUserRegistration,
  validateLogin,
  validatePasswordReset,
};
