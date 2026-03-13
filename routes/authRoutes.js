import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import User from "../models/user.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Đọc trong function — tránh lỗi dotenv chưa load
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ id }, secret, { expiresIn });
};

// Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Chỉ chấp nhận file ảnh"), false);
  },
});

// ============================
// REGISTER
// ============================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please enter username, email, and password." });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? "Email has already been used."
          : "Username has already been used.",
      });
    }

    const user = await User.create({ username, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      message: "Registration successful",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(400).json({
        message: field === "email" ? "Email has already been used." : "Username has already been used.",
      });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// LOGIN
// ============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please enter email and password." });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Email or password is incorrect" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Email or password is incorrect" });

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// LOGOUT
// ============================
router.post("/logout", protect, (req, res) => {
  res.json({ message: "Logout successful" });
});

// ============================
// GET CURRENT USER
// ============================
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        country: user.country,
        bio: user.bio,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// UPLOAD AVATAR ← MỚI THÊM
// ============================
router.post("/upload-avatar", protect, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file ảnh" });
    }

    // Upload lên Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "avatars",
          transformation: [{ width: 200, height: 200, crop: "fill" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // Lưu URL vào user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    );

    res.json({
      success: true,
      avatarUrl: result.secure_url,
      user,
    });
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
