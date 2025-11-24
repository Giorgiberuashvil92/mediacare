import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
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
}
