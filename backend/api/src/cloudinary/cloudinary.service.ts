import { Inject, Injectable } from '@nestjs/common';
import {
  UploadApiOptions,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY) private cloudinaryClient: typeof cloudinary,
  ) {}

  async uploadImage(
    filePath: string,
    options: UploadApiOptions = {},
  ): Promise<UploadApiResponse> {
    return this.cloudinaryClient.uploader.upload(filePath, {
      folder: 'mediacare',
      resource_type: 'image',
      ...options,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions = {},
    mimeType?: string,
    originalFilename?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // For PDFs and documents, use 'raw' resource_type
      // For images, use 'image'
      let resourceType = options.resource_type || 'auto';
      const uploadOptions: UploadApiOptions = {
        folder: 'mediacare',
        ...options,
      };

      if (
        mimeType === 'application/pdf' ||
        mimeType?.startsWith('application/')
      ) {
        resourceType = 'raw';
        // For raw files, we need to include the extension in the filename
        // Extract extension from original filename or mimeType
        let extension = '';
        if (originalFilename) {
          const match = originalFilename.match(/\.([^.]+)$/);
          if (match) extension = match[1];
        } else if (mimeType === 'application/pdf') {
          extension = 'pdf';
        }
        if (extension) {
          // Generate a unique public_id with extension
          const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
          uploadOptions.public_id = `${uniqueId}.${extension}`;
        }
      } else if (mimeType?.startsWith('image/')) {
        resourceType = 'image';
      }

      uploadOptions.resource_type = resourceType;

      const stream = this.cloudinaryClient.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(error.message || 'Cloudinary upload failed'));
            return;
          }
          if (!result || !result.secure_url) {
            console.error('Cloudinary returned empty result:', result);
            reject(new Error('Cloudinary returned empty result'));
            return;
          }
          console.log('Cloudinary upload success:', result.secure_url);
          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }
}
