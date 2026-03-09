import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    // Giá tại thời điểm mua 
    priceAtPurchase: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Index để lấy đơn theo user nhanh
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ game: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
