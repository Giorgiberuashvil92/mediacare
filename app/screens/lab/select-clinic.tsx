import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../../contexts/CartContext";
import { Clinic, apiService } from "../../services/api";

const SelectClinic = () => {
  const params = useLocalSearchParams<{
    productId: string;
    productName: string;
    productPrice: string;
    productImage?: string;
    productDescription?: string;
    appointmentId?: string; // For booking laboratory test from appointment history
  }>();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getClinics();
      if (response.success) {
        setClinics(response.data.filter((clinic) => clinic.isActive));
      }
    } catch (err) {
      console.error("Failed to load clinics", err);
      setError("კლინიკების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic.id);
  };

  const handleAddToCart = async () => {
    if (!selectedClinic) {
      return;
    }

    const selectedClinicData = clinics.find((c) => c.id === selectedClinic);
    if (!selectedClinicData) {
      return;
    }

    // If this is booking from appointment history, update the appointment's laboratory test
    if (params.appointmentId) {
      try {
        await apiService.bookLaboratoryTest(params.appointmentId, {
          productId: params.productId,
          clinicId: selectedClinicData.id,
          clinicName: selectedClinicData.name,
        });
        router.back();
        return;
      } catch (err) {
        console.error("Failed to book laboratory test:", err);
        // Fall through to add to cart as fallback
      }
    }

    const price = Number(params.productPrice || 0);

    addToCart({
      id: params.productId,
      name: params.productName,
      price: price,
      weight: "1", // Default for laboratory products
      image: params.productImage,
      clinic: selectedClinicData.name,
      clinicId: selectedClinicData.id,
    });

    router.back();
    router.back(); // Go back twice: once from clinic selection, once from product details
  };

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
          <Text style={styles.headerTitle}>კლინიკის არჩევა</Text>
          <View style={styles.iconButtonPlaceholder} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>აირჩიეთ კლინიკა</Text>
          <Text style={styles.infoSubtitle}>
            აირჩიეთ კლინიკა სადაც გსურთ გაკეთდეს &quot;{params.productName}&quot;
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadClinics}>
              <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
            </TouchableOpacity>
          </View>
        )}

        {clinics.length === 0 && !loading && !error ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>კლინიკა არ მოიძებნა</Text>
            <Text style={styles.emptySubtitle}>
              ამჟამად არ არის ხელმისაწვდომი კლინიკები
            </Text>
          </View>
        ) : (
          <FlatList
            data={clinics}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.clinicsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.clinicCard,
                  selectedClinic === item.id && styles.clinicCardSelected,
                ]}
                onPress={() => handleSelectClinic(item)}
                activeOpacity={0.7}
              >
                <View style={styles.clinicCardContent}>
                  <View style={styles.clinicIconContainer}>
                    <Ionicons
                      name="business"
                      size={24}
                      color={selectedClinic === item.id ? "#06B6D4" : "#64748B"}
                    />
                  </View>
                  <View style={styles.clinicInfo}>
                    <Text style={styles.clinicName}>{item.name}</Text>
                    {item.address && (
                      <View style={styles.clinicDetailRow}>
                        <Ionicons name="location-outline" size={14} color="#94A3B8" />
                        <Text style={styles.clinicDetailText}>{item.address}</Text>
                      </View>
                    )}
                    {item.phone && (
                      <View style={styles.clinicDetailRow}>
                        <Ionicons name="call-outline" size={14} color="#94A3B8" />
                        <Text style={styles.clinicDetailText}>{item.phone}</Text>
                      </View>
                    )}
                  </View>
                  {selectedClinic === item.id && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#06B6D4" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {selectedClinic && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddToCart}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>კალათაში დამატება</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 6,
  },
  infoSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
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
  clinicsList: {
    paddingBottom: 100,
  },
  clinicCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clinicCardSelected: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0FDFA",
  },
  clinicCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clinicIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  clinicInfo: {
    flex: 1,
    gap: 6,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Poppins-SemiBold",
  },
  clinicDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clinicDetailText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    flex: 1,
  },
  checkIcon: {
    marginLeft: "auto",
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

export default SelectClinic;

