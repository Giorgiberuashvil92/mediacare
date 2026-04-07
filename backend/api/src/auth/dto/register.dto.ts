import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
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
  @IsOptional()
  verificationCode?: string; // OTP code is optional - phone verification is checked via isPhoneVerified

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

  /** ექიმთან ვიზიტით რეგისტრაცია → MIS GenerateService; ორივე ერთად სავალდებულოა */
  @IsOptional()
  @ValidateIf(
    (o: RegisterDto) =>
      o.appointmentServiceDate != null &&
      String(o.appointmentServiceDate).trim() !== '',
  )
  @IsMongoId()
  appointmentDoctorId?: string;

  @IsOptional()
  @ValidateIf(
    (o: RegisterDto) =>
      o.appointmentDoctorId != null &&
      String(o.appointmentDoctorId).trim() !== '',
  )
  @IsString()
  @IsNotEmpty()
  appointmentServiceDate?: string;

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

  // Identomat verification images (for admin panel)
  @IsString()
  @IsOptional()
  identomatFaceImage?: string; // Face image URL from Identomat

  @IsString()
  @IsOptional()
  identomatDocumentFrontImage?: string; // Document front image URL from Identomat

  @IsString()
  @IsOptional()
  identomatDocumentBackImage?: string; // Document back image URL from Identomat

  @IsOptional()
  identomatFullData?: any; // Full Identomat response data for admin panel
}
