import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import * as mongoose from 'mongoose';
import { User, UserDocument, UserRole } from '../../schemas/user.schema';

// Decorator to set allowed roles
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: mongoose.Model<UserDocument>,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access (fallback to JwtAuthGuard)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    console.log('🔒 RolesGuard - canActivate called', {
      requiredRoles,
      url: context.switchToHttp().getRequest<Request>().url,
    });

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      console.error('🔒 RolesGuard - No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload: { sub?: string; [key: string]: any } =
        await this.jwtService.verifyAsync(token);

      if (!payload.sub) {
        console.error('RolesGuard - Missing payload.sub');
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      const userId = String(payload.sub).trim();

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error('Invalid user ID format in token:', userId);
        throw new UnauthorizedException(
          'Invalid token: invalid user ID format',
        );
      }

      console.log('🔒 RolesGuard - Searching for user with ID:', userId);
      const user = await this.userModel.findById(userId);
      console.log('🔒 RolesGuard - User found:', {
        user: user ? 'exists' : 'null',
        userId: user?._id
          ? (user._id as mongoose.Types.ObjectId).toString()
          : 'null',
        role: user?.role,
      });

      if (!user) {
        console.error('🔒 RolesGuard - User not found');
        throw new UnauthorizedException('User not found');
      }

      // Check if user's role is in the required roles
      if (!requiredRoles.includes(user.role)) {
        console.error('🔒 RolesGuard - Insufficient permissions:', {
          userRole: user.role,
          requiredRoles,
        });
        throw new UnauthorizedException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}`,
        );
      }

      const userIdString = (user._id as mongoose.Types.ObjectId).toString();
      console.log('RolesGuard - user authorized:', {
        userId: userIdString,
        role: user.role,
        requiredRoles,
      });

      // Set user in request
      const requestUser: { sub: string; role: string } = {
        sub: userId,
        role: user.role,
      };
      (request as Request & { user: { sub: string; role: string } })['user'] =
        requestUser;

      console.log('RolesGuard - request.user set:', {
        sub: requestUser.sub,
        role: requestUser.role,
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('RolesGuard error:', error);
      throw new UnauthorizedException(
        'Invalid token or insufficient permissions',
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
