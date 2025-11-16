import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GetUsersDto {
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @IsEnum(['patient', 'doctor'])
  @IsOptional()
  role?: 'patient' | 'doctor';

  @IsString()
  @IsOptional()
  search?: string;
}
