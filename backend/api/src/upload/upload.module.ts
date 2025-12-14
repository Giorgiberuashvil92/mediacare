import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UploadController, UploadImageController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [UploadController, UploadImageController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
