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
export class PatientGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🔒 PatientGuard - canActivate called');
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    console.log('🔒 PatientGuard - token extracted:', {
      hasToken: !!token,
      tokenLength: token?.length,
      url: request.url,
      method: request.method,
    });

    if (!token) {
      console.error('🔒 PatientGuard - No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload: { sub?: string; [key: string]: any } =
        await this.jwtService.verifyAsync(token);

      const subValue = payload.sub ? String(payload.sub) : '';
      console.log('PatientGuard - payload received:', {
        sub: payload.sub,
        subType: typeof payload.sub,
        subValue,
        subLength: subValue.length,
      });

      if (!payload.sub) {
        console.error('PatientGuard - Missing payload.sub');
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      const userId = this.normalizeUserIdFromTokenSub(payload.sub);

      console.log('PatientGuard - normalized userId:', {
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

      console.log('🔒 PatientGuard - Searching for user with ID:', userId);
      const user = await this.userModel.findById(userId);
      console.log('🔒 PatientGuard - User found:', {
        user: user ? 'exists' : 'null',
        userId: user?._id
          ? (user._id as mongoose.Types.ObjectId).toString()
          : 'null',
        role: user?.role,
      });

      if (!user || user.role !== UserRole.PATIENT) {
        console.error('🔒 PatientGuard - User not found or not a patient:', {
          userExists: !!user,
          role: user?.role,
          expectedRole: UserRole.PATIENT,
        });
        throw new UnauthorizedException(
          'Only patients can access this resource',
        );
      }

      const userIdString = (user._id as mongoose.Types.ObjectId).toString();
      console.log('PatientGuard - user found:', {
        userId: userIdString,
        role: user.role,
      });

      // Use normalized userId instead of payload.sub
      const requestUser: { sub: string; role: string } = {
        sub: userId,
        role: user.role,
      };
      (request as Request & { user: { sub: string; role: string } })['user'] =
        requestUser;

      console.log('PatientGuard - request.user set:', {
        sub: requestUser.sub,
        role: requestUser.role,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('PatientGuard error:', error);
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

  private normalizeUserIdFromTokenSub(sub: unknown): string {
    if (typeof sub === 'string') {
      return sub.trim();
    }

    if (sub instanceof mongoose.Types.ObjectId) {
      return sub.toString();
    }

    if (sub && typeof sub === 'object') {
      const doc = sub as { _id?: unknown; id?: unknown };
      const rawId = doc._id ?? doc.id;
      if (rawId instanceof mongoose.Types.ObjectId) {
        return rawId.toString();
      }
      if (typeof rawId === 'string') {
        return rawId.trim();
      }
    }

    return String(sub).trim();
  }
}
