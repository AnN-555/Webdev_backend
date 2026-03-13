import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import connectDB from "../config/database.js";
import Game from "../models/game.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder chứa dữ liệu game
const DATABASE_FOLDER = path.join(__dirname, "../../database");

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function importGames() {
  await connectDB();

  const folders = fs
    .readdirSync(DATABASE_FOLDER, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let imported = 0,
      updated = 0,
      skipped = 0,
      errors = 0;

  for (const name of folders) {
    try {
      const gameDir = path.join(DATABASE_FOLDER, name);
      const linkFile = path.join(gameDir, "link.txt");

      if (!fs.existsSync(linkFile)) {
        skipped++;
        continue;
      }

      // Read link
      const link = fs.readFileSync(linkFile, "utf-8").trim();

      // Read tags
      const tagsFile = path.join(gameDir, "tags.txt");
      const tags = fs.existsSync(tagsFile)
        ? fs
            .readFileSync(tagsFile, "utf-8")
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      // Read details (optional)
      const detailsFile = path.join(gameDir, "details.txt");
      const details = fs.existsSync(detailsFile)
        ? fs.readFileSync(detailsFile, "utf-8").trim()
        : "";

      // Read price (optional, số VND)
      const priceFile = path.join(gameDir, "price.txt");
      let price = 0;
      if (fs.existsSync(priceFile)) {
        const raw = fs.readFileSync(priceFile, "utf-8").trim();
        const num = parseInt(raw, 10);
        if (!Number.isNaN(num) && num >= 0) price = num;
      }

      // Read images (1.jpg → 10.jpg)
      const images = [];
      for (let i = 1; i <= 10; i++) {
        if (fs.existsSync(path.join(gameDir, `${i}.jpg`))) {
          images.push(path.join(name, `${i}.jpg`));
        }
      }

      const existingGame = await Game.findOne({ name });

      if (existingGame) {
        // Cập nhật game đã có: link, tags, images luôn sync; details/price chỉ khi có file
        existingGame.link = link;
        existingGame.tags = tags;
        existingGame.images = images;
        if (fs.existsSync(detailsFile)) existingGame.details = details;
        if (fs.existsSync(priceFile)) existingGame.price = price;
        await existingGame.save();
        updated++;
      } else {
        // Tạo mới
        const game = new Game({
          name,
          slug: slugify(name),
          link,
          headerImage: path.join(name, "header.jpg"),
          images,
          tags,
          details: details || undefined,
          price,
        });
        await game.save();
        imported++;
      }
    } catch (err) {
      errors++;
      console.error(`Error with "${name}":`, err.message);
    }
  }

  console.log({
    imported,
    updated,
    skipped,
    errors,
    total: folders.length,
  });

  process.exit(0);
}

importGames();