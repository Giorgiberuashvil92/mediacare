import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTermDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  contentEn?: string;

  @IsOptional()
  @IsString()
  contentRu?: string;
}
