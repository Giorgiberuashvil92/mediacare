import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    try {
      console.log('👤 CurrentUser decorator - START');
      const request = ctx.switchToHttp().getRequest();
      console.log('👤 CurrentUser decorator - request.user:', {
        user: request.user,
        userType: typeof request.user,
        userSub: request.user?.sub,
        userSubType: typeof request.user?.sub,
        userStringified: JSON.stringify(request.user),
      });

      if (!request.user) {
        console.error(
          '👤 CurrentUser decorator - request.user is null/undefined',
        );
        throw new Error('User not found in request');
      }

      if (!request.user.sub) {
        console.error(
          '👤 CurrentUser decorator - request.user.sub is null/undefined',
        );
        throw new Error('User sub not found in request.user');
      }

      console.log('👤 CurrentUser decorator - returning user:', request.user);
      return request.user;
    } catch (error) {
      console.error('👤 CurrentUser decorator - ERROR:', error);
      throw error;
    }
  },
);
