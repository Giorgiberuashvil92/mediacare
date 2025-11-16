/**
 * Script to create super admin user
 * Run this once to create the initial admin account
 *
 * Usage:
 * 1. Call POST /admin/create-superadmin endpoint
 * 2. Or run this script directly
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminService } from './admin.service';

async function createSuperAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);

  try {
    const result = await adminService.createSuperAdmin();
    console.log('✅ Super Admin created successfully!');
    console.log('📧 Email:', result.data.email);
    console.log('🔑 Password:', result.data.password);
    console.log('⚠️  Please change the password after first login');
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await app.close();
  }
}

// Uncomment to run directly
// createSuperAdmin();
