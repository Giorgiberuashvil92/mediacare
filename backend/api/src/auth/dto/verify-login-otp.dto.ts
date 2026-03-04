import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyLoginOTPDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  verificationCode: string;
}
