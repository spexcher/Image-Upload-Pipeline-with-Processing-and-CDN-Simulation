import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';
import { addImage } from '../db.js';
import { processImageVariants } from '../services/imageProcessor.js';

const router = express.Router();

// Allowed MIME types based on the requirements
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// Configure Multer
// Using memory storage because we want to validate the magic bytes before saving to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // First pass validation: check extension/mimetype reported by client
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

router.post('/', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      // Second pass validation: Check actual magic bytes from the buffer
      const fileType = await fileTypeFromBuffer(req.file.buffer);

      if (!fileType || !ALLOWED_MIMES.includes(fileType.mime)) {
        return res.status(400).json({ error: 'Invalid file content. Magic bytes do not match allowed formats.' });
      }

      const id = uuidv4();
      const originalName = req.file.originalname;

      // Add pending record to the database
      const imageRecord = {
        id,
        originalName,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      
      await addImage(imageRecord);

      // Trigger asynchronous processing, do NOT await it so we don't block the response
      processImageVariants(id, req.file.buffer, originalName).catch(console.error);

      // Return immediately
      return res.status(202).json({
        id,
        status: 'pending',
        message: 'Upload successful. Processing variants in background.',
      });

    } catch (error) {
      console.error('Upload handling error:', error);
      return res.status(500).json({ error: 'Internal server error during upload.' });
    }
  });
});

export default router;
