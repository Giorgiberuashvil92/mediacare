export declare class UploadService {
    private readonly uploadDir;
    private readonly imagesDir;
    constructor();
    saveLicenseDocument(file: Express.Multer.File): string;
    deleteLicenseDocument(filePath: string): void;
    saveImage(file: Express.Multer.File): string;
    validateLicenseFile(file: Express.Multer.File): boolean;
    validateImageFile(file: Express.Multer.File): boolean;
}
