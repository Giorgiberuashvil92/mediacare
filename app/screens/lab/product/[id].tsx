import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LabProductDetails = () => {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    description?: string;
    price?: string;
    discountPercent?: string;
    imageUrl?: string;
    category?: string;
  }>();

  const price = Number(params.price || 0);
  const discountPercent = Number(params.discountPercent || 0);
  const hasDiscount = !Number.isNaN(discountPercent) && discountPercent > 0;
  const originalPrice =
    hasDiscount && price > 0
      ? (price * 100) / (100 - discountPercent)
      : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#06B6D4", "#0891B2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>პროდუქტის დეტალი</Text>
          <View style={styles.iconButtonPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.imageWrap}>
            {params.imageUrl ? (
              <Image
                source={{ uri: params.imageUrl }}
                style={styles.image}
                contentFit="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="flask-outline" size={48} color="#06B6D4" />
              </View>
            )}
            {hasDiscount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discountPercent}%</Text>
              </View>
            )}
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.title}>{params.name || "პროდუქტი"}</Text>
            {params.category ? (
              <View style={styles.tag}>
                <Ionicons name="pricetag-outline" size={14} color="#0EA5E9" />
                <Text style={styles.tagText}>{params.category}</Text>
              </View>
            ) : null}

            <View style={styles.priceRow}>
              <Text style={styles.price}>₾{price.toFixed(2)}</Text>
              {originalPrice && (
                <Text style={styles.originalPrice}>₾{originalPrice.toFixed(2)}</Text>
              )}
            </View>
          </View>

          {params.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>აღწერა</Text>
              <Text style={styles.sectionText}>{params.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Section - Add to Cart Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push({
              pathname: "/screens/lab/select-clinic",
              params: {
                productId: params.id,
                productName: params.name || "პროდუქტი",
                productPrice: params.price || "0",
                productImage: params.imageUrl,
                productDescription: params.description,
              },
            })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>კალათაში დამატება</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LabProductDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 16,
  },
  imageWrap: {
    width: "100%",
    height: 220,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins-Bold",
  },
  infoBlock: {
    gap: 10,
  },
  title: {
    fontSize: 20,
    color: "#0F172A",
    fontFamily: "Poppins-Bold",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
  },
  tagText: {
    color: "#0EA5E9",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  price: {
    fontSize: 26,
    color: "#0EA5E9",
    fontFamily: "Poppins-Bold",
  },
  originalPrice: {
    fontSize: 14,
    color: "#94A3B8",
    textDecorationLine: "line-through",
    fontFamily: "Poppins-Regular",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#0F172A",
    fontFamily: "Poppins-SemiBold",
  },
  sectionText: {
    fontSize: 14,
    color: "#475569",
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  addButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
});

