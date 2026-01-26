import { apiService } from "@/app/_services/api";
import { useFavorites } from "@/app/contexts/FavoritesContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    consultationFee: doctor.consultationFee
      ? `$${doctor.consultationFee}`
      : undefined,
    followUpFee: doctor.followUpFee ? `$${doctor.followUpFee}` : undefined,
    about: doctor.about || "",
    experience: doctor.experience || "",
  };
};

export default function DoctorsListScreen() {
  const { specialty, symptom } = useLocalSearchParams<{ specialty: string; symptom: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadDoctors();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [specialty, symptom, searchQuery]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled for doctors list. Please disable USE_MOCK_API.",
        );
      }


      const response = await apiService.getDoctors({
        specialization: specialty,
        symptom: symptom,
        search: searchQuery,
        page: 1,
        limit: 100,
      });

      if (response.success) {
        const apiBaseUrl = apiService.getBaseURL();
        const mappedDoctors = response.data.doctors.map((doctor: any) =>
          mapDoctorFromAPI(doctor, apiBaseUrl),
        );
        setDoctors(mappedDoctors);
      }
    } catch (err: any) {
      setError(err.message || "ექიმების ჩატვირთვა ვერ მოხერხდა");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter doctors by specialty and search query (for client-side filtering if needed)
  const filteredDoctors = useMemo(() => {
    return doctors;
  }, [doctors]);

  const handleGoBack = () => {
    router.back();
  };

  const handleToggleFavorite = (doctor: (typeof doctors)[0]) => {
    if (isFavorite(doctor.id)) {
      setSelectedDoctor(doctor as any);
      setShowRemoveModal(true);
    } else {
      toggleFavorite(doctor as any);
    }
  };

  const confirmRemoveFavorite = async () => {
    if (selectedDoctor) {
      await toggleFavorite(selectedDoctor as any);
      setShowRemoveModal(false);
      setSelectedDoctor(null);
    }
  };

  const cancelRemoveFavorite = () => {
    setShowRemoveModal(false);
    setSelectedDoctor(null);
  };

  const handleDoctorPress = (doctorId: string) => {
    router.push({
      pathname: "/screens/doctors/doctor/[id]",
      params: { id: doctorId },
    });
  };

  const renderDoctorCard = ({
    item: doctor,
  }: {
    item: (typeof doctors)[0];
  }) => (
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
          <Text style={styles.consultationFee}>
            {doctor.consultationFee}
          </Text>
        )}
      </View>

      <View style={styles.doctorActions}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleToggleFavorite(doctor)}
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
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <View style={styles.backButtonIcon}>
              <Ionicons name="chevron-back" size={20} color="" />
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Doctors list</Text>
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
            <TouchableOpacity style={styles.searchFilterButton}>
              <Ionicons name="options-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Doctors List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#20BEB8" />
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
            <Text style={styles.emptyText}>ექიმები არ მოიძებნა</Text>
          </View>
        ) : (
          <FlatList
            data={filteredDoctors}
            renderItem={renderDoctorCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={loadDoctors}
          />
        )}

        {/* Remove Confirmation Modal */}
        <Modal
          visible={showRemoveModal}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelRemoveFavorite}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>Remove from Favourites?</Text>

              {selectedDoctor && (
                <View style={styles.doctorCardModal}>
                  <View style={styles.doctorImageContainerModal}>
                    <Image
                      source={selectedDoctor.image}
                      style={styles.doctorImageModal}
                    />
                  </View>

                  <View style={styles.doctorInfoModal}>
                    <Text style={styles.doctorNameModal}>
                      {selectedDoctor.name}
                    </Text>
                    <Text style={styles.doctorSpecialtyModal}>
                      {selectedDoctor.specialization}
                    </Text>
                    <Text style={styles.doctorQualificationModal}>
                      {selectedDoctor.degrees || ""}
                    </Text>
                    <View style={styles.doctorDetailsModal}>
                      <View style={styles.consultationFeeModal}>
                        <Text style={styles.consultationFeeTextModal}>
                          {selectedDoctor.consultationFee || "არ არის მითითებული"}
                        </Text>
                      </View>
                      <View style={styles.ratingContainerModal}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.ratingTextModal}>
                          {selectedDoctor.rating} (
                          {selectedDoctor.reviewCount ||
                            selectedDoctor.reviews ||
                            0}
                          )
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.favoriteIconModal}>
                    <Ionicons name="heart" size={20} color="#EF4444" />
                  </View>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelRemoveFavorite}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={confirmRemoveFavorite}
                >
                  <Text style={styles.removeButtonText}>Yes, remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    // marginRight: 15,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    backgroundColor: "white",
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
    marginRight: 40,
  },
  filterButton: {
    // marginLeft: 15,
  },
  filterButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  searchFilterButton: {
    padding: 4,
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
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    minHeight: 300,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 20,
  },
  doctorCardModal: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    alignItems: "center",
  },
  doctorImageContainerModal: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginRight: 16,
    overflow: "hidden",
  },
  doctorImageModal: {
    width: "100%",
    height: "100%",
  },
  doctorInfoModal: {
    flex: 1,
  },
  doctorNameModal: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  doctorSpecialtyModal: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 2,
  },
  doctorQualificationModal: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginBottom: 8,
  },
  doctorDetailsModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  consultationFeeModal: {
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  consultationFeeTextModal: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  ratingContainerModal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingTextModal: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  favoriteIconModal: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
  },
  removeButton: {
    flex: 1,
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  removeButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
});
