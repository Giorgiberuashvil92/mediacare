import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked', // დროებით დაბლოკილი time slot
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ required: true })
  appointmentNumber: string;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  doctorId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  patientId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  appointmentDate: Date;

  @Prop({ required: true })
  appointmentTime: string;

  @Prop({ enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Prop({ required: true })
  consultationFee: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop()
  paymentMethod?: string;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({
    type: {
      name: String,
      dateOfBirth: String,
      gender: String,
      problem: String,
    },
    _id: false,
  })
  patientDetails?: {
    name?: string;
    dateOfBirth?: string;
    gender?: string;
    problem?: string;
  };

  @Prop({ type: [String], default: [] })
  documents: string[];

  @Prop()
  notes?: string;

  @Prop()
  expiresAt?: Date; // დროებით blocked appointments-ებისთვის

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Create index for appointment number
AppointmentSchema.index({ appointmentNumber: 1 }, { unique: true });

// Create index for doctor and date
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1 });

// Create index for patient
AppointmentSchema.index({ patientId: 1 });

// Create TTL index for automatic cleanup of expired blocked appointments
AppointmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
