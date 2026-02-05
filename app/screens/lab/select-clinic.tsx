import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../../contexts/CartContext";

const SelectClinic = () => {
  const params = useLocalSearchParams<{
    productId: string;
    productName: string;
    productPrice: string;
    productImage?: string;
    productDescription?: string;
    appointmentId?: string; // For booking test from appointment history
    testType?: "laboratory" | "instrumental"; // Type of test being booked
  }>();

  const [loading, setLoading] = useState(true);
  // Only home collection is available now
  const [collectionType] = useState<"clinic" | "home">("home");
  const [homeAddress, setHomeAddress] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    setLoading(false);
  }, []);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleAddToCart = async () => {
    if (collectionType === "home") {
      if (!homeAddress.trim()) {
        Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ მისამართი");
        return;
      }
      // Validate date is not in the past
      const now = new Date();
      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(selectedTime.getHours());
      selectedDateTime.setMinutes(selectedTime.getMinutes());
      if (selectedDateTime < now) {
        Alert.alert("შეცდომა", "გთხოვთ აირჩიოთ მომავალი თარიღი და დრო");
        return;
      }
    }

    // If home collection is selected, add to cart and navigate directly to checkout
    if (collectionType === "home") {
      const price = Number(params.productPrice || 0);

      addToCart({
        id: params.productId,
        name: params.productName,
        price: price,
        weight: "1", // Default for laboratory products
        image: params.productImage,
        clinic: "სახლში გამოძახება",
        clinicId: "home-collection",
        homeCollection: {
          address: homeAddress,
          date: formatDate(selectedDate),
          time: formatTime(selectedTime),
        },
      });

      // Navigate directly to checkout instead of going back
      router.push("/screens/medicine/checkout");
      return;
    }
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>სახლში გამოძახება</Text>
          <Text style={styles.infoSubtitle}>
            შეიყვანეთ მისამართი და აირჩიეთ თარიღი &quot;{params.productName}&quot;-ისთვის
          </Text>
        </View>

        {/* Home Collection Form */}
        {(
          <View style={styles.homeCollectionForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>მისამართი *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={homeAddress}
                onChangeText={setHomeAddress}
                placeholder="შეიყვანეთ სრული მისამართი"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>თარიღი *</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
                  <Text style={styles.dateTimeText}>
                    {formatDate(selectedDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>დრო *</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color="#06B6D4" />
                  <Text style={styles.dateTimeText}>
                    {formatTime(selectedTime)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddToCart}
          activeOpacity={0.8}
        >
          <Ionicons name="card-outline" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>გადახდა</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event: any, date?: Date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={(event: any, date?: Date) => {
            setShowTimePicker(false);
            if (date) {
              setSelectedTime(date);
            }
          }}
        />
      )}

      {/* iOS Date/Time Picker Modal */}
      {Platform.OS === "ios" && (showDatePicker || showTimePicker) && (
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                style={styles.pickerCancelButton}
              >
                <Text style={styles.pickerCancelText}>გაუქმება</Text>
              </TouchableOpacity>
              <Text style={styles.pickerModalTitle}>
                {showDatePicker ? "თარიღის არჩევა" : "დროის არჩევა"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                style={styles.pickerDoneButton}
              >
                <Text style={styles.pickerDoneText}>დადასტურება</Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={(event: any, date?: Date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                minimumDate={new Date()}
                style={styles.picker}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={(event: any, date?: Date) => {
                  if (date) {
                    setSelectedTime(date);
                  }
                }}
                style={styles.picker}
              />
            )}
          </View>
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
  collectionTypeContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  collectionTypeCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  collectionTypeCardActive: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0FDFA",
  },
  collectionTypeCardDisabled: {
    opacity: 0.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  collectionTypeText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#64748B",
  },
  collectionTypeTextActive: {
    color: "#06B6D4",
  },
  collectionTypeTextDisabled: {
    color: "#94A3B8",
  },
  homeCollectionForm: {
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  dateTimeText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  pickerModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  pickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerCancelButton: {
    paddingVertical: 8,
  },
  pickerCancelText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#64748B",
  },
  pickerModalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  pickerDoneButton: {
    paddingVertical: 8,
  },
  pickerDoneText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  picker: {
    height: 200,
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

