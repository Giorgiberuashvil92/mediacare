import { apiService } from "@/app/_services/api";
import { useFavorites } from "@/app/contexts/FavoritesContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    location: doctor.location || "",
    consultationFee: doctor.consultationFee
      ? `₾${doctor.consultationFee}`
      : undefined,
  };
};

export default function HomeVisitDoctorsScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all doctors first
      const response = await apiService.getDoctors({ page: 1, limit: 100 });

      if (response.success) {
        const apiBaseUrl = apiService.getBaseURL();
        const allDoctors = response.data.doctors.map((doctor: any) =>
          mapDoctorFromAPI(doctor, apiBaseUrl),
        );

        // Filter doctors who have home-visit availability
        const doctorsWithHomeVisit: any[] = [];
        
        for (const doctor of allDoctors) {
          try {
            // პაციენტისთვის: forPatient=true, რომ დაჯავშნილი სლოტები ჩანდეს
            const availabilityResponse = await apiService.getDoctorAvailability(
              doctor.id,
              "home-visit",
              true,
            );
            
            if (
              availabilityResponse.success &&
              availabilityResponse.data &&
              availabilityResponse.data.length > 0
            ) {
              // Check if doctor has at least one available day
              const hasAvailableSlots = availabilityResponse.data.some(
                (day: any) => day.isAvailable && day.timeSlots?.length > 0,
              );
              
              if (hasAvailableSlots) {
                doctorsWithHomeVisit.push(doctor);
              }
            }
          } catch (err) {
            // Skip doctor if availability check fails
            console.error(`Error checking availability for doctor ${doctor.id}:`, err);
          }
        }

        setDoctors(doctorsWithHomeVisit);
      }
    } catch (err: any) {
      setError(err.message || "ექიმების ჩატვირთვა ვერ მოხერხდა");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doctor) =>
    searchQuery
      ? doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  const handleDoctorPress = (doctorId: string) => {
    router.push({
      pathname: "/screens/doctors/doctor/[id]",
      params: {
        id: doctorId,
        appointmentType: "home-visit",
        lockAppointmentType: "true",
      },
    });
  };

  const renderDoctorCard = ({ item: doctor }: { item: (typeof doctors)[0] }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => handleDoctorPress(doctor.id.toString())}
    >
      <View style={styles.doctorImageContainer}>
        <Image source={doctor.image} style={styles.doctorImage} />
      </View>

      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{doctor.name}</Text>
        <Text style={styles.doctorSpecialty}>{doctor.specialization}</Text>
        {doctor.degrees && (
          <Text style={styles.doctorQualification}>{doctor.degrees}</Text>
        )}
        {doctor.consultationFee && (
          <Text style={styles.consultationFee}>{doctor.consultationFee}</Text>
        )}
      </View>

      <View style={styles.doctorActions}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(doctor as any)}
        >
          <Ionicons
            name={isFavorite(doctor.id) ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite(doctor.id) ? "#EF4444" : "#9CA3AF"}
          />
        </TouchableOpacity>

        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.ratingText}>
            {doctor.rating} ({doctor.reviewCount})
          </Text>
        </View>

        <View style={styles.homeVisitBadge}>
          <Ionicons name="home" size={16} color="#06B6D4" />
          <Text style={styles.homeVisitText}>ბინაზე ვიზიტი</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ბინაზე გამოძახება</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="მოძებნე ექიმი"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Doctors List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text style={styles.loadingText}>ექიმების ჩატვირთვა...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadDoctors}
            >
              <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDoctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {searchQuery
                ? "ექიმები არ მოიძებნა"
                : "ბინაზე გამოძახების სერვისი არ არის ხელმისაწვდომი"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDoctors}
            renderItem={renderDoctorCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    backgroundColor: "#FFFFFF",
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  doctorCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 16,
    overflow: "hidden",
  },
  doctorImage: {
    width: "100%",
    height: "100%",
  },
  doctorInfo: {
    flex: 1,
    justifyContent: "center",
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    marginBottom: 4,
  },
  doctorQualification: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 8,
  },
  consultationFee: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  doctorActions: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  favoriteButton: {
    padding: 4,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  homeVisitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E0F2FE",
  },
  homeVisitText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
  },
});

