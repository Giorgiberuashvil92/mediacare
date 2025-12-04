import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentType } from '../../appointments/schemas/appointment.schema';

export class CreateFollowUpDto {
  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @IsOptional()
  @IsString()
  visitAddress?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
