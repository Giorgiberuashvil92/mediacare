import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  merchantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  merchantName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bogClientId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bogClientSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  misAmbulatoryBaseUrl?: string;

  @IsOptional() @IsString() misAuthLoginUrl?: string;
  @IsOptional() @IsString() misAuthLoginName?: string;
  @IsOptional() @IsString() misAuthPassword?: string;
  @IsOptional() @IsString() misAuthLoginToken?: string;

  @IsOptional() @IsString() misServiceIdHomeVisit?: string;
  @IsOptional() @IsString() misServiceIdVideo?: string;
  @IsOptional() @IsString() misServiceIdVideoFollowUp?: string;
  @IsOptional() @IsString() misContractId?: string;
}
