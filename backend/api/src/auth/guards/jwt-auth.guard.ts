/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import * as mongoose from 'mongoose';

function normalizeJwtSubject(sub: unknown): string | null {
  if (!sub) {
    return null;
  }

  if (typeof sub === 'string') {
    const trimmed = sub.trim();
    return trimmed || null;
  }

  if (sub instanceof mongoose.Types.ObjectId) {
    return sub.toString();
  }

  if (typeof sub === 'object') {
    const doc = sub as { _id?: unknown; id?: unknown };
    const rawId = doc._id ?? doc.id;
    if (rawId instanceof mongoose.Types.ObjectId) {
      return rawId.toString();
    }
    if (typeof rawId === 'string') {
      const trimmed = rawId.trim();
      return trimmed || null;
    }
  }

  const fallback = String(sub).trim();
  return fallback && fallback !== '[object Object]' ? fallback : null;
}

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

        const normalizedSub = normalizeJwtSubject(payload.sub);
        if (!normalizedSub) {
          console.error(
            '🔐 JwtAuthGuard - payload.sub could not be normalized',
          );
          throw new UnauthorizedException('Invalid token: missing user ID');
        }

        const normalizedPayload = {
          ...payload,
          sub: normalizedSub,
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
