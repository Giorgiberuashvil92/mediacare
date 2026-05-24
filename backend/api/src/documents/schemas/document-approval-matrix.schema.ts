import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentApprovalMatrixDocument = DocumentApprovalMatrix & Document;

@Schema({ _id: false })
export class ApprovalCondition {
  @Prop()
  field?: string;

  @Prop()
  operator?: string;

  @Prop()
  value?: string;
}

@Schema({ _id: false })
export class MatrixApprover {
  @Prop()
  userId?: string;

  @Prop()
  roleId?: number;

  @Prop()
  name?: string;
}

@Schema({ _id: false })
export class ApprovalLevel {
  @Prop({ required: true })
  levelNumber: number;

  @Prop({ type: [MatrixApprover], default: [] })
  approvers: MatrixApprover[];

  @Prop({ type: [ApprovalCondition], default: [] })
  conditions: ApprovalCondition[];
}

@Schema({ _id: false })
export class MatrixApplicable {
  @Prop({ required: true })
  branchId: number;

  @Prop({ required: true })
  departmentId: number;

  @Prop({ required: true })
  documentCategoryId: number;

  @Prop({ required: true })
  documentTypeId: number;

  @Prop({ type: [ApprovalLevel], default: [] })
  approvalLevels: ApprovalLevel[];
}

@Schema({ timestamps: true, collection: 'document_approval_matrices' })
export class DocumentApprovalMatrix {
  @Prop()
  name?: string;

  @Prop({ type: [MatrixApplicable], default: [] })
  matrixApplicables: MatrixApplicable[];
}

export const DocumentApprovalMatrixSchema = SchemaFactory.createForClass(
  DocumentApprovalMatrix,
);

DocumentApprovalMatrixSchema.index({
  'matrixApplicables.branchId': 1,
  'matrixApplicables.departmentId': 1,
  'matrixApplicables.documentCategoryId': 1,
  'matrixApplicables.documentTypeId': 1,
});
