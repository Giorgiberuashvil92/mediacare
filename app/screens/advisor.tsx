import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  reviewCount: number;
  image: any;
  consultationFee?: string;
  degrees?: string;
}

const SYMPTOM_CATEGORIES = [
  { id: "headache", label: "თავის ტკივილი", icon: "medical-outline" },
  { id: "fever", label: "ცხელება", icon: "thermometer-outline" },
  { id: "cough", label: "ხველა", icon: "lungs-outline" },
  { id: "stomach", label: "მუცლის ტკივილი", icon: "restaurant-outline" },
  { id: "skin", label: "კანის პრობლემები", icon: "body-outline" },
  { id: "heart", label: "გულის პრობლემები", icon: "heart-outline" },
  { id: "eye", label: "თვალის პრობლემები", icon: "eye-outline" },
  { id: "ear", label: "ყურ�ის პრობლემები", icon: "ear-outline" },
];

export default function AdvisorScreen() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [recommendedDoctors, setRecommendedDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"symptoms" | "results">("symptoms");

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((id) => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleAddCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      setSelectedSymptoms((prev) => [...prev, customSymptom.trim()]);
      setCustomSymptom("");
    }
  };

  const handleFindDoctors = async () => {
    if (selectedSymptoms.length === 0) {
      return;
    }

    setLoading(true);
    try {
      // Get active advisors first
      const advisorsResponse = await apiService.getActiveAdvisors();

      if (advisorsResponse.success && advisorsResponse.data.length > 0) {
        // Use advisors if available
        const apiBaseUrl = apiService.getBaseURL();
        const doctors = advisorsResponse.data.map((advisor: any) => {
          const doctor = advisor.doctorId || advisor;
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

          // Ensure doctor ID is correctly extracted
          const doctorId = doctor._id 
            ? String(doctor._id) 
            : doctor.id 
            ? String(doctor.id) 
            : advisor.doctorId && typeof advisor.doctorId === 'string'
            ? advisor.doctorId
            : '';

          return {
            id: doctorId,
            name: advisor.name || doctor.name || "",
            specialization: advisor.specialization || doctor.specialization || "",
            rating: doctor.rating || 0,
            reviewCount: doctor.reviewCount || 0,
            image: imageSource,
            consultationFee: doctor.consultationFee
              ? `₾${doctor.consultationFee}`
              : undefined,
            degrees: doctor.degrees || "",
            bio: advisor.bio,
          };
        });

        setRecommendedDoctors(doctors);
        setStep("results");
      } else {
        // Fallback to regular doctors if no advisors
        const response = await apiService.getDoctors({
          page: 1,
          limit: 50,
        });

        if (response.success) {
          const apiBaseUrl = apiService.getBaseURL();
          const doctors = response.data.doctors.map((doctor: any) => {
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
              consultationFee: doctor.consultationFee
                ? `₾${doctor.consultationFee}`
                : undefined,
              degrees: doctor.degrees || "",
            };
          });

          setRecommendedDoctors(doctors.slice(0, 6));
          setStep("results");
        }
      }
    } catch (error) {
      console.error("Error finding doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorPress = (doctorId: string) => {
    router.push({
      pathname: "/screens/chat/[doctorId]",
      params: { doctorId },
    });
  };

  const handleReset = () => {
    setSelectedSymptoms([]);
    setCustomSymptom("");
    setRecommendedDoctors([]);
    setStep("symptoms");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === "results") {
                handleReset();
              } else {
                router.back();
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === "symptoms" ? "მრჩეველი" : "რეკომენდებული ექიმები"}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {step === "symptoms" ? (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroBackground}>
                <View style={styles.heroCircle1} />
                <View style={styles.heroCircle2} />
                <View style={styles.heroCircle3} />
              </View>
              <View style={styles.iconContainer}>
                <View style={styles.iconInnerGlow}>
                  <Ionicons name="sparkles" size={52} color="#06B6D4" />
                </View>
                <View style={styles.iconOuterRing} />
              </View>
              <Text style={styles.heroTitle}>
                შეგირჩევთ სწორ ექიმს
              </Text>
              <Text style={styles.heroSubtitle}>
                მიუთითეთ თქვენი სიმპტომები და ჩვენ დაგეხმარებით ექიმის
                არჩევაში
              </Text>
              <View style={styles.heroFeatures}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>სწრაფი ძიება</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>სწორი არჩევანი</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>დამოკიდებული</Text>
                </View>
              </View>
            </View>



            {/* Custom Symptom Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ან შეიყვანეთ თქვენი სიმპტომი</Text>
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="მაგ: თავის ტკივილი, ცხელება..."
                  placeholderTextColor="#9CA3AF"
                  value={customSymptom}
                  onChangeText={setCustomSymptom}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !customSymptom.trim() && styles.addButtonDisabled,
                  ]}
                  onPress={handleAddCustomSymptom}
                  disabled={!customSymptom.trim()}
                >
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={customSymptom.trim() ? "#FFFFFF" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Selected Symptoms */}
            {selectedSymptoms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>არჩეული სიმპტომები</Text>
                <View style={styles.selectedSymptomsContainer}>
                  {selectedSymptoms.map((symptom) => {
                    const category = SYMPTOM_CATEGORIES.find(
                      (c) => c.id === symptom
                    );
                    return (
                      <TouchableOpacity
                        key={symptom}
                        style={styles.selectedSymptomTag}
                        onPress={() => handleSymptomToggle(symptom)}
                      >
                        <Text style={styles.selectedSymptomText}>
                          {category?.label || symptom}
                        </Text>
                        <Ionicons name="close-circle" size={18} color="#06B6D4" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Find Doctors Button */}
            <TouchableOpacity
              style={[
                styles.findButton,
                (selectedSymptoms.length === 0 || loading) &&
                  styles.findButtonDisabled,
              ]}
              onPress={handleFindDoctors}
              disabled={selectedSymptoms.length === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#FFFFFF" />
                  <Text style={styles.findButtonText}>
                    ექიმის ძიება ({selectedSymptoms.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
              <Text style={styles.resultsTitle}>
                ჩვენი რეკომენდაციები
              </Text>
              <Text style={styles.resultsSubtitle}>
                ჩვენ გირჩევთ შემდეგ ექიმებს თქვენი სიმპტომების მიხედვით
              </Text>
            </View>

            {/* Doctors List */}
            {recommendedDoctors.length > 0 ? (
              <View style={styles.doctorsList}>
                {recommendedDoctors.map((doctor) => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={styles.doctorCard}
                    onPress={() => handleDoctorPress(doctor.id)}
                  >
                    <View style={styles.doctorImageContainer}>
                      <Image
                        source={doctor.image}
                        style={styles.doctorImage}
                        contentFit="cover"
                      />
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={styles.doctorName}>{doctor.name}</Text>
                      <Text style={styles.doctorSpecialty}>
                        {doctor.specialization}
                      </Text>
                      {doctor.degrees && (
                        <Text style={styles.doctorDegrees}>
                          {doctor.degrees}
                        </Text>
                      )}
                      <View style={styles.doctorRating}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.ratingText}>
                          {doctor.rating} ({doctor.reviewCount} მიმოხილვა)
                        </Text>
                      </View>
                      {doctor.consultationFee && (
                        <Text style={styles.consultationFee}>
                          {doctor.consultationFee}
                        </Text>
                      )}
                    </View>
                    <View style={styles.doctorArrow}>
                      <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="medical-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                  ექიმები არ მოიძებნა
                </Text>
              </View>
            )}

            {/* Reset Button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Ionicons name="refresh-outline" size={20} color="#06B6D4" />
              <Text style={styles.resetButtonText}>ახლიდან დაწყება</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: "#F0FDFA",
    position: "relative",
    overflow: "hidden",
    marginBottom: 8,
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#E0F2FE",
    opacity: 0.5,
    top: -50,
    right: -50,
  },
  heroCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#CFFAFE",
    opacity: 0.4,
    bottom: -30,
    left: -30,
  },
  heroCircle3: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#A5F3FC",
    opacity: 0.3,
    top: "50%",
    left: "50%",
    marginLeft: -50,
    marginTop: -50,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconInnerGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E0F2FE",
  },
  iconOuterRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#CFFAFE",
    borderStyle: "dashed",
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  heroFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#334155",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  symptomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  symptomChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0F2FE",
    gap: 10,
    minWidth: "45%",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  symptomChipActive: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  symptomChipText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0891B2",
  },
  symptomChipTextActive: {
    color: "#FFFFFF",
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0F2FE",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
  selectedSymptomsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedSymptomTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    gap: 8,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedSymptomText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#0369A1",
  },
  findButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 8,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: "#06B6D4",
    gap: 10,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  findButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
  },
  findButtonText: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  resultsHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: "#F0FDFA",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  resultsSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  doctorsList: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  doctorImage: {
    width: "100%",
    height: "100%",
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 16,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
    marginBottom: 4,
  },
  doctorDegrees: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 6,
  },
  doctorRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  consultationFee: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginTop: 4,
  },
  doctorArrow: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginTop: 16,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#06B6D4",
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
});

