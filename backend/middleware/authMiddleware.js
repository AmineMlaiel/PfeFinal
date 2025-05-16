const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

/**
 * Middleware to protect routes by validating JWT token
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

/**
 * Middleware to check if user is an admin
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

/**
 * Middleware to check if user is an owner
 */
const owner = (req, res, next) => {
  if (req.user && (req.user.role === "owner" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as a property owner" });
  }
};

/**
 * Middleware to check if user is verified
 */
const verified = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(403).json({ message: "Account not verified" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Not authorized. Required roles: ${roles.join(', ')}` 
      });
    }
    next();
  };
};


module.exports = { protect, admin, owner, verified , authorize };
