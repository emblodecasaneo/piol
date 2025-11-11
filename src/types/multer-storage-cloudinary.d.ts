import { StorageEngine } from 'multer';

declare module 'multer-storage-cloudinary' {
  import { v2 as cloudinary } from 'cloudinary';

  interface CloudinaryStorageOptions {
    cloudinary: typeof cloudinary;
    params?: any;
  }

  export class CloudinaryStorage implements StorageEngine {
    constructor(options: CloudinaryStorageOptions);
  }
}
