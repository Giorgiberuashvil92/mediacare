import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender, UserRole } from '../../schemas/user.schema';

export class RegisterDto {
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  profileImage?: string;

  // Doctor specific fields
  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  licenseDocument?: string; // File path for uploaded license document

  @IsString()
  @IsOptional()
  degrees?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsOptional()
  consultationFee?: number;

  @IsOptional()
  followUpFee?: number;

  @IsString()
  @IsOptional()
  about?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
