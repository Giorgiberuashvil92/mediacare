/* eslint-disable no-useless-escape */
import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  orderId: string;

  @IsString()
  description: string;

  // Allow both public URLs and localhost for development
  @Matches(
    /^https?:\/\/(localhost|127\.0\.0\.1|[\da-z\.-]+\.([a-z\.]{2,6}))(:\d+)?(\/.*)?$/i,
    {
      message: 'callbackUrl must be a valid URL address',
    },
  )
  callbackUrl: string;

  @IsString()
  @IsOptional()
  captureMethod?: 'AUTO' | 'MANUAL';
}
