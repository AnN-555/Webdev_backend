  import jwt from "jsonwebtoken";
  import User from "../models/user.js";
  export const protect = async (req, res, next) => {
    try {
      let token = req.headers.authorization?.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : null;

      if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
      }
      const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
      const decoded = jwt.verify(token, secret);

      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.log("JWT Error:", error.message); // xem terminal biết lỗi gì
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }
  };
