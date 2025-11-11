import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Wrapper pour gérer les erreurs multer
const handleMulterError = (handler: express.RequestHandler): express.RequestHandler => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    handler(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'File too large',
              message: 'File size exceeds the maximum allowed size',
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              error: 'Too many files',
              message: 'File count exceeds the maximum allowed',
            });
          }
          return res.status(400).json({
            error: 'Upload error',
            message: err.message,
          });
        }
        return res.status(400).json({
          error: 'Upload error',
          message: err.message || 'Error uploading file',
        });
      }
      next();
    });
  };
};

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

// Route de test pour vérifier que la route est accessible
router.get('/test', (req, res) => {
  res.json({ message: 'Upload route is working!' });
});

// Route de test SANS authentification pour tester multer
router.post(
  '/test-upload',
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('🧪 TEST Upload request received');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Content-Type:', req.headers['content-type']);
    
    upload.single('image')(req, res, (err: any) => {
      if (err) {
        console.error('❌ Multer error:', err);
        return res.status(400).json({
          error: 'Upload error',
          message: err.message || 'Erreur lors de l\'upload',
        });
      }

      if (!req.file) {
        console.error('❌ No file in request');
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Aucun fichier fourni',
        });
      }

      console.log('✅ TEST File uploaded:', req.file.filename);

      return res.json({
        message: 'Test upload successful!',
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    });
  }
);

router.post(
  '/property-image',
  authenticateToken,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('========================================');
    console.log('📤 Upload request received at /property-image');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Original URL:', req.originalUrl);
    console.log('User:', req.user ? `ID: ${req.user.userId}` : 'No user');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Authorization:', req.headers['authorization'] ? 'Present' : 'Missing');
    console.log('Has file before multer:', !!req.file);
    console.log('Body keys:', Object.keys(req.body || {}));
    console.log('========================================');
    
    // Utiliser le middleware multer avec gestion d'erreur
    upload.single('image')(req, res, (err: any) => {
      if (err) {
        console.error('❌ Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'File too large',
              message: 'La taille du fichier dépasse la limite autorisée (5MB)',
            });
          }
          return res.status(400).json({
            error: 'Upload error',
            message: err.message || 'Erreur lors de l\'upload',
          });
        }
        return res.status(400).json({
          error: 'Upload error',
          message: err.message || 'Erreur lors de l\'upload du fichier',
        });
      }

      if (!req.file) {
        console.error('❌ No file in request');
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Aucun fichier fourni. Veuillez sélectionner une image.',
        });
      }

      console.log('✅ File uploaded:', req.file.filename);

      // Utiliser UPLOAD_BASE_URL en production, sinon construire depuis la requête
      const baseUrl = process.env.UPLOAD_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://piol.onrender.com'
          : `${req.protocol}://${req.get('host')}`);

      const url = `${baseUrl}/uploads/properties/${req.file.filename}`;

      console.log('✅ Upload success, URL:', url);

      return res.json({
        message: 'Image uploaded successfully',
        url,
        filename: req.file.filename,
      });
    });
  }
);

// Upload multiple property images
router.post(
  '/property-images',
  authenticateToken,
  requireAdmin,
  handleMulterError(uploadMultiple.array('images', 10)),
  (req: express.Request, res: express.Response) => {
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
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('📤 Document upload request received');
    
    uploadDocument.single('document')(req, res, (err: any) => {
      if (err) {
        console.error('❌ Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'File too large',
              message: 'La taille du fichier dépasse la limite autorisée (10MB)',
            });
          }
          return res.status(400).json({
            error: 'Upload error',
            message: err.message || 'Erreur lors de l\'upload',
          });
        }
        return res.status(400).json({
          error: 'Upload error',
          message: err.message || 'Erreur lors de l\'upload du document',
        });
      }

      if (!req.file) {
        console.error('❌ No file in request');
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Aucun fichier fourni. Veuillez sélectionner un document.',
        });
      }

      console.log('✅ Document uploaded:', req.file.filename);

      const baseUrl = process.env.UPLOAD_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://piol.onrender.com'
          : `${req.protocol}://${req.get('host')}`);

      const url = `${baseUrl}/uploads/agents/${req.file.filename}`;

      console.log('✅ Document upload success, URL:', url);

      res.json({
        message: 'Document uploaded successfully',
        url,
        filename: req.file.filename,
      });
    });
  }
);

router.post(
  '/user-avatar',
  authenticateToken,
  handleMulterError(avatarUpload.single('avatar')),
  (req: express.Request, res: express.Response) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload an avatar image',
      });
    }

    // Utiliser UPLOAD_BASE_URL en production, sinon construire depuis la requête
    const baseUrl = process.env.UPLOAD_BASE_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://piol.onrender.com'
        : `${req.protocol}://${req.get('host')}`);

    const url = `${baseUrl}/uploads/avatars/${req.file.filename}`;

    res.json({
      message: 'Avatar uploaded successfully',
      url,
      filename: req.file.filename,
    });
  }
);

export default router;

