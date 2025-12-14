import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ShopService } from './shop.service';

@Controller('admin/shop')
@UseGuards(JwtAuthGuard)
export class ShopAdminController {
  constructor(private readonly shopService: ShopService) {}

  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.shopService.createCategory(dto);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.shopService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.shopService.deleteCategory(id);
  }

  @Post('products')
  async createProduct(@Body() dto: CreateProductDto) {
    return this.shopService.createProduct(dto);
  }

  @Patch('products/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.shopService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    return this.shopService.deleteProduct(id);
  }

  @Post('categories/query')
  async queryCategories(@Body() query: QueryCategoriesDto) {
    return this.shopService.getCategories(query);
  }

  @Post('products/query')
  async queryProducts(@Body() query: QueryProductsDto) {
    return this.shopService.getProducts(query);
  }

  // Clinic endpoints
  @Post('clinics')
  async createClinic(@Body() dto: CreateClinicDto) {
    return this.shopService.createClinic(dto);
  }

  @Get('clinics')
  async getClinics(@Query('isActive') isActive?: string) {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.shopService.findAllClinics(isActiveBool);
  }

  @Get('clinics/:id')
  async getClinicById(@Param('id') id: string) {
    return this.shopService.findClinicById(id);
  }

  @Patch('clinics/:id')
  async updateClinic(@Param('id') id: string, @Body() dto: UpdateClinicDto) {
    return this.shopService.updateClinic(id, dto);
  }

  @Delete('clinics/:id')
  async deleteClinic(@Param('id') id: string) {
    return this.shopService.deleteClinic(id);
  }
}
