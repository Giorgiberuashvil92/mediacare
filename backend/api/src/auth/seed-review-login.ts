import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../app.module';
import {
  ApprovalStatus,
  Gender,
  User,
  UserDocument,
  UserRole,
} from '../schemas/user.schema';
import {
  REVIEW_LOGIN_EMAIL,
  REVIEW_LOGIN_PASSWORD,
} from './review-login.config';

const REVIEW_USER = {
  role: UserRole.PATIENT,
  name: 'App Store Reviewer',
  nameEn: 'App Store Reviewer',
  email: REVIEW_LOGIN_EMAIL,
  phone: '599000001',
  idNumber: '00000000001',
  gender: Gender.OTHER,
  address: 'თბილისი, საქართველო',
  addressEn: 'Tbilisi, Georgia',
  addressRu: 'Тбилиси, Грузия',
};

async function seedReviewLoginUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<import('mongoose').Model<UserDocument>>(
    getModelToken(User.name),
  );

  console.log('🌱 Seeding App Store review login account...');
  console.log(`   Email: ${REVIEW_LOGIN_EMAIL}`);

  const hashedPassword = await bcrypt.hash(REVIEW_LOGIN_PASSWORD, 10);

  const existing = await userModel.findOne({
    email: REVIEW_LOGIN_EMAIL,
    role: REVIEW_USER.role,
  });

  if (existing) {
    existing.password = hashedPassword;
    existing.name = REVIEW_USER.name;
    existing.nameEn = REVIEW_USER.nameEn;
    existing.phone = REVIEW_USER.phone;
    existing.idNumber = REVIEW_USER.idNumber;
    existing.gender = REVIEW_USER.gender;
    existing.address = REVIEW_USER.address;
    existing.addressEn = REVIEW_USER.addressEn;
    existing.addressRu = REVIEW_USER.addressRu;
    existing.isActive = true;
    existing.isVerified = true;
    existing.approvalStatus = ApprovalStatus.APPROVED;
    await existing.save();

    console.log('✅ Updated existing review account');
    console.log(`   User ID: ${existing._id.toString()}`);
  } else {
    const created = await userModel.create({
      ...REVIEW_USER,
      password: hashedPassword,
      isActive: true,
      isVerified: true,
      approvalStatus: ApprovalStatus.APPROVED,
    });

    console.log('✅ Created review account');
    console.log(`   User ID: ${created._id.toString()}`);
  }

  console.log('✨ Review login seed completed (OTP skipped for this email).');
  await app.close();
}

seedReviewLoginUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Review login seed failed:', error);
    process.exit(1);
  });
