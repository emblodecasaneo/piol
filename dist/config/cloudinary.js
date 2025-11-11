"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCloudinaryFileUrl = exports.getLocalFileUrl = exports.agentDocumentStorage = exports.avatarImageStorage = exports.propertyImageStorage = exports.CLOUDINARY_ENABLED = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const sanitizeFilename = (filename) => filename
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
const getFileBaseName = (filename) => {
    const withoutExtension = filename.replace(/\.[^/.]+$/, '');
    return sanitizeFilename(withoutExtension);
};
const uploadsRoot = path_1.default.join(__dirname, '..', '..', 'uploads');
const propertyImagesDir = path_1.default.join(uploadsRoot, 'properties');
const agentDocumentsDir = path_1.default.join(uploadsRoot, 'agents');
const avatarsDir = path_1.default.join(uploadsRoot, 'avatars');
const ensureDirectory = (dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
};
exports.CLOUDINARY_ENABLED = Boolean(process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);
if (exports.CLOUDINARY_ENABLED) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}
else {
    ensureDirectory(propertyImagesDir);
    ensureDirectory(agentDocumentsDir);
    ensureDirectory(avatarsDir);
    console.warn('[Cloudinary] Environment variables not fully set. Falling back to local file storage.');
}
const baseFolder = process.env.CLOUDINARY_ROOT_FOLDER || 'piol';
const buildCloudinaryPublicId = (filename) => `${Date.now()}-${getFileBaseName(filename)}`;
const createDiskStorage = (destination) => multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, destination);
    },
    filename: (_req, file, cb) => {
        const sanitizedOriginalName = sanitizeFilename(file.originalname);
        cb(null, `${Date.now()}-${sanitizedOriginalName}`);
    },
});
exports.propertyImageStorage = exports.CLOUDINARY_ENABLED
    ? new multer_storage_cloudinary_1.CloudinaryStorage({
        cloudinary: cloudinary_1.v2,
        params: (_req, file) => ({
            folder: process.env.CLOUDINARY_PROPERTY_FOLDER || `${baseFolder}/properties`,
            resource_type: 'image',
            public_id: buildCloudinaryPublicId(file.originalname),
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        }),
    })
    : createDiskStorage(propertyImagesDir);
exports.avatarImageStorage = exports.CLOUDINARY_ENABLED
    ? new multer_storage_cloudinary_1.CloudinaryStorage({
        cloudinary: cloudinary_1.v2,
        params: (_req, file) => ({
            folder: process.env.CLOUDINARY_AVATAR_FOLDER || `${baseFolder}/avatars`,
            resource_type: 'image',
            public_id: buildCloudinaryPublicId(file.originalname),
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        }),
    })
    : createDiskStorage(avatarsDir);
exports.agentDocumentStorage = exports.CLOUDINARY_ENABLED
    ? new multer_storage_cloudinary_1.CloudinaryStorage({
        cloudinary: cloudinary_1.v2,
        params: (_req, file) => ({
            folder: process.env.CLOUDINARY_AGENT_FOLDER || `${baseFolder}/agents`,
            resource_type: file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
                ? 'raw'
                : 'auto',
            public_id: buildCloudinaryPublicId(file.originalname),
        }),
    })
    : createDiskStorage(agentDocumentsDir);
const getLocalFileUrl = (req, folder, filename) => {
    const baseUrl = process.env.UPLOAD_BASE_URL || `${req.protocol}://${req.get('host') || 'localhost'}`;
    return `${baseUrl}/uploads/${folder}/${filename}`;
};
exports.getLocalFileUrl = getLocalFileUrl;
const getCloudinaryFileUrl = (file) => {
    const typedFile = file;
    return typedFile?.path || typedFile?.secure_url;
};
exports.getCloudinaryFileUrl = getCloudinaryFileUrl;
//# sourceMappingURL=cloudinary.js.map