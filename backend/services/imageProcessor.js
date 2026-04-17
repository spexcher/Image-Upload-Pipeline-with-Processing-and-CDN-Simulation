import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { updateImage } from '../db.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
console.log(process.cwd());
export async function processImageVariants(id, buffer, originalName) {
  try {
    console.log(process.cwd());
    const dirPath = path.join(UPLOADS_DIR, id);
    await fs.mkdir(dirPath, { recursive: true });

    // Ensure we know it's pending initially, but usually the route does this
    await updateImage(id, { status: 'processing' });

    const metadata = await sharp(buffer).metadata();
    const format = metadata.format === 'jpeg' ? 'jpg' : metadata.format;

    // Define filenames
    const originalFilename = `original.${format}`;
    const mediumFilename = `medium.${format}`;
    const thumbnailFilename = `thumbnail.${format}`;

    // Paths
    const originalPath = path.join(dirPath, originalFilename);
    const mediumPath = path.join(dirPath, mediumFilename);
    const thumbnailPath = path.join(dirPath, thumbnailFilename);

    // 1. Original at 85% quality
    const originalJob = sharp(buffer)
      [metadata.format]({ quality: 85 })
      .toFile(originalPath)
      .then((info) => ({
        url: `/uploads/${id}/${originalFilename}`,
        width: info.width,
        height: info.height,
        size: info.size,
      }));

    // 2. Medium: 800px wide
    const mediumJob = sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      [metadata.format]({ quality: 85 })
      .toFile(mediumPath)
      .then((info) => ({
        url: `/uploads/${id}/${mediumFilename}`,
        width: info.width,
        height: info.height,
        size: info.size,
      }));

    // 3. Thumbnail: 300px width, auto height to support masonry layout
    const thumbnailJob = sharp(buffer)
      .resize({ width: 300, withoutEnlargement: true })
      [metadata.format]({ quality: 85 })
      .toFile(thumbnailPath)
      .then((info) => ({
        url: `/uploads/${id}/${thumbnailFilename}`,
        width: info.width,
        height: info.height,
        size: info.size,
      }));

    const [original, medium, thumbnail] = await Promise.all([
      originalJob,
      mediumJob,
      thumbnailJob,
    ]);

    await updateImage(id, {
      status: 'completed',
      variants: {
        original,
        medium,
        thumbnail,
      },
    });
  } catch (error) {
    console.error(`Error processing image ${id}:`, error);
    await updateImage(id, { status: 'failed', error: error.message });
  }
}
