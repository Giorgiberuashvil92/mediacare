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
    // Determine resource type based on mimeType
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';

    if (mimeType === 'application/pdf') {
      resourceType = 'image'; // Cloudinary can handle PDFs as images
    } else if (mimeType?.startsWith('image/')) {
      resourceType = 'image';
    } else if (mimeType?.startsWith('application/')) {
      resourceType = 'raw';
    }

    // Use base64 data URI for more reliable upload
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`;

    try {
      const result = await this.cloudinaryClient.uploader.upload(dataUri, {
        folder: 'mediacare',
        resource_type: resourceType,
        public_id: originalFilename,
        ...options,
      });

      console.log('Cloudinary upload success:', result.secure_url);
      return result;
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      throw new Error((error as Error).message || 'Cloudinary upload failed');
    }
  }
}
