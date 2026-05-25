import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class VerifyLoginOTPDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  verificationCode: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;
}
