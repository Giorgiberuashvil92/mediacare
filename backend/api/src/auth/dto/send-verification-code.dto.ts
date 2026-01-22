import { IsNotEmpty, IsString } from 'class-validator';

export class SendVerificationCodeDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}
