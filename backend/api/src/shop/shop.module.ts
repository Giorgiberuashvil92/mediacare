import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Clinic, ClinicSchema } from './schemas/clinic.schema';
import {
  ShopCategory,
  ShopCategorySchema,
} from './schemas/shop-category.schema';
import { ShopProduct, ShopProductSchema } from './schemas/shop-product.schema';
import { ShopAdminController } from './shop.admin.controller';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopCategory.name, schema: ShopCategorySchema },
      { name: ShopProduct.name, schema: ShopProductSchema },
      { name: Clinic.name, schema: ClinicSchema },
    ]),
  ],
  controllers: [ShopController, ShopAdminController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
