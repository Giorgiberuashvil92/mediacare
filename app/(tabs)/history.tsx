import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";

const History = () => {
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadPastAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const loadPastAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        setVisits([]);
        return;
      }

      const response = await apiService.getPatientAppointments();
      if (response.success && Array.isArray(response.data)) {
        const mapped = response.data
          .map(mapAppointmentToVisit)
          .filter((visit) => visit && isPastAppointment(visit));
        setVisits(mapped);
      } else {
        setVisits([]);
      }
    } catch (err: any) {
      console.error("History load failed", err);
      setError(err.message || "ვიზიტების ჩატვირთვა ვერ მოხერხდა");
      setVisits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPastAppointments();
  };

  const filteredVisits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return visits;
    }
    return visits.filter((visit) => {
      const searchable = `${visit.doctorName} ${visit.doctorSpecialty} ${visit.diagnosis}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [visits, searchQuery]);

  const openDetails = (visit: any) => {
    setSelectedVisit(visit);
    setShowDetailsModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#06B6D4"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ისტორია</Text>
          <Text style={styles.subtitle}>
            დასრულებული ან გასული ვიზიტები ავტომატურად გადმოდის აქ
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="ძებნა ექიმის, სპეციალობის ან დიაგნოზით..."
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

        {/* Visits List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            {filteredVisits.length} ვიზიტი
          </Text>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#06B6D4" />
              <Text style={styles.loadingText}>იტვირთება ვიზიტების ისტორია...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={64} color="#F87171" />
              <Text style={styles.emptyStateTitle}>ვერ ჩაიტვირთა</Text>
              <Text style={styles.emptyStateText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadPastAppointments}>
                <Text style={styles.retryButtonText}>თავიდან ცდა</Text>
              </TouchableOpacity>
            </View>
          ) : filteredVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>ვიზიტები ვერ მოიძებნა</Text>
              <Text style={styles.emptyStateText}>
                როგორც კი ვიზიტი დასრულდება, ავტომატურად გადმოვა აქ
              </Text>
            </View>
          ) : (
            filteredVisits.map((visit) => (
              <TouchableOpacity
                key={visit.id}
                style={styles.visitCard}
                onPress={() => openDetails(visit)}
              >
                <View style={styles.visitHeader}>
                  <View style={styles.doctorInfo}>
                    <View style={styles.avatarContainer}>
                      <Ionicons name="medical" size={24} color="#06B6D4" />
                    </View>
                    <View style={styles.doctorDetails}>
                      <Text style={styles.doctorName}>{visit.doctorName}</Text>
                      <Text style={styles.doctorSpecialty}>
                        {visit.doctorSpecialty || "სპეციალისტი"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateText}>{visit.date}</Text>
                    {visit.statusLabel ? (
                      <Text style={styles.statusLabel}>{visit.statusLabel}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.visitBody}>
                  <View style={styles.diagnosisRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10B981"
                    />
                    <Text style={styles.diagnosisText}>
                      {visit.diagnosis || "დიაგნოზი არ არის მითითებული"}
                    </Text>
                  </View>

                  {visit.symptoms && visit.symptoms.length > 0 && (
                    <View style={styles.symptomsContainer}>
                      <Text style={styles.symptomsLabel}>სიმპტომები:</Text>
                      <View style={styles.symptomsList}>
                        {visit.symptoms.map((symptom: string, index: number) => (
                          <View key={index} style={styles.symptomTag}>
                            <Text style={styles.symptomText}>{symptom}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {visit.medications && visit.medications.length > 0 && (
                    <View style={styles.medicationsContainer}>
                      <Text style={styles.medicationsLabel}>
                        დანიშნული მედიკამენტები:
                      </Text>
                      <View style={styles.medicationsList}>
                        {visit.medications.slice(0, 3).map((med: any, index: number) => (
                          <View key={index} style={styles.medicationTag}>
                            <Ionicons
                              name="medkit-outline"
                              size={14}
                              color="#8B5CF6"
                            />
                            <Text style={styles.medicationText}>
                              {med.name}
                            </Text>
                          </View>
                        ))}
                        {visit.medications.length > 3 && (
                          <View style={styles.medicationTag}>
                            <Text style={styles.medicationText}>
                              +{visit.medications.length - 3} მეტი
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.visitFooter}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => openDetails(visit)}
                  >
                    <Text style={styles.viewDetailsText}>
                      დეტალურად ნახვა
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="#06B6D4"
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ვიზიტის დეტალები</Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedVisit && (
              <ScrollView style={styles.modalBody}>
                {/* Doctor Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ექიმი</Text>
                  <Text style={styles.detailValue}>{selectedVisit.doctorName}</Text>
                  <Text style={styles.detailSubValue}>
                    {selectedVisit.doctorSpecialty}
                  </Text>
                </View>

                {/* Date */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>თარიღი</Text>
                  <Text style={styles.detailValue}>{selectedVisit.date}</Text>
                </View>

                {/* Diagnosis */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>დიაგნოზი</Text>
                  <Text style={styles.detailValue}>{selectedVisit.diagnosis}</Text>
                </View>

                {/* Symptoms */}
                {selectedVisit.symptoms && selectedVisit.symptoms.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>სიმპტომები</Text>
                    {selectedVisit.symptoms.map((symptom: string, index: number) => (
                      <View key={index} style={styles.listItem}>
                        <Ionicons
                          name="remove-circle"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.listItemText}>{symptom}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Vital Signs */}
                {selectedVisit.vitalSigns && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ვიტალური ნიშნები</Text>
                    <View style={styles.vitalSignsGrid}>
                      <View style={styles.vitalSignCard}>
                        <Ionicons
                          name="pulse"
                          size={20}
                          color="#EF4444"
                        />
                        <Text style={styles.vitalSignLabel}>
                          არტერიული წნევა
                        </Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.bloodPressure}
                        </Text>
                      </View>
                      <View style={styles.vitalSignCard}>
                        <Ionicons name="heart" size={20} color="#10B981" />
                        <Text style={styles.vitalSignLabel}>
                          პულსი
                        </Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.heartRate}
                        </Text>
                      </View>
                      <View style={styles.vitalSignCard}>
                        <Ionicons
                          name="thermometer"
                          size={20}
                          color="#F59E0B"
                        />
                        <Text style={styles.vitalSignLabel}>ტემპერატურა</Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.temperature}
                        </Text>
                      </View>
                      <View style={styles.vitalSignCard}>
                        <Ionicons
                          name="scale"
                          size={20}
                          color="#8B5CF6"
                        />
                        <Text style={styles.vitalSignLabel}>წონა</Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.weight}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Medications */}
                {selectedVisit.medications &&
                  selectedVisit.medications.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        დანიშნული მედიკამენტები
                      </Text>
                      {selectedVisit.medications.map(
                        (med: any, index: number) => (
                          <View key={index} style={styles.medicationCard}>
                            <View style={styles.medicationHeader}>
                              <Ionicons
                                name="medkit-outline"
                                size={20}
                                color="#8B5CF6"
                              />
                              <Text style={styles.medicationName}>
                                {med.name}
                              </Text>
                            </View>
                            <View style={styles.medicationDetails}>
                              <View style={styles.medicationDetailRow}>
                                <Text style={styles.medicationDetailLabel}>
                                  დოზა:
                                </Text>
                                <Text style={styles.medicationDetailValue}>
                                  {med.dosage}
                                </Text>
                              </View>
                              <View style={styles.medicationDetailRow}>
                                <Text style={styles.medicationDetailLabel}>
                                  სიხშირე:
                                </Text>
                                <Text style={styles.medicationDetailValue}>
                                  {med.frequency}
                                </Text>
                              </View>
                              <View style={styles.medicationDetailRow}>
                                <Text style={styles.medicationDetailLabel}>
                                  ხანგრძლივობა:
                                </Text>
                                <Text style={styles.medicationDetailValue}>
                                  {med.duration}
                                </Text>
                              </View>
                              {med.instructions && (
                                <View style={styles.medicationInstructions}>
                                  <Text
                                    style={styles.medicationInstructionsText}
                                  >
                                    {med.instructions}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        )
                      )}
                    </View>
                  )}

                {/* Notes */}
                {selectedVisit.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>შენიშვნები</Text>
                    <Text style={styles.notesText}>{selectedVisit.notes}</Text>
                  </View>
                )}

                {/* Follow-up */}
                {selectedVisit.followUp && selectedVisit.followUp.required && (
                  <View style={styles.detailSection}>
                    <View style={styles.followUpCard}>
                      <Ionicons
                        name="calendar"
                        size={24}
                        color="#06B6D4"
                      />
                      <View style={styles.followUpContent}>
                        <Text style={styles.followUpTitle}>
                          განმეორებითი ვიზიტი
                        </Text>
                        {selectedVisit.followUp.date && (
                          <Text style={styles.followUpDate}>
                            {selectedVisit.followUp.date}
                          </Text>
                        )}
                        {selectedVisit.followUp.reason && (
                          <Text style={styles.followUpReason}>
                            {selectedVisit.followUp.reason}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Form 100 */}
                {selectedVisit.form100 && (
                  <View style={styles.detailSection}>
                    <View style={styles.form100Card}>
                      <View style={styles.form100Header}>
                        <Ionicons
                          name="document-text"
                          size={24}
                          color="#10B981"
                        />
                        <View style={styles.form100Info}>
                          <Text style={styles.form100Title}>
                            ფორმა 100
                          </Text>
                          <Text style={styles.form100Id}>
                            ID: {selectedVisit.form100.id}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.form100Details}>
                        <View style={styles.form100DetailRow}>
                          <Text style={styles.form100DetailLabel}>
                            გაცემის თარიღი:
                          </Text>
                          <Text style={styles.form100DetailValue}>
                            {selectedVisit.form100.issueDate}
                          </Text>
                        </View>
                        <View style={styles.form100DetailRow}>
                          <Text style={styles.form100DetailLabel}>
                            მოქმედებს:
                          </Text>
                          <Text style={styles.form100DetailValue}>
                            {selectedVisit.form100.validUntil}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.form100DownloadButton}>
                        <Ionicons
                          name="download-outline"
                          size={20}
                          color="#10B981"
                        />
                        <Text style={styles.form100DownloadText}>
                          PDF-ის ჩამოტვირთვა
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.modalButtonText}>დახურვა</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const STATUS_LABELS: Record<string, string> = {
  completed: "დასრულებული",
  cancelled: "გაუქმებული",
  "in-progress": "მიმდინარე",
  scheduled: "დანიშნული",
  pending: "მოლოდინში",
};

const mapAppointmentToVisit = (appointment: any) => {
  if (!appointment) {
    return null;
  }

  const doctor =
    typeof appointment.doctorId === "object" ? appointment.doctorId : {};
  const appointmentDate = appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toISOString().split("T")[0]
    : "";

  const rawSymptoms = appointment.symptoms || appointment.patientDetails?.problem;
  let symptoms: string[] = [];
  if (Array.isArray(rawSymptoms)) {
    symptoms = rawSymptoms.filter(Boolean);
  } else if (typeof rawSymptoms === "string" && rawSymptoms.trim().length) {
    symptoms = rawSymptoms.split(",").map((item) => item.trim()).filter(Boolean);
  } else if (rawSymptoms) {
    symptoms = [String(rawSymptoms)];
  }

  const summary = appointment.consultationSummary || {};

  if (summary.symptoms) {
    const summarySymptoms = summary.symptoms
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
    symptoms = Array.from(new Set([...symptoms, ...summarySymptoms]));
  }

  let medications = Array.isArray(appointment.medications)
    ? appointment.medications
    : [];

  if ((!medications || medications.length === 0) && summary.medications) {
    medications = summary.medications
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean)
      .map((name: string) => ({ name }));
  }

  const status = appointment.status || "scheduled";

  return {
    id: appointment._id || appointment.id || Math.random().toString(36).slice(2),
    doctorName: doctor?.name || "უცნობი ექიმი",
    doctorSpecialty: doctor?.specialization || doctor?.speciality || "",
    date: appointmentDate,
    appointmentDate,
    appointmentTime: appointment.appointmentTime || appointment.time || "",
    diagnosis:
      summary.diagnosis ||
      appointment.diagnosis ||
      appointment.patientDetails?.problem ||
      "",
    symptoms,
    medications,
    notes: summary.notes || appointment.notes || "",
    vitalSigns: appointment.vitalSigns || summary.vitals,
    consultationSummary: summary,
    followUp: appointment.followUp,
    form100: appointment.form100,
    status,
    statusLabel: STATUS_LABELS[status],
  };
};

const isPastAppointment = (visit: any) => {
  if (!visit?.appointmentDate) {
    return false;
  }

  const timePart = visit.appointmentTime || "00:00";
  let appointmentDateTime = new Date(`${visit.appointmentDate}T${timePart}`);

  if (Number.isNaN(appointmentDateTime.getTime())) {
    appointmentDateTime = new Date(`${visit.appointmentDate} ${timePart}`);
  }

  if (Number.isNaN(appointmentDateTime.getTime())) {
    appointmentDateTime = new Date(visit.appointmentDate);
  }

  if (Number.isNaN(appointmentDateTime.getTime())) {
    return false;
  }

  return appointmentDateTime.getTime() < Date.now();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
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
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 16,
  },
  visitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  visitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#06B6D410",
    justifyContent: "center",
    alignItems: "center",
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  dateBadge: {
    backgroundColor: "#06B6D410",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  visitBody: {
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
  },
  diagnosisText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  symptomsContainer: {
    gap: 8,
  },
  symptomsLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  symptomsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  symptomTag: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  symptomText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  medicationsContainer: {
    gap: 8,
  },
  medicationsLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  medicationsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  medicationTag: {
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medicationText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#8B5CF6",
  },
  visitFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
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
  loadingState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#06B6D4",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
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
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  detailSubValue: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  listItemText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  vitalSignsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  vitalSignCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  vitalSignLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  vitalSignValue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  medicationCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  medicationDetails: {
    gap: 4,
  },
  medicationDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  medicationDetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  medicationDetailValue: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  medicationInstructions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  medicationInstructionsText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    fontStyle: "italic",
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 20,
  },
  followUpCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F0FDFA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#06B6D4",
  },
  followUpContent: {
    flex: 1,
  },
  followUpTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#06B6D4",
    marginBottom: 4,
  },
  followUpDate: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  followUpReason: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  form100Card: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  form100Header: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  form100Info: {
    flex: 1,
  },
  form100Title: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#10B981",
    marginBottom: 2,
  },
  form100Id: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  form100Details: {
    gap: 8,
    marginBottom: 16,
  },
  form100DetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  form100DetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  form100DetailValue: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  form100DownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 8,
    padding: 12,
  },
  form100DownloadText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
});

export default History;
