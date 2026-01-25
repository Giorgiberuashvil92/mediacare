import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadService } from './upload.service';

@Controller('uploads')
export class UploadImageController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('ფაილი აუცილებელია');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('ფაილის ტიპი არასწორია');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('ფაილი უნდა იყოს 5MB-მდე');
    }

    const result = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      {
        folder: 'mediacare',
        resource_type: 'image',
      },
      file.mimetype,
      file.originalname,
    );

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  // Public upload for unauthenticated flows (e.g., doctor signup profile photo)
  @Post('image/public')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImagePublic(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('ფაილი აუცილებელია');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('ფაილის ტიპი არასწორია');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('ფაილი უნდა იყოს 5MB-მდე');
    }

    const result = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      {
        folder: 'mediacare',
        resource_type: 'image',
      },
      file.mimetype,
      file.originalname,
    );

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  }
}

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('license')
  @UseInterceptors(FileInterceptor('file'))
  uploadLicense(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file
    if (!this.uploadService.validateLicenseFile(file)) {
      throw new BadRequestException(
        'Invalid file. Only PDF, JPG, JPEG, PNG files up to 5MB are allowed.',
      );
    }

    // Save file
    const filePath = this.uploadService.saveLicenseDocument(file);

    return {
      success: true,
      message: 'File uploaded successfully',
      data: {
        filePath,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    };
  }

  @Post('identification')
  @UseInterceptors(FileInterceptor('file'))
  async uploadIdentification(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file
    if (!this.uploadService.validateLicenseFile(file)) {
      throw new BadRequestException(
        'Invalid file. Only PDF, JPG, JPEG, PNG files up to 5MB are allowed.',
      );
    }

    // Upload to Cloudinary instead of saving locally
    console.log(
      '📤 [UploadController] Uploading identification document to Cloudinary:',
      {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    );

    const result = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      {
        folder: 'mediacare/identification',
        resource_type: 'raw', // PDFs and documents use 'raw' resource type
      },
      file.mimetype,
      file.originalname,
    );

    console.log(
      '✅ [UploadController] Identification document uploaded to Cloudinary:',
      {
        url: result.secure_url,
        publicId: result.public_id,
      },
    );

    return {
      success: true,
      message: 'File uploaded successfully',
      data: {
        filePath: result.secure_url, // Return Cloudinary URL instead of local path
        url: result.secure_url, // Also include url for consistency
        publicId: result.public_id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    };
  }
}
