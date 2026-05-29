import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;
}
