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
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // For PDFs and other raw files, use 'raw' or 'auto' resource_type
      const resourceType = options.resource_type || 'auto';

      const stream = this.cloudinaryClient.uploader.upload_stream(
        {
          folder: 'mediacare',
          resource_type: resourceType,
          ...options,
        },
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
