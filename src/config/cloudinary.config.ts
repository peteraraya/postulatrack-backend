import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import * as dotenv from 'dotenv';
import { Request } from 'express';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'postulatrack/cvs',
    format: async (req: Request, file: Express.Multer.File) => {
      // Return the correct format based on mimetype to keep extensions
      if (file.mimetype === 'application/pdf') return 'pdf';
      if (file.mimetype === 'application/msword') return 'doc';
      if (
        file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
        return 'docx';
      return 'pdf'; // Default fallback
    },
    resource_type: 'raw',
  } as any,
});
