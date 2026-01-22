import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum DoctorStatusFilter {
  PENDING = 'pending',
  AWAITING_SCHEDULE = 'awaiting_schedule',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ALL = 'all',
}

export class GetDoctorsDto {
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rating?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  symptom?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value as DoctorStatusFilter;
    }
    return value;
  })
  @IsEnum(DoctorStatusFilter, {
    message:
      'status must be one of the following values: pending, awaiting_schedule, approved, rejected, all',
  })
  status?: DoctorStatusFilter;
}
