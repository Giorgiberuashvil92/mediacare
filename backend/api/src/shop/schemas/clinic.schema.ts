import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'clinics' })
export class Clinic {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ trim: true })
  merchantId?: string;

  @Prop({ trim: true })
  merchantName?: string;

  @Prop({ trim: true })
  bogClientId?: string;

  @Prop({ trim: true })
  bogClientSecret?: string;

  /**
   * კლინიკის MIS Ambulatory API base URL.
   * მაგ.: http://192.168.1.254/MISNew/MIS.AmbulatoryTest.API
   * აქედან იგება:
   *  - /api/Patients/AddOrUpdatePatient
   *  - /api/Services/GenerateService
   *  - /api/PrintForm/GetFormsByServiceID
   */
  @Prop({ trim: true })
  misAmbulatoryBaseUrl?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export type ClinicDocument = Clinic & Document;
export const ClinicSchema = SchemaFactory.createForClass(Clinic);
