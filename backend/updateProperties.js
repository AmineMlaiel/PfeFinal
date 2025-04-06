const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

// Import Property model
const Property = require("./models/propertyModel");

const updateProperties = async () => {
  try {
    // Update all existing properties with default values for new fields
    const result = await Property.updateMany(
      {
        $or: [
          { cleaningFee: { $exists: false } },
          { additionalGuestFee: { $exists: false } },
          { baseGuests: { $exists: false } },
        ],
      },
      {
        $set: {
          cleaningFee: 50,
          additionalGuestFee: 25,
          baseGuests: 2,
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} properties`);
    console.log(`Matched ${result.matchedCount} properties`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("MongoDB Disconnected");

    process.exit(0);
  } catch (error) {
    console.error("Error updating properties:", error);
    process.exit(1);
  }
};

// Run the update function
updateProperties();
