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

    if (mimeType?.startsWith('image/')) {
      resourceType = 'image';
    } else {
      // PDFs and other files use 'raw'
      resourceType = 'raw';
    }

    // Use base64 data URI for more reliable upload
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`;

    // Generate clean public_id: decode URL encoding, remove extension, sanitize
    let publicId: string | undefined;
    if (originalFilename) {
      // Decode URL-encoded characters
      let cleanName = decodeURIComponent(originalFilename);
      // Remove file extension (Cloudinary adds it automatically)
      cleanName = cleanName.replace(/\.[^.]+$/, '');
      // Replace spaces and special chars with underscores
      cleanName = cleanName.replace(/[^a-zA-Z0-9_-]/g, '_');
      // Add timestamp for uniqueness
      publicId = `${Date.now()}_${cleanName}`;
    }

    try {
      const result = await this.cloudinaryClient.uploader.upload(dataUri, {
        folder: 'mediacare',
        resource_type: resourceType,
        ...(publicId && { public_id: publicId }),
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
