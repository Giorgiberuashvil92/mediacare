import DoctorFilters, {
  DoctorFilterOption,
} from "@/app/components/shared/doctorFilters";
import { apiService } from "@/app/services/api";
import Fontisto from "@expo/vector-icons/Fontisto";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const mapDoctorFromAPI = (doctor: any, apiBaseUrl: string) => {
  let imageSource;
  if (doctor.profileImage) {
    imageSource = doctor.profileImage.startsWith("http")
      ? { uri: doctor.profileImage }
      : { uri: `${apiBaseUrl}/${doctor.profileImage}` };
  } else {
    imageSource = require("@/assets/images/doctors/doctor1.png");
  }

  return {
    id: doctor.id || doctor._id,
    name: doctor.name || "",
    specialization: doctor.specialization || "",
    rating: doctor.rating || 0,
    reviewCount: doctor.reviewCount || 0,
    isActive:
      doctor.isActive !== undefined ? Boolean(doctor.isActive) : true,
    image: imageSource,
    degrees: doctor.degrees || "",
    consultationFee: doctor.consultationFee
      ? `$${doctor.consultationFee}`
      : undefined,
  };
};

const TopDoctors = () => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [specLoading, setSpecLoading] = useState(true);

  useEffect(() => {
    loadDoctors();
  }, []);

useEffect(() => {
  const loadSpecializations = async () => {
    try {
      setSpecLoading(true);

      if (apiService.isMockMode()) {
        setSpecializations([]);
        return;
      }

      const response = await apiService.getSpecializations();
      if (response.success) {
        setSpecializations(response.data.filter((spec) => spec.isActive));
      } else {
        setSpecializations([]);
      }
    } catch (error) {
      console.error("Failed to load specializations:", error);
      setSpecializations([]);
    } finally {
      setSpecLoading(false);
    }
  };

  loadSpecializations();
}, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        setDoctors([]);
        return;
      }

      const response = await apiService.getDoctors({ page: 1, limit: 200 });
      if (response.success && response.data?.doctors) {
        const apiBaseUrl = apiService.getBaseURL();
        const mapped = response.data.doctors.map((doctor: any) =>
          mapDoctorFromAPI(doctor, apiBaseUrl),
        );
        setDoctors(mapped);
      } else {
        setDoctors([]);
      }
    } catch (err: any) {
      console.error("Failed to load doctors:", err);
      setError(err.message || "ექიმების ჩატვირთვა ვერ მოხერხდა");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

const fallbackFilters = useMemo<DoctorFilterOption[]>(() => {
  const specializationSet = new Set<string>();
  doctors.forEach((doctor) => {
    const raw = doctor.specialization?.trim();
    if (raw) {
      raw.split(",").forEach((part) => {
        const clean = part.trim();
        if (clean) {
          specializationSet.add(clean);
        }
      });
    }
  });

  return Array.from(specializationSet).map((spec) => ({
    id: spec,
    name: spec,
  }));
}, [doctors]);

const filterOptions = useMemo<DoctorFilterOption[]>(() => {
  const specOptions = specializations.map((spec) => ({
    id: spec.name,
    name: spec.name,
  }));

  const options =
    specOptions.length > 0 ? specOptions : fallbackFilters;

  return [{ id: "all", name: "All Doctors" }, ...options];
}, [specializations, fallbackFilters]);

useEffect(() => {
  if (
    selectedFilter !== "all" &&
    !filterOptions.some((option) => option.id === selectedFilter)
  ) {
    setSelectedFilter("all");
  }
}, [filterOptions, selectedFilter]);

  const filteredDoctors = useMemo(() => {
    if (selectedFilter === "all") {
      return doctors;
    }

    const target = selectedFilter.toLowerCase();
    return doctors.filter((doctor) =>
      doctor.specialization
        ?.toLowerCase()
        .split(",")
        .map((spec) => spec.trim())
        .some((spec) => spec.includes(target)),
    );
  }, [selectedFilter, doctors]);

  const groupedDoctors = useMemo(() => {
    const groups: Record<string, any[]> = {};

    filteredDoctors.forEach((doctor) => {
      const specializations = doctor.specialization
        ?.split(",")
        .map((spec) => spec.trim())
        .filter(Boolean) || ["Other"];

      specializations.forEach((spec) => {
        if (!groups[spec]) {
          groups[spec] = [];
        }
        groups[spec].push(doctor);
      });
    });

    return groups;
  }, [filteredDoctors]);

  const renderDoctorCard = (doctor: any) => (
    <TouchableOpacity
      key={doctor.id}
      style={styles.doctorCard}
      onPress={() =>
        router.push({
          pathname: "/screens/doctors/doctor/[id]",
          params: { id: doctor.id.toString() },
        })
      }
    >
      <View style={styles.imageContainer}>
        <Image source={doctor.image} style={styles.doctorImage} />
        {doctor.isActive && (
          <View style={styles.activeIndicator}>
            <Fontisto name="radio-btn-active" size={18} color="#22C55E" />
          </View>
        )}
      </View>
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{doctor.name}</Text>
        <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>
        <View style={styles.ratingContainer}>
          <View style={styles.ratingLeft}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.doctorRating}>{doctor.rating}</Text>
            <Text style={styles.doctorReviews}>({doctor.reviewCount})</Text>
          </View>
          <TouchableOpacity style={styles.favoriteButton}>
            <Ionicons name="heart-outline" size={20} color="#D4D4D4" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Doctors</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Section */}
      <View style={{ paddingHorizontal: 20 }}>
        <DoctorFilters
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          filters={filterOptions}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20BEB8" />
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDoctors}>
            <Text style={styles.retryText}>თავიდან ცდა</Text>
          </TouchableOpacity>
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>ექიმები ჯერ არ არის დამატებული</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(groupedDoctors).map(
            ([specialization, doctorsList]) => (
              <View key={specialization} style={styles.specializationSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{specialization}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/screens/doctors/doctors-list",
                        params: { specialty: specialization },
                      })
                    }
                  >
                    <Text style={styles.seeAllText}>ყველას ნახვა</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.doctorsScroll}
                >
                  {doctorsList.map((doctor) => renderDoctorCard(doctor))}
                </ScrollView>
              </View>
            ),
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default TopDoctors;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#F2F2F7",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  specializationSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#20BEB8",
  },
  doctorsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  doctorCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    height: 140,
    backgroundColor: "white",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  doctorImage: {
    width: "100%",
    height: "100%",
  },
  doctorInfo: {
    padding: 16,
  },
  doctorName: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doctorRating: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#333333",
  },
  doctorReviews: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#333333",
  },
  favoriteButton: {
    padding: 4,
  },
  activeIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
