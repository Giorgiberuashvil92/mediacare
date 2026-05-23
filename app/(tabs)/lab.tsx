import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MedicineShopOverview,
  ShopProduct,
  apiService,
} from "../_services/api";

const fallbackOverview: MedicineShopOverview = {
  laboratoryCategories: [],
  laboratoryProducts: [],
  equipmentCategories: [],
  equipmentProducts: [],
};

const Lab = () => {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [overview, setOverview] = useState<MedicineShopOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"laboratory" | "immunological">(
    "laboratory",
  );
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (params.tab === "laboratory") {
      setActiveTab("laboratory");
      setSelectedCategory(null);
      return;
    }
    if (params.tab === "immunological") {
      setActiveTab("immunological");
      setSelectedCategory(null);
    }
  }, [params.tab]);

  // უკან ღილაკზე კლავიატურის დახურვა (Android)
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (keyboardVisible) {
          Keyboard.dismiss();
          return true;
        }
        return false;
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
      backHandler.remove();
    };
  }, [keyboardVisible]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMedicineShopOverview();
      setOverview(response.data);
    } catch (err) {
      console.error("Laboratory load failed", err);
      setError("მონაცემების ჩატვირთვა ვერ მოხერხდა");
      setOverview(fallbackOverview);
    } finally {
      setLoading(false);
    }
  };

  const {
    laboratoryProducts,
    laboratoryCategories,
    equipmentProducts,
    equipmentCategories,
  } = overview || fallbackOverview;

  // Determine which products to show based on active tab
  const currentProducts =
    (activeTab === "laboratory" ? laboratoryProducts : equipmentProducts) || [];

  const currentCategories =
    (activeTab === "laboratory" ? laboratoryCategories : equipmentCategories) ||
    [];

  const filteredProducts = currentProducts.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>იტვირთება...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dismissKeyboard = () => Keyboard.dismiss();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={["#06B6D4", "#0891B2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>დიაგნოსტიკური კვლევები </Text>
            <Text style={styles.headerSubtitle}>
              ანალიზები და ლაბორატორიული ტესტები
            </Text>
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name="flask" size={32} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
        <View style={styles.mainContent}>
          <View style={styles.centralBanner}>
            <Text style={styles.centralBannerText}>
              {activeTab === "laboratory"
                ? "ეს ფუნქცია მალე დაემატება — შეძლებ ლაბორატორიული კვლევის სახლში გამოძახებას"
                : "ეს ფუნქცია მალე დაემატება — შეძლებ ინსტრუმენტული კვლევის კლინიკაში დაჯავშნას"}
            </Text>
          </View>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "laboratory" && styles.tabActive,
              ]}
              onPress={() => {
                setActiveTab("laboratory");
                setSelectedCategory(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "laboratory" && styles.tabTextActive,
                ]}
              >
                ლაბორატორიული
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "immunological" && styles.tabActive,
              ]}
              onPress={() => {
                setActiveTab("immunological");
                setSelectedCategory(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "immunological" && styles.tabTextActive,
                ]}
              >
                ინსტრუმენტული
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#94A3B8"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="მოძებნე ანალიზი..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Categories Filter */}
          {currentCategories && currentCategories.length > 0 && (
            <View style={styles.categoriesContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    !selectedCategory && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      !selectedCategory && styles.categoryChipTextActive,
                    ]}
                  >
                    ყველა
                  </Text>
                </TouchableOpacity>
                {currentCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id &&
                        styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category.id &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {String(category.name || "")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Products List */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadOverview}
              >
                <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
              </TouchableOpacity>
            </View>
          )}

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="flask-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedCategory
                  ? "პროდუქტი არ მოიძებნა"
                  : "ლაბორატორიის პროდუქტები ჯერ არ არის დამატებული"}
              </Text>
              <Text style={styles.emptySubtitle}>
                სცადეთ სხვა ძიება ან დაბრუნდით მოგვიანებით
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.productsList}
              renderItem={({ item }) => <ProductCard product={item} />}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const ProductCard = ({ product }: { product: ShopProduct }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.9}
      onPress={() => {}}
    >
      <View style={styles.productImageContainer}>
        {Boolean(product.imageUrl) && !imageError ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productImage}
            onError={() => setImageError(true)}
            contentFit="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="flask-outline" size={32} color="#06B6D4" />
          </View>
        )}
        {Boolean(product.discountPercent) && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              -{String(product.discountPercent || 0)}%
            </Text>
          </View>
        )}
      </View>

      <View style={styles.productContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {String(product.name || "")}
        </Text>
        {Boolean(product.description) && (
          <Text style={styles.productDescription} numberOfLines={1}>
            {String(product.description || "")}
          </Text>
        )}

        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>
              ₾{Number(product.price || 0).toFixed(2)}
            </Text>
            {Boolean(product.discountPercent) && Boolean(product.price) && (
              <Text style={styles.productOriginalPrice}>
                ₾
                {(
                  (Number(product.price || 0) * 100) /
                  (100 - Number(product.discountPercent || 0))
                ).toFixed(2)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mainContent: {
    flex: 1,
  },
  centralBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#0891B2",
    borderRadius: 14,
  },
  centralBannerText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#E0F2FE",
    fontFamily: "Poppins-Regular",
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    fontFamily: "Poppins-Regular",
  },
  categoriesContainer: {
    paddingVertical: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins-Medium",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    alignItems: "center",
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#B91C1C",
    fontFamily: "Poppins-Medium",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#06B6D4",
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  productsList: {
    padding: 16,
    paddingBottom: 100,
  },
  productCard: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  productImageContainer: {
    width: 92,
    height: 92,
    backgroundColor: "#F1F5F9",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  discountBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Poppins-Bold",
  },
  productContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 4,
    minHeight: 20,
  },
  productDescription: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    marginBottom: 8,
    lineHeight: 14,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#06B6D4",
    fontFamily: "Poppins-Bold",
  },
  productOriginalPrice: {
    fontSize: 12,
    color: "#94A3B8",
    textDecorationLine: "line-through",
    fontFamily: "Poppins-Regular",
    marginTop: 2,
  },
});

export default Lab;
