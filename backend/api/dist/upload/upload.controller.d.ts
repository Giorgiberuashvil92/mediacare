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
    constructor(uploadService: UploadService);
    uploadLicense(file: Express.Multer.File): {
        success: boolean;
        message: string;
        data: {
            filePath: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
        };
    };
    uploadIdentification(file: Express.Multer.File): {
        success: boolean;
        message: string;
        data: {
            filePath: string;
            fileName: string;
            fileSize: number;
            mimeType: string;
        };
    };
}
