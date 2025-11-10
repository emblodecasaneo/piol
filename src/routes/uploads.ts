import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Ensure uploads directory exists
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const propertyImagesDir = path.join(uploadRoot, 'properties');

if (!fs.existsSync(propertyImagesDir)) {
  fs.mkdirSync(propertyImagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, propertyImagesDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${timestamp}-${sanitizedOriginalName}`);
  },
});

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (
    file.mimetype.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some((ext) =>
      file.originalname.toLowerCase().endsWith(ext)
    )
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: imageFilter,
});

router.post(
  '/property-image',
  authenticateToken,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide an image file to upload',
      });
    }

    const baseUrl =
      process.env.UPLOAD_BASE_URL ||
      `${req.protocol}://${req.get('host')}`;

    const url = `${baseUrl}/uploads/properties/${req.file.filename}`;

    return res.json({
      message: 'Image uploaded successfully',
      url,
      filename: req.file.filename,
    });
  }
);

export default router;

