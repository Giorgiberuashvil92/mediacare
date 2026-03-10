import { apiService } from "@/app/_services/api";
import AppointmentScheduler from "@/app/components/ui/appointmentScheduler";
import { useFavorites } from "@/app/contexts/FavoritesContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
    if (doctor.profileImage.startsWith("http")) {
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
    adminNotes: doctor.adminNotes || "", // ადმინის ჩანაწერი — ჩანს „ექიმის შესახებ“-ის მაგივრად
    workingHours: doctor.workingHours || "24/7",
    availability: doctor.availability || [],
    totalReviews: doctor.reviewCount || 0,
  };
};

const DoctorDetail = () => {
  const {
    id,
    appointmentType,
    lockAppointmentType,
    followUpAppointmentId,
    followUp,
  } = useLocalSearchParams<{
    id: string;
    appointmentType?: string;
    lockAppointmentType?: string;
    followUpAppointmentId?: string;
    followUp?: string;
  }>();
  const [doctor, setDoctor] = useState<any>(null);
  console.log("🏥 Frontend doctor object:", doctor);
  console.log("🏥 Frontend doctor availability:", doctor?.availability);
  const [showAppointmentScheduler, setShowAppointmentScheduler] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showEducationModal, setShowEducationModal] = useState(false);

  useEffect(() => {
    loadDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-open scheduler if this is a follow-up appointment
  useEffect(() => {
    if (followUp === "true" && followUpAppointmentId && doctor) {
      setShowAppointmentScheduler(true);
    }
  }, [followUp, followUpAppointmentId, doctor]);

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
        console.log(
          "🏥 Doctor Detail - API Response:",
          JSON.stringify(response.data, null, 2),
        );
        console.log(
          "🏥 Doctor Detail - Availability data:",
          JSON.stringify(response.data.availability, null, 2),
        );

        const apiBaseUrl = apiService.getBaseURL();
        const mappedDoctor = mapDoctorFromAPI(response.data, apiBaseUrl);

        console.log(
          "🏥 Doctor Detail - Mapped doctor availability:",
          JSON.stringify(mappedDoctor.availability, null, 2),
        );

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

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "ექიმი არ მოიძებნა"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDoctor}>
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Step 2: full-screen appointment scheduler
  if (showAppointmentScheduler) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.schedulerHeader}>
          <TouchableOpacity
            style={styles.schedulerBackButton}
            onPress={() => setShowAppointmentScheduler(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.schedulerHeaderInfo}>
            <Text style={styles.schedulerTitle}>
              {followUp === "true"
                ? "განმეორებითი ვიზიტის დაჯავშნა"
                : "ჯავშნის გაკეთება"}
            </Text>
            <Text style={styles.schedulerSubtitle}>{doctor.name}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.schedulerContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.appointmentSection}>
            <AppointmentScheduler
              workingHours={doctor.workingHours}
              availability={doctor.availability || []}
              totalReviews={doctor.totalReviews || 0}
              reviews={Array.isArray(doctor.reviews) ? doctor.reviews : []}
              doctorId={doctor.id}
              initialMode={
                (appointmentType as "video" | "home-visit") || "video"
              }
              lockMode={lockAppointmentType === "true"}
              followUpAppointmentId={followUpAppointmentId}
              isFollowUp={followUp === "true"}
            />
          </View>
        </ScrollView>
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
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
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
          {/* Rating above name */}

          <View style={styles.nameRow}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
          </View>
          <Text style={styles.specialty}>{doctor.specialization}</Text>
          {doctor.about && <Text style={styles.languages}>{doctor.about}</Text>}
        </View>

        {/* Compact Stats */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="star" size={16} color="#FACC15" />
            <Text style={styles.metaValue}>{doctor.rating || 0}</Text>
            <Text style={styles.metaLabel}>რეიტინგი</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="briefcase-outline" size={16} color="#4B5563" />
            <Text style={styles.metaValue}>
              {doctor.experience ? `${doctor.experience} წელი` : "-"}
            </Text>
          </View>
        </View>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceLabel}>კონსულტაციის საფასური</Text>
            <Text style={styles.priceValue}>
              {doctor.consultationFee || "—"}
            </Text>
            {doctor.followUpFee && (
              <Text style={styles.priceSub}>
                განმეორებითი ვიზიტი: {doctor.followUpFee}
              </Text>
            )}
          </View>
          <View style={styles.priceTag}>
            <Ionicons name="time-outline" size={16} color="#0369A1" />
            <Text style={styles.priceTagText}>30-45 წთ</Text>
          </View>
        </View>

        {/* About Doctor */}
        {(doctor.adminNotes || doctor.about) && (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>ექიმის შესახებ</Text>
            <Text style={styles.aboutText}>{doctor.adminNotes}</Text>
          </View>
        )}

        {/* Payment Information */}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {/* <TouchableOpacity
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => {
            router.push({
              pathname: "/screens/chat/[doctorId]" as any,
              params: { doctorId: doctor.id },
            });
          }}
        >
          <Ionicons name="chatbubbles-outline" size={20} color="#06B6D4" />
          <Text style={styles.chatButtonText}>ჩატი</Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={[styles.actionButton, styles.appointmentButton]}
          onPress={() => setShowAppointmentScheduler(true)}
        >
          <Text style={styles.buttonText}>ჯავშნის გაკეთება</Text>
        </TouchableOpacity>
      </View>

      {/* Education and Experience Modal */}
      <Modal
        visible={showEducationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEducationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>განათლება და გამოცდილება</Text>
              <TouchableOpacity
                onPress={() => setShowEducationModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {doctor.degrees && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>განათლება</Text>
                  <Text style={styles.modalSectionText}>{doctor.degrees}</Text>
                </View>
              )}
              {doctor.experience && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>გამოცდილება</Text>
                  <Text style={styles.modalSectionText}>
                    {doctor.experience} წელი
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DoctorDetail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
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
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#666666",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  doctorName: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  infoButton: {
    padding: 4,
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
  languages: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 4,
  },
  metaValue: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  metaLabel: {
    marginLeft: 4,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#1E3A8A",
  },
  priceValue: {
    marginTop: 4,
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
  },
  priceSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
  },
  priceTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    flexDirection: "row",
    alignItems: "center",
  },
  priceTagText: {
    marginLeft: 6,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  aboutSection: {
    marginBottom: 80,
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
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  actionButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chatButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#06B6D4",
    flexDirection: "row",
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  appointmentButton: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
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
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "space-between",
  },
  schedulerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  schedulerHeaderInfo: {
    flex: 1,
    marginLeft: 12,
    alignItems: "center",
  },
  schedulerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  schedulerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  schedulerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  appointmentSection: {
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    lineHeight: 22,
  },
});
