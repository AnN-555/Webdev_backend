import express from "express";
import Order from "../models/order.js";
import Game from "../models/game.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tất cả route orders đều cần đăng nhập
router.use(protect);

// POST /api/orders - Mua game (tạo đơn hàng)
router.post("/", async (req, res) => {
  try {
    const { gameId } = req.body;
    const userId = req.user._id;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu gameId",
      });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game không tồn tại",
      });
    }

    // Kiểm tra đã mua game này chưa (optional - có thể cho mua nhiều lần)
    const existingOrder = await Order.findOne({
      user: userId,
      game: gameId,
      status: { $in: ["pending", "completed"] },
    });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã mua game này rồi",
      });
    }

    const order = new Order({
      user: userId,
      game: gameId,
      priceAtPurchase: game.price ?? 0,
      status: "completed", // hoặc "pending" nếu có bước thanh toán
    });
    await order.save();
    await order.populate("game", "name slug price headerImage");

    res.status(201).json({
      success: true,
      data: order,
      message: "Mua game thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/orders - Lấy danh sách đơn hàng của user
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort("-createdAt")
      .populate("game", "name slug price headerImage");

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/orders/:id - Chi tiết một đơn
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("game", "name slug price details headerImage link");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
