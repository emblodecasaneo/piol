import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const sanitizeFilename = (filename: string): string =>
  filename
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();

const getFileBaseName = (filename: string): string => {
  const withoutExtension = filename.replace(/\.[^/.]+$/, '');
  return sanitizeFilename(withoutExtension);
};

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const propertyImagesDir = path.join(uploadsRoot, 'properties');
const agentDocumentsDir = path.join(uploadsRoot, 'agents');
const avatarsDir = path.join(uploadsRoot, 'avatars');

const ensureDirectory = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const CLOUDINARY_ENABLED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  ensureDirectory(propertyImagesDir);
  ensureDirectory(agentDocumentsDir);
  ensureDirectory(avatarsDir);
  console.warn('[Cloudinary] Environment variables not fully set. Falling back to local file storage.');
}

const baseFolder = process.env.CLOUDINARY_ROOT_FOLDER || 'piol';

const buildCloudinaryPublicId = (filename: string) =>
  `${Date.now()}-${getFileBaseName(filename)}`;

const createDiskStorage = (destination: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const sanitizedOriginalName = sanitizeFilename(file.originalname);
      cb(null, `${Date.now()}-${sanitizedOriginalName}`);
    },
  });

export const propertyImageStorage: multer.StorageEngine = CLOUDINARY_ENABLED
  ? new CloudinaryStorage({
      cloudinary,
      params: (_req, file) => ({
        folder: process.env.CLOUDINARY_PROPERTY_FOLDER || `${baseFolder}/properties`,
        resource_type: 'image',
        public_id: buildCloudinaryPublicId(file.originalname),
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      }),
    })
  : createDiskStorage(propertyImagesDir);

export const avatarImageStorage: multer.StorageEngine = CLOUDINARY_ENABLED
  ? new CloudinaryStorage({
      cloudinary,
      params: (_req, file) => ({
        folder: process.env.CLOUDINARY_AVATAR_FOLDER || `${baseFolder}/avatars`,
        resource_type: 'image',
        public_id: buildCloudinaryPublicId(file.originalname),
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      }),
    })
  : createDiskStorage(avatarsDir);

export const agentDocumentStorage: multer.StorageEngine = CLOUDINARY_ENABLED
  ? new CloudinaryStorage({
      cloudinary,
      params: (_req, file) => ({
        folder: process.env.CLOUDINARY_AGENT_FOLDER || `${baseFolder}/agents`,
        resource_type:
          file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
            ? 'raw'
            : 'auto',
        public_id: buildCloudinaryPublicId(file.originalname),
      }),
    })
  : createDiskStorage(agentDocumentsDir);

export const getLocalFileUrl = (
  req: express.Request,
  folder: 'properties' | 'agents' | 'avatars',
  filename: string
): string => {
  const baseUrl =
    process.env.UPLOAD_BASE_URL || `${req.protocol}://${req.get('host') || 'localhost'}`;
  return `${baseUrl}/uploads/${folder}/${filename}`;
};

export const getCloudinaryFileUrl = (file: Express.Multer.File): string | undefined => {
  const typedFile = file as Express.Multer.File & {
    path?: string;
    secure_url?: string;
  };
  return typedFile?.path || typedFile?.secure_url;
};
