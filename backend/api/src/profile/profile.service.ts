import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
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

    return {
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
          about: user.about,
          location: user.location,
          rating: user.rating,
          reviewCount: user.reviewCount,
          isActive: user.isActive,
        }),
      },
    };
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
      updateData.address = updateProfileDto.address;
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
      if (updateProfileDto.about !== undefined) {
        updateData.about = updateProfileDto.about;
      }
      if (updateProfileDto.location !== undefined) {
        updateData.location = updateProfileDto.location;
      }
    }

    // Update user
    Object.assign(user, updateData);
    await user.save();

    // Return updated profile
    return this.getProfile(userId);
  }

  async updateProfileImage(userId: string, imageUrl: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { profileImage: imageUrl },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Profile image updated successfully',
      data: {
        profileImage: user.profileImage,
      },
    };
  }
}
