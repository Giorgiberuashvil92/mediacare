import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from '../upload/upload.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  async getProfile(@CurrentUser() user: { sub: string }) {
    console.log('📸 [ProfileController] getProfile called for user:', user.sub);
    const result = await this.profileService.getProfile(user.sub);
    console.log('📸 [ProfileController] Returning profile:', JSON.stringify(result, null, 2));
    return result;
  }

  @Put()
  async updateProfile(
    @CurrentUser() user: { sub: string },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.sub, updateProfileDto);
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileImage(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate and save image
    const filePath = this.uploadService.saveImage(file);

    // Update user profile image
    return this.profileService.updateProfileImage(user.sub, filePath);
  }

  @Put('password')
  async changePassword(
    @CurrentUser() user: { sub: string },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.profileService.changePassword(user.sub, changePasswordDto);
  }
}
