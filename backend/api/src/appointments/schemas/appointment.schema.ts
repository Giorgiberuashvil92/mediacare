import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in-progress',
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

  @Prop({
    type: {
      diagnosis: String,
      symptoms: String,
      vitals: {
        bloodPressure: String,
        heartRate: String,
        temperature: String,
        weight: String,
      },
      medications: String,
      notes: String,
    },
    _id: false,
  })
  consultationSummary?: {
    diagnosis?: string;
    symptoms?: string;
    vitals?: {
      bloodPressure?: string;
      heartRate?: string;
      temperature?: string;
      weight?: string;
    };
    medications?: string;
    notes?: string;
  };

  @Prop({
    type: {
      required: { type: Boolean, default: false },
      date: Date,
      reason: String,
      appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
    },
    _id: false,
  })
  followUp?: {
    required: boolean;
    date?: Date;
    reason?: string;
    appointmentId?: mongoose.Types.ObjectId;
  };

  @Prop({
    type: {
      id: String,
      issueDate: Date,
      validUntil: Date,
      reason: String,
      diagnosis: String,
      recommendations: String,
      pdfUrl: String,
      fileName: String,
    },
    _id: false,
  })
  form100?: {
    id?: string;
    issueDate?: Date;
    validUntil?: Date;
    reason?: string;
    diagnosis?: string;
    recommendations?: string;
    pdfUrl?: string;
    fileName?: string;
  };

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
