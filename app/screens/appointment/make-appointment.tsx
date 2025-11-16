import { useAuth } from "@/app/contexts/AuthContext";
import { apiService } from "@/app/services/api";
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
  const { doctorId, selectedDate, selectedTime, paymentMethod } =
    useLocalSearchParams();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<"self" | "other">("self");
  const [promoCode, setPromoCode] = useState("");
  const [selectedPaymentMethod] = useState((paymentMethod as string) || "visa");
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);

  useEffect(() => {
    loadDoctor();
    loadPatientProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, user?.id]);

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

  const loadPatientProfile = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingProfile(true);
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        setPatientProfile(response.data);
      }
    } catch (err: any) {
      console.error("Error loading patient profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth?: string): number | null => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Format gender to Georgian
  const formatGender = (gender?: string): string => {
    if (!gender) return "";
    const genderMap: { [key: string]: string } = {
      male: "კაცი",
      female: "ქალი",
      other: "სხვა",
    };
    return genderMap[gender.toLowerCase()] || gender;
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
    // If "self" is selected and we have complete profile info, create appointment directly
    if (selectedPatient === "self" && patientProfile) {
      // Check if we have all required fields
      const hasCompleteInfo = 
        patientProfile.name && 
        patientProfile.dateOfBirth && 
        patientProfile.gender;

      if (hasCompleteInfo) {
        // Create appointment directly without going to patient-details page
        try {
          setCreatingAppointment(true);
          
          // Format dateOfBirth for API
          // Backend returns dateOfBirth in ISO format (YYYY-MM-DD), so use it directly
          let dateOfBirthForAPI = patientProfile.dateOfBirth;
          
          // If it's not in ISO format (e.g., Georgian format), try to parse it
          if (!dateOfBirthForAPI.includes("-")) {
            // Try to parse Georgian date format (e.g., "15 იანვარი 1990")
            const dateMatch = dateOfBirthForAPI.match(/(\d+)\s+(\w+)\s+(\d+)/);
            if (dateMatch) {
              const months = [
                "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
                "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
              ];
              const monthIndex = months.indexOf(dateMatch[2]);
              if (monthIndex !== -1) {
                const date = new Date(parseInt(dateMatch[3]), monthIndex, parseInt(dateMatch[1]));
                dateOfBirthForAPI = date.toISOString().split("T")[0];
              }
            }
          }
          
          // Ensure it's in ISO format (YYYY-MM-DD)
          if (!dateOfBirthForAPI || !dateOfBirthForAPI.includes("-")) {
            // Fallback: try to parse as Date object
            const parsedDate = new Date(patientProfile.dateOfBirth);
            if (!isNaN(parsedDate.getTime())) {
              dateOfBirthForAPI = parsedDate.toISOString().split("T")[0];
            }
          }

          const response = await apiService.createAppointment({
            doctorId: doctorId as string,
            appointmentDate: selectedDate as string,
            appointmentTime: selectedTime as string,
            consultationFee: consultationFee,
            totalAmount: netAmount,
            paymentMethod: "pending", // Payment will be handled later
            paymentStatus: "pending", // Payment status is pending until payment is made
            patientDetails: {
              name: patientProfile.name,
              dateOfBirth: dateOfBirthForAPI,
              gender: patientProfile.gender,
              problem: "", // Can be empty if user didn't specify
            },
            documents: [],
            notes: "",
          });

          if (response.success) {
            router.push({
              pathname: "/screens/appointment/appointment-success",
              params: {
                doctorId: doctorId as string,
                appointmentId: response.data?._id || response.data?.id || "",
                selectedDate: selectedDate as string,
                selectedTime: selectedTime as string,
                paymentMethod: selectedPaymentMethod,
                patientName: patientProfile.name,
                problem: "",
                appointmentNumber: response.data?.appointmentNumber || "",
              },
            });
          } else {
            Alert.alert("შეცდომა", response.message || "ჯავშნის შექმნა ვერ მოხერხდა");
          }
        } catch (error: any) {
          console.error("Error creating appointment:", error);
          Alert.alert(
            "შეცდომა",
            error.message || "ჯავშნის შექმნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან."
          );
        } finally {
          setCreatingAppointment(false);
        }
        return;
      }
    }

    // Otherwise, navigate to Patient Details page
    router.push({
      pathname: "/screens/appointment/patient-details",
      params: {
        doctorId: doctorId as string,
        selectedDate: selectedDate as string,
        selectedTime: selectedTime as string,
        paymentMethod: selectedPaymentMethod,
        amount: netAmount.toString(),
        consultationFee: consultationFee.toString(),
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
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ჯავშნის გაკეთება</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.appointmentDateTime}>
                {appointmentDateTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>პაციენტის ინფორმაცია</Text>
          
          {loadingProfile ? (
            <View style={styles.patientOption}>
              <ActivityIndicator size="small" color="#20BEB8" />
              <Text style={styles.loadingText}>პროფილის ჩატვირთვა...</Text>
            </View>
          ) : patientProfile ? (
            <TouchableOpacity
              style={styles.patientOption}
              onPress={() => setSelectedPatient("self")}
            >
              <View style={styles.radioButton}>
                {selectedPatient === "self" && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>
                  {patientProfile.name || user?.name || "პაციენტი"}
                </Text>
                <Text style={styles.patientDetails}>
                  {patientProfile.dateOfBirth
                    ? `${calculateAge(patientProfile.dateOfBirth) || "?"} წლის`
                    : ""}
                  {patientProfile.gender
                    ? ` | ${formatGender(patientProfile.gender)}`
                    : ""}
                </Text>
              </View>
            </TouchableOpacity>
          ) : user?.name ? (
            <TouchableOpacity
              style={styles.patientOption}
              onPress={() => setSelectedPatient("self")}
            >
              <View style={styles.radioButton}>
                {selectedPatient === "self" && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{user.name}</Text>
                <Text style={styles.patientDetails}>
                  პროფილის დეტალები არ არის შევსებული
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.patientOption}
            onPress={() => setSelectedPatient("other")}
          >
            <View style={styles.radioButton}>
              {selectedPatient === "other" && (
                <View style={styles.radioButtonSelected} />
              )}
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>სხვა პაციენტი</Text>
              <Text style={styles.patientDetails}>
                ინფორმაცია შეიყვანება შემდეგ გვერდზე
              </Text>
            </View>
          </TouchableOpacity>
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
            (loading || creatingAppointment) && styles.makeAppointmentButtonDisabled,
          ]}
          onPress={handleMakeAppointment}
          disabled={loading || creatingAppointment}
        >
          {creatingAppointment ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.makeAppointmentButtonText}>შექმნა...</Text>
            </View>
          ) : (
            <Text style={styles.makeAppointmentButtonText}>ჯავშნის გაკეთება</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginBottom: 16,
  },
  doctorCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  doctorImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#E5E5EA",
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
    color: "#333333",
    flex: 1,
  },
  specialty: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
  },
  degrees: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#999999",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  appointmentDateTime: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  patientOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
    color: "#333333",
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#999999",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#333333",
  },
  paymentAmount: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
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
    color: "#333333",
  },
  netAmountValue: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  promoCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  promoCodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    marginRight: 12,
  },
  applyButton: {
    backgroundColor: "#20BEB8",
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
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  makeAppointmentButton: {
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
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
    backgroundColor: "#20BEB8",
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
