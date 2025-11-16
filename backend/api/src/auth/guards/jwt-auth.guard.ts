/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      console.log('🔐 JwtAuthGuard - canActivate called');
      const request = context.switchToHttp().getRequest<Request>();
      const token = this.extractTokenFromHeader(request);

      console.log('🔐 JwtAuthGuard - token extracted:', {
        hasToken: !!token,
        tokenLength: token?.length,
        url: request.url,
        method: request.method,
      });

      if (!token) {
        console.error('🔐 JwtAuthGuard - No token provided');
        throw new UnauthorizedException('No token provided');
      }

      try {
        const payload = await this.jwtService.verifyAsync(token);
        console.log('🔐 JwtAuthGuard - token verified, payload:', {
          sub: payload.sub,
          subType: typeof payload.sub,
          payloadKeys: Object.keys(payload),
          payloadStringified: JSON.stringify(payload),
        });

        if (!payload.sub) {
          console.error('🔐 JwtAuthGuard - payload.sub is missing');
          throw new UnauthorizedException('Invalid token: missing user ID');
        }

        // Normalize payload.sub to ensure it's a string
        const normalizedPayload = {
          ...payload,
          sub: String(payload.sub).trim(),
        };

        console.log('🔐 JwtAuthGuard - normalized payload:', {
          sub: normalizedPayload.sub,
          subType: typeof normalizedPayload.sub,
          subLength: normalizedPayload.sub.length,
        });

        (request as any)['user'] = normalizedPayload;
        console.log('🔐 JwtAuthGuard - request.user set:', {
          user: (request as any)['user'],
          userSub: (request as any)['user']?.sub,
        });
      } catch (error) {
        console.error('🔐 JwtAuthGuard - token verification failed:', {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        throw new UnauthorizedException('Invalid token');
      }

      return true;
    } catch (error) {
      console.error('🔐 JwtAuthGuard - canActivate error:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
