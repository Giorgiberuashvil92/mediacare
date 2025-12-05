import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTermDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
