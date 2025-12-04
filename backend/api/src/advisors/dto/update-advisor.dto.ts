import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateAdvisorDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
