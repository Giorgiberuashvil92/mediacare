import { Document } from 'mongoose';
export type UserDocument = User & Document;
export declare enum UserRole {
    PATIENT = "patient",
    DOCTOR = "doctor",
    ADMIN = "admin"
}
export declare enum ApprovalStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare enum Gender {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other"
}
export declare class User {
    role: UserRole;
    name: string;
    email: string;
    password: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    profileImage?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    licenseNumber?: string;
    isVerified: boolean;
    isActive: boolean;
    approvalStatus: ApprovalStatus;
    specialization?: string;
    licenseDocument?: string;
    degrees?: string;
    experience?: string;
    consultationFee?: number;
    followUpFee?: number;
    about?: string;
    location?: string;
    rating: number;
    reviewCount: number;
    isTopRated?: boolean;
    minWorkingDaysRequired?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User, any, {}> & User & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
