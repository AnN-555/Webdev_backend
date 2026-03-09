import express from "express";
import Cart from "../models/cart.js";
import Order from "../models/order.js";
import Game from "../models/game.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Health check (no auth) - verify cart routes are loaded
router.get("/ping", (req, res) => res.json({ ok: true, message: "Cart API is ready" }));

router.use(protect);

// GET /api/cart - Get current user's cart
router.get("/", async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.game",
      "name slug price headerImage"
    );
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
      await cart.populate("items.game", "name slug price headerImage");
    }
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/cart/add - Add game to cart
router.post("/add", async (req, res) => {
  try {
    const { gameId } = req.body;
    const userId = req.user._id;

    if (!gameId) {
      return res.status(400).json({ success: false, message: "Missing gameId" });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const exists = cart.items.some((i) => i.game.toString() === gameId);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Game already in cart",
      });
    }

    cart.items.push({ game: gameId });
    await cart.save();
    await cart.populate("items.game", "name slug price headerImage");

    res.json({ success: true, data: cart, message: "Added to cart" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/cart/item/:gameId - Remove game from cart
router.delete("/item/:gameId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }
    cart.items = cart.items.filter(
      (i) => i.game.toString() !== req.params.gameId
    );
    await cart.save();
    await cart.populate("items.game", "name slug price headerImage");
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/cart/checkout - Create orders from cart and clear cart
router.post("/checkout", async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.game"
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const orders = [];
    for (const item of cart.items) {
      const game = item.game;
      if (!game) continue;

      const existingOrder = await Order.findOne({
        user: req.user._id,
        game: game._id,
        status: { $in: ["pending", "completed"] },
      });
      if (existingOrder) continue;

      const order = new Order({
        user: req.user._id,
        game: game._id,
        priceAtPurchase: game.price ?? 0,
        status: "completed",
      });
      await order.save();
      orders.push(order);
    }

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      data: orders,
      message: "Checkout successful",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
