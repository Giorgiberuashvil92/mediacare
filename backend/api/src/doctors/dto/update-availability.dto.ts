import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
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

  @IsString()
  @IsIn(['video', 'home-visit'])
  type: 'video' | 'home-visit';
}

export class UpdateAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability: AvailabilitySlotDto[];
}
