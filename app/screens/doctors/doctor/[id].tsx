import AppointmentScheduler from "@/app/components/ui/appointmentScheduler";
import { useFavorites } from "@/app/contexts/FavoritesContext";
import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Helper function to map backend doctor to app format
const mapDoctorFromAPI = (doctor: any, apiBaseUrl: string) => {
  // Build image URL from backend
  let imageSource;
  if (doctor.profileImage) {
    // If profileImage is a full URL, use it; otherwise construct it
    if (doctor.profileImage.startsWith('http')) {
      imageSource = { uri: doctor.profileImage };
    } else {
      imageSource = { uri: `${apiBaseUrl}/${doctor.profileImage}` };
    }
  } else {
    // Fallback to default image
    imageSource = require("@/assets/images/doctors/doctor1.png");
  }

  return {
    id: doctor.id, // Keep as string (MongoDB ObjectId)
    name: doctor.name || "",
    specialization: doctor.specialization || "",
    rating: doctor.rating || 0,
    reviewCount: doctor.reviewCount || 0,
    reviews: doctor.reviewCount || 0,
    isActive: doctor.isActive !== undefined ? doctor.isActive : true,
    image: imageSource,
    degrees: doctor.degrees || "",
    location: doctor.location || "",
    patients: doctor.patients || undefined,
    experience: doctor.experience || "",
    consultationFee: doctor.consultationFee
      ? `${doctor.consultationFee} ₾`
      : undefined,
    followUpFee: doctor.followUpFee ? `${doctor.followUpFee} ₾` : undefined,
    about: doctor.about || "",
    workingHours: doctor.workingHours || undefined,
    availability: doctor.availability || [],
    totalReviews: doctor.reviewCount || 0,
  };
};

const DoctorDetail = () => {
  const { id } = useLocalSearchParams();
  const [doctor, setDoctor] = useState<any>(null);
  console.log('🏥 Frontend doctor object:', doctor);
  console.log('🏥 Frontend doctor availability:', doctor?.availability);
  const [showAppointmentScheduler, setShowAppointmentScheduler] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    loadDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled for doctor detail. Please disable USE_MOCK_API.",
        );
      }

      const response = await apiService.getDoctorById(id as string);

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
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>ექიმის ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "ექიმი არ მოიძებნა"}
          </Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(doctor)}
        >
          <Ionicons
            name={isFavorite(doctor.id) ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite(doctor.id) ? "#EF4444" : "#64748B"}
          />
        </TouchableOpacity>
        <View style={styles.profileImageContainer}>
          <Image source={doctor.image} style={styles.profileImage} />
        </View>
      </View>

      {/* Content Card */}
      <ScrollView
        style={styles.contentCard}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={styles.basicInfo}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <Text style={styles.specialty}>{doctor.specialization}</Text>
          <Text style={styles.degrees}>{doctor.degrees}</Text>
          <Text style={styles.location}>{doctor.location}</Text>
        </View>

        {/* Statistics */}
        <View style={styles.statistics}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={24} color="#333333" />
            <Text style={styles.statNumber}>{doctor.patients}</Text>
            <Text style={styles.statLabel}>პაციენტები</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="briefcase" size={24} color="#333333" />
            <Text style={styles.statNumber}>{doctor.experience}</Text>
            <Text style={styles.statLabel}>გამოცდილება</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={24} color="#333333" />
            <Text style={styles.statNumber}>{doctor.rating}</Text>
            <Text style={styles.statLabel}>რეიტინგი</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubbles" size={24} color="#333333" />
            <Text style={styles.statNumber}>{doctor.reviewCount}+</Text>
            <Text style={styles.statLabel}>შეფასებები</Text>
          </View>
        </View>

        {/* Fees Section */}
        <View style={styles.feesSection}>
          <View style={styles.feeItem}>
            <Text style={styles.feeLabel}>კონსულტაციის საფასური</Text>
            <Text style={styles.feeAmount}>{doctor.consultationFee}</Text>
            <Text style={styles.feeNote}>/ კონსულტაცია</Text>
          </View>
          <View style={styles.feeItem}>
            <Text style={styles.feeLabel}>განმეორებითი ვიზიტის საფასური</Text>
            <Text style={styles.feeAmount}>{doctor.followUpFee}</Text>
            <Text style={styles.feeNote}>(15 დღის განმავლობაში)</Text>
          </View>
        </View>

        {/* About Doctor */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>ექიმის შესახებ</Text>
          <Text style={styles.aboutText}>{doctor.about}</Text>
          <TouchableOpacity>
            <Text style={styles.readMore}>მეტის წაკითხვა</Text>
          </TouchableOpacity>
        </View>

        {showAppointmentScheduler && (
          <View style={styles.appointmentSection}>
            <Text style={styles.appointmentTitle}>ჯავშნის გაკეთება</Text>
            <AppointmentScheduler
              workingHours={doctor.workingHours}
              availability={doctor.availability || []}
              totalReviews={doctor.totalReviews || 0}
              reviews={Array.isArray(doctor.reviews) ? doctor.reviews : []}
              doctorId={doctor.id}
              onTimeSlotBlocked={loadDoctor} // Reload doctor data after blocking
            />
          </View>
        )}
      </ScrollView>

      {!showAppointmentScheduler && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.appointmentButton}
            onPress={() => setShowAppointmentScheduler(true)}
          >
            <Text style={styles.buttonText}>ჯავშნის გაკეთება</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default DoctorDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#20BEB8",
  },
  header: {
    height: 200,
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  favoriteButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  profileImageContainer: {
    marginTop: 30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  contentCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  basicInfo: {
    alignItems: "center",
    marginBottom: 30,
  },
  doctorName: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginBottom: 8,
  },
  specialty: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#666666",
    marginBottom: 4,
  },
  degrees: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#999999",
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#999999",
  },
  statistics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  feesSection: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  feeItem: {
    flex: 1,
    alignItems: "center",
  },
  feeLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#333333",
    marginBottom: 8,
  },
  feeAmount: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginBottom: 4,
  },
  feeNote: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#999999",
  },
  aboutSection: {
    marginBottom: 100,
  },
  aboutTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    lineHeight: 22,
    marginBottom: 8,
  },
  readMore: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  appointmentButton: {
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  schedulerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  schedulerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginLeft: 16,
  },
  appointmentSection: {
    marginTop: -50,
    marginBottom: 20,
  },
  appointmentTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginBottom: 16,
    textAlign: "center",
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
    color: "#FFFFFF",
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
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
  },
});
