import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/database.js";
import User from "../models/user.js";
import Game from "../models/game.js";
import Comment from "../models/comment.js";

dotenv.config();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const OPENERS = [
  "Mình mới chơi thử",
  "Ấn tượng đầu tiên của mình là",
  "Sau vài giờ trải nghiệm",
  "Cảm giác chung của mình",
  "Theo mình đánh giá nhanh",
];

const SENTENCES = [
  "game khá mượt, ít bug đáng kể.",
  "đồ hoạ đẹp, tối ưu ổn, FPS ổn định.",
  "gameplay ổn nhưng nhịp đầu hơi chậm.",
  "nội dung khá cuốn, đặc biệt là phần cốt truyện.",
  "phần combat vui nhưng đôi lúc hơi lặp lại.",
  "âm nhạc ổn, không quá nổi bật nhưng dễ chịu.",
  "mình nghĩ khá đáng tiền so với giá hiện tại.",
  "ai thích co-op chắc sẽ thấy game này rất vui.",
];

const ENDINGS = [
  "Đáng để thử.",
  "Mình recommend.",
  "Rất phù hợp để chơi cùng bạn bè.",
  "Nếu máy tầm trung vẫn chơi ổn.",
  "Ai đã chơi rồi cho thêm ý kiến với.",
];

const buildComment = () => {
  const parts = [];
  parts.push(pick(OPENERS));
  const n = randInt(1, 3);
  for (let i = 0; i < n; i++) parts.push(pick(SENTENCES));
  parts.push(pick(ENDINGS));
  return parts.join(" ");
};

async function ensureSeedUsers() {
  const existing = await User.find().limit(5);
  if (existing.length > 0) return existing;

  const seed = [
    { username: "alice", email: "alice@example.com" },
    { username: "bob", email: "bob@example.com" },
    { username: "charlie", email: "charlie@example.com" },
    { username: "david", email: "david@example.com" },
    { username: "eva", email: "eva@example.com" },
  ];

  const created = [];
  for (const u of seed) {
    const user = new User({ ...u, password: "123456" });
    await user.save();
    created.push(user);
  }
  return created;
}

async function seedGameComments() {
  const perGame = parseInt(process.env.SEED_GAME_COMMENTS_PER_GAME || "5", 10);
  const maxGames = parseInt(process.env.SEED_GAME_COMMENTS_MAX_GAMES || "50", 10);
  const wipe = String(process.env.SEED_GAME_COMMENTS_WIPE || "false").toLowerCase() === "true";

  await connectDB();

  if (wipe) {
    await Comment.deleteMany({});
  }

  const users = await ensureSeedUsers();

  const games = await Game.find().limit(maxGames).select("_id name");
  if (!games.length) {
    console.log("No games found, abort seeding game comments.");
    await mongoose.disconnect();
    return;
  }

  const comments = [];
  for (const game of games) {
    const count = randInt(Math.max(1, Math.floor(perGame / 2)), perGame);
    for (let i = 0; i < count; i++) {
      comments.push({
        game: game._id,
        user: pick(users)._id,
        text: buildComment(),
      });
    }
  }

  if (comments.length > 0) {
    await Comment.insertMany(comments);
  }

  const total = await Comment.countDocuments();

  console.log("Seed game comments done:", {
    gamesSeeded: games.length,
    createdComments: comments.length,
    totalComments: total,
    wipe,
  });

  await mongoose.disconnect();
}

seedGameComments().catch(async (err) => {
  console.error("Seed game comments failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});