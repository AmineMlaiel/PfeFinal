const User = require("../models/userModel"); // Import the User model
const bcrypt = require("bcryptjs"); // Import the bcrypt library for password hashing
const jwt = require("jsonwebtoken");
const {
  sendConfirmationEmail,
  sendPasswordResetEmail,
} = require("../utils/mailSender");
const { generateToken, generateResetToken } = require("../utils/tokenUtils");
const { badRequest, notFound, serverError } = require("../utils/errorHandler");

// Controller function to handle user registration
exports.registerUser = async (req, res) => {
  const { name, lastName, email, password, mobileNumber, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create the user - password will be hashed by model pre-save hook
    const user = new User({
      name,
      lastName,
      email,
      password, // No need to hash here, the pre-save hook in the model will do it
      mobileNumber,
      // For testing purposes, you can set this to true to skip email verification
      isVerified: false, // TEMPORARILY set to true for testing
      // Only allow setting role to renter or owner during registration
      role: role === "owner" ? "owner" : "renter",
    });

    // Save the user to the database
    await user.save();

    // Generate a confirmation token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Generate the confirmation link
    const confirmationLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;

    // Send confirmation email
    await sendConfirmationEmail(email, confirmationLink);

    // Send success response
    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email to confirm your account.",
    });
  } catch (err) {
    console.error("Error in registerUser:", err); // Log the full error
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: err.message || err,
    }); // Include error details in the response
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2. Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Compare passwords using the comparePassword method from the model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 4. Skip email verification check for testing
    // Comment this back in when you have email verification set up
    /*
    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: "Account not verified. Please verify your email." 
      });
    }
    */

    // 5. Generate a JWT token
    const token = generateToken(user._id);

    // 6. Send the token and user data to the client
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

exports.confirmEmail = async (req, res) => {
  const { token } = req.query;

  try {
    // 1. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Find the user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Mark the user as confirmed
    user.isVerified = true;
    await user.save();

    // 4. Create a session token for the user
    const sessionToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h", // Session expiry time
      }
    );

    // 5. Redirect the user to the frontend app with the token
    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (error) {
    console.error("Error confirming email:", error);
    res.status(400).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if email is provided
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({
        success: true,
        message:
          "If your email is registered, you will receive a password reset link",
      });
    }

    // Generate reset token and expiration
    const { token, expires } = generateResetToken();

    // Save the reset token and expiration to the user
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    // Create reset password URL
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // Send password reset email
    await sendPasswordResetEmail(email, resetLink);

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({
      success: false,
      message: "Error sending password reset email",
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    // Find user with the provided reset token and check if it's still valid
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    // Set the new password (will be hashed by the pre-save hook)
    user.password = password;

    // Clear the reset token and expiration
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Save the updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    // User is already available in req.user from the protect middleware
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving user profile",
      error: error.message,
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { name, lastName, email, mobileNumber } = req.body;

    // Find user by ID (from auth middleware)
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (lastName) user.lastName = lastName;
    if (email && email !== user.email) {
      // Check if new email is already in use
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
      user.email = email;
      user.isVerified = false; // Require verification of new email

      // Generate a confirmation token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      // Generate the confirmation link
      const confirmationLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;

      // Send confirmation email
      await sendConfirmationEmail(email, confirmationLink);
    }
    if (mobileNumber) user.mobileNumber = mobileNumber;

    // If password is provided, update it
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    // Save updated user
    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        isVerified: updatedUser.isVerified,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

exports.deleteUserProfile = async (req, res) => {
  try {
    // Find and delete user (from auth middleware)
    const user = await User.findByIdAndDelete(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting profile",
      error: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Fetch all users from the database
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error retrieving users",
      error: err.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error getting user:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving user",
      error: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByIdAndDelete(userId); // Find and delete the user by ID
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: err.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  const userId = req.params.id;
  const updates = req.body; // Extract updated data from the request body

  try {
    // Don't allow role updates through this endpoint for security
    if (updates.role && req.user.role !== "admin") {
      delete updates.role;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators on updates
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: err.message,
    });
  }
};

exports.validateUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isVerified: true },
      {
        new: true, // Return the updated document
        runValidators: true,
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User validated successfully",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error validating user",
      error: err.message,
    });
  }
};

// Upgrade a user from renter to owner
exports.upgradeToOwner = async (req, res) => {
  try {
    // Can only upgrade own account (unless admin)
    const userId = req.params.id || req.user.id;

    // If not self and not admin, deny
    if (userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to upgrade this account",
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already an owner or admin
    if (user.role === "owner" || user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "User already has owner privileges",
      });
    }

    // Upgrade to owner
    user.role = "owner";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Account upgraded to owner successfully",
    });
  } catch (error) {
    console.error("Error upgrading account:", error);
    res.status(500).json({
      success: false,
      message: "Error upgrading account",
      error: error.message,
    });
  }
};
