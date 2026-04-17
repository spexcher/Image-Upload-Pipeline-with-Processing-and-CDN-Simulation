import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import uploadRouter from "./routes/upload.js";
import { getAllImages, getImage, clearAllImages } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve the static uploads directory to simulate a CDN
// Using absolute path resolving to the uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/uploads", uploadRouter);

// GET /images - List all uploaded images
app.get("/images", async (req, res) => {
  try {
    const images = await getAllImages();
    // Sort by newest first
    const sortedImages = images.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    res.json(sortedImages);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ error: "Failed to retrieve images" });
  }
});

// GET /images/:id - Get specific image variants and status
app.get("/images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const image = await getImage(id);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(image);
  } catch (error) {
    console.error(`Error fetching image ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to retrieve image details" });
  }
});

// DELETE /images - Clear all uploaded images
app.delete("/images", async (req, res) => {
  try {
    await clearAllImages();
    const uploadsPath = path.join(process.cwd(), "uploads");
    try {
      await fs.rm(uploadsPath, { recursive: true, force: true });
      await fs.mkdir(uploadsPath, { recursive: true });
    } catch (e) {
      console.error("Error deleting files:", e);
    }
    res.json({ message: "Gallery cleared successfully" });
  } catch (error) {
    console.error("Error clearing images:", error);
    res.status(500).json({ error: "Failed to clear gallery" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
