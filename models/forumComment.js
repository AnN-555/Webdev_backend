import mongoose from "mongoose";

const forumCommentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumPost",
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

forumCommentSchema.index({ post: 1, createdAt: -1 });

const ForumComment = mongoose.model("ForumComment", forumCommentSchema);
export default ForumComment;