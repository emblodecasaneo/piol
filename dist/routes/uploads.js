"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const cloudinary_1 = require("../config/cloudinary");
const router = express_1.default.Router();
const handleMulterError = (handler) => {
    return (req, res, next) => {
        handler(req, res, (err) => {
            if (err) {
                if (err instanceof multer_1.default.MulterError) {
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
const imageFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') ||
        ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some((ext) => file.originalname.toLowerCase().endsWith(ext))) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed'));
    }
};
const upload = (0, multer_1.default)({
    storage: cloudinary_1.propertyImageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: imageFilter,
});
const uploadMultiple = (0, multer_1.default)({
    storage: cloudinary_1.propertyImageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: imageFilter,
});
const documentFilter = (_req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
    if (allowedMimes.includes(file.mimetype) ||
        allowedExtensions.some((ext) => file.originalname.toLowerCase().endsWith(ext))) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image and PDF files are allowed'));
    }
};
const uploadDocument = (0, multer_1.default)({
    storage: cloudinary_1.agentDocumentStorage,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
    fileFilter: documentFilter,
});
const avatarUpload = (0, multer_1.default)({
    storage: cloudinary_1.avatarImageStorage,
    limits: {
        fileSize: 3 * 1024 * 1024,
        files: 1,
    },
    fileFilter: imageFilter,
});
const buildUploadResponse = (req, file, folder) => {
    if (cloudinary_1.CLOUDINARY_ENABLED) {
        const url = (0, cloudinary_1.getCloudinaryFileUrl)(file);
        if (!url) {
            throw new Error('Unable to retrieve Cloudinary URL');
        }
        return {
            url,
            filename: file.filename,
        };
    }
    return {
        url: (0, cloudinary_1.getLocalFileUrl)(req, folder, file.filename),
        filename: file.filename,
    };
};
router.post('/property-image', auth_1.authenticateToken, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('❌ Multer error:', err);
            if (err instanceof multer_1.default.MulterError) {
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
        }
        catch (error) {
            console.error('❌ Upload response error:', error);
            return res.status(500).json({
                error: 'Upload error',
                message: 'Impossible de générer l’URL du fichier uploadé',
            });
        }
    });
});
router.post('/property-images', auth_1.authenticateToken, auth_1.requireAdmin, handleMulterError(uploadMultiple.array('images', 10)), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            error: 'No files uploaded',
            message: 'Please provide at least one image file to upload',
        });
    }
    try {
        const files = req.files;
        const urls = files.map((file) => buildUploadResponse(req, file, 'properties'));
        return res.json({
            message: 'Images uploaded successfully',
            urls,
            count: urls.length,
        });
    }
    catch (error) {
        console.error('❌ Upload multiple response error:', error);
        return res.status(500).json({
            error: 'Upload error',
            message: 'Impossible de générer les URLs des fichiers uploadés',
        });
    }
});
router.post('/agent-document', auth_1.authenticateToken, (req, res, next) => {
    console.log('📤 Document upload request received');
    uploadDocument.single('document')(req, res, (err) => {
        if (err) {
            console.error('❌ Multer error:', err);
            if (err instanceof multer_1.default.MulterError) {
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
        }
        catch (error) {
            console.error('❌ Document URL generation error:', error);
            res.status(500).json({
                error: 'Upload error',
                message: 'Impossible de générer l’URL du document uploadé',
            });
        }
    });
});
router.post('/user-avatar', auth_1.authenticateToken, handleMulterError(avatarUpload.single('avatar')), (req, res) => {
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
    }
    catch (error) {
        console.error('❌ Avatar URL generation error:', error);
        res.status(500).json({
            error: 'Upload error',
            message: 'Impossible de générer l’URL de l’avatar uploadé',
        });
    }
});
exports.default = router;
//# sourceMappingURL=uploads.js.map