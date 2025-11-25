import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AppointmentStatus } from '../../appointments/schemas/appointment.schema';

class ConsultationVitalsDto {
  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @IsOptional()
  @IsString()
  heartRate?: string;

  @IsOptional()
  @IsString()
  temperature?: string;

  @IsOptional()
  @IsString()
  weight?: string;
}

class ConsultationSummaryDto {
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsultationVitalsDto)
  vitals?: ConsultationVitalsDto;

  @IsOptional()
  @IsString()
  medications?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class FollowUpDto {
  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateDoctorAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsultationSummaryDto)
  consultationSummary?: ConsultationSummaryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;
}

