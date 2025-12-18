import { apiService, AppointmentType } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Helper function to map backend doctor to app format
const mapDoctorFromAPI = (doctor: any, apiBaseUrl: string) => {
  let imageSource;
  if (doctor.profileImage) {
    if (doctor.profileImage.startsWith("http")) {
      imageSource = { uri: doctor.profileImage };
    } else {
      imageSource = { uri: `${apiBaseUrl}/${doctor.profileImage}` };
    }
  } else {
    imageSource = require("@/assets/images/doctors/doctor1.png");
  }

  return {
    id: doctor.id,
    name: doctor.name || "",
    specialization: doctor.specialization || "",
    rating: doctor.rating || 0,
    reviewCount: doctor.reviewCount || 0,
    image: imageSource,
    degrees: doctor.degrees || "",
    consultationFee: doctor.consultationFee || 0,
  };
};

const MakeAppointment = () => {
  const {
    doctorId,
    selectedDate,
    selectedTime,
    paymentMethod,
    appointmentType: appointmentTypeParam,
  } = useLocalSearchParams();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [selectedPaymentMethod] = useState((paymentMethod as string) || "visa");
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(
    (appointmentTypeParam as AppointmentType) || "video",
  );
  const [visitAddress, setVisitAddress] = useState("");
  const isLockedType = !!appointmentTypeParam;

  useEffect(() => {
    loadDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled for appointments. Please disable USE_MOCK_API.",
        );
      }

      const response = await apiService.getDoctorById(doctorId as string);

      if (response.success && response.data) {
        const apiBaseUrl = apiService.getBaseURL();
        const mappedDoctor = mapDoctorFromAPI(response.data, apiBaseUrl);
        setDoctor(mappedDoctor);
      } else {
        setDoctor(null);
        setError("ექიმი არ მოიძებნა");
      }
    } catch (err: any) {
      setError(err.message || "ექიმის ჩატვირთვა ვერ მოხერხდა");
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20BEB8" />
          <Text style={styles.loadingText}>ექიმის ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor || error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "ექიმი არ მოიძებნა"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadDoctor}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const consultationFee = typeof doctor.consultationFee === 'number' 
    ? doctor.consultationFee 
    : parseFloat(String(doctor.consultationFee).replace(/[^\d.]/g, '')) || 0;
  const vat = Math.round(consultationFee * 0.05);
  const netAmount = consultationFee + vat;

  // Format the date and time for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "იან",
      "თებ",
      "მარ",
      "აპრ",
      "მაი",
      "ივნ",
      "ივლ",
      "აგვ",
      "სექ",
      "ოქტ",
      "ნოე",
      "დეკ",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const appointmentDateTime = `${formatDate(
    selectedDate as string
  )} | ${selectedTime}`;

  const handleMakeAppointment = async () => {
    // Client-side guard: at least 2 hours before selected time
    if (selectedDate && selectedTime) {
      const candidate = new Date(`${selectedDate}T${selectedTime}:00`);
      const now = new Date();
      const twoHoursMs = 2 * 60 * 60 * 1000;
      if (candidate.getTime() - now.getTime() < twoHoursMs) {
        Alert.alert(
          "შეზღუდვა",
          "ჯავშნის გაკეთება შესაძლებელია მინიმუმ 2 საათით ადრე.",
        );
        return;
      }
    }

    // Validate home visit address if needed
    if (appointmentType === "home-visit" && !visitAddress.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ მიუთითოთ ბინაზე ვიზიტის მისამართი");
      return;
    }

    // Always navigate to Patient Details page to fill in all information
    router.push({
      pathname: "/screens/appointment/patient-details",
      params: {
        doctorId: doctorId as string,
        selectedDate: selectedDate as string,
        selectedTime: selectedTime as string,
        paymentMethod: selectedPaymentMethod,
        amount: netAmount.toString(),
        consultationFee: consultationFee.toString(),
        appointmentType,
        visitAddress,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>ახალი ჯავშანი</Text>
          <Text style={styles.headerSubtitle}>აირჩიე ტიპი და დაადასტურე ვიზიტი</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Information */}
        <View style={styles.section}>
          <View style={styles.doctorCard}>
            <View style={styles.doctorImagePlaceholder}>
              <Image source={doctor.image} style={styles.doctorImage} />
            </View>
            <View style={styles.doctorInfo}>
              <View style={styles.doctorNameRow}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, index) => (
                    <Ionicons
                      key={index}
                      name="star"
                      size={16}
                      color="#FFD700"
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.specialty}>{doctor.specialization}</Text>
              <Text style={styles.degrees}>{doctor.degrees}</Text>
              <View style={styles.dateTimeRow}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="#6B7280"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.appointmentDateTime}>
                  {appointmentDateTime}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Appointment Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>კონსულტაციის ტიპი</Text>

          {isLockedType ? (
            <View style={styles.typeSelectorContainer}>
              <View style={[styles.typeChip, styles.typeChipActive]}>
                <Ionicons
                  name={
                    appointmentType === "home-visit"
                      ? "home-outline"
                      : "videocam-outline"
                  }
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={[styles.typeChipText, styles.typeChipTextActive]}>
                  {appointmentType === "home-visit"
                    ? "ბინაზე ვიზიტი"
                    : "ვიდეო კონსულტაცია"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.typeSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  appointmentType === "video" && styles.typeChipActive,
                ]}
                onPress={() => setAppointmentType("video")}
              >
                <Ionicons
                  name="videocam-outline"
                  size={18}
                  color={appointmentType === "video" ? "#FFFFFF" : "#4B5563"}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    appointmentType === "video" && styles.typeChipTextActive,
                  ]}
                >
                  ვიდეო კონსულტაცია
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeChip,
                  appointmentType === "home-visit" && styles.typeChipActive,
                ]}
                onPress={() => setAppointmentType("home-visit")}
              >
                <Ionicons
                  name="home-outline"
                  size={18}
                  color={
                    appointmentType === "home-visit" ? "#FFFFFF" : "#4B5563"
                  }
                />
                <Text
                  style={[
                    styles.typeChipText,
                    appointmentType === "home-visit" &&
                      styles.typeChipTextActive,
                  ]}
                >
                  ბინაზე ვიზიტი
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {appointmentType === "home-visit" && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.fieldLabel}>ვიზიტის მისამართი</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="მაგ: თბილისი, ჭავჭავაძის გამზირი 15, ბინა 12"
                placeholderTextColor="#9CA3AF"
                value={visitAddress}
                onChangeText={setVisitAddress}
                multiline
              />
            </View>
          )}
        </View>


        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>გადახდის დეტალები</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>კონსულტაციის საფასური</Text>
            <Text style={styles.paymentAmount}>{consultationFee} ₾</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>დღგ (5%)</Text>
            <Text style={styles.paymentAmount}>{vat} ₾</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={styles.netAmountLabel}>საერთო თანხა</Text>
            <Text style={styles.netAmountValue}>{netAmount} ₾</Text>
          </View>

          <View style={styles.promoCodeContainer}>
            <TextInput
              style={styles.promoCodeInput}
              placeholder="გაქვთ პრომო კოდი?"
              placeholderTextColor="#999999"
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>გამოყენება</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method - Temporarily hidden, payment will be handled later */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>გადახდა</Text>

          <TouchableOpacity
            style={styles.paymentMethodCard}
            onPress={handlePaymentMethodPress}
          >
            <View style={styles.visaButton}>
              <Text style={styles.visaText}>VISA</Text>
            </View>
            <Text style={styles.cardNumber}>************ 3254</Text>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </TouchableOpacity>
        </View> */}
      </ScrollView>

      {/* Make Appointment Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.makeAppointmentButton,
            loading && styles.makeAppointmentButtonDisabled,
          ]}
          onPress={handleMakeAppointment}
          disabled={loading}
        >
          <Text style={styles.makeAppointmentButtonText}>ჯავშნის გაკეთება</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  headerTitles: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    marginBottom: 16,
  },
  doctorCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  doctorImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    marginRight: 16,
    overflow: "hidden",
  },
  doctorImage: {
    width: "100%",
    height: "100%",
  },
  doctorInfo: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  doctorName: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#111827",
    flex: 1,
  },
  specialty: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0EA5E9",
  },
  degrees: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  typeSelectorContainer: {
    flexDirection: "row",
    gap: 10,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  typeChipActive: {
    backgroundColor: "#0EA5E9",
  },
  typeChipText: {
    marginLeft: 8,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  appointmentDateTime: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#374151",
    marginBottom: 6,
  },
  addressInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#111827",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  patientOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E5EA",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#20BEB8",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  paymentLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
  },
  paymentAmount: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    borderStyle: "dashed",
    marginVertical: 12,
  },
  netAmountLabel: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
  },
  netAmountValue: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0369A1",
  },
  promoCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  promoCodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    marginRight: 12,
  },
  applyButton: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
  },
  visaButton: {
    backgroundColor: "#1E40AF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 12,
  },
  visaText: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  cardNumber: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  makeAppointmentButton: {
    backgroundColor: "#22C55E",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 4,
  },
  makeAppointmentButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  makeAppointmentButtonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default MakeAppointment;
