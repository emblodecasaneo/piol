import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Ensure uploads directory exists
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const propertyImagesDir = path.join(uploadRoot, 'properties');
const agentDocumentsDir = path.join(uploadRoot, 'agents');
const avatarsDir = path.join(uploadRoot, 'avatars');

if (!fs.existsSync(propertyImagesDir)) {
  fs.mkdirSync(propertyImagesDir, { recursive: true });
}
if (!fs.existsSync(agentDocumentsDir)) {
  fs.mkdirSync(agentDocumentsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
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
  },
  fileFilter: imageFilter,
});

// Upload multiple images
const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

// Storage for agent documents (PDF, images)
const agentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, agentDocumentsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${timestamp}-${sanitizedOriginalName}`);
  },
});

const documentFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
  
  if (
    allowedMimes.includes(file.mimetype) ||
    allowedExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext)
    )
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed'));
  }
};

const uploadDocument = multer({
  storage: agentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: documentFilter,
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${timestamp}-${sanitizedOriginalName}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
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

    // Utiliser UPLOAD_BASE_URL en production, sinon construire depuis la requête
    const baseUrl = process.env.UPLOAD_BASE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://piol.onrender.com'
        : `${req.protocol}://${req.get('host')}`);

    const url = `${baseUrl}/uploads/properties/${req.file.filename}`;

    return res.json({
      message: 'Image uploaded successfully',
      url,
      filename: req.file.filename,
    });
  }
);

// Upload multiple property images
router.post(
  '/property-images',
  authenticateToken,
  requireAdmin,
  uploadMultiple.array('images', 10),
  (req, res) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please provide at least one image file to upload',
      });
    }

    // Utiliser UPLOAD_BASE_URL en production, sinon construire depuis la requête
    const baseUrl = process.env.UPLOAD_BASE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://piol.onrender.com'
        : `${req.protocol}://${req.get('host')}`);

    const files = req.files as Express.Multer.File[];
    const urls = files.map((file) => ({
      url: `${baseUrl}/uploads/properties/${file.filename}`,
      filename: file.filename,
    }));

    return res.json({
      message: 'Images uploaded successfully',
      urls,
      count: urls.length,
    });
  }
);

// Upload agent document
router.post(
  '/agent-document',
  authenticateToken,
  uploadDocument.single('document'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a document',
      });
    }

    const relativePath = `/uploads/agents/${req.file.filename}`;

    res.json({
      message: 'Document uploaded successfully',
      url: relativePath,
    });
  }
);

router.post(
  '/user-avatar',
  authenticateToken,
  avatarUpload.single('avatar'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload an avatar image',
      });
    }

    const relativePath = `/uploads/avatars/${req.file.filename}`;

    res.json({
      message: 'Avatar uploaded successfully',
      url: relativePath,
    });
  }
);

export default router;

