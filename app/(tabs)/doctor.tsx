import { apiService } from "@/app/_services/api";
import { useFavorites } from "@/app/contexts/FavoritesContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
  };
};

const Doctor = () => {
  const router = useRouter();
  const { appointmentType, lockAppointmentType } = useLocalSearchParams<{
    appointmentType?: string;
    lockAppointmentType?: string;
  }>();
  const shouldLockAppointmentType =
    lockAppointmentType === "true" && !!appointmentType;
  const hasUsedLockedNavigation = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specializations, setSpecializations] = useState<any[]>([]);

  // Filter options - will be populated from API
  const filterOptions = useMemo(() => {
    const options = [{ id: "all", label: "ყველა" }];
    if (specializations && specializations.length > 0) {
      const activeSpecializations = specializations
        .filter((spec) => spec.isActive !== false)
        .map((spec) => ({
          id: spec.name || spec._id,
          label: spec.name || "უცნობი",
        }));
      options.push(...activeSpecializations);
    }
    return options;
  }, [specializations]);

  useEffect(() => {
    loadSpecializations();
    loadDoctors();
  }, []);

  const loadSpecializations = async () => {
    try {
      const response = await apiService.getSpecializations();
      if (response.success) {
        setSpecializations(response.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load specializations:", err);
      // If API fails, keep empty array - filterOptions will only show "ყველა"
      setSpecializations([]);
    }
  };

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled for doctors screen. Please disable USE_MOCK_API.",
        );
      }

      const response = await apiService.getDoctors({ page: 1, limit: 100 });

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

  // Filter doctors
  const filteredDoctors = useMemo(() => {
    let filtered = doctors;

    // Filter by specialty
    if (selectedFilter !== "all") {
      filtered = filtered.filter((doctor) =>
        doctor.specialization
          ?.toLowerCase()
          .includes(selectedFilter.toLowerCase()),
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((doctor) =>
        doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialization
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
      );
    }

    return filtered;
  }, [doctors, selectedFilter, searchQuery]);

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
    if (shouldLockAppointmentType) {
      hasUsedLockedNavigation.current = true;
    }
    router.push({
      pathname: "/screens/doctors/doctor/[id]",
      params: {
        id: doctorId,
        ...(shouldLockAppointmentType
          ? { appointmentType, lockAppointmentType: "true" }
          : {}),
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      // If we just returned from a locked navigation (video/home-visit shortcut),
      // clear params so the tab shows both appointment types again.
      if (hasUsedLockedNavigation.current && lockAppointmentType === "true") {
        hasUsedLockedNavigation.current = false;
        router.replace("/(tabs)/doctor");
      }
    }, [lockAppointmentType, router]),
  );

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
        <Text style={styles.doctorQualification}>
          {doctor.degrees || ""}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.ratingText}>
            {doctor.rating} ({doctor.reviewCount || doctor.reviews || 0})
          </Text>
        </View>
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
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ექიმები</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="ძებნა ექიმის სახელით..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          data={filterOptions}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(item.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterListContent}
        />
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
          <TouchableOpacity style={styles.retryButton} onPress={loadDoctors}>
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          renderItem={renderDoctorCard}
          keyExtractor={(item, index) => {
            const key = item?.id ?? item?.email ?? item?.name;
            return key ? String(key) : `doctor-${index}`;
          }}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={loadDoctors}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>ექიმები ვერ მოიძებნა</Text>
              <Text style={styles.emptyStateText}>
                სცადეთ განსხვავებული ფილტრები
              </Text>
            </View>
          }
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
                  <Text style={styles.doctorNameModal}>{selectedDoctor.name}</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  lockedFilterBanner: {
    marginTop: 10,
    backgroundColor: "#E0F2FE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    gap: 10,
  },
  lockedFilterTextWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  lockedFilterTextContent: {
    flex: 1,
  },
  lockedFilterTitle: {
    color: "#0F172A",
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
  },
  lockedFilterSubtitle: {
    color: "#475569",
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    marginTop: 2,
  },
  lockedFilterReset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#0284C7",
  },
  lockedFilterResetText: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingLeft: 20,
  },
  filterListContent: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#20BEB8",
    borderColor: "#20BEB8",
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
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
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  doctorImage: {
    width: "100%",
    height: "100%",
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 12,
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
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
    marginBottom: 4,
  },
  doctorQualification: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#F59E0B",
  },
  consultationFee: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  doctorActions: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
  },
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
    paddingVertical: 60,
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
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#20BEB8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default Doctor;
