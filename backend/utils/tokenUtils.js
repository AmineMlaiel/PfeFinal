const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Generate JWT token for authentication
 * @param {string} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "3d",
  });
};

/**
 * Generate random token for email verification/password reset
 * @returns {string} Random token
 */
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Generate verification token with expiration
 * @returns {Object} Token and expiration
 */
const generateVerificationToken = () => {
  const token = generateRandomToken();
  // Token expires in 24 hours
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return { token, expires };
};

/**
 * Generate password reset token with expiration
 * @returns {Object} Token and expiration
 */
const generateResetToken = () => {
  const token = generateRandomToken();
  // Token expires in 1 hour
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  return { token, expires };
};

module.exports = {
  generateToken,
  generateRandomToken,
  generateVerificationToken,
  generateResetToken,
};
