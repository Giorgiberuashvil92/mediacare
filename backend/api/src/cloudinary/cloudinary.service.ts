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
      access_mode: 'public', // Always ensure files are uploaded as public (override any options)
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions = {},
    mimeType?: string,
    originalFilename?: string,
  ): Promise<UploadApiResponse> {
    // Determine resource type based on mimeType, but allow override from options
    let resourceType: 'image' | 'video' | 'raw' | 'auto' =
      options.resource_type || 'auto';

    // If resource_type is not explicitly set in options, determine from mimeType
    if (!options.resource_type) {
      if (mimeType?.startsWith('image/')) {
        resourceType = 'image';
      } else {
        // PDFs and other files use 'raw'
        resourceType = 'raw';
      }
    }

    // Use base64 data URI for more reliable upload
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`;

    // Generate clean public_id (without folder prefix, folder will be added by Cloudinary)
    let publicId: string | undefined;
    if (originalFilename) {
      // Decode URL-encoded characters
      let cleanName = decodeURIComponent(originalFilename);

      // Remove slashes first (Cloudinary doesn't allow slashes in display names)
      cleanName = cleanName.replace(/[/\\]/g, '_');

      // Extract extension
      const extMatch = cleanName.match(/\.([^.]+)$/);
      const extension = extMatch ? extMatch[1] : '';

      // Remove extension from name for cleaning
      const nameWithoutExt = cleanName.replace(/\.[^.]+$/, '');

      // Replace spaces and special chars with underscores
      const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Add timestamp for uniqueness, and add extension back for raw files
      // Note: Don't include folder in public_id, Cloudinary will add it based on folder option
      if (resourceType === 'raw' && extension) {
        publicId = `${Date.now()}_${sanitizedName}.${extension}`;
      } else {
        publicId = `${Date.now()}_${sanitizedName}`;
      }
    }

    try {
      // Remove resource_type and access_mode from options if they were set, since we're setting them explicitly

      const {
        resource_type: _resourceType,
        folder: optionsFolder,
        access_mode: _accessMode,
        ...restOptions
      } = options;

      // Explicitly mark unused variables to avoid TypeScript errors
      void _resourceType;
      void _accessMode;

      // Use folder from options if provided, otherwise default to 'mediacare'
      const folder = optionsFolder || 'mediacare';

      const uploadOptions: UploadApiOptions = {
        folder,
        resource_type: resourceType,
        ...(publicId && { public_id: publicId }),
        ...restOptions,
        access_mode: 'public', // Always ensure files are uploaded as public (override any options)
        invalidate: true, // Invalidate CDN cache to ensure fresh access
        // For raw files, use public-raw preset to ensure public access
        ...(resourceType === 'raw' && {
          upload_preset: 'public-raw', // Use public-raw preset for public access
          // Note: unsigned is handled by the preset itself, don't set it explicitly
          type: 'upload',
          use_filename: false,
          unique_filename: true,
        }),
      };

      console.log('📤 [CloudinaryService] Uploading with options:', {
        folder,
        resource_type: resourceType,
        publicId,
        access_mode: uploadOptions.access_mode,
        upload_preset: uploadOptions.upload_preset,
        mimeType,
        originalFilename,
      });

      const result = await this.cloudinaryClient.uploader.upload(
        dataUri,
        uploadOptions,
      );

      console.log('✅ [CloudinaryService] Cloudinary upload success:', {
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        access_mode: result.access_mode,
        url: result.url,
      });

      // For raw files, use Cloudinary URL helper to generate clean public URL
      // Add fl_inline parameter to ensure files open inline instead of downloading
      if (resourceType === 'raw') {
        // Generate URL without signing (for public files)
        let publicUrl = cloudinary.url(result.public_id, {
          resource_type: 'raw',
          secure: true,
          sign_url: false, // Don't sign - assume file is public
        });

        // Add fl_inline parameter to force inline display (for PDFs and other documents)
        // This ensures files open in browser instead of downloading
        publicUrl += (publicUrl.includes('?') ? '&' : '?') + 'fl_inline';

        // Override secure_url with the generated public URL
        result.secure_url = publicUrl;
        result.url = publicUrl.replace('https://', 'http://');

        console.log(
          '🔗 [CloudinaryService] Generated public URL for raw file (inline):',
          publicUrl,
        );
        console.log('⚠️ [CloudinaryService] If file returns 401, please:');
        console.log('   1. Go to Cloudinary Dashboard -> Settings -> Upload');
        console.log('   2. Set "Access mode by default" to "Public"');
        console.log('   3. Or create an Upload Preset with public access');
      }

      return result;
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      throw new Error((error as Error).message || 'Cloudinary upload failed');
    }
  }
}
