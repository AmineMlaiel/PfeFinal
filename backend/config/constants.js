/**
 * Application constants
 */
const constants = {
  // User roles
  ROLES: {
    USER: "user",
    ADMIN: "admin",
  },

  // HTTP status codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },

  // Token expiry periods
  TOKEN_EXPIRY: {
    EMAIL_VERIFICATION: "24h",
    PASSWORD_RESET: "1h",
    JWT: "3d",
  },

  // Endpoints
  ENDPOINTS: {
    CONFIRM_EMAIL: "/confirm-email",
    RESET_PASSWORD: "/reset-password",
  },

  // Password settings
  PASSWORD: {
    MIN_LENGTH: 6,
    SALT_ROUNDS: 10,
  },
};

module.exports = constants;
