import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'licenses');
  private readonly imagesDir = path.join(process.cwd(), 'uploads', 'images');
  private readonly formsDir = path.join(process.cwd(), 'uploads', 'forms');

  constructor() {
    // Ensure upload directories exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
    if (!fs.existsSync(this.formsDir)) {
      fs.mkdirSync(this.formsDir, { recursive: true });
    }
  }

  saveLicenseDocument(file: Express.Multer.File): string {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return relative path
    return `uploads/licenses/${fileName}`;
  }

  deleteLicenseDocument(filePath: string): void {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  saveImage(file: Express.Multer.File): string {
    // Validate image
    if (!this.validateImageFile(file)) {
      throw new BadRequestException(
        'Invalid image file. Only JPG, JPEG, PNG, WEBP files up to 5MB are allowed.',
      );
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.originalname}`;
    const filePath = path.join(this.imagesDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Return relative path
    return `uploads/images/${fileName}`;
  }

  saveFormDocument(file: Express.Multer.File): string {
    if (!this.validateFormDocument(file)) {
      throw new BadRequestException(
        'Invalid file. Only PDF, JPG, JPEG, PNG files up to 5MB are allowed.',
      );
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.originalname}`;
    const filePath = path.join(this.formsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);
    return `uploads/forms/${fileName}`;
  }

  deleteFormDocument(filePath: string): void {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  validateLicenseFile(file: Express.Multer.File): boolean {
    // Allowed mime types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    // Check mime type
    if (!allowedTypes.includes(file.mimetype)) {
      return false;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return false;
    }

    return true;
  }

  validateImageFile(file: Express.Multer.File): boolean {
    // Allowed mime types for images
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // Check mime type
    if (!allowedTypes.includes(file.mimetype)) {
      return false;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return false;
    }

    return true;
  }

  validateFormDocument(file: Express.Multer.File): boolean {
    return this.validateLicenseFile(file);
  }
}
