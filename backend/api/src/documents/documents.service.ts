import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ApprovalLevel,
  DocumentApprovalMatrix,
  DocumentApprovalMatrixDocument,
} from './schemas/document-approval-matrix.schema';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentApprovalMatrix.name)
    private readonly documentApprovalMatrixModel: Model<DocumentApprovalMatrixDocument>,
  ) {}

  /**
   * Returns approval levels (with approvers & conditions) for the given
   * branch, department, document category and document type — mirrors Laravel
   * DocumentApprovalMatrixRepository::getDocumentApprovalMatrixByBranchAndDepartmentAndCategoryAndDocumentType
   */
  async getDocumentApprovalMatrixByBranchAndDepartmentAndCategoryAndDocumentType(
    branchId: number,
    departmentId: number,
    documentCategoryId: number,
    documentTypeId: number,
  ): Promise<ApprovalLevel[]> {
    const matrix = await this.documentApprovalMatrixModel
      .findOne({
        matrixApplicables: {
          $elemMatch: {
            branchId,
            departmentId,
            documentCategoryId,
            documentTypeId,
          },
        },
      })
      .lean()
      .exec();

    const applicable = matrix?.matrixApplicables?.find(
      (row) =>
        row.branchId === branchId &&
        row.departmentId === departmentId &&
        row.documentCategoryId === documentCategoryId &&
        row.documentTypeId === documentTypeId,
    );

    if (!applicable?.approvalLevels?.length) {
      return [];
    }

    return [...applicable.approvalLevels].sort(
      (a, b) => a.levelNumber - b.levelNumber,
    );
  }
}
