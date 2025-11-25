import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateFollowUpDto {
  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
