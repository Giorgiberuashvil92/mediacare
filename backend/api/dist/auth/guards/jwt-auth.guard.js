"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async canActivate(context) {
        try {
            console.log('🔐 JwtAuthGuard - canActivate called');
            const request = context.switchToHttp().getRequest();
            const token = this.extractTokenFromHeader(request);
            console.log('🔐 JwtAuthGuard - token extracted:', {
                hasToken: !!token,
                tokenLength: token?.length,
                url: request.url,
                method: request.method,
            });
            if (!token) {
                console.error('🔐 JwtAuthGuard - No token provided');
                throw new common_1.UnauthorizedException('No token provided');
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
                    throw new common_1.UnauthorizedException('Invalid token: missing user ID');
                }
                const normalizedPayload = {
                    ...payload,
                    sub: String(payload.sub).trim(),
                };
                console.log('🔐 JwtAuthGuard - normalized payload:', {
                    sub: normalizedPayload.sub,
                    subType: typeof normalizedPayload.sub,
                    subLength: normalizedPayload.sub.length,
                });
                request['user'] = normalizedPayload;
                console.log('🔐 JwtAuthGuard - request.user set:', {
                    user: request['user'],
                    userSub: request['user']?.sub,
                });
            }
            catch (error) {
                console.error('🔐 JwtAuthGuard - token verification failed:', {
                    error,
                    errorMessage: error instanceof Error ? error.message : String(error),
                    errorStack: error instanceof Error ? error.stack : undefined,
                });
                throw new common_1.UnauthorizedException('Invalid token');
            }
            return true;
        }
        catch (error) {
            console.error('🔐 JwtAuthGuard - canActivate error:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map