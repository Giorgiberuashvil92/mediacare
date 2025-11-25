import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ShopCategory,
  ShopCategoryDocument,
  ShopCategoryType,
} from './schemas/shop-category.schema';
import {
  ShopProduct,
  ShopProductDocument,
  ShopProductType,
} from './schemas/shop-product.schema';

type CategoryLeanDocument = ShopCategory & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

type ProductLeanDocument = ShopProduct & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

type FormattedCategory = {
  id: string;
  name: string;
  slug: string;
  type: ShopCategoryType;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  parentCategory: string | null;
  order?: number;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  products?: FormattedProduct[];
};

type FormattedProduct = {
  id: string;
  name: string;
  description?: string;
  type: ShopProductType;
  category: string | null;
  price?: number;
  currency?: string;
  discountPercent?: number;
  stock?: number;
  unit?: string;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  order?: number;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(ShopCategory.name)
    private readonly categoryModel: Model<ShopCategoryDocument>,
    @InjectModel(ShopProduct.name)
    private readonly productModel: Model<ShopProductDocument>,
  ) {}

  private normalizeObjectId(
    value?: Types.ObjectId | string | null,
  ): Types.ObjectId | null {
    if (!value) {
      return null;
    }
    if (value instanceof Types.ObjectId) {
      return value;
    }
    return new Types.ObjectId(value);
  }

  private normalizeObjectIdToString(
    value?: Types.ObjectId | string | null,
  ): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
    return value;
  }

  private buildSlug(name: string) {
    return (
      name
        ?.toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9ა-ჰ\s-]/g, '')
        .replace(/\s+/g, '-') || ''
    );
  }

  private formatCategory(category: CategoryLeanDocument): FormattedCategory {
    return {
      id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      type: category.type,
      description: category.description,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      parentCategory: this.normalizeObjectIdToString(category.parentCategory),
      order: category.order,
      tags: category.tags || [],
      metadata: (category.metadata ?? {}) as Record<string, unknown>,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private formatProduct(product: ProductLeanDocument): FormattedProduct {
    return {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      type: product.type,
      category: this.normalizeObjectIdToString(product.category),
      price: product.price,
      currency: product.currency,
      discountPercent: product.discountPercent,
      stock: product.stock,
      unit: product.unit,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      imageUrl: product.imageUrl,
      order: product.order,
      tags: product.tags || [],
      metadata: (product.metadata ?? {}) as Record<string, unknown>,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = this.buildSlug(dto.name);
    const category = await this.categoryModel.create({
      ...dto,
      slug,
    });

    return {
      success: true,
      data: this.formatCategory(category.toObject() as CategoryLeanDocument),
    };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const updateData = {
      ...dto,
      ...(dto.name && { slug: this.buildSlug(dto.name) }),
    };

    const category = await this.categoryModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean<CategoryLeanDocument>();

    if (!category) {
      throw new Error('კატეგორია ვერ მოიძებნა');
    }

    return {
      success: true,
      data: this.formatCategory(category),
    };
  }

  async deleteCategory(id: string) {
    const category = await this.categoryModel
      .findByIdAndDelete(id)
      .lean<CategoryLeanDocument>();

    if (!category) {
      throw new Error('კატეგორია ვერ მოიძებნა');
    }

    await this.productModel.updateMany(
      { category: category._id },
      { $set: { category: null } },
    );

    return {
      success: true,
      message: 'კატეგორია წარმატებით წაიშალა',
    };
  }

  async getCategories(query: QueryCategoriesDto) {
    const { type, search, isActive, parentCategory } = query;
    const filter: FilterQuery<ShopCategoryDocument> = {};

    if (type) {
      filter.type = type;
    }

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    if (parentCategory) {
      filter.parentCategory = new Types.ObjectId(parentCategory);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const categories = (await this.categoryModel
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean()) as unknown as CategoryLeanDocument[];

    let productsByCategory: Record<string, FormattedProduct[]> = {};

    if (query.includeProducts) {
      const categoryIds = categories.map((category) => category._id);

      if (categoryIds.length) {
        const products = (await this.productModel
          .find({
            category: { $in: categoryIds },
            ...(typeof isActive === 'boolean'
              ? { isActive }
              : { isActive: true }),
          })
          .sort({ order: 1, createdAt: -1 })
          .lean()) as unknown as ProductLeanDocument[];

        productsByCategory = products.reduce(
          (acc, product) => {
            const key =
              this.normalizeObjectIdToString(product.category) ||
              'uncategorized';
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(this.formatProduct(product));
            return acc;
          },
          {} as Record<string, FormattedProduct[]>,
        );
      }
    }

    const formatted = categories.map((category) => {
      const formattedCategory = this.formatCategory(category);
      if (query.includeProducts) {
        formattedCategory.products =
          productsByCategory[formattedCategory.id] || [];
      }
      return formattedCategory;
    });

    return {
      success: true,
      data: formatted,
    };
  }

  async createProduct(dto: CreateProductDto) {
    const product = await this.productModel.create({
      ...dto,
      category: dto.category ? new Types.ObjectId(dto.category) : null,
    });

    return {
      success: true,
      data: this.formatProduct(product.toObject() as ProductLeanDocument),
    };
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const updatedRaw = await this.productModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          ...(dto.category && { category: new Types.ObjectId(dto.category) }),
        },
        { new: true },
      )
      .lean();
    const product = await this.productModel
      .findByIdAndUpdate(id, updatedRaw, { new: true })
      .lean<ProductLeanDocument | null>();

    if (!product) {
      throw new Error('პროდუქტი ვერ მოიძებნა');
    }

    return {
      success: true,
      data: this.formatProduct(product),
    };
  }

  async deleteProduct(id: string) {
    const product = (await this.productModel
      .findByIdAndDelete(id)
      .lean()) as unknown as ProductLeanDocument | null;

    if (!product) {
      throw new Error('პროდუქტი ვერ მოიძებნა');
    }

    return {
      success: true,
      message: 'პროდუქტი წარმატებით წაიშალა',
    };
  }

  async getProducts(query: QueryProductsDto) {
    const { type, category, search, isActive, page = 1, limit = 20 } = query;
    const filter: FilterQuery<ShopProductDocument> = {};

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = new Types.ObjectId(category);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }

    const [rawItems, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);
    const items = rawItems as unknown as ProductLeanDocument[];

    return {
      success: true,
      data: {
        items: items.map((product) => this.formatProduct(product)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getOverview() {
    const [rawLaboratory, rawEquipmentCategories, rawLaboratoryCategories] =
      await Promise.all([
        this.productModel
          .find({
            type: ShopProductType.LABORATORY,
            isActive: true,
          })
          .sort({ order: 1, createdAt: -1 })
          .limit(20)
          .lean(),
        this.categoryModel
          .find({
            type: ShopCategoryType.EQUIPMENT,
            isActive: true,
          })
          .sort({ order: 1, createdAt: -1 })
          .lean(),
        this.categoryModel
          .find({
            type: ShopCategoryType.LABORATORY,
            isActive: true,
          })
          .sort({ order: 1, createdAt: -1 })
          .lean(),
      ]);
    const laboratoryProducts =
      rawLaboratory as unknown as ProductLeanDocument[];
    const equipmentCategories =
      rawEquipmentCategories as unknown as CategoryLeanDocument[];
    const laboratoryCategories =
      rawLaboratoryCategories as unknown as CategoryLeanDocument[];

    const equipmentCategoryIds = equipmentCategories.map(
      (category) => category._id,
    );
    const laboratoryCategoryIds = laboratoryCategories.map(
      (category) => category._id,
    );

    let equipmentProductsByCategory: Record<string, FormattedProduct[]> = {};
    if (equipmentCategoryIds.length) {
      const equipmentProducts = (await this.productModel
        .find({
          type: ShopProductType.EQUIPMENT,
          isActive: true,
          category: { $in: equipmentCategoryIds },
        })
        .sort({ order: 1, createdAt: -1 })
        .lean()) as unknown as ProductLeanDocument[];

      equipmentProductsByCategory = equipmentProducts.reduce(
        (acc: Record<string, FormattedProduct[]>, product) => {
          const key =
            this.normalizeObjectIdToString(product.category) || 'uncategorized';
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(this.formatProduct(product));
          return acc;
        },
        {} as Record<string, FormattedProduct[]>,
      );
    }

    let laboratoryProductsByCategory: Record<string, FormattedProduct[]> = {};
    if (laboratoryCategoryIds.length) {
      const labProducts = (await this.productModel
        .find({
          type: ShopProductType.LABORATORY,
          isActive: true,
          category: { $in: laboratoryCategoryIds },
        })
        .sort({ order: 1, createdAt: -1 })
        .lean()) as unknown as ProductLeanDocument[];

      laboratoryProductsByCategory = labProducts.reduce(
        (acc: Record<string, FormattedProduct[]>, product) => {
          const key =
            this.normalizeObjectIdToString(product.category) || 'uncategorized';
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(this.formatProduct(product));
          return acc;
        },
        {} as Record<string, FormattedProduct[]>,
      );
    }

    const formattedEquipmentCategories = equipmentCategories.map((category) => {
      const formattedCategory = this.formatCategory(category);
      formattedCategory.products =
        equipmentProductsByCategory[formattedCategory.id] || [];
      return formattedCategory;
    });

    const formattedLaboratoryCategories = laboratoryCategories.map(
      (category) => {
        const formattedCategory = this.formatCategory(category);
        formattedCategory.products =
          laboratoryProductsByCategory[formattedCategory.id] || [];
        return formattedCategory;
      },
    );

    return {
      success: true,
      data: {
        laboratoryProducts: laboratoryProducts.map((product) =>
          this.formatProduct(product),
        ),
        laboratoryCategories: formattedLaboratoryCategories,
        equipmentCategories: formattedEquipmentCategories,
      },
    };
  }
}
