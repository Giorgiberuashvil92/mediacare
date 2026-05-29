/**
 * Updates the users collection uniqueness indexes so email and phone are
 * unique within the same role, while doctor and patient accounts can share
 * the same email or phone.
 *
 * Run from the repository root:
 *   npm --prefix backend/api run fix:user-unique-indexes
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { User, UserDocument } from '../schemas/user.schema';

const LEGACY_EMAIL_INDEX_NAME = 'email_1';
const ROLE_SCOPED_EMAIL_INDEX_NAME = 'email_1_role_1';
const LEGACY_PHONE_INDEX_NAME = 'phone_1';
const ROLE_SCOPED_PHONE_INDEX_NAME = 'phone_1_role_1';

async function fixUserEmailIndex() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));

  try {
    const indexes = await userModel.collection.indexes();
    const hasRoleScopedEmailIndex = indexes.some(
      (index) => index.name === ROLE_SCOPED_EMAIL_INDEX_NAME,
    );
    const hasLegacyEmailIndex = indexes.some(
      (index) => index.name === LEGACY_EMAIL_INDEX_NAME,
    );
    const hasRoleScopedPhoneIndex = indexes.some(
      (index) => index.name === ROLE_SCOPED_PHONE_INDEX_NAME,
    );
    const hasLegacyPhoneIndex = indexes.some(
      (index) => index.name === LEGACY_PHONE_INDEX_NAME,
    );

    if (!hasRoleScopedEmailIndex) {
      console.log('Creating role-scoped email index...');
      await userModel.collection.createIndex(
        { email: 1, role: 1 },
        { unique: true, name: ROLE_SCOPED_EMAIL_INDEX_NAME },
      );
    } else {
      console.log('Role-scoped email index already exists.');
    }

    if (!hasRoleScopedPhoneIndex) {
      console.log('Creating role-scoped phone index...');
      await userModel.collection.createIndex(
        { phone: 1, role: 1 },
        {
          unique: true,
          name: ROLE_SCOPED_PHONE_INDEX_NAME,
          partialFilterExpression: {
            phone: { $exists: true, $type: 'string', $gt: '' },
          },
        },
      );
    } else {
      console.log('Role-scoped phone index already exists.');
    }

    if (hasLegacyEmailIndex) {
      console.log('Dropping legacy global email index...');
      await userModel.collection.dropIndex(LEGACY_EMAIL_INDEX_NAME);
    } else {
      console.log('Legacy global email index was not found.');
    }

    if (hasLegacyPhoneIndex) {
      console.log('Dropping legacy global phone index...');
      await userModel.collection.dropIndex(LEGACY_PHONE_INDEX_NAME);
    } else {
      console.log('Legacy global phone index was not found.');
    }

    console.log('User email/phone indexes are ready.');
  } finally {
    await app.close();
  }
}

fixUserEmailIndex()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to update user email/phone indexes:', err);
    process.exit(1);
  });
