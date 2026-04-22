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

export enum AppointmentSubStatus {
  SCHEDULED = 'scheduled', // დანიშნული
  CONDUCTED = 'conducted', // ჩატარებული
  DOCUMENTS_PENDING = 'documents-pending', // დოკუმენტებია ასატვირთი
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

export enum AppointmentType {
  VIDEO = 'video',
  HOME_VISIT = 'home-visit',
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

  @Prop({ enum: AppointmentType, required: true })
  type: AppointmentType;

  /** true თუ ჯავშანი განმეორებითი ვიზიტია (ექიმის ან პაციენტის მიერ შექმნილი) — ვიდეო/ბინა არ მნიშვნელობს */
  @Prop({ default: false })
  isFollowUp?: boolean;

  @Prop({ enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Prop({ enum: AppointmentSubStatus })
  subStatus?: AppointmentSubStatus; // ქვე-სტატუსი დანიშნული კონსულტაციებისთვის

  @Prop()
  patientJoinedAt?: Date; // პაციენტის შესვლის დრო ვიდეო კონსულტაციაში

  @Prop()
  doctorJoinedAt?: Date; // ექიმის შესვლის დრო ვიდეო კონსულტაციაში

  @Prop()
  completedAt?: Date; // კონსულტაციის დასრულების დრო (ორივე მხარე leave call-ს რომ დააჭერს)

  @Prop()
  homeVisitCompletedAt?: Date; // ბინაზე კონსულტაციის დასრულების დრო (პაციენტის მიერ)

  @Prop({ required: true })
  consultationFee: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop()
  paymentMethod?: string;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop()
  paymentOrderId?: string; // BOG payment order ID

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
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    personalId?: string;
    address?: string;
    problem?: string;
  };

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        name: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now },
        isExternalLabResult: { type: Boolean, default: false },
      },
    ],
    default: [],
    _id: false,
  })
  documents?: {
    url: string;
    publicId?: string;
    name?: string;
    mimeType?: string;
    size?: number;
    uploadedAt: Date;
    isExternalLabResult?: boolean;
  }[];

  @Prop()
  notes?: string;

  @Prop()
  visitAddress?: string;

  /** MIS POST /api/Services/GenerateService → `value` (დაგენერირებული სერვისის ID, ფორმებისთვის) */
  @Prop()
  misGeneratedServiceId?: string;

  /** ბოლო წარმატებული HIS mis-print-forms GET-ზე ფორმა IV–100 იყო პასუხში (დასრულებისთვის; PDF ატვირთვა არ ითვლება). */
  @Prop({ type: Date })
  misForm100AvailableAt?: Date;

  /** HIS `GetFormsByServiceID` მასივში IV–100-ის ინდექსი — PDF ჩამოტვირთვა HIS დროებით რომ ჩავარდეს, პაციენტს ეგ ინდექსი სჭირდება. */
  @Prop({ type: Number })
  misForm100PrintFormIndex?: number;

  /**
   * აღარ ინახება / აღარ იტვირთება ნაგულისხმევად — ფორმები მხოლოდ HIS-იდან GET /appointments/:id/mis-print-forms.
   * (ძველი ჩანაწერები DB-ში შეიძლება დარჩეს; `select: false` აპლიკაციაში არ ჩანს.)
   */
  @Prop({ type: mongoose.Schema.Types.Mixed, select: false })
  misPrintFormsByService?: unknown;

  @Prop({ type: Date, select: false })
  misPrintFormsFetchedAt?: Date;

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

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        clinicId: String,
        clinicName: String,
        assignedAt: { type: Date, default: Date.now },
        booked: { type: Boolean, default: false },
        // Store resultFile as a flexible subdocument (Mixed) so it can hold the full Cloudinary payload
        resultFile: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    default: [],
    _id: false,
  })
  laboratoryTests?: {
    productId: string;
    productName: string;
    clinicId?: string;
    clinicName?: string;
    assignedAt: Date;
    booked: boolean;
    resultFile?: {
      url: string;
      publicId?: string;
      name?: string;
      type?: string;
      size?: number;
      uploadedAt: Date;
    };
  }[];

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        notes: String,
        assignedAt: { type: Date, default: Date.now },
        clinicId: String,
        clinicName: String,
        booked: { type: Boolean, default: false },
        resultFile: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    default: [],
    _id: false,
  })
  instrumentalTests?: {
    productId: string;
    productName: string;
    notes?: string;
    assignedAt?: Date;
    clinicId?: string;
    clinicName?: string;
    booked?: boolean;
    resultFile?: any;
  }[];

  @Prop()
  expiresAt?: Date; // დროებით blocked appointments-ებისთვის

  @Prop({
    type: {
      requestedBy: { type: String, enum: ['doctor', 'patient'] },
      requestedDate: Date,
      requestedTime: String,
      reason: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      requestedAt: { type: Date, default: Date.now },
      respondedAt: Date,
      respondedBy: String,
    },
    _id: false,
  })
  rescheduleRequest?: {
    requestedBy?: 'doctor' | 'patient';
    requestedDate?: Date;
    requestedTime?: string;
    reason?: string;
    status?: 'pending' | 'approved' | 'rejected';
    requestedAt?: Date;
    respondedAt?: Date;
    respondedBy?: string;
  };

  @Prop()
  cancelledAt?: Date; // ზუსტი დრო, როდესაც პაციენტმა (ან სისტემამ) გაუქმება გააკეთა

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
