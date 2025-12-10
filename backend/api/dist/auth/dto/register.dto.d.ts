import { Gender, UserRole } from '../../schemas/user.schema';
export declare class RegisterDto {
    role: UserRole;
    name: string;
    email: string;
    password: string;
    phone?: string;
    idNumber: string;
    dateOfBirth?: string;
    gender?: Gender;
    profileImage?: string;
    specialization?: string;
    licenseDocument?: string;
    degrees?: string;
    experience?: string;
    consultationFee?: number;
    followUpFee?: number;
    about?: string;
    location?: string;
}
