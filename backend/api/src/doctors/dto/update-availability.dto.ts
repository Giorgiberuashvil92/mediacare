import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';

class AvailabilitySlotDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @IsNotEmpty()
  timeSlots: string[];

  @IsBoolean()
  @IsNotEmpty()
  isAvailable: boolean;
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
}
