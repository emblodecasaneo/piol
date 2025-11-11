import express from 'express';
import multer from 'multer';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
  propertyImageStorage,
  agentDocumentStorage,
  avatarImageStorage,
  CLOUDINARY_ENABLED,
  getLocalFileUrl,
  getCloudinaryFileUrl,
} from '../config/cloudinary';

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
  storage: propertyImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

// Upload multiple images
const uploadMultiple = multer({
  storage: propertyImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
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
  storage: agentDocumentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: documentFilter,
});

const avatarUpload = multer({
  storage: avatarImageStorage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
    files: 1,
  },
  fileFilter: imageFilter,
});

type UploadFolder = 'properties' | 'agents' | 'avatars';

const buildUploadResponse = (
  req: express.Request,
  file: Express.Multer.File,
  folder: UploadFolder
) => {
  if (CLOUDINARY_ENABLED) {
    const url = getCloudinaryFileUrl(file);
    if (!url) {
      throw new Error('Unable to retrieve Cloudinary URL');
    }
    return {
      url,
      filename: file.filename,
    };
  }

  return {
    url: getLocalFileUrl(req, folder, file.filename),
    filename: file.filename,
  };
};


router.post(
  '/property-image',
  authenticateToken,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    
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
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Aucun fichier fourni. Veuillez sélectionner une image.',
        });
      }

      try {
        const fileInfo = buildUploadResponse(req, req.file, 'properties');
        return res.json({
          message: 'Image uploaded successfully',
          url: fileInfo.url,
          filename: fileInfo.filename,
        });
      } catch (error) {
        console.error('❌ Upload response error:', error);
        return res.status(500).json({
          error: 'Upload error',
          message: 'Impossible de générer l’URL du fichier uploadé',
        });
      }
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

    try {
      const files = req.files as Express.Multer.File[];
      const urls = files.map((file) => buildUploadResponse(req, file, 'properties'));

      return res.json({
        message: 'Images uploaded successfully',
        urls,
        count: urls.length,
      });
    } catch (error) {
      console.error('❌ Upload multiple response error:', error);
      return res.status(500).json({
        error: 'Upload error',
        message: 'Impossible de générer les URLs des fichiers uploadés',
      });
    }
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

      try {
        const fileInfo = buildUploadResponse(req, req.file, 'agents');

        console.log('✅ Document upload success, URL:', fileInfo.url);

        res.json({
          message: 'Document uploaded successfully',
          url: fileInfo.url,
          filename: fileInfo.filename,
        });
      } catch (error) {
        console.error('❌ Document URL generation error:', error);
        res.status(500).json({
          error: 'Upload error',
          message: 'Impossible de générer l’URL du document uploadé',
        });
      }
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

    try {
      const fileInfo = buildUploadResponse(req, req.file, 'avatars');

      res.json({
        message: 'Avatar uploaded successfully',
        url: fileInfo.url,
        filename: fileInfo.filename,
      });
    } catch (error) {
      console.error('❌ Avatar URL generation error:', error);
      res.status(500).json({
        error: 'Upload error',
        message: 'Impossible de générer l’URL de l’avatar uploadé',
      });
    }
  }
);

export default router;

