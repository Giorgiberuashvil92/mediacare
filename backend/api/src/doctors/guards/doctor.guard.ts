import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import * as mongoose from 'mongoose';
import { User, UserDocument, UserRole } from '../../schemas/user.schema';

@Injectable()
export class DoctorGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🔒 DoctorGuard - canActivate called');
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    console.log('🔒 DoctorGuard - token extracted:', {
      hasToken: !!token,
      tokenLength: token?.length,
      url: request.url,
      method: request.method,
    });

    if (!token) {
      console.error('🔒 DoctorGuard - No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload: { sub?: string; [key: string]: any } =
        await this.jwtService.verifyAsync(token);

      const subValue = payload.sub ? String(payload.sub) : '';
      console.log('DoctorGuard - payload received:', {
        sub: payload.sub,
        subType: typeof payload.sub,
        subValue,
        subLength: subValue.length,
      });

      if (!payload.sub) {
        console.error('DoctorGuard - Missing payload.sub');
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      const userId = String(payload.sub).trim();

      console.log('DoctorGuard - normalized userId:', {
        userId,
        userIdType: typeof userId,
        userIdLength: userId.length,
        isValid: mongoose.Types.ObjectId.isValid(userId),
        matchesRegex: /^[0-9a-fA-F]{24}$/.test(userId),
      });

      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error(
          'Invalid user ID format in token:',
          userId,
          'Type:',
          typeof userId,
          'Length:',
          userId?.length,
        );
        throw new UnauthorizedException(
          'Invalid token: invalid user ID format',
        );
      }

      console.log('🔒 DoctorGuard - Searching for user with ID:', userId);
      const user = await this.userModel.findById(userId);
      console.log('🔒 DoctorGuard - User found:', {
        user: user ? 'exists' : 'null',
        userId: user?._id
          ? (user._id as mongoose.Types.ObjectId).toString()
          : 'null',
        role: user?.role,
      });

      if (!user || user.role !== UserRole.DOCTOR) {
        console.error('🔒 DoctorGuard - User not found or not a doctor:', {
          userExists: !!user,
          role: user?.role,
          expectedRole: UserRole.DOCTOR,
        });
        throw new UnauthorizedException(
          'Only doctors can access this resource',
        );
      }

      const userIdString = (user._id as mongoose.Types.ObjectId).toString();
      console.log('DoctorGuard - user found:', {
        userId: userIdString,
        role: user.role,
      });

      // Use normalized userId instead of payload.sub
      const requestUser: { sub: string; role: string } = {
        sub: userId,
        role: user.role,
      };

      // Ensure request.user is properly set
      (request as Request & { user: { sub: string; role: string } })['user'] =
        requestUser;

      console.log('DoctorGuard - request.user set:', {
        sub: requestUser.sub,
        role: requestUser.role,
        userIdLength: requestUser.sub.length,
        userIdIsValid: mongoose.Types.ObjectId.isValid(requestUser.sub),
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('DoctorGuard error:', error);
      throw new UnauthorizedException(
        'Invalid token or insufficient permissions',
      );
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
