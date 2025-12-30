import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class InstrumentalTestDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignInstrumentalTestsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstrumentalTestDto)
  tests: InstrumentalTestDto[];
}
