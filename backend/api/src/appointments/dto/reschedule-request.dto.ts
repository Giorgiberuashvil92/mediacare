import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RescheduleRequestDto {
  @IsDateString()
  newDate: string;

  @IsString()
  newTime: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
