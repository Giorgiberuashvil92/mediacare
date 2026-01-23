export declare class UploadService {
    private readonly uploadDir;
    private readonly imagesDir;
    private readonly formsDir;
    private readonly identificationDir;
    constructor();
    saveLicenseDocument(file: Express.Multer.File): string;
    deleteLicenseDocument(filePath: string): void;
    saveIdentificationDocument(file: Express.Multer.File): string;
    deleteIdentificationDocument(filePath: string): void;
    saveImage(file: Express.Multer.File): string;
    saveFormDocument(file: Express.Multer.File): string;
    deleteFormDocument(filePath: string): void;
    validateLicenseFile(file: Express.Multer.File): boolean;
    validateImageFile(file: Express.Multer.File): boolean;
    validateFormDocument(file: Express.Multer.File): boolean;
}
