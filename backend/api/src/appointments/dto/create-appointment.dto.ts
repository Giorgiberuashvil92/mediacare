import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentStatus } from '../schemas/appointment.schema';

class PatientDetailsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  problem?: string;
}

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsNotEmpty()
  @IsString()
  appointmentDate: string; // ISO date string

  @IsNotEmpty()
  @IsString()
  appointmentTime: string;

  @IsNotEmpty()
  @IsNumber()
  consultationFee: number;

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => PatientDetailsDto)
  patientDetails?: PatientDetailsDto;

  @IsOptional()
  @IsString({ each: true })
  documents?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
