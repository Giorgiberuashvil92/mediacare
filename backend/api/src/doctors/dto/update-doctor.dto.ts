import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsString,
} from 'class-validator';
import { ApprovalStatus, Gender } from '../../schemas/user.schema';

export class UpdateDoctorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsString()
  @IsOptional()
  degrees?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsNumber()
  @IsOptional()
  consultationFee?: number;

  @IsNumber()
  @IsOptional()
  followUpFee?: number;

  @IsNumber()
  @IsOptional()
  videoConsultationFee?: number;

  @IsNumber()
  @IsOptional()
  homeVisitFee?: number;

  @IsString()
  @IsOptional()
  about?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsBoolean()
  @IsOptional()
  isTopRated?: boolean;

  // Minimum working days doctor must have scheduled in the next 2 weeks
  @IsOptional()
  @IsNumber()
  minWorkingDaysRequired?: number;

  @IsString()
  @IsOptional()
  contractDocument?: string;

  /** ადმინის ჩანაწერი ექიმის შესახებ დეტალურად */
  @IsString()
  @IsOptional()
  adminNotes?: string;

  /** საჯარო რეიტინგი (აპში ვარსკვლავებით) — ადმინის მიერ */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  /** შეფასებების რაოდენობა (აპში ტექსტური მითითებისთვის) */
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewCount?: number;
}
