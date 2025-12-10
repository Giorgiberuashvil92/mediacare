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
      const stream = this.cloudinaryClient.uploader.upload_stream(
        {
          folder: 'mediacare',
          resource_type: 'image',
          ...options,
        },
        (error, result) => {
          if (error) {
            reject(new Error(error.message || 'Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }
}
