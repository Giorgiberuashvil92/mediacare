import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MedicineShopOverview,
  ShopCategory,
  ShopProduct,
  apiService,
} from "../_services/api";
import Search from "../components/ui/search";

const fallbackOverview: MedicineShopOverview = {
  laboratoryCategories: [],
  laboratoryProducts: [],
  equipmentCategories: [],
};

const Medicine = () => {
  const [overview, setOverview] = useState<MedicineShopOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

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

  const { laboratoryProducts } = overview || fallbackOverview;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 20,
          }}
        >
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#0F172A" }}>
            მედიკამენტების მაღაზია
          </Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Feather name="shopping-cart" size={24} color="#0F172A" />
          </View>
        </View>

        <Search />

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

            <LaboratorySection products={laboratoryProducts} onRefresh={loadOverview} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
      <Text style={{ fontSize: 18, fontWeight: "600", color: "#0F172A" }}>
        {title}
      </Text>
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

const LaboratorySection = ({
  products,
  onRefresh,
}: {
  products: ShopProduct[];
  onRefresh: () => void;
}) => {
  const topProducts = useMemo(() => products.slice(0, 6), [products]);

  return (
    <View style={{ paddingVertical: 16 }}>
      <SectionHeader
        title="ლაბორატორია"
        subtitle="ანალიზები და ტესტები, მზად თუ pickup-სთვის"
        actionLabel="განახლება"
        onActionPress={onRefresh}
      />

      {topProducts.length === 0 ? (
        <EmptyState text="ლაბორატორიის პროდუქტები ჯერ არ არის დამატებული" />
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
            <LaboratoryProductCard key={product.id} product={product} />
          ))}
        </View>
      )}
    </View>
  );
};

const LaboratoryProductCard = ({ product }: { product: ShopProduct }) => (
  <View
    style={{
      width: "47%",
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 14,
      shadowColor: "#0F172A",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
      gap: 10,
    }}
  >
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#0F172A",
        }}
        numberOfLines={2}
      >
        {product.name}
      </Text>
      {product.description && (
        <Text
          style={{ fontSize: 13, color: "#6B7280" }}
          numberOfLines={2}
        >
          {product.description}
        </Text>
      )}
    </View>

    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0EA5E9" }}>
          ₾{product.price ?? 0}
        </Text>
        {product.discountPercent ? (
          <View
            style={{
              marginTop: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: "#FFF1E6",
            }}
          >
            <Text style={{ color: "#EA580C", fontSize: 12, fontWeight: "600" }}>
              -{product.discountPercent}%
            </Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0EA5E9",
        }}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  </View>
);



export const EquipmentCategoryCard = ({ category }: { category: ShopCategory }) => (
  <View
    style={{
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
      shadowColor: "#0F172A",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
      gap: 12,
    }}
  >
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      {category.imageUrl ? (
        <Image
          source={{ uri: category.imageUrl }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 14,
            backgroundColor: "#F1F5F9",
          }}
        />
      ) : (
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 14,
            backgroundColor: "#E2E8F0",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="box" size={24} color="#94A3B8" />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>
          {category.name}
        </Text>
        {category.description && (
          <Text style={{ color: "#64748B" }} numberOfLines={2}>
            {category.description}
          </Text>
        )}
      </View>
    </View>

    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {(category.products || []).slice(0, 4).map((product) => (
        <View
          key={product.id}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: "#ECFEFF",
          }}
        >
          <Text style={{ color: "#0F172A", fontWeight: "600" }}>
            {product.name}
          </Text>
        </View>
      ))}
      {(category.products || []).length > 4 && (
        <View
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: "#E0F2FE",
          }}
        >
          <Text style={{ color: "#0F172A", fontWeight: "600" }}>
            +{(category.products || []).length - 4} პროდუქტი
          </Text>
        </View>
      )}
    </View>
  </View>
);

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

