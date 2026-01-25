import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as mongoose from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log(
      '📸 [ProfileService] User profileImage from DB:',
      user.profileImage,
    );
    console.log(
      '📸 [ProfileService] User full object:',
      JSON.stringify(user, null, 2),
    );

    const profileData = {
      success: true,
      data: {
        id: (user._id as string).toString(),
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth
          ? user.dateOfBirth.toISOString().split('T')[0]
          : undefined,
        gender: user.gender,
        profileImage: user.profileImage,
        address: user.address,
        about: user.about,
        isActive: user.isActive,
        isVerified: user.isVerified,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Doctor specific fields
        ...(user.role === UserRole.DOCTOR && {
          specialization: user.specialization,
          licenseNumber: user.licenseNumber,
          degrees: user.degrees,
          experience: user.experience,
          consultationFee: user.consultationFee,
          followUpFee: user.followUpFee,
          location: user.location,
          rating: user.rating,
          reviewCount: user.reviewCount,
          doctorStatus: user.doctorStatus,
        }),
      },
    };

    console.log(
      '📸 [ProfileService] Returning profile data with profileImage:',
      profileData.data.profileImage,
    );
    return profileData;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const updateData: Partial<User> = {};

    if (updateProfileDto.name !== undefined) {
      updateData.name = updateProfileDto.name;
    }
    if (updateProfileDto.email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await this.userModel.findOne({
        email: updateProfileDto.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new UnauthorizedException('Email already in use');
      }
      updateData.email = updateProfileDto.email;
    }
    if (updateProfileDto.phone !== undefined) {
      updateData.phone = updateProfileDto.phone;
    }
    if (updateProfileDto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }
    if (updateProfileDto.gender !== undefined) {
      updateData.gender = updateProfileDto.gender;
    }
    if (updateProfileDto.address !== undefined) {
      updateData.address = updateProfileDto.address.trim();
    }
    if (updateProfileDto.profileImage !== undefined) {
      console.log(
        '📸 [ProfileService] updateProfile - updating profileImage to:',
        updateProfileDto.profileImage,
      );
      updateData.profileImage = updateProfileDto.profileImage;
    }

    // About field is available for all users
    if (updateProfileDto.about !== undefined) {
      updateData.about = updateProfileDto.about;
    }

    // Doctor specific fields
    if (user.role === UserRole.DOCTOR) {
      if (updateProfileDto.specialization !== undefined) {
        updateData.specialization = updateProfileDto.specialization;
      }
      if (updateProfileDto.licenseNumber !== undefined) {
        updateData.licenseNumber = updateProfileDto.licenseNumber;
      }
      if (updateProfileDto.degrees !== undefined) {
        updateData.degrees = updateProfileDto.degrees;
      }
      if (updateProfileDto.experience !== undefined) {
        updateData.experience = updateProfileDto.experience;
      }
      if (updateProfileDto.consultationFee !== undefined) {
        updateData.consultationFee = updateProfileDto.consultationFee;
      }
      if (updateProfileDto.followUpFee !== undefined) {
        updateData.followUpFee = updateProfileDto.followUpFee;
      }
      if (updateProfileDto.location !== undefined) {
        updateData.location = updateProfileDto.location;
      }
    }

    // Update user
    Object.assign(user, updateData);
    await user.save();

    console.log(
      '📸 [ProfileService] updateProfile - user saved. profileImage:',
      user.profileImage,
    );

    // Return updated profile
    return this.getProfile(userId);
  }

  async updateProfileImage(userId: string, imageUrl: string) {
    console.log(
      '📸 [ProfileService] updateProfileImage called with userId:',
      userId,
      'imageUrl:',
      imageUrl,
    );
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log(
      '📸 [ProfileService] Profile image updated. New profileImage:',
      user.profileImage,
    );

    return {
      success: true,
      message: 'Profile image updated successfully',
      data: {
        profileImage: user.profileImage,
      },
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('მიმდინარე პაროლი არასწორია');
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'ახალი პაროლი უნდა განსხვავდებოდეს მიმდინარე პაროლისგან',
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    return {
      success: true,
      message: 'პაროლი წარმატებით შეიცვალა',
    };
  }
}
