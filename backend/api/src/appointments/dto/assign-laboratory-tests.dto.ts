import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class LaboratoryTestDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsOptional()
  clinicId?: string;

  @IsString()
  @IsOptional()
  clinicName?: string;
}

export class AssignLaboratoryTestsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LaboratoryTestDto)
  tests: LaboratoryTestDto[];
}
