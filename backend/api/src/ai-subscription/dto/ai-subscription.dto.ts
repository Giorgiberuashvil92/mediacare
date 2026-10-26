import { IsIn } from 'class-validator';

export class CreateAiCheckoutDto {
  @IsIn(['standard', 'premium'])
  plan: 'standard' | 'premium';
}
