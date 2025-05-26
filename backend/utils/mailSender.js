const nodemailer = require("nodemailer");
require ("dotenv").config();
console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASS =", process.env.EMAIL_PASS ? "DEFINED" : "UNDEFINED");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send account confirmation email
 * @param {string} email - Recipient email address
 * @param {string} confirmationLink - Link for email confirmation
 */
const sendConfirmationEmail = async (email, confirmationLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Confirm Your Account",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="font-size: 24px; font-weight: bold; color: #111827; text-align: center;">
            Confirm Your Account
          </h1>
          <p style="font-size: 16px; color: #374151; margin-top: 16px;">
            Thank you for signing up! Please confirm your account by clicking the button below:
          </p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${confirmationLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Confirm Account
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            If you didn't sign up for this account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetLink - Link for password reset
 */
const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h1 style="font-size: 24px; font-weight: bold; color: #111827; text-align: center;">
            Reset Your Password
          </h1>
          <p style="font-size: 16px; color: #374151; margin-top: 16px;">
            You requested a password reset. Please click the button below to create a new password:
          </p>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${resetLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendConfirmationEmail,
  sendPasswordResetEmail,
};
