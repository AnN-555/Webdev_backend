import express from "express";
import ForumPost from "../models/forumPost.js";
import ForumComment from "../models/forumComment.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/forums/posts - Public: list posts (supports search + pagination)
router.get("/posts", async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sort = "-createdAt" } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const query = {};
    if (search && String(search).trim()) {
      query.$text = { $search: String(search).trim() };
    }

    const [posts, total] = await Promise.all([
      ForumPost.find(query)
        .sort(sort)
        .skip(skip)
        .limit(safeLimit)
        .populate("user", "username")
        .lean(),
      ForumPost.countDocuments(query),
    ]);

    // lightweight counts per post
    const postIds = posts.map((p) => p._id);
    const counts = await ForumComment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const enriched = posts.map((p) => ({
      ...p,
      commentCount: countMap.get(String(p._id)) || 0,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/forums/posts - Protected: create a post
router.post("/posts", protect, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: "Tiêu đề không được để trống" });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: "Nội dung không được để trống" });
    }

    const post = await ForumPost.create({
      title: String(title).trim().slice(0, 120),
      content: String(content).trim().slice(0, 5000),
      user: req.user._id,
    });

    await post.populate("user", "username");
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/forums/posts/:id - Public: post detail + comments
router.get("/posts/:id", async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id).populate("user", "username").lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const comments = await ForumComment.find({ post: post._id })
      .sort("createdAt")
      .populate("user", "username")
      .lean();
    res.json({ success: true, data: { post, comments } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/forums/posts/:id/comments - Protected: add comment to a post
router.post("/posts/:id/comments", protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: "Nội dung comment không được để trống" });
    }
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const comment = await ForumComment.create({
      post: post._id,
      user: req.user._id,
      text: String(text).trim().slice(0, 1000),
    });
    await comment.populate("user", "username");
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;