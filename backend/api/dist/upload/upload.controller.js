"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = exports.UploadImageController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const upload_service_1 = require("./upload.service");
let UploadImageController = class UploadImageController {
    constructor(cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }
    async uploadImage(file) {
        if (!file) {
            throw new common_1.BadRequestException('ფაილი აუცილებელია');
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('ფაილის ტიპი არასწორია');
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new common_1.BadRequestException('ფაილი უნდა იყოს 5MB-მდე');
        }
        const result = await this.cloudinaryService.uploadBuffer(file.buffer, {
            folder: 'mediacare',
            resource_type: 'image',
        });
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        };
    }
    async uploadImagePublic(file) {
        if (!file) {
            throw new common_1.BadRequestException('ფაილი აუცილებელია');
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('ფაილის ტიპი არასწორია');
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new common_1.BadRequestException('ფაილი უნდა იყოს 5MB-მდე');
        }
        const result = await this.cloudinaryService.uploadBuffer(file.buffer, {
            folder: 'mediacare',
            resource_type: 'image',
        });
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        };
    }
};
exports.UploadImageController = UploadImageController;
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadImageController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)('image/public'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadImageController.prototype, "uploadImagePublic", null);
exports.UploadImageController = UploadImageController = __decorate([
    (0, common_1.Controller)('uploads'),
    __metadata("design:paramtypes", [cloudinary_service_1.CloudinaryService])
], UploadImageController);
let UploadController = class UploadController {
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    uploadLicense(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!this.uploadService.validateLicenseFile(file)) {
            throw new common_1.BadRequestException('Invalid file. Only PDF, JPG, JPEG, PNG files up to 5MB are allowed.');
        }
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
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('license'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UploadController.prototype, "uploadLicense", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [upload_service_1.UploadService])
], UploadController);
//# sourceMappingURL=upload.controller.js.map