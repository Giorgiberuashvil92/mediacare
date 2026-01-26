import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UploadService } from './upload.service';
export declare class UploadImageController {
    private readonly cloudinaryService;
    constructor(cloudinaryService: CloudinaryService);
    uploadImage(file: Express.Multer.File): Promise<{
        success: boolean;
        url: string;
        publicId: string;
    }>;
    uploadImagePublic(file: Express.Multer.File): Promise<{
        success: boolean;
        url: string;
        publicId: string;
    }>;
}
export declare class UploadController {
    private readonly uploadService;
    private readonly cloudinaryService;
    constructor(uploadService: UploadService, cloudinaryService: CloudinaryService);
    uploadLicense(file: Express.Multer.File): Promise<{
        success: boolean;
        message: string;
        data: {
            filePath: string;
            url: string;
            publicId: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
        };
    }>;
    uploadIdentification(file: Express.Multer.File): Promise<{
        success: boolean;
        message: string;
        data: {
            filePath: string;
            url: string;
            publicId: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
        };
    }>;
}
