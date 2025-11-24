import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ShopCategoryType } from '../schemas/shop-category.schema';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEnum(ShopCategoryType)
  type: ShopCategoryType;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsMongoId()
  parentCategory?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
