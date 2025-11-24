import { Controller, Get, Query } from '@nestjs/common';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('overview')
  async getOverview() {
    return this.shopService.getOverview();
  }

  @Get('categories')
  async getCategories(@Query() query: QueryCategoriesDto) {
    return this.shopService.getCategories(query);
  }

  @Get('products')
  async getProducts(@Query() query: QueryProductsDto) {
    return this.shopService.getProducts(query);
  }
}
