import { useFavorites } from "@/app/contexts/FavoritesContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavouritesScreen() {
  const { favoriteDoctors, removeFromFavorites } = useFavorites();
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const handleGoBack = () => {
    router.back();
  };

  const handleDoctorPress = (doctorId: number) => {
    router.push({
      pathname: "/screens/doctors/doctor/[id]",
      params: { id: doctorId.toString() },
    });
  };

  const handleRemoveFavorite = async (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowRemoveModal(true);
  };

  const confirmRemoveFavorite = async () => {
    if (selectedDoctor) {
      await removeFromFavorites(selectedDoctor.id);
      setShowRemoveModal(false);
      setSelectedDoctor(null);
    }
  };

  const cancelRemoveFavorite = () => {
    setShowRemoveModal(false);
    setSelectedDoctor(null);
  };

  const renderDoctorCard = ({ item: doctor }: { item: any }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => handleDoctorPress(doctor.id)}
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
        <Text style={styles.consultationFee}>
          {doctor.consultationFee || "არ არის მითითებული"}
        </Text>
      </View>

      <View style={styles.doctorActions}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => handleRemoveFavorite(doctor)}
        >
          <Ionicons name="heart" size={24} color="#EF4444" />
        </TouchableOpacity>

        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.ratingText}>
            {doctor.rating} ({doctor.reviewCount || doctor.reviews || 0})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={64} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Favourite Doctors</Text>
      <Text style={styles.emptyDescription}>
        Start adding doctors to your favourites to see them here
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push("/screens/doctors/topdoctors")}
      >
        <Text style={styles.browseButtonText}>Browse Doctors</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <View style={styles.backButtonIcon}>
            <Ionicons name="arrow-back" size={20} color="#06B6D4" />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Favourite Doctors</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Doctors List */}
      {favoriteDoctors.length > 0 ? (
        <FlatList
          data={favoriteDoctors}
          renderItem={renderDoctorCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
  backButton: {},
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  browseButton: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
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
});
