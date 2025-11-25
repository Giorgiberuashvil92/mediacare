import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Consultation,
  getConsultationTypeLabel,
  getStatusColor,
  getStatusLabel,
} from "../../assets/data/doctorDashboard";
import { apiService } from "../services/api";

export default function DoctorAppointments() {
  const router = useRouter();
  const FORM100_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const createEmptyAppointmentData = () => ({
    diagnosis: "",
    symptoms: "",
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    weight: "",
    medications: "",
    followUpRequired: false,
    followUpDate: "",
    followUpTime: "",
    followUpReason: "",
    notes: "",
  });

  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "scheduled" | "in-progress" | "cancelled"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const resetAppointmentForm = () => {
    setAppointmentData(createEmptyAppointmentData());
    setForm100File(null);
  };
  const [currentTime, setCurrentTime] = useState(new Date());
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Appointment form state
  const [appointmentData, setAppointmentData] = useState(createEmptyAppointmentData);
  const [form100File, setForm100File] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // Fetch consultations from API
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.getDoctorDashboardAppointments(100);

        if (response.success) {
          setConsultations(response.data as any);
        } else {
          setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
        }
      } catch (err) {
        console.error("Error fetching consultations:", err);
        setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, []);

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Function to calculate time until consultation
  const getTimeUntilConsultation = (consultation: Consultation) => {
    const consultationDateTime = new Date(
      `${consultation.date}T${consultation.time}`
    );
    const diff = consultationDateTime.getTime() - currentTime.getTime();

    if (diff < 0) return null; // Past consultation

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} დღეში`;
    } else if (hours > 0) {
      return `${hours} საათში`;
    } else if (minutes > 0) {
      return `${minutes} წუთში`;
    } else {
      return "ახლა";
    }
  };

  // Check if consultation is starting soon (within 30 minutes)
  const isConsultationSoon = (consultation: Consultation) => {
    const consultationDateTime = new Date(
      `${consultation.date}T${consultation.time}`
    );
    const diff = consultationDateTime.getTime() - currentTime.getTime();
    return diff > 0 && diff <= 30 * 60 * 1000; // 30 minutes
  };

  // Filter consultations
  const filteredConsultations = consultations.filter((consultation) => {
    const matchesStatus =
      filterStatus === "all" || consultation.status === filterStatus;
    const matchesSearch = consultation.patientName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const stats = {
    all: consultations.length,
    completed: consultations.filter((c) => c.status === "completed").length,
    scheduled: consultations.filter((c) => c.status === "scheduled").length,
    inProgress: consultations.filter((c) => c.status === "in-progress").length,
  };

  const updateConsultationState = (updated: Consultation) => {
    setConsultations((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const buildFileUrl = (filePath?: string | null) => {
    if (!filePath) {
      return null;
    }
    if (filePath.startsWith("http")) {
      return filePath;
    }
    const base = apiService.getBaseURL();
    const normalized = filePath.startsWith("/")
      ? filePath.slice(1)
      : filePath;
    return `${base}/${normalized}`;
  };

  const openForm100File = (filePath?: string | null) => {
    const url = buildFileUrl(filePath);
    if (!url) {
      Alert.alert("ფაილი ვერ მოიძებნა");
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert("შეცდომა", "ფაილის გახსნა ვერ მოხერხდა")
    );
  };

  const handlePickForm100File = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        return;
      }

      if (asset.size && asset.size > FORM100_MAX_FILE_SIZE) {
        Alert.alert(
          "ფაილი ძალიან დიდია",
          "მაქსიმუმ 5MB ზომის PDF ან გამოსახულება აირჩიეთ."
        );
        return;
      }

      setForm100File(asset);
    } catch (error) {
      console.error("Failed to pick Form 100 file", error);
      Alert.alert("შეცდომა", "ფორმა 100-ის ატვირთვა ვერ მოხერხდა");
    }
  };

  const openDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);
  };

  const openAppointment = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    const summary = consultation.consultationSummary;
    let followUpTime = "";
    if (consultation.followUp?.date) {
      const followUpDate = new Date(consultation.followUp.date);
      if (!Number.isNaN(followUpDate.getTime())) {
        followUpTime = followUpDate.toISOString().split("T")[1]?.slice(0, 5) || "";
      }
    }
    setAppointmentData({
      diagnosis:
        summary?.diagnosis || consultation.diagnosis || "",
      symptoms:
        summary?.symptoms || consultation.symptoms || "",
      bloodPressure: summary?.vitals?.bloodPressure || "",
      heartRate: summary?.vitals?.heartRate || "",
      temperature: summary?.vitals?.temperature || "",
      weight: summary?.vitals?.weight || "",
      medications: summary?.medications || "",
      notes: summary?.notes || "",
      followUpRequired: consultation.followUp?.required ?? false,
      followUpDate: consultation.followUp?.date
        ? consultation.followUp?.date.split("T")[0]
        : "",
      followUpTime,
      followUpReason: consultation.followUp?.reason || "",
    });
    setForm100File(null);
    setShowAppointmentModal(true);
  };

  const handleSaveAppointment = async () => {
    if (!selectedConsultation) {
      return;
    }

    if (!appointmentData.diagnosis.trim()) {
      alert("გთხოვთ შეიყვანოთ დიაგნოზი");
      return;
    }

    if (
      appointmentData.followUpRequired &&
      (!appointmentData.followUpDate.trim() ||
        !appointmentData.followUpTime.trim())
    ) {
      alert("გთხოვთ მიუთითოთ განმეორებითი ვიზიტის თარიღი და დრო");
      return;
    }

    try {
      setSavingAppointment(true);

      const payload = {
        status: "completed" as const,
        consultationSummary: {
          diagnosis: appointmentData.diagnosis.trim(),
          symptoms: appointmentData.symptoms.trim() || undefined,
          medications: appointmentData.medications.trim() || undefined,
          notes: appointmentData.notes.trim() || undefined,
          vitals: {
            bloodPressure: appointmentData.bloodPressure.trim() || undefined,
            heartRate: appointmentData.heartRate.trim() || undefined,
            temperature: appointmentData.temperature.trim() || undefined,
            weight: appointmentData.weight.trim() || undefined,
          },
        },
        followUp: appointmentData.followUpRequired
          ? {
              required: true,
              date: appointmentData.followUpDate
                ? new Date(appointmentData.followUpDate).toISOString()
                : undefined,
              reason: appointmentData.followUpReason.trim() || undefined,
            }
          : { required: false },
      };

      let latestConsultation: Consultation | null = selectedConsultation;

      const response = await apiService.updateDoctorAppointment(
        selectedConsultation.id,
        payload
      );

      if (response.success && response.data) {
        latestConsultation = response.data as Consultation;
        updateConsultationState(latestConsultation);
      }

      if (
        appointmentData.followUpRequired &&
        appointmentData.followUpDate.trim() &&
        appointmentData.followUpTime.trim()
      ) {
        const followUpResponse = await apiService.scheduleFollowUpAppointment(
          selectedConsultation.id,
          {
            date: appointmentData.followUpDate.trim(),
            time: appointmentData.followUpTime.trim(),
            reason: appointmentData.followUpReason.trim() || undefined,
          }
        );

        if (followUpResponse.success && followUpResponse.data) {
          setConsultations((prev) => [
            followUpResponse.data as Consultation,
            ...prev,
          ]);
        }
      }

      if (form100File) {
        const formResponse = await apiService.uploadForm100Document(
          selectedConsultation.id,
          {
            diagnosis: appointmentData.diagnosis.trim() || undefined,
          },
          form100File
            ? {
                uri: form100File.uri,
                name: form100File.name,
                mimeType: form100File.mimeType,
              }
            : undefined
        );

        if (formResponse.success && formResponse.data) {
          latestConsultation = formResponse.data as Consultation;
          updateConsultationState(latestConsultation);
        }
      }

      if (latestConsultation) {
        setSelectedConsultation(latestConsultation);
      }

      setShowAppointmentModal(false);
      setShowSuccessModal(true);
      resetAppointmentForm();
    } catch (error: any) {
      console.error("Failed to save appointment summary", error);
      alert(
        error?.message || "დანიშნულების შენახვა ვერ მოხერხდა, სცადეთ თავიდან"
      );
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleStatusUpdate = async (
    consultation: Consultation,
    nextStatus: "in-progress" | "cancelled"
  ) => {
    try {
      setStatusActionLoading(`${consultation.id}-${nextStatus}`);
      const response = await apiService.updateDoctorAppointment(
        consultation.id,
        { status: nextStatus }
      );
      if (response.success && response.data) {
        updateConsultationState(response.data as Consultation);
      }
    } catch (error: any) {
      console.error("Failed to update appointment status", error);
      alert(error?.message || "სტატუსის განახლება ვერ მოხერხდა");
    } finally {
      setStatusActionLoading(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            კონსულტაციების ჩატვირთვა...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ fontSize: 16, color: "#EF4444", marginBottom: 12 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                setLoading(true);
                setError(null);
                const response = await apiService.getDoctorDashboardAppointments(100);
                if (response.success) {
                  setConsultations(response.data as any);
                } else {
                  setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
                }
              } catch (err) {
                console.error("Error fetching consultations:", err);
                setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
              } finally {
                setLoading(false);
              }
            }}
            style={{
              backgroundColor: "#06B6D4",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
              ხელახლა ცდა
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>კონსულტაციები</Text>
            <Text style={styles.subtitle}>ყველა დანიშვნა და კონსულტაცია</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="ძებნა პაციენტის სახელით..."
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

        {/* Statistics */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={[
              styles.statCard,
              filterStatus === "all" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("all")}
          >
            <Ionicons
              name="list"
              size={24}
              color={filterStatus === "all" ? "#06B6D4" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "all" && styles.statValueActive,
              ]}
            >
              {stats.all}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "all" && styles.statLabelActive,
              ]}
            >
              ყველა
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              filterStatus === "completed" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("completed")}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={filterStatus === "completed" ? "#10B981" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "completed" && styles.statValueActive,
              ]}
            >
              {stats.completed}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "completed" && styles.statLabelActive,
              ]}
            >
              შესრულებული
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              filterStatus === "scheduled" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("scheduled")}
          >
            <Ionicons
              name="calendar"
              size={24}
              color={filterStatus === "scheduled" ? "#8B5CF6" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "scheduled" && styles.statValueActive,
              ]}
            >
              {stats.scheduled}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "scheduled" && styles.statLabelActive,
              ]}
            >
              დანიშნული
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              filterStatus === "in-progress" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("in-progress")}
          >
            <Ionicons
              name="time"
              size={24}
              color={filterStatus === "in-progress" ? "#F59E0B" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "in-progress" && styles.statValueActive,
              ]}
            >
              {stats.inProgress}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "in-progress" && styles.statLabelActive,
              ]}
            >
              მიმდინარე
            </Text>
          </TouchableOpacity>
        </View>

        {/* Consultations List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredConsultations.length} კონსულტაცია
            </Text>
            <TouchableOpacity style={styles.sortButton}>
              <Ionicons name="funnel-outline" size={18} color="#6B7280" />
              <Text style={styles.sortText}>ფილტრი</Text>
            </TouchableOpacity>
          </View>

          {filteredConsultations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>
                კონსულტაციები ვერ მოიძებნა
              </Text>
              <Text style={styles.emptyStateText}>
                სცადეთ განსხვავებული ფილტრები
              </Text>
            </View>
          ) : (
            filteredConsultations.map((consultation) => (
              <TouchableOpacity
                key={consultation.id}
                style={styles.consultationCard}
                onPress={() => openDetails(consultation)}
              >
                <View style={styles.consultationHeader}>
                  <View style={styles.patientInfo}>
                    <Image
                      source={{
                        uri: `https://picsum.photos/seed/${consultation.patientName}/200/200`,
                      }}
                      style={styles.avatarImage}
                    />
                    <View style={styles.patientDetails}>
                      <View style={styles.patientNameRow}>
                        <Text style={styles.patientName}>
                          {consultation.patientName}
                        </Text>
                        {consultation.status === "scheduled" &&
                          isConsultationSoon(consultation) && (
                            <View style={styles.soonBadge}>
                              <Ionicons
                                name="alarm"
                                size={12}
                                color="#EF4444"
                              />
                              <Text style={styles.soonText}>მალე</Text>
                            </View>
                          )}
                      </View>
                      <Text style={styles.patientAge}>
                        {consultation.patientAge} წლის •{" "}
                        {getConsultationTypeLabel(consultation.type)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: `${getStatusColor(
                          consultation.status
                        )}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(consultation.status) },
                      ]}
                    >
                      {getStatusLabel(consultation.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.consultationBody}>
                  <View style={styles.datetimeRow}>
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.infoText}>{consultation.date}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{consultation.time}</Text>
                    </View>
                  </View>
                  {(consultation.consultationSummary?.symptoms ||
                    consultation.symptoms) && (
                    <View style={styles.symptomsRow}>
                      <Ionicons name="medical" size={16} color="#6B7280" />
                      <Text style={styles.symptomsText}>
                        {consultation.consultationSummary?.symptoms ||
                          consultation.symptoms}
                      </Text>
                    </View>
                  )}
                  {(consultation.consultationSummary?.diagnosis ||
                    consultation.diagnosis) && (
                    <View style={styles.diagnosisRow}>
                      <MaterialCommunityIcons
                        name="file-document"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={styles.diagnosisText}>
                        {consultation.consultationSummary?.diagnosis ||
                          consultation.diagnosis}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Reminder & Join Call Section */}
                {(consultation.status === "scheduled" ||
                  consultation.status === "in-progress") && (
                  <View style={styles.reminderSection}>
                    {getTimeUntilConsultation(consultation) && (
                      <View
                        style={[
                          styles.reminderBadge,
                          isConsultationSoon(consultation) &&
                            styles.reminderBadgeUrgent,
                        ]}
                      >
                        <Ionicons
                          name={
                            isConsultationSoon(consultation)
                              ? "alarm"
                              : "time-outline"
                          }
                          size={16}
                          color={
                            isConsultationSoon(consultation)
                              ? "#EF4444"
                              : "#F59E0B"
                          }
                        />
                        <Text
                          style={[
                            styles.reminderText,
                            isConsultationSoon(consultation) &&
                              styles.reminderTextUrgent,
                          ]}
                        >
                          {getTimeUntilConsultation(consultation)} დარჩა
                        </Text>
                        {isConsultationSoon(consultation) && (
                          <View style={styles.urgentDot} />
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.joinCallButton,
                        isConsultationSoon(consultation) &&
                          styles.joinCallButtonPulsing,
                      ]}
                      onPress={() => {
                        router.push({
                          pathname: "/screens/video-call",
                          params: {
                            consultationId: consultation.id,
                            patientName: consultation.patientName,
                            roomName: `medicare-${consultation.id}`,
                          },
                        });
                      }}
                    >
                      <Ionicons name="videocam" size={20} color="#FFFFFF" />
                      <Text style={styles.joinCallText}>
                        შესვლა კონსულტაციაზე
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Status Actions */}
                <View style={styles.statusActionsRow}>
                  {consultation.status === "scheduled" && (
                    <TouchableOpacity
                      style={styles.statusActionButton}
                      onPress={() =>
                        handleStatusUpdate(consultation, "in-progress")
                      }
                      disabled={
                        statusActionLoading ===
                        `${consultation.id}-in-progress`
                      }
                    >
                      <Ionicons
                        name="play"
                        size={16}
                        color="#2563EB"
                      />
                      <Text style={styles.statusActionText}>
                        დაწყება
                      </Text>
                    </TouchableOpacity>
                  )}

                  {consultation.status !== "cancelled" && (
                    <TouchableOpacity
                      style={styles.statusActionButtonPrimary}
                      onPress={() => openAppointment(consultation)}
                      disabled={savingAppointment}
                    >
                      <Ionicons
                        name="document-text"
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.statusActionPrimaryText}>
                        {consultation.consultationSummary
                          ? "რედაქტირება"
                          : consultation.status === "completed"
                            ? "რედაქტირება"
                            : "დასრულება"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {consultation.status !== "cancelled" && (
                    <TouchableOpacity
                      style={styles.statusActionButton}
                      onPress={() =>
                        handleStatusUpdate(consultation, "cancelled")
                      }
                      disabled={
                        statusActionLoading ===
                        `${consultation.id}-cancelled`
                      }
                    >
                      <Ionicons name="close" size={16} color="#DC2626" />
                      <Text style={[styles.statusActionText, { color: "#DC2626" }]}>
                        გაუქმება
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.consultationFooter}>
                  <View style={styles.feeRow}>
                    <Ionicons name="wallet" size={16} color="#6B7280" />
                    <Text style={styles.feeAmount}>${consultation.fee}</Text>
                    <View
                      style={[
                        styles.paymentBadge,
                        consultation.isPaid
                          ? styles.paymentBadgePaid
                          : styles.paymentBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentText,
                          consultation.isPaid
                            ? styles.paymentTextPaid
                            : styles.paymentTextPending,
                        ]}
                      >
                        {consultation.isPaid ? "გადახდილი" : "მოსალოდნელი"}
                      </Text>
                    </View>
                  </View>
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
              <Text style={styles.modalTitle}>კონსულტაციის დეტალები</Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedConsultation && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>პაციენტი</Text>
                  <Text style={styles.detailValue}>
                    {selectedConsultation.patientName}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ასაკი</Text>
                  <Text style={styles.detailValue}>
                    {selectedConsultation.patientAge} წელი
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>თარიღი და დრო</Text>
                  <Text style={styles.detailValue}>
                    {selectedConsultation.date} • {selectedConsultation.time}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ტიპი</Text>
                  <Text style={styles.detailValue}>
                    {getConsultationTypeLabel(selectedConsultation.type)}
                  </Text>
                </View>

                {selectedConsultation.symptoms && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>სიმპტომები</Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.symptoms}
                    </Text>
                  </View>
                )}

                {selectedConsultation.diagnosis && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>დიაგნოზი</Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.diagnosis}
                    </Text>
                  </View>
                )}

                {selectedConsultation.consultationSummary?.medications && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      დანიშნული მედიკამენტები
                    </Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.consultationSummary.medications}
                    </Text>
                  </View>
                )}

                {selectedConsultation.consultationSummary?.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>შენიშვნები</Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.consultationSummary.notes}
                    </Text>
                  </View>
                )}

                {selectedConsultation.consultationSummary?.vitals && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ვიტალური ნიშნები</Text>
                    <View style={styles.vitalSignsGrid}>
                      {selectedConsultation.consultationSummary.vitals
                        .bloodPressure ? (
                        <View style={styles.vitalSignCard}>
                          <Text style={styles.vitalSignLabel}>
                            არტერიული წნევა
                          </Text>
                          <Text style={styles.vitalSignValue}>
                            {
                              selectedConsultation.consultationSummary.vitals
                                .bloodPressure
                            }
                          </Text>
                        </View>
                      ) : null}
                      {selectedConsultation.consultationSummary.vitals
                        .heartRate ? (
                        <View style={styles.vitalSignCard}>
                          <Text style={styles.vitalSignLabel}>პულსი</Text>
                          <Text style={styles.vitalSignValue}>
                            {
                              selectedConsultation.consultationSummary.vitals
                                .heartRate
                            }
                          </Text>
                        </View>
                      ) : null}
                      {selectedConsultation.consultationSummary.vitals
                        .temperature ? (
                        <View style={styles.vitalSignCard}>
                          <Text style={styles.vitalSignLabel}>ტემპერატურა</Text>
                          <Text style={styles.vitalSignValue}>
                            {
                              selectedConsultation.consultationSummary.vitals
                                .temperature
                            }
                          </Text>
                        </View>
                      ) : null}
                      {selectedConsultation.consultationSummary.vitals.weight ? (
                        <View style={styles.vitalSignCard}>
                          <Text style={styles.vitalSignLabel}>წონა</Text>
                          <Text style={styles.vitalSignValue}>
                            {
                              selectedConsultation.consultationSummary.vitals
                                .weight
                            }
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}

                {selectedConsultation.followUp?.required && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>განმეორებითი ვიზიტი</Text>
                    {selectedConsultation.followUp.date && (
                      <Text style={styles.detailValue}>
                        {selectedConsultation.followUp.date.split("T")[0]}
                      </Text>
                    )}
                    {selectedConsultation.followUp.reason && (
                      <Text style={styles.detailSubValue}>
                        {selectedConsultation.followUp.reason}
                      </Text>
                    )}
                  </View>
                )}

                {selectedConsultation.form100?.pdfUrl && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ფორმა 100</Text>
                    <TouchableOpacity
                      style={styles.viewFileButton}
                      onPress={() =>
                        openForm100File(selectedConsultation.form100?.pdfUrl)
                      }
                    >
                      <Ionicons
                        name="document-text"
                        size={18}
                        color="#4C1D95"
                      />
                      <Text style={styles.viewFileButtonText}>
                        {selectedConsultation.form100?.fileName ||
                          "ფაილის ნახვა"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ანაზღაურება</Text>
                  <Text style={styles.detailValue}>
                    ${selectedConsultation.fee}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>გადახდის სტატუსი</Text>
                  <View
                    style={[
                      styles.paymentBadge,
                      selectedConsultation.isPaid
                        ? styles.paymentBadgePaid
                        : styles.paymentBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentText,
                        selectedConsultation.isPaid
                          ? styles.paymentTextPaid
                          : styles.paymentTextPending,
                      ]}
                    >
                      {selectedConsultation.isPaid
                        ? "გადახდილი"
                        : "მოსალოდნელი"}
                    </Text>
                  </View>
                </View>
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

      {/* Appointment Form Modal */}
      <Modal
        visible={showAppointmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>დანიშნულება</Text>
                {selectedConsultation && (
                  <Text style={styles.modalSubtitle}>
                    {selectedConsultation.patientName}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowAppointmentModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Diagnosis */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>დიაგნოზი *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="მიუთითეთ დიაგნოზი"
                  placeholderTextColor="#9CA3AF"
                  value={appointmentData.diagnosis}
                  onChangeText={(text) =>
                    setAppointmentData({ ...appointmentData, diagnosis: text })
                  }
                />
              </View>

              {/* Symptoms */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>სიმპტომები</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="მიუთითეთ სიმპტომები"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  value={appointmentData.symptoms}
                  onChangeText={(text) =>
                    setAppointmentData({ ...appointmentData, symptoms: text })
                  }
                />
              </View>

              {/* Vital Signs */}
              <Text style={styles.sectionTitle}>ვიტალური ნიშნები</Text>
              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>არტერიული წნევა</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="120/80"
                    placeholderTextColor="#9CA3AF"
                    value={appointmentData.bloodPressure}
                    onChangeText={(text) =>
                      setAppointmentData({
                        ...appointmentData,
                        bloodPressure: text,
                      })
                    }
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>გულის გახეთქვა</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="72 bpm"
                    placeholderTextColor="#9CA3AF"
                    value={appointmentData.heartRate}
                    onChangeText={(text) =>
                      setAppointmentData({
                        ...appointmentData,
                        heartRate: text,
                      })
                    }
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>ტემპერატურა</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="36.6°C"
                    placeholderTextColor="#9CA3AF"
                    value={appointmentData.temperature}
                    onChangeText={(text) =>
                      setAppointmentData({
                        ...appointmentData,
                        temperature: text,
                      })
                    }
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>წონა</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="70 კგ"
                    placeholderTextColor="#9CA3AF"
                    value={appointmentData.weight}
                    onChangeText={(text) =>
                      setAppointmentData({ ...appointmentData, weight: text })
                    }
                  />
                </View>
              </View>

              {/* Medications */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>დანიშნული მედიკამენტები</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="მაგ: ენალაპრილი 10მგ დღეში 1-ჯერ"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  value={appointmentData.medications}
                  onChangeText={(text) =>
                    setAppointmentData({
                      ...appointmentData,
                      medications: text,
                    })
                  }
                />
              </View>

              {/* Follow Up */}
              <View style={styles.formSection}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    setAppointmentData({
                      ...appointmentData,
                      followUpRequired: !appointmentData.followUpRequired,
                    })
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      appointmentData.followUpRequired &&
                        styles.checkboxChecked,
                    ]}
                  >
                    {appointmentData.followUpRequired && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    საჭიროა განმეორებითი ვიზიტი
                  </Text>
                </TouchableOpacity>

                {appointmentData.followUpRequired && (
                  <>
                    <View style={styles.formRow}>
                      <View style={styles.formFieldHalf}>
                        <Text style={styles.formLabel}>თარიღი</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="2024-11-20"
                          placeholderTextColor="#9CA3AF"
                          value={appointmentData.followUpDate}
                          onChangeText={(text) =>
                            setAppointmentData({
                              ...appointmentData,
                              followUpDate: text,
                            })
                          }
                        />
                      </View>
                      <View style={styles.formFieldHalf}>
                        <Text style={styles.formLabel}>დრო</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="14:30"
                          placeholderTextColor="#9CA3AF"
                          value={appointmentData.followUpTime}
                          onChangeText={(text) =>
                            setAppointmentData({
                              ...appointmentData,
                              followUpTime: text,
                            })
                          }
                        />
                      </View>
                    </View>
                    <View style={styles.formSection}>
                      <Text style={styles.formLabel}>მიზეზი</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="მიუთითეთ მიზეზი"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={2}
                        value={appointmentData.followUpReason}
                        onChangeText={(text) =>
                          setAppointmentData({
                            ...appointmentData,
                            followUpReason: text,
                          })
                        }
                      />
                    </View>
                  </>
                )}
              </View>

              {/* Notes */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>შენიშვნები</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="დამატებითი ინფორმაცია..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  value={appointmentData.notes}
                  onChangeText={(text) =>
                    setAppointmentData({ ...appointmentData, notes: text })
                  }
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>ფორმა 100 ფაილი</Text>
                {selectedConsultation?.form100?.pdfUrl ? (
                  <TouchableOpacity
                    style={styles.existingFileButton}
                    onPress={() =>
                      openForm100File(selectedConsultation.form100?.pdfUrl)
                    }
                  >
                    <Ionicons
                      name="document-text"
                      size={18}
                      color="#4C1D95"
                    />
                    <Text style={styles.existingFileText}>
                      {selectedConsultation.form100?.fileName ||
                        "არსებული ფაილის ნახვა"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.selectedFileHint}>
                    ჯერ არ არის ატვირთული ფორმა 100
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickForm100File}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="#06B6D4"
                  />
                  <Text style={styles.uploadButtonText}>
                    {form100File?.name || "აირჩიეთ PDF ან გამოსახულება"}
                  </Text>
                </TouchableOpacity>
                {form100File ? (
                  <>
                    <Text style={styles.selectedFileHint}>
                      ახალი ფაილი აიტვირთება შენახვისას
                    </Text>
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => setForm100File(null)}
                    >
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={styles.removeFileText}>ფაილის წაშლა</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowAppointmentModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>გაუქმება</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveAppointment}
              >
                <Text style={styles.modalButtonTextPrimary}>შენახვა</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successModalTitle}>შენახულია</Text>
            <Text style={styles.successModalMessage}>
              დანიშნულება წარმატებით დამატებულია
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successModalButtonText}>კარგი</Text>
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
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  statCardActive: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0FDFA",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 8,
  },
  statValueActive: {
    color: "#06B6D4",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  statLabelActive: {
    color: "#06B6D4",
  },
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    color: "#1F2937",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sortText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  consultationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  consultationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#06B6D4",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E6FFFA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#06B6D4",
  },
  patientDetails: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  patientName: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  soonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  soonText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#EF4444",
  },
  patientAge: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  consultationBody: {
    gap: 10,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  datetimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  symptomsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  symptomsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#92400E",
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  diagnosisText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#065F46",
  },
  consultationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 12,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  feeAmount: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentBadgePaid: {
    backgroundColor: "#10B98120",
  },
  paymentBadgePending: {
    backgroundColor: "#F59E0B20",
  },
  paymentText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  paymentTextPaid: {
    color: "#10B981",
  },
  paymentTextPending: {
    color: "#F59E0B",
  },
  reminderSection: {
    marginTop: 12,
    gap: 10,
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  reminderBadgeUrgent: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  reminderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#D97706",
  },
  reminderTextUrgent: {
    color: "#DC2626",
  },
  urgentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  joinCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#10B981",
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinCallButtonPulsing: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  joinCallText: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
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
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
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
  },
  modalButtonSecondary: {
    backgroundColor: "#F3F4F6",
  },
  modalButtonPrimary: {
    backgroundColor: "#06B6D4",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  formSection: {
    marginBottom: 20,
  },
  vitalSignsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vitalSignCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
  },
  vitalSignLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  vitalSignValue: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginTop: 4,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginBottom: 8,
  },
  statusActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  statusActionText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#2563EB",
  },
  statusActionButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statusActionPrimaryText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#ECFEFF",
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  selectedFileHint: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  removeFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  removeFileText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#EF4444",
  },
  existingFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginBottom: 8,
  },
  existingFileText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#4C1D95",
  },
  viewFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F5F3FF",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  viewFileButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#4C1D95",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formFieldHalf: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 40,
    minWidth: 280,
  },
  successModalIconContainer: {
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  successModalButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    minWidth: 120,
  },
  successModalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});
