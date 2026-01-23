import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender, UserRole } from '../../schemas/user.schema';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  // Doctor specific fields
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  degrees?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  consultationFee?: number;

  @IsOptional()
  followUpFee?: number;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
