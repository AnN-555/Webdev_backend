import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        game: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Game",
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

cartSchema.index({ user: 1 });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
