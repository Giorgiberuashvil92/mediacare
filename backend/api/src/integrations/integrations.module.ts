import { Global, Module } from '@nestjs/common';
import { MisAuthService } from './mis-auth.service';

@Global()
@Module({
  providers: [MisAuthService],
  exports: [MisAuthService],
})
export class IntegrationsModule {}
