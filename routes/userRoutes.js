import express from "express";
import User from "../models/user.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user }); // ← thêm wrapper
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// UPDATE profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { username, country, bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, country, bio, avatar },
      { new: true }
    );
    res.json({ user }); // ← thêm wrapper
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});
// CHANGE PASSWORD
router.put("/change-password", protect, async (req, res) => {

  try {

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");

    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch) {

      return res.status(400).json({
        message: "Old password incorrect"
      });

    }

    user.password = newPassword;

    await user.save();

    res.json({
      message: "Password updated"
    });

  } catch (error) {

    res.status(500).json({
      message: "Server error"
    });

  }

});

export default router;
