import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Patient } from "../../assets/data/doctorDashboard";
import { useAuth } from "../contexts/AuthContext";

export default function DoctorPatients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterGender, setFilterGender] = useState<"all" | "male" | "female">(
    "all"
  );

  useEffect(() => {
    if (user?.id) {
      loadPatients();
    }
     
  }, [user?.id]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled. Please disable USE_MOCK_API.",
        );
      }

      console.log('👥 Loading patients for doctor:', user?.id);
      console.log('🌐 API Base URL:', apiService.getBaseURL());
      
      const response = await apiService.getDoctorPatients();
      
      console.log('👥 Patients API response:', {
        success: response.success,
        dataLength: response.data?.length || 0,
        data: response.data
      });

      if (response.success && response.data) {
        setPatients(response.data);
        console.log('👥 Patients loaded:', response.data.length);
      } else {
        console.warn('👥 No patients data in response');
        setPatients([]);
      }
    } catch (err: any) {
      console.error("Error loading patients:", err);
      setError(err.message || "პაციენტების ჩატვირთვა ვერ მოხერხდა");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  // Filter patients
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender =
      filterGender === "all" || patient.gender === filterGender;
    return matchesSearch && matchesGender;
  });

  const openDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  const getGenderIcon = (gender: "male" | "female") => {
    return gender === "male" ? "man" : "woman";
  };

  const getGenderColor = (gender: "male" | "female") => {
    return gender === "male" ? "#06B6D4" : "#EC4899";
  };

  if (loading && patients.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>პაციენტების ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && patients.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadPatients}
          >
            <LinearGradient
              colors={["#06B6D4", "#0891B2"]}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>პაციენტები</Text>
            <Text style={styles.subtitle}>სულ {patients.length} პაციენტი</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <LinearGradient
              colors={["#06B6D4", "#0891B2"]}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="ძებნა სახელით, ტელეფონით, ელ-ფოსტით..."
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

        {/* Gender Filter */}
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterGender === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setFilterGender("all")}
          >
            <Ionicons
              name="people"
              size={20}
              color={filterGender === "all" ? "#06B6D4" : "#6B7280"}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterGender === "all" && styles.filterButtonTextActive,
              ]}
            >
              ყველა ({patients.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterGender === "male" && styles.filterButtonActive,
            ]}
            onPress={() => setFilterGender("male")}
          >
            <Ionicons
              name="man"
              size={20}
              color={filterGender === "male" ? "#06B6D4" : "#6B7280"}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterGender === "male" && styles.filterButtonTextActive,
              ]}
            >
              მამრობითი ({patients.filter((p) => p.gender === "male").length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterGender === "female" && styles.filterButtonActive,
            ]}
            onPress={() => setFilterGender("female")}
          >
            <Ionicons
              name="woman"
              size={20}
              color={filterGender === "female" ? "#EC4899" : "#6B7280"}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterGender === "female" && styles.filterButtonTextActive,
              ]}
            >
              მდედრობითი ({patients.filter((p) => p.gender === "female").length}
              )
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patients List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredPatients.length} პაციენტი
            </Text>
          </View>

          {filteredPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="people-outline" size={56} color="#06B6D4" />
              </View>
              <Text style={styles.emptyStateTitle}>
                პაციენტები ვერ მოიძებნა
              </Text>
              <Text style={styles.emptyStateText}>
                სცადეთ განსხვავებული ძიება
              </Text>
            </View>
          ) : (
            filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                onPress={() => openDetails(patient)}
              >
                <View style={styles.patientHeader}>
                  <View style={styles.patientInfo}>
                    <View
                      style={[
                        styles.avatarContainer,
                        {
                          backgroundColor: `${getGenderColor(
                            patient.gender
                          )}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getGenderIcon(patient.gender)}
                        size={28}
                        color={getGenderColor(patient.gender)}
                      />
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <View style={styles.patientMeta}>
                        <Text style={styles.patientAge}>
                          {patient.age} წლის
                        </Text>
                        <View style={styles.metaDivider} />
                        <Text style={styles.patientBlood}>
                          {patient.bloodType}
                        </Text>
                        <View style={styles.metaDivider} />
                        <Text style={styles.patientVisits}>
                          {patient.totalVisits} ვიზიტი
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>

                <View style={styles.patientBody}>
                  {/* Contact Info */}
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color="#6B7280" />
                    <Text style={styles.infoText}>{patient.phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="mail" size={16} color="#6B7280" />
                    <Text style={styles.infoText}>{patient.email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {patient.address}
                    </Text>
                  </View>

                  {/* Chronic Diseases */}
                  {patient.chronicDiseases.length > 0 && (
                    <View style={styles.diseasesContainer}>
                      <View style={styles.diseasesHeader}>
                        <MaterialCommunityIcons
                          name="alert-circle"
                          size={16}
                          color="#EF4444"
                        />
                        <Text style={styles.diseasesTitle}>
                          ქრონიკული დაავადებები:
                        </Text>
                      </View>
                      <View style={styles.diseasesTags}>
                        {patient.chronicDiseases.map((disease, index) => (
                          <View key={index} style={styles.diseaseTag}>
                            <Text style={styles.diseaseTagText}>{disease}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Allergies */}
                  {patient.allergies.length > 0 &&
                    patient.allergies[0] !== "არა" && (
                      <View style={styles.allergiesContainer}>
                        <View style={styles.allergiesHeader}>
                          <MaterialCommunityIcons
                            name="allergy"
                            size={16}
                            color="#F59E0B"
                          />
                          <Text style={styles.allergiesTitle}>ალერგიები:</Text>
                        </View>
                        <View style={styles.allergiesTags}>
                          {patient.allergies.map((allergy, index) => (
                            <View key={index} style={styles.allergyTag}>
                              <Text style={styles.allergyTagText}>
                                {allergy}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                </View>

                <View style={styles.patientFooter}>
                  <View style={styles.footerItem}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.footerText}>
                      ბოლო ვიზიტი: 
                    </Text>
                  </View>
                  {patient.nextAppointment && (
                    <View style={styles.nextAppointmentBadge}>
                      <Ionicons name="calendar" size={14} color="#06B6D4" />
                      <Text style={styles.nextAppointmentText}>
                        {patient.nextAppointment}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Patient Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>პაციენტის დეტალები</Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <ScrollView style={styles.modalBody}>
                {/* Patient Info */}
                <View style={styles.modalSection}>
                  <View style={styles.modalPatientHeader}>
                    <View
                      style={[
                        styles.modalAvatar,
                        {
                          backgroundColor: `${getGenderColor(
                            selectedPatient.gender
                          )}15`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getGenderIcon(selectedPatient.gender)}
                        size={40}
                        color={getGenderColor(selectedPatient.gender)}
                      />
                    </View>
                    <View>
                      <Text style={styles.modalPatientName}>
                        {selectedPatient.name}
                      </Text>
                      <Text style={styles.modalPatientMeta}>
                        {selectedPatient.age} წლის • {selectedPatient.bloodType}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Contact Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    საკონტაქტო ინფორმაცია
                  </Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={20} color="#06B6D4" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>ტელეფონი</Text>
                      <Text style={styles.detailValue}>
                        {selectedPatient.phone}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail" size={20} color="#06B6D4" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>ელ-ფოსტა</Text>
                      <Text style={styles.detailValue}>
                        {selectedPatient.email}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color="#06B6D4" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>მისამართი</Text>
                      <Text style={styles.detailValue}>
                        {selectedPatient.address}
                      </Text>
                    </View>
                  </View>
                  {selectedPatient.dateOfBirth && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={20} color="#06B6D4" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>დაბადების თარიღი</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedPatient.dateOfBirth).toLocaleDateString('ka-GE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Medical Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    სამედიცინო ინფორმაცია
                  </Text>

                  {selectedPatient.chronicDiseases.length > 0 && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={20}
                        color="#EF4444"
                      />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          ქრონიკული დაავადებები
                        </Text>
                        {selectedPatient.chronicDiseases.map(
                          (disease, index) => (
                            <Text key={index} style={styles.detailListItem}>
                              • {disease}
                            </Text>
                          )
                        )}
                      </View>
                    </View>
                  )}

                  {selectedPatient.allergies.length > 0 &&
                    selectedPatient.allergies[0] !== "არა" && (
                      <View style={styles.detailRow}>
                        <MaterialCommunityIcons
                          name="allergy"
                          size={20}
                          color="#F59E0B"
                        />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>ალერგიები</Text>
                          {selectedPatient.allergies.map((allergy, index) => (
                            <Text key={index} style={styles.detailListItem}>
                              • {allergy}
                            </Text>
                          ))}
                        </View>
                      </View>
                    )}

                  {selectedPatient.currentMedications.length > 0 && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons
                        name="pill"
                        size={20}
                        color="#10B981"
                      />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          მიმდინარე მედიკამენტები
                        </Text>
                        {selectedPatient.currentMedications.map(
                          (medication, index) => (
                            <Text key={index} style={styles.detailListItem}>
                              • {medication}
                            </Text>
                          )
                        )}
                      </View>
                    </View>
                  )}
                </View>

                {/* Emergency Contact */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    გადაუდებელი კონტაქტი
                  </Text>
                  <View style={styles.emergencyCard}>
                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                    <View style={styles.emergencyInfo}>
                      <Text style={styles.emergencyName}>
                        {selectedPatient.emergencyContact.name}
                      </Text>
                      <Text style={styles.emergencyRelation}>
                        {selectedPatient.emergencyContact.relation}
                      </Text>
                      <Text style={styles.emergencyPhone}>
                        {selectedPatient.emergencyContact.phone}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Insurance */}
                {selectedPatient.insuranceInfo && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      სადაზღვევო ინფორმაცია
                    </Text>
                    <View style={styles.insuranceCard}>
                      <MaterialCommunityIcons
                        name="shield-check"
                        size={24}
                        color="#06B6D4"
                      />
                      <View style={styles.insuranceInfo}>
                        <Text style={styles.insuranceProvider}>
                          {selectedPatient.insuranceInfo.provider}
                        </Text>
                        <Text style={styles.insurancePolicy}>
                          პოლისი: {selectedPatient.insuranceInfo.policyNumber}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Notes */}
                {selectedPatient.notes && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>შენიშვნები</Text>
                    <View style={styles.notesCard}>
                      <Text style={styles.notesText}>
                        {selectedPatient.notes}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Visit Statistics */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    ვიზიტების სტატისტიკა
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {selectedPatient.totalVisits}
                      </Text>
                      <Text style={styles.statLabel}>სულ ვიზიტი</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <LinearGradient
                  colors={["#06B6D4", "#0891B2"]}
                  style={styles.modalButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.modalButtonText}>დახურვა</Text>
                </LinearGradient>
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
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
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
  filterSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0FDFA",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#06B6D4",
  },
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 6,
  },
  patientMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  patientAge: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  patientBlood: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: "#EF4444",
  },
  patientVisits: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  patientBody: {
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  diseasesContainer: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  diseasesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  diseasesTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#EF4444",
  },
  diseasesTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  diseaseTag: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  diseaseTagText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#DC2626",
  },
  allergiesContainer: {
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  allergiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  allergiesTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#F59E0B",
  },
  allergiesTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  allergyTag: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  allergyTagText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#D97706",
  },
  patientFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  nextAppointmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5EEAD4",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nextAppointmentText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
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
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalPatientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  modalPatientName: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  modalPatientMeta: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  detailListItem: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    marginTop: 4,
  },
  emergencyCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyName: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  emergencyRelation: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 4,
  },
  emergencyPhone: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#EF4444",
  },
  insuranceCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#F0FDFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#5EEAD4",
  },
  insuranceInfo: {
    flex: 1,
  },
  insuranceProvider: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  insurancePolicy: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  notesCard: {
    padding: 16,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalButtonGradient: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
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
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    overflow: "hidden",
    borderRadius: 8,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});
