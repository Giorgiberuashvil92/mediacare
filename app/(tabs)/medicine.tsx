import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Search from "../components/ui/search";
import { useCart } from "../contexts/CartContext";
import {
  MedicineShopOverview,
  ShopCategory,
  ShopProduct,
  apiService,
} from "../services/api";

const fallbackOverview: MedicineShopOverview = {
  laboratoryProducts: [],
  laboratoryCategories: [],
  equipmentCategories: [],
};

const PRODUCT_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1584985598961-14e7d5898678?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1582711012124-a56cf560d5b1?auto=format&fit=crop&w=500&q=80",
];

const CATEGORY_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1585505000163-0ac69e3620b5?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=500&q=80",
];

const getProductImage = (product: ShopProduct) => {
  const metadataImage =
    (product.metadata as Record<string, any> | undefined)?.imageUrl ||
    (product.metadata as Record<string, any> | undefined)?.image;
  return (
    (product as Record<string, any>).imageUrl ||
    metadataImage ||
    PRODUCT_PLACEHOLDERS[Math.abs(product.id?.charCodeAt(0) || 0) % PRODUCT_PLACEHOLDERS.length]
  );
};

const getCategoryImage = (category: ShopCategory) => {
  const metadataImage =
    (category.metadata as Record<string, any> | undefined)?.imageUrl ||
    (category.metadata as Record<string, any> | undefined)?.image;
  return (
    category.imageUrl ||
    metadataImage ||
    CATEGORY_PLACEHOLDERS[
      Math.abs(category.id?.charCodeAt(0) || 0) % CATEGORY_PLACEHOLDERS.length
    ]
  );
};

const Medicine = () => {
  const [overview, setOverview] = useState<MedicineShopOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLabCategory, setSelectedLabCategory] = useState<string>("all");
  const { addToCart } = useCart();

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (
      selectedLabCategory !== "all" &&
      !(overview?.laboratoryCategories || []).some(
        (category) => category.id === selectedLabCategory,
      )
    ) {
      setSelectedLabCategory("all");
    }
  }, [overview?.laboratoryCategories, selectedLabCategory]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMedicineShopOverview();
      setOverview(response.data);
    } catch (err) {
      console.error("Medicine shop load failed", err);
      setError("მონაცემების ჩატვირთვა ვერ მოხერხდა");
      setOverview(fallbackOverview);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadOverview();
    } finally {
      setRefreshing(false);
    }
  };

  const handleBuyProduct = (product: ShopProduct) => {
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price || 0,
        weight: product.unit || "Custom pack",
        image: getProductImage(product),
      },
      1,
    );
    router.push("/screens/medicine/cart");
  };

  const {
    laboratoryProducts,
    laboratoryCategories,
    equipmentCategories,
  } = overview || fallbackOverview;

  const filteredLaboratoryProducts = useMemo(() => {
    if (selectedLabCategory === "all") {
      return laboratoryProducts;
    }
    return laboratoryProducts.filter(
      (product) => product.category === selectedLabCategory,
    );
  }, [laboratoryProducts, selectedLabCategory]);

  const activeLabCategoryMeta = useMemo(() => {
    if (selectedLabCategory === "all") {
      return null;
    }
    return laboratoryCategories.find(
      (category) => category.id === selectedLabCategory,
    );
  }, [laboratoryCategories, selectedLabCategory]);

  const totalProducts =
    laboratoryProducts.length +
    equipmentCategories.reduce(
      (sum, category) => sum + (category.products?.length || 0),
      0,
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#20BEB8" />
        }
      >
        <HeroHeader totalProducts={totalProducts} />
        <View style={{ marginTop: -32, paddingHorizontal: 16 }}>
          <Search />
        </View>

        {loading ? (
          <View
            style={{
              paddingVertical: 80,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color="#20BEB8" />
            <Text style={{ marginTop: 12, color: "#94A3B8" }}>
              იტვირთება მედიკამენტების სია...
            </Text>
          </View>
        ) : (
          <>
            {error && (
              <View
                style={{
                  marginHorizontal: 16,
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "#FEF2F2",
                }}
              >
                <Text style={{ color: "#B91C1C", fontWeight: "500" }}>
                  {error}
                </Text>
                <TouchableOpacity onPress={loadOverview}>
                  <Text
                    style={{
                      color: "#20BEB8",
                      marginTop: 4,
                      fontWeight: "600",
                    }}
                  >
                    თავიდან ცდა
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Spacing />
            <CategoryHighlights categories={equipmentCategories} />
            <Spacing size={12} />
            <PromoBanner />
            <Spacing />
            {laboratoryCategories.length > 0 && (
              <>
                <LaboratoryCategoryFilter
                  categories={laboratoryCategories}
                  selectedCategory={selectedLabCategory}
                  onSelect={setSelectedLabCategory}
                />
                <Spacing size={8} />
              </>
            )}
            <LaboratorySection
              products={filteredLaboratoryProducts}
              onRefresh={loadOverview}
              onBuy={handleBuyProduct}
              activeCategoryLabel={activeLabCategoryMeta?.name || undefined}
            />
            <Spacing />
            <EquipmentSection categories={equipmentCategories} />
            <Spacing size={24} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Spacing = ({ size = 20 }: { size?: number }) => (
  <View style={{ height: size }} />
);

const HeroHeader = ({ totalProducts }: { totalProducts: number }) => (
  <View
    style={{
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 80,
      backgroundColor: "#0F172A",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    }}
  >
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View>
        <Text style={{ color: "#CBD5F5", fontSize: 14 }}>მაღაზია</Text>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: "700",
            marginTop: 4,
          }}
        >
          მედიკამენტები & ლაბორატორია
        </Text>
      </View>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "#1F2937",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Feather name="shopping-cart" size={20} color="#FFFFFF" />
      </View>
    </View>
    <View
      style={{
        marginTop: 20,
        flexDirection: "row",
        gap: 12,
      }}
    >
      <HeroStat title="პროდუქტები" value={`${totalProducts}+`} />
      <HeroStat title="ლაბორატორია" value="24/7" />
      <HeroStat title="სიჩქარე" value="15წთ+" />
    </View>
  </View>
);

const HeroStat = ({ title, value }: { title: string; value: string }) => (
  <View
    style={{
      flex: 1,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
      backgroundColor: "rgba(255,255,255,0.08)",
    }}
  >
    <Text style={{ color: "#E2E8F0", fontSize: 12 }}>{title}</Text>
    <Text
      style={{
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
        marginTop: 4,
      }}
    >
      {value}
    </Text>
  </View>
);

const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) => (
  <View
    style={{
      paddingHorizontal: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    }}
  >
    <View style={{ flex: 1, paddingRight: 12 }}>
     <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
       <Text style={{ fontSize: 18, fontWeight: "600", color: "#0F172A" }}>
        {title}
      </Text>
      <TouchableOpacity onPress={onActionPress}> ყველას ნახვა </TouchableOpacity>
     </View>
      {subtitle && (
        <Text style={{ color: "#64748B", marginTop: 4 }}>{subtitle}</Text>
      )}
    </View>
    {actionLabel && onActionPress && (
      <TouchableOpacity onPress={onActionPress}>
        <Text style={{ color: "#20BEB8", fontWeight: "600" }}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const CategoryHighlights = ({ categories }: { categories: ShopCategory[] }) => {
  const highlighted = categories.slice(0, 8);
  if (!highlighted.length) return null;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <SectionHeader
        title="კატეგორიების ჰიროები"
        subtitle="შეარჩიე სწრაფად მოწყობილობა ან სერვისი"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
      >
        {highlighted.map((category) => (
          <View
            key={category.id}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 16,
              backgroundColor: "#ECFEFF",
              borderWidth: 1,
              borderColor: "#99F6E4",
            }}
          >
            <Text style={{ color: "#0F172A", fontWeight: "600" }}>{category.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const PromoBanner = () => (
  <View
    style={{
      marginHorizontal: 16,
      borderRadius: 20,
      padding: 20,
      backgroundColor: "#DCFCE7",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#14532D" }}>
        სწრაფი მომსახურება
      </Text>
      
    </View>
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#BBF7D0",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Feather name="clock" size={22} color="#166534" />
    </View>
  </View>
);

const LaboratoryCategoryFilter = ({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: ShopCategory[];
  selectedCategory: string;
  onSelect: (id: string) => void;
}) => {
  if (!categories.length) {
    return null;
  }

  const orderedCategories = [...categories].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: "#0F172A",
          marginBottom: 10,
        }}
      >
        ლაბორატორიის კატეგორიები
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <CategoryChip
          label="ყველა"
          isActive={selectedCategory === "all"}
          onPress={() => onSelect("all")}
        />
        {orderedCategories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            isActive={selectedCategory === category.id}
            onPress={() => onSelect(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const CategoryChip = ({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isActive ? "#0EA5E9" : "#E2E8F0",
      backgroundColor: isActive ? "#0EA5E9" : "#F8FAFC",
    }}
  >
    <Text
      style={{
        color: isActive ? "#FFFFFF" : "#0F172A",
        fontWeight: "600",
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const LaboratorySection = ({
  products,
  onRefresh,
  onBuy,
  activeCategoryLabel,
}: {
  products: ShopProduct[];
  onRefresh: () => void;
  onBuy: (product: ShopProduct) => void;
  activeCategoryLabel?: string;
}) => {
  const topProducts = useMemo(() => products.slice(0, 6), [products]);

  return (
    <View style={{ paddingVertical: 16 }}>
      <SectionHeader
        title="ლაბორატორია"
        subtitle={
          activeCategoryLabel
            ? `შერჩეული კატეგორია: ${activeCategoryLabel}`
            : "ანალიზები და ტესტები, მზად pickup-სთვის"
        }
        actionLabel="განახლება"
        onActionPress={onRefresh}
      />

      {topProducts.length === 0 ? (
        <EmptyState
          text={
            activeCategoryLabel
              ? `${activeCategoryLabel} კატეგორიაში პროდუქტები ჯერ არ არის`
              : "ლაბორატორიის პროდუქტები ჯერ არ არის დამატებული"
          }
        />
      ) : (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            paddingHorizontal: 16,
          }}
        >
          {topProducts.map((product) => (
            <LaboratoryProductCard key={product.id} product={product} onBuy={onBuy} />
          ))}
        </View>
      )}
    </View>
  );
};

const LaboratoryProductCard = ({
  product,
  onBuy,
}: {
  product: ShopProduct;
  onBuy: (product: ShopProduct) => void;
}) => {
  const heroImage = getProductImage(product);
  return (
    <View
      style={{
        width: "47%",
        borderRadius: 22,
        padding: 1,
        backgroundColor: "#20BEB8",
      }}
    >
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          padding: 16,
          minHeight: 220,
          shadowColor: "#0F172A",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        }}
      >
        <View style={{ marginBottom: 12 }}>
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={{
                width: "100%",
                height: 110,
                borderRadius: 16,
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 110,
                borderRadius: 16,
                backgroundColor: "#ECFEFF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="image" size={22} color="#20BEB8" />
            </View>
          )}
        </View>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#0F172A",
                marginBottom: 6,
              }}
              numberOfLines={2}
            >
              {product.name}
            </Text>
            {product.description && (
              <Text
                style={{ fontSize: 13, color: "#64748B", marginBottom: 12 }}
                numberOfLines={2}
              >
                {product.description}
              </Text>
            )}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#20BEB8" }}>
                ₾{product.price ?? 0}
              </Text>
              {product.discountPercent ? (
                <Text style={{ color: "#F97316", fontSize: 12 }}>
                  -{product.discountPercent}% აქცია
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#20BEB8",
              }}
              onPress={() => onBuy(product)}
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const EquipmentSection = ({ categories }: { categories: ShopCategory[] }) => (
  <View style={{ paddingVertical: 16 }}>
    <SectionHeader
      title="ექუიფმენთი და მოწყობილობები"
      subtitle="კატეგორიები და სიის სწრაფი ფილტრი"
    />

    {categories.length === 0 ? (
      <EmptyState text="ექუიფმენთის კატეგორიები ჯერ არ არის დამატებული" />
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}
      >
        {categories.map((category) => (
          <EquipmentCategoryCard key={category.id} category={category} />
        ))}
      </ScrollView>
    )}
  </View>
);

const EquipmentCategoryCard = ({ category }: { category: ShopCategory }) => {
  const heroImage = getCategoryImage(category);
  return (
    <View
      style={{
        width: 280,
        borderRadius: 26,
        padding: 1,
        backgroundColor: "#0EA5E9",
      }}
    >
      <View
        style={{
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
          padding: 16,
          shadowColor: "#0F172A",
          shadowOpacity: 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <View style={{ marginBottom: 12 }}>
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={{ width: "100%", height: 120, borderRadius: 18 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 120,
                borderRadius: 18,
                backgroundColor: "#E0F2FE",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="box" size={28} color="#0EA5E9" />
            </View>
          )}
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#0F172A" }}>
            {category.name}
          </Text>
          {category.description && (
            <Text style={{ color: "#64748B", marginTop: 4 }} numberOfLines={2}>
              {category.description}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(category.products || []).slice(0, 4).map((product) => (
            <View
              key={product.id}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: "#F1F5F9",
              }}
            >
              <Text style={{ color: "#0F172A" }}>{product.name}</Text>
            </View>
          ))}
          {(category.products || []).length > 4 && (
            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: "#ECFEFF",
              }}
            >
              <Text style={{ color: "#0F172A" }}>
                +{(category.products || []).length - 4} პროდუქტი
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <View
    style={{
      marginHorizontal: 16,
      marginTop: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: "#F8FAFC",
      alignItems: "center",
    }}
  >
    <Text style={{ color: "#94A3B8" }}>{text}</Text>
  </View>
);

export default Medicine;
