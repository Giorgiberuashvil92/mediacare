import CommonSymptoms from "@/app/components/ui/commonSymptoms";
import TopDoctors from "@/app/components/ui/topDoctors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
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
import { apiService, Specialization } from "../../services/api";

// Icon mapping for specializations
const getIconForSpecialization = (name: string) => {
  const iconMap: Record<string, any> = {
    "ნევროლოგია": require("../../../assets/images/icons/brain1.png"),
    "კარდიოლოგია": require("../../../assets/images/icons/cardiology.png"),
    "გინეკოლოგია": require("../../../assets/images/icons/pregnant.png"),
    "პედიატრია": require("../../../assets/images/icons/baby.png"),
    "ალერგოლოგია": require("../../../assets/images/icons/allergy.png"),
    "სტომატოლოგია": require("../../../assets/images/icons/dendist.png"),
    "უროლოგია": require("../../../assets/images/icons/urology.png"),
    "გასტროენტეროლოგია": require("../../../assets/images/icons/gastrology.png"),
    "დერმატოლოგია": require("../../../assets/images/icons/cardiology.png"),
    "ორთოპედია": require("../../../assets/images/icons/brain1.png"),
    "ოფთალმოლოგია": require("../../../assets/images/icons/allergy.png"),
    "ფსიქოლოგია": require("../../../assets/images/icons/phycatry.png"),
  };
  return iconMap[name] || require("../../../assets/images/icons/brain1.png");
};

// Background color mapping
const getBgColorForSpecialization = (name: string) => {
  const colorMap: Record<string, string> = {
    "ნევროლოგია": "#E3F2FD",
    "კარდიოლოგია": "#FFEBEE",
    "გინეკოლოგია": "#F3E5F5",
    "პედიატრია": "#E8F5E8",
    "ალერგოლოგია": "#FFF3E0",
    "სტომატოლოგია": "#E0F2F1",
    "უროლოგია": "#E1F5FE",
    "გასტროენტეროლოგია": "#FCE4EC",
    "დერმატოლოგია": "#FFF8E1",
    "ორთოპედია": "#E8EAF6",
    "ოფთალმოლოგია": "#F1F8E9",
    "ფსიქოლოგია": "#FCE4EC",
  };
  return colorMap[name] || "#E3F2FD";
};

const DepartmentsScreen = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | null>(null);
  const [showSymptomsModal, setShowSymptomsModal] = useState(false);

  useEffect(() => {
    loadSpecializations();
  }, []);

  const loadSpecializations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSpecializations();
      if (response.success) {
        setSpecializations(response.data);
      }
    } catch (error) {
      console.error("Failed to load specializations:", error);
      setSpecializations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecializationPress = (spec: Specialization) => {
    setSelectedSpecialization(spec);
    if (spec.symptoms && spec.symptoms.length > 0) {
      setShowSymptomsModal(true);
    } else {
      // If no symptoms, go directly to doctors list
      router.push(`/screens/doctors/doctors-list?specialty=${spec.name.toLowerCase()}`);
    }
  };

  const handleSymptomPress = (symptom: string) => {
    setShowSymptomsModal(false);
    router.push(`/screens/doctors/doctors-list?symptom=${encodeURIComponent(symptom)}`);
  };

  const handleViewAllDoctors = () => {
    if (selectedSpecialization) {
      setShowSymptomsModal(false);
      router.push(`/screens/doctors/doctors-list?specialty=${selectedSpecialization.name.toLowerCase()}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>სპეციალიზაციები</Text>
        <View style={styles.placeholder} />
      </View>
      <Text
        style={{
          padding: 24,
          fontSize: 16,
          fontFamily: "Poppins-SemiBold",
          color: "#333333",
        }}
      >
        სპეციალიზაციები
      </Text>
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text style={styles.loadingText}>იტვირთება...</Text>
          </View>
        ) : specializations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>სპეციალიზაციები არ მოიძებნა</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {specializations.map((spec) => (
              <TouchableOpacity
                key={spec._id}
                style={styles.departmentCard}
                onPress={() => handleSpecializationPress(spec)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: getBgColorForSpecialization(spec.name) },
                  ]}
                >
                  <Image
                    source={getIconForSpecialization(spec.name)}
                    style={{ width: 48, height: 48 }}
                  />
                </View>
                <Text style={styles.departmentName}>{spec.name}</Text>
                {spec.symptoms && spec.symptoms.length > 0 && (
                  <Text style={styles.symptomsCount}>
                    {spec.symptoms.length} სიმპტომი
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        <CommonSymptoms />
        <TopDoctors />
      </ScrollView>

      {/* Symptoms Modal */}
      <Modal
        visible={showSymptomsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSymptomsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedSpecialization?.name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowSymptomsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            {selectedSpecialization?.symptoms && selectedSpecialization.symptoms.length > 0 ? (
              <>
                <Text style={styles.modalSubtitle}>სიმპტომები:</Text>
                <ScrollView style={styles.symptomsList}>
                  {selectedSpecialization.symptoms.map((symptom, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.symptomItem}
                      onPress={() => handleSymptomPress(symptom)}
                    >
                      <Text style={styles.symptomText}>{symptom}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#06B6D4" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewAllDoctors}
                >
                  <Text style={styles.viewAllButtonText}>
                    ყველა ექიმის ნახვა
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noSymptomsContainer}>
                <Text style={styles.noSymptomsText}>
                  სიმპტომები არ არის დამატებული
                </Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewAllDoctors}
                >
                  <Text style={styles.viewAllButtonText}>
                    ყველა ექიმის ნახვა
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F2F2F7",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 6,
    backgroundColor: "#F2F2F7",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  departmentCard: {
    width: "30%",
    alignItems: "center",
    marginBottom: 16,
    padding: 4,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  departmentName: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#333333",
    textAlign: "center",
  },
  symptomsCount: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#06B6D4",
    marginTop: 4,
    textAlign: "center",
  },
  departmentDescription: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#333333",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  symptomsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  symptomItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 8,
  },
  symptomText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    flex: 1,
  },
  viewAllButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: "center",
  },
  viewAllButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  noSymptomsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noSymptomsText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginBottom: 20,
  },
});

export default DepartmentsScreen;
