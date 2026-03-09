import Game from "../models/game.js";
import Comment from "../models/comment.js";
import { protect} from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";
import router from "./authRoutes.js";

// GET /api/games - Lấy tất cả games
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      tag,
      featured,
      search,
      sort = "-createdAt",
    } = req.query;

    // Build query
    const query = {};

    if (tag) {
      query.tags = tag;
    }

    if (featured === "true") {
      query.rating = 5;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const games = await Game.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Game.countDocuments(query);

    res.json({
      success: true,
      data: games,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/games/:gameId/comments - Lấy comment của game (đặt trước /:id)
router.get("/:gameId/comments", async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }
    const comments = await Comment.find({ game: gameId })
      .sort("-createdAt")
      .populate("user", "username")
      .lean();
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/games/:gameId/comments - Thêm comment (cần đăng nhập)
router.post("/:gameId/comments", protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { text } = req.body;
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: "Nội dung comment không được để trống" });
    }
    const comment = new Comment({
      game: gameId,
      user: req.user._id,
      text: String(text).trim().slice(0, 1000),
    });
    await comment.save();
    await comment.populate("user", "username");
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/games/:id - Lấy game theo ID
router.get("/:id", async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/games/slug/:slug - Lấy game theo slug
router.get("/slug/:slug", async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/games/tags/all - Lấy tất cả tags unique
router.get("/tags/all", async (req, res) => {
  try {
    const tags = await Game.distinct("tags");
    res.json({
      success: true,
      data: tags.sort(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /api/games - Tạo game mới với ảnh
router.post("/", upload.fields([
  { name: "headerImage", maxCount: 1 },
  { name: "images", maxCount: 10 }
]), async (req, res) => {
  try {
    const { name, description, link, tags } = req.body;

    // Upload header image
    let headerImageUrl = null;
    if (req.files.headerImage && req.files.headerImage[0]) {
      const result = await cloudinary.uploader.upload(req.files.headerImage[0].path, {
        folder: `database/${name}/header`
      });
      headerImageUrl = result.secure_url;
    }

    // Upload other images
    const images = [];
    if (req.files.images) {
      for (const file of req.files.images) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: `database/${name}/images`
        });
        images.push(result.secure_url);
      }
    }

    const game = new Game({
      name,
      description,
      link,
      headerImage: headerImageUrl,
      images,
      tags
    });

    await game.save();
    res.status(201).json({ success: true, data: game });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/games/:id - Cập nhật game với ảnh mới
router.put("/:id", upload.single("headerImage"), async (req, res) => {
  try {
    let updateData = { ...req.body };

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: `database/${updateData.name || "gamestore"}/header`,
      });
      updateData.headerImage = result.secure_url;
    }

    const game = await Game.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!game) {
      return res.status(404).json({ success: false, message: "Game not found" });
    }

    res.json({ success: true, data: game });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/games/:id - Xóa game
router.delete("/:id", async (req, res) => {
  try {
    const game = await Game.findByIdAndDelete(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: "Game not found",
      });
    }

    res.json({
      success: true,
      message: "Game deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;