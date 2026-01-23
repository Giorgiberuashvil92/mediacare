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
  @IsNotEmpty()
  phone: string;

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

  // Patient specific fields
  @IsOptional()
  @IsString()
  address?: string;

  // Identification document (for patients and doctors)
  @IsString()
  @IsOptional()
  identificationDocument?: string; // File path for uploaded identification document

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

  // Minimum working days doctor must have scheduled in the next 2 weeks (set by admin)
  @IsOptional()
  minWorkingDaysRequired?: number;
}
