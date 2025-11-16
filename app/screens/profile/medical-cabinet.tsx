import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

interface VisitRecord {
  id: string;
  date: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentId?: string;
}

type TabType = "records" | "personal-info";

export default function MedicalCabinetScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("personal-info");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [birthPlace, setBirthPlace] = useState<string>("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>("");
  const [hasChronicDisease, setHasChronicDisease] = useState(false);
  const [chronicDiseaseText, setChronicDiseaseText] = useState<string>("");
  const [hasAllergy, setHasAllergy] = useState(false);
  const [allergyText, setAllergyText] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [patientVisits, setPatientVisits] = useState<VisitRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (activeTab === "records" && user?.id) {
      loadMedicalRecords();
    }
  }, [activeTab, user?.id]);

  const loadMedicalRecords = async () => {
    try {
      setLoadingRecords(true);

      if (apiService.isMockMode()) {
        setLoadingRecords(false);
        return;
      }

      const response = await apiService.getPatientAppointments();

      if (response.success && response.data) {
        // Map appointments to visit records
        const visits: VisitRecord[] = response.data.map((apt: any) => {
          const doctor = apt.doctorId || {};
          return {
            id: apt._id || apt.id || "",
            date: apt.appointmentDate || "",
            doctorName: doctor.name || "ექიმი",
            doctorSpecialty: doctor.specialization || "",
            appointmentId: apt._id || apt.id || "",
          };
        });
        setPatientVisits(visits);
      } else {
        setPatientVisits([]);
      }
    } catch (err: any) {
      console.error("Error loading medical records:", err);
      setPatientVisits([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (date: string) => {
    const visitDate = new Date(date);
    const today = new Date();
    const diffTime = today.getTime() - visitDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return "#10B981"; // ახალი
    if (diffDays <= 30) return "#F59E0B"; // ბოლო თვე
    return "#6B7280"; // ძველი
  };

  const renderVisitCard = (visit: VisitRecord) => {
    const statusColor = getStatusColor(visit.date);

    return (
      <TouchableOpacity
        key={visit.id}
        style={styles.visitCard}
        onPress={() =>
          router.push({
            pathname: "/screens/appointment/appointment-details",
            params: {
              appointmentId: visit.appointmentId || visit.id,
              doctorId: "",
            },
          })
        }
      >
        <View style={styles.visitCardContent}>
          <View style={[styles.visitIconContainer, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name="medical" size={24} color={statusColor} />
          </View>
          <View style={styles.visitInfoContainer}>
            <View style={styles.visitDateRow}>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
              <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
            </View>
            <Text style={styles.doctorName}>{visit.doctorName}</Text>
            <View style={styles.specialtyRow}>
              <Ionicons name="person-circle" size={16} color="#6B7280" />
              <Text style={styles.doctorSpecialty}>
                {visit.doctorSpecialty}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleBack = () => {
    router.back();
  };

  const handleSave = () => {
    // Validate that blood group is selected
    if (!selectedBloodGroup) {
      alert("გთხოვთ აირჩიოთ სისხლის ჯგუფი");
      return;
    }

    // Here you would save the data to your backend/state management
    console.log("Saving personal information:", {
      selectedGender,
      birthDate,
      birthPlace,
      selectedBloodGroup,
      chronicDisease: hasChronicDisease ? chronicDiseaseText : null,
      allergy: hasAllergy ? allergyText : null,
    });

    // Show success modal
    setShowSuccessModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>პირადი კაბინეტი</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "personal-info" && styles.activeTab]}
          onPress={() => handleTabChange("personal-info")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "personal-info" && styles.activeTabText,
            ]}
          >
            ანკეტა
          </Text>
          {activeTab === "personal-info" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "records" && styles.activeTab]}
          onPress={() => handleTabChange("records")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "records" && styles.activeTabText,
            ]}
          >
            ისტორია
          </Text>
          {activeTab === "records" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "records" ? (
          <View style={styles.recordsContainer}>
            {/* Summary Stats */}
            <View style={styles.summarySection}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="document-text" size={24} color="#06B6D4" />
                </View>
                <Text style={styles.summaryValue}>{patientVisits.length}</Text>
                <Text style={styles.summaryLabel}>სულ ვიზიტი</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="medical" size={24} color="#10B981" />
                </View>
                <Text style={styles.summaryValue}>
                  {patientVisits.filter((v) => {
                    const visitDate = new Date(v.date);
                    const today = new Date();
                    const diffDays = Math.ceil((today.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays <= 15;
                  }).length}
                </Text>
                <Text style={styles.summaryLabel}>ბოლო 15 დღე</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="calendar" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.summaryValue}>
                  {patientVisits.filter((v) => {
                    const visitDate = new Date(v.date);
                    const today = new Date();
                    return visitDate >= today;
                  }).length}
                </Text>
                <Text style={styles.summaryLabel}>მომავალი</Text>
              </View>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#06B6D4" />
              <Text style={styles.infoText}>
                დააჭირეთ ვიზიტს დეტალური ინფორმაციისთვის
              </Text>
            </View>

            {/* Visits List */}
            <View style={styles.visitsSection}>
              {loadingRecords ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#06B6D4" />
                  <Text style={styles.loadingText}>მონაცემების ჩატვირთვა...</Text>
                </View>
              ) : patientVisits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>
                    მედიცინური ჩანაწერები ვერ მოიძებნა
                  </Text>
                  <Text style={styles.emptyStateText}>
                    თქვენ არ გაქვთ დაჯავშნილი ვიზიტები
                  </Text>
                </View>
              ) : (
                patientVisits.map((visit) => renderVisitCard(visit))
              )}
            </View>
          </View>
        ) : (
          <View style={styles.personalInfoContainer}>
            {/* Personal Information Form */}
            <View style={styles.formSection}>
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="person" size={20} color="#06B6D4" />
                  <Text style={styles.label}>სქესი</Text>
                </View>
                <View style={styles.genderOptions}>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      selectedGender === "male" && styles.genderOptionSelected,
                    ]}
                    onPress={() => setSelectedGender("male")}
                  >
                    <Ionicons
                      name="male"
                      size={20}
                      color={selectedGender === "male" ? "#06B6D4" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        selectedGender === "male" && styles.genderTextSelected,
                      ]}
                    >
                      მამრობითი
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderOption,
                      selectedGender === "female" && styles.genderOptionSelected,
                    ]}
                    onPress={() => setSelectedGender("female")}
                  >
                    <Ionicons
                      name="female"
                      size={20}
                      color={
                        selectedGender === "female" ? "#06B6D4" : "#6B7280"
                      }
                    />
                    <Text
                      style={[
                        styles.genderText,
                        selectedGender === "female" && styles.genderTextSelected,
                      ]}
                    >
                      მდედრობითი
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="calendar" size={20} color="#06B6D4" />
                  <Text style={styles.label}>დაბადების თარიღი</Text>
                </View>
                <View style={styles.input}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="მაგალითად: 1990-01-15"
                    placeholderTextColor="#9CA3AF"
                    value={birthDate}
                    onChangeText={setBirthDate}
                  />
                </View>
              </View>

              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="location" size={20} color="#06B6D4" />
                  <Text style={styles.label}>დაბადების ადგილი</Text>
                </View>
                <View style={styles.input}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="მაგალითად: თბილისი"
                    placeholderTextColor="#9CA3AF"
                    value={birthPlace}
                    onChangeText={setBirthPlace}
                  />
                </View>
              </View>

              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="water" size={20} color="#06B6D4" />
                  <Text style={styles.label}>სისხლის ჯგუფი</Text>
                </View>
                <View style={styles.bloodGroupOptions}>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "A+" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("A+")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "A+" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      A+
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "A-" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("A-")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "A-" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      A-
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "B+" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("B+")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "B+" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      B+
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "B-" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("B-")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "B-" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      B-
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "AB+" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("AB+")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "AB+" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      AB+
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "AB-" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("AB-")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "AB-" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      AB-
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "O+" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("O+")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "O+" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      O+
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bloodGroupOption,
                      selectedBloodGroup === "O-" &&
                        styles.bloodGroupOptionSelected,
                    ]}
                    onPress={() => setSelectedBloodGroup("O-")}
                  >
                    <Text
                      style={[
                        styles.bloodGroupText,
                        selectedBloodGroup === "O-" &&
                          styles.bloodGroupTextSelected,
                      ]}
                    >
                      O-
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Chronic Disease Section */}
              <View style={styles.formItem}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setHasChronicDisease(!hasChronicDisease)}
                  >
                    {hasChronicDisease && (
                      <Ionicons name="checkmark" size={20} color="#06B6D4" />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>ქრონიკული დაავადება</Text>
                </View>
                {hasChronicDisease && (
                  <View style={[styles.input, { marginTop: 12 }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="მიუთითეთ თქვენი ქრონიკული დაავადება"
                      placeholderTextColor="#9CA3AF"
                      value={chronicDiseaseText}
                      onChangeText={setChronicDiseaseText}
                      multiline
                    />
                  </View>
                )}
              </View>

              {/* Allergy Section */}
              <View style={styles.formItem}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setHasAllergy(!hasAllergy)}
                  >
                    {hasAllergy && (
                      <Ionicons name="checkmark" size={20} color="#06B6D4" />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>ალერგია</Text>
                </View>
                {hasAllergy && (
                  <View style={[styles.input, { marginTop: 12 }]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="მიუთითეთ თქვენი ალერგია"
                      placeholderTextColor="#9CA3AF"
                      value={allergyText}
                      onChangeText={setAllergyText}
                      multiline
                    />
                  </View>
                )}
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>შენახვა</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#06B6D4" />
            </View>
            <Text style={styles.modalTitle}>შენახულია</Text>
            <Text style={styles.modalMessage}>
              თქვენი პერსონალური ინფორმაცია წარმატებით შენახულია
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/(tabs)");
              }}
            >
              <Text style={styles.modalButtonText}>კარგი</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: "relative",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#E6FFFA",
  },
  tabText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#0F766E",
    fontFamily: "Poppins-Bold",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "10%",
    right: "10%",
    height: 3,
    backgroundColor: "#0F766E",
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  // Records Tab Styles
  recordsContainer: {
    paddingTop: 20,
  },
  summarySection: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FDFA",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#06B6D4",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#0F766E",
  },
  visitsSection: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  visitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  visitCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  visitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  visitInfoContainer: {
    flex: 1,
    gap: 4,
  },
  visitDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  visitDate: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  specialtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  doctorSpecialty: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  // Personal Info Tab Styles
  personalInfoContainer: {
    paddingTop: 20,
  },
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formItem: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  genderOptions: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  genderOptionSelected: {
    backgroundColor: "#E6FFFA",
    borderColor: "#06B6D4",
  },
  genderText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  genderTextSelected: {
    color: "#06B6D4",
    fontFamily: "Poppins-SemiBold",
  },
  datePicker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textInput: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  bloodGroupOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bloodGroupOption: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  bloodGroupOptionSelected: {
    backgroundColor: "#E6FFFA",
    borderColor: "#06B6D4",
  },
  bloodGroupText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  bloodGroupTextSelected: {
    color: "#06B6D4",
    fontFamily: "Poppins-SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  saveButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 40,
    minWidth: 280,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    minWidth: 120,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
});

