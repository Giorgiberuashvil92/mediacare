import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsService } from './documents.service';
import {
  DocumentApprovalMatrix,
  DocumentApprovalMatrixSchema,
} from './schemas/document-approval-matrix.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DocumentApprovalMatrix.name,
        schema: DocumentApprovalMatrixSchema,
      },
    ]),
  ],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
