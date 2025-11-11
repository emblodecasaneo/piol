import express from 'express';
import multer from 'multer';
export declare const CLOUDINARY_ENABLED: boolean;
export declare const propertyImageStorage: multer.StorageEngine;
export declare const avatarImageStorage: multer.StorageEngine;
export declare const agentDocumentStorage: multer.StorageEngine;
export declare const getLocalFileUrl: (req: express.Request, folder: "properties" | "agents" | "avatars", filename: string) => string;
export declare const getCloudinaryFileUrl: (file: Express.Multer.File) => string | undefined;
//# sourceMappingURL=cloudinary.d.ts.map