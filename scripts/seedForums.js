import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/database.js";
import User from "../models/user.js";
import ForumPost from "../models/forumPost.js";
import ForumComment from "../models/forumComment.js";

dotenv.config();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const TOPICS = [
  "Game hay cho người mới?",
  "Xin review cấu hình PC",
  "Top game co-op chơi với bạn bè",
  "Tư vấn mua game giá rẻ",
  "Chia sẻ mẹo/kinh nghiệm",
  "Game nào đáng chơi 2026?",
  "Lỗi game và cách fix",
  "Thảo luận cốt truyện",
  "Build/Strategy tối ưu",
];

const OPENERS = [
  "Mọi người cho mình hỏi",
  "Theo mọi người thì",
  "Mình mới chơi nên muốn xin ý kiến",
  "Cá nhân mình thấy",
  "Mình đang phân vân",
  "Chia sẻ nhanh chút trải nghiệm",
];

const SENTENCES = [
  "Game này có vẻ khá cuốn, nhưng mình chưa chắc có hợp không.",
  "Nếu ai đã chơi rồi cho mình xin ưu/nhược điểm với.",
  "Mình ưu tiên gameplay mượt, ít grind, có co-op càng tốt.",
  "Mình hay chơi buổi tối nên muốn game thư giãn nhẹ nhàng.",
  "Có tips nào cho người mới bắt đầu không?",
  "Mình gặp lỗi crash ngẫu nhiên, không biết do setting hay driver.",
  "Cảm ơn mọi người trước nhé!",
];

const REPLIES = [
  "Mình cũng từng như bạn, theo mình nên thử bản này trước.",
  "Nếu bạn thích co-op thì game này ổn, nhưng cần phối hợp nhiều.",
  "Cấu hình tầm trung vẫn chơi tốt, giảm shadow/AA là ổn.",
  "Mình thấy cốt truyện hay, nhưng nhịp đầu hơi chậm.",
  "Bạn thử verify file hoặc update driver VGA xem sao.",
  "Đợt sale thường rẻ lắm, canh cuối tuần nhé.",
  "Chuẩn luôn, mình đồng ý.",
];

const buildParagraph = (min = 3, max = 6) => {
  const n = randInt(min, max);
  const lines = [];
  lines.push(`${pick(OPENERS)} ${pick(TOPICS).toLowerCase()}?`);
  for (let i = 0; i < n; i++) lines.push(pick(SENTENCES));
  return lines.join("\n");
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
    // password must be >= 6 chars; will be hashed by pre-save hook
    const user = new User({ ...u, password: "123456" });
    await user.save();
    created.push(user);
  }
  return created;
}

async function seedForums() {
  const postsCount = parseInt(process.env.SEED_FORUM_POSTS || "25", 10);
  const minComments = parseInt(process.env.SEED_FORUM_MIN_COMMENTS || "1", 10);
  const maxComments = parseInt(process.env.SEED_FORUM_MAX_COMMENTS || "6", 10);
  const wipe = String(process.env.SEED_FORUM_WIPE || "false").toLowerCase() === "true";

  await connectDB();

  if (wipe) {
    await ForumComment.deleteMany({});
    await ForumPost.deleteMany({});
  }

  const users = await ensureSeedUsers();

  const posts = [];
  for (let i = 0; i < postsCount; i++) {
    const title = `${pick(TOPICS)} #${i + 1}`;
    const content = buildParagraph();
    const user = pick(users);
    posts.push({ title, content, user: user._id });
  }

  const createdPosts = await ForumPost.insertMany(posts);

  const comments = [];
  for (const p of createdPosts) {
    const cCount = randInt(minComments, maxComments);
    for (let i = 0; i < cCount; i++) {
      comments.push({
        post: p._id,
        user: pick(users)._id,
        text: pick(REPLIES),
      });
    }
  }
  await ForumComment.insertMany(comments);

  const postsTotal = await ForumPost.countDocuments();
  const commentsTotal = await ForumComment.countDocuments();

  console.log("Seed forums done:", {
    createdPosts: createdPosts.length,
    createdComments: comments.length,
    postsTotal,
    commentsTotal,
    wipe,
  });

  await mongoose.disconnect();
}

seedForums().catch(async (err) => {
  console.error("Seed forums failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});