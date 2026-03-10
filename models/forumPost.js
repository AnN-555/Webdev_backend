import mongoose from "mongoose";

const forumPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Title must be at least 3 characters."],
      maxlength: [120, "Title can be up to 120 characters."],
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Content must be at least 3 characters."],
      maxlength: [5000, "Content can be up to 5000 characters."],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

forumPostSchema.index({ createdAt: -1 });
forumPostSchema.index({ title: "text", content: "text" });

const ForumPost = mongoose.model("ForumPost", forumPostSchema);
export default ForumPost;