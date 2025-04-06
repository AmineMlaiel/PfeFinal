
exports.checkPropertyOwnership = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    console.log("Checking property ownership:");
    console.log("Property owner:", property.owner);
    console.log("Current user:", req.user._id);
    console.log(
      "String comparison:",
      property.owner.toString() === req.user._id.toString()
    );

    // Check if current user is the owner
    const isOwner = property.owner.toString() === req.user._id.toString();

    res.status(200).json({
      success: true,
      isOwner,
    });
  } catch (error) {
    console.error("Error checking property ownership:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
