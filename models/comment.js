import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Comments can be up to 1000 characters."],
    },
  },
  { timestamps: true }
);

commentSchema.index({ game: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
