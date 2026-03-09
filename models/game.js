import mongoose from "mongoose";

const gameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    link: {
      type: String,
      required: [true],
      trim: true,
    },
    headerImage: {
      type: String,
      required: [true],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 10; // Limit to 10 images
        },
        message: "Maximum 10 images allowed",
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    releaseDate: {
      type: Date,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    // Đơn vị: VND
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Create slug from name before saving (only if slug is not provided)
gameSchema.pre("save", async function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

// Index for text search
gameSchema.index({ name: "text", description: "text", tags: "text" });

// Index for common queries
gameSchema.index({ featured: 1, createdAt: -1 });
gameSchema.index({ tags: 1 });

const Game = mongoose.model("Game", gameSchema);

export default Game;