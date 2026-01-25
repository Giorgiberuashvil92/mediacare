import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RescheduleRequestDto {
  @IsOptional()
  @IsDateString()
  newDate?: string;

  @IsOptional()
  @IsString()
  newTime?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
