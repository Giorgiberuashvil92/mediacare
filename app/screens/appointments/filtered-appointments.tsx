import { apiService } from "@/app/_services/api";
import { useAuth } from "@/app/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PatientAppointment {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  status: string;
  type: string;
  fee: string | number;
  doctorImage?: any;
  visitAddress?: string;
  homeVisitCompletedAt?: string;
}

const mapAppointmentFromAPI = (
  appointment: any,
  apiBaseUrl: string,
): PatientAppointment => {
  let doctorImage;
  if (appointment.doctorId?.profileImage) {
    if (appointment.doctorId.profileImage.startsWith("http")) {
      doctorImage = { uri: appointment.doctorId.profileImage };
    } else {
      doctorImage = {
        uri: `${apiBaseUrl}/${appointment.doctorId.profileImage}`,
      };
    }
  } else {
    doctorImage = require("@/assets/images/doctors/doctor1.png");
  }

  return {
    id: appointment._id?.toString() || appointment.id?.toString() || "",
    doctorName: appointment.doctorId?.name || "უცნობი ექიმი",
    doctorSpecialty: appointment.doctorId?.specialization || "",
    date: appointment.appointmentDate
      ? new Date(appointment.appointmentDate).toISOString().split("T")[0]
      : "",
    time: appointment.appointmentTime || "",
    status: appointment.status || "scheduled",
    type: appointment.type || "video",
    fee: appointment.consultationFee || appointment.totalAmount || 0,
    doctorImage,
    visitAddress: appointment.visitAddress,
    homeVisitCompletedAt: appointment.homeVisitCompletedAt,
  };
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed":
      return "დასრულებული";
    case "scheduled":
      return "დანიშნული";
    case "cancelled":
      return "გაუქმებული";
    case "in-progress":
      return "მიმდინარე";
    case "pending":
      return "დანიშნული";
    case "confirmed":
      return "დადასტურებული";
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "#10B981";
    case "scheduled":
      return "#8B5CF6";
    case "cancelled":
      return "#EF4444";
    case "in-progress":
      return "#06B6D4";
    case "pending":
      return "#8B5CF6";
    case "confirmed":
      return "#10B981";
    default:
      return "#6B7280";
  }
};

export default function FilteredAppointmentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filterType: string }>();
  const { isAuthenticated, user } = useAuth();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showConsultationTimeModal, setShowConsultationTimeModal] =
    useState(false);

  const filterType = params.filterType === "video" ? "video" : "home-visit";
  const title =
    filterType === "video" ? "ვიდეო კონსულტაციები" : "ბინაზე გამოძახებები";

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled. Please disable USE_MOCK_API.",
        );
      }

      const response = await apiService.getPatientAppointments();

      if (response.success && response.data) {
        const apiBaseUrl = apiService.getBaseURL();
        const mappedAppointments = response.data
          .map((appointment: any) =>
            mapAppointmentFromAPI(appointment, apiBaseUrl),
          )
          .filter(
            (apt: PatientAppointment) =>
              apt.type === filterType &&
              apt.status !== "completed" &&
              apt.status !== "cancelled",
          )
          .sort((a: PatientAppointment, b: PatientAppointment) => {
            // Sort by date and time - nearest first
            const dateA = new Date(`${a.date}T${a.time}`).getTime();
            const dateB = new Date(`${b.date}T${b.time}`).getTime();
            return dateA - dateB;
          });
        setAppointments(mappedAppointments);
      } else {
        setAppointments([]);
      }
    } catch (err: any) {
      console.error("Error loading appointments:", err);
      setError(err.message || "ჯავშნების ჩატვირთვა ვერ მოხერხდა");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, loadAppointments]);

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ka-GE", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const isJoinButtonActive = (appointment: PatientAppointment) => {
    if (
      appointment.status !== "scheduled" &&
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      return false;
    }

    // Parse appointment date and time
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );

    // Calculate time difference (negative means past)
    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    // One hour in milliseconds
    const oneHourInMs = 60 * 60 * 1000;

    // Button is active:
    // - Before appointment time (diff > 0) - always show
    // - From appointment time until 1 hour after (diff <= 0 && diff >= -oneHourInMs)
    // So: diff >= -oneHourInMs covers both cases
    return diff >= -oneHourInMs;
  };

  // კონსულტაციის დრო + 1 საათი გავიდა — ღილაკი ვაჩვენოთ არა, ტექსტი "დრო უკვე გავიდა"
  const isConsultationTimePassed = (appointment: PatientAppointment) => {
    if (
      appointment.status !== "scheduled" &&
      appointment.status !== "in-progress" &&
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      return false;
    }
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();
    const oneHourInMs = 60 * 60 * 1000;
    return diff < -oneHourInMs;
  };

  // Check if consultation time has not yet arrived (more than 30 minutes before)
  const isConsultationTimeNotYet = (appointment: PatientAppointment) => {
    if (
      appointment.status !== "scheduled" &&
      appointment.status !== "in-progress" &&
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      return false;
    }

    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );

    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    // 30 minutes in milliseconds
    const thirtyMinutesInMs = 30 * 60 * 1000;

    // Consultation time has not yet arrived if diff > 30 minutes
    return diff > thirtyMinutesInMs;
  };

  // Get time remaining until appointment (for waiting screen)
  const getTimeRemaining = (appointment: PatientAppointment) => {
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    if (diff < 0) return null; // Past appointment

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} დღე ${hours % 24} საათი`;
    } else if (hours > 0) {
      return `${hours} საათი ${minutes} წუთი`;
    } else if (minutes > 0) {
      return `${minutes} წუთი`;
    } else {
      return "ნაკლები წუთი";
    }
  };

  const handleAppointmentPress = (appointment: PatientAppointment) => {
    router.push({
      pathname: "/(tabs)/appointment",
      params: { appointmentId: appointment.id, filterType: filterType },
    });
  };

  const renderAppointmentCard = ({ item }: { item: PatientAppointment }) => (
    <TouchableOpacity
      style={styles.appointmentCard}
      onPress={() => handleAppointmentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.doctorInfo}>
          <Image source={item.doctorImage} style={styles.doctorImage} />
          <View style={styles.doctorDetails}>
            <Text style={styles.doctorName}>{item.doctorName}</Text>
            <Text style={styles.doctorSpecialty}>{item.doctorSpecialty}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}15` },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color="#6B7280"
              style={styles.icon}
            />
            <Text style={styles.dateTimeText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.dateTimeItem}>
            <Ionicons
              name="time-outline"
              size={16}
              color="#6B7280"
              style={styles.icon}
            />
            <Text style={styles.dateTimeText}>{item.time}</Text>
          </View>
        </View>

        {item.type === "home-visit" && item.visitAddress && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.visitAddress}
            </Text>
          </View>
        )}
      </View>

      {item.type === "video" &&
        (item.status === "scheduled" ||
          item.status === "in-progress" ||
          item.status === "pending" ||
          item.status === "confirmed") &&
        (isConsultationTimePassed(item) ? (
          <View style={styles.timePassedContainer}>
            <Ionicons name="time-outline" size={20} color="#9CA3AF" />
            <Text style={styles.timePassedText}>დრო უკვე გავიდა</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.joinCallButton,
              !isJoinButtonActive(item) && styles.joinCallButtonDisabled,
            ]}
            onPress={async (e) => {
              e.stopPropagation();
              if (isConsultationTimeNotYet(item)) {
                setShowConsultationTimeModal(true);
                return;
              }
              if (!isJoinButtonActive(item)) {
                router.push({
                  pathname: "/screens/appointment-waiting",
                  params: {
                    appointmentId: item.id,
                    doctorName: item.doctorName,
                    date: item.date,
                    time: item.time,
                    timeRemaining: getTimeRemaining(item) || "",
                  },
                });
                return;
              }
              try {
                await apiService.joinCall(item.id);
              } catch (err) {
                console.error("Failed to track join time:", err);
              }
              router.push({
                pathname: "/screens/video-call",
                params: {
                  appointmentId: item.id,
                  doctorName: item.doctorName,
                  roomName: `medicare-${item.id}`,
                },
              });
            }}
            disabled={false}
          >
            <Ionicons
              name="videocam"
              size={20}
              color={isJoinButtonActive(item) ? "#FFFFFF" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.joinCallText,
                !isJoinButtonActive(item) && { color: "#9CA3AF" },
              ]}
            >
              შესვლა კონსულტაციაზე
            </Text>
            {isJoinButtonActive(item) && (
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}

      {item.type === "home-visit" &&
        (item.status === "scheduled" ||
          item.status === "in-progress" ||
          item.status === "pending" ||
          item.status === "confirmed") && (
          <TouchableOpacity
            style={[
              styles.completeHomeVisitButton,
              item.homeVisitCompletedAt &&
                styles.completeHomeVisitButtonDisabled,
            ]}
            disabled={!!item.homeVisitCompletedAt}
            onPress={async (e) => {
              e.stopPropagation();
              Alert.alert(
                "დასრულება",
                "დარწმუნებული ხართ, რომ ბინაზე კონსულტაცია დასრულდა?",
                [
                  {
                    text: "გაუქმება",
                    style: "cancel",
                  },
                  {
                    text: "დასრულება",
                    style: "default",
                    onPress: async () => {
                      try {
                        const response = await apiService.completeHomeVisit(
                          item.id,
                        );
                        if (response.success) {
                          Alert.alert(
                            "წარმატება",
                            "ბინაზე კონსულტაცია მონიშნულია როგორც ჩატარებული",
                          );
                          await loadAppointments();
                        } else {
                          Alert.alert(
                            "შეცდომა",
                            response.message || "ოპერაცია ვერ მოხერხდა",
                          );
                        }
                      } catch (err: any) {
                        console.error("❌ Complete home visit error:", err);
                        const errorMessage =
                          err.message || "ოპერაცია ვერ მოხერხდა";
                        Alert.alert("შეცდომა", errorMessage);
                      }
                    },
                  },
                ],
              );
            }}
          >
            <Ionicons
              name={
                item.homeVisitCompletedAt
                  ? "checkmark-done-circle"
                  : "checkmark-circle"
              }
              size={20}
              color={item.homeVisitCompletedAt ? "#6B7280" : "#FFFFFF"}
            />
            <Text
              style={[
                styles.completeHomeVisitButtonText,
                item.homeVisitCompletedAt &&
                  styles.completeHomeVisitButtonTextDisabled,
              ]}
            >
              {item.homeVisitCompletedAt ? "უკვე დასრულებულია" : "დასრულება"}
            </Text>
            {!item.homeVisitCompletedAt && (
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>ჯავშნების ჩატვირთვა...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadAppointments}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={filterType === "video" ? "videocam-outline" : "home-outline"}
            size={64}
            color="#D1D5DB"
          />
          <Text style={styles.emptyTitle}>
            {filterType === "video"
              ? "ვიდეო კონსულტაციები არ მოიძებნა"
              : "ბინაზე გამოძახებები არ მოიძებნა"}
          </Text>
          <Text style={styles.emptyText}>ამ ტიპის ჯავშნები ჯერ არ გაქვთ</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadAppointments}
        />
      )}

      {/* Consultation Time Modal */}
      <Modal
        visible={showConsultationTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConsultationTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="time-outline" size={48} color="#F59E0B" />
              <Text style={styles.modalTitle}>კონსულტაციის დრო არ მოვიდა</Text>
              <Text style={styles.modalText}>
                ვერ შეხვალ ჯერ კონსულტაციის დრო არაა. გთხოვთ დაელოდოთ
                კონსულტაციის დროს.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowConsultationTimeModal(false)}
              >
                <Text style={styles.modalButtonText}>კარგი</Text>
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
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  doctorImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
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
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  cardBody: {
    gap: 10,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 16,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    marginRight: 0,
  },
  dateTimeText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  addressText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    flex: 1,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  feeLabel: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  feeAmount: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
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
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#EF4444",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
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
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  completeHomeVisitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeHomeVisitButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.7,
    shadowColor: "transparent",
  },
  completeHomeVisitButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  completeHomeVisitButtonTextDisabled: {
    color: "#6B7280",
  },
  joinCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinCallButtonDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
    shadowColor: "transparent",
  },
  joinCallText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  timePassedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  timePassedText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});
