import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";

interface PatientAppointment {
  id: string;
  _id?: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  status: string;
  type: string;
  fee: string | number;
  isPaid: boolean;
  symptoms?: string;
  diagnosis?: string;
  doctorImage?: any;
  // API response fields
  appointmentDate?: string;
  appointmentTime?: string;
  doctorId?: any;
  patientDetails?: any;
  formattedDate?: string; // Formatted date in YYYY-MM-DD format (local timezone)
}

const TodayAppointment = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load today's appointments from API
  useEffect(() => {
    const loadTodayAppointments = async () => {
      if (!isAuthenticated || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🏠 TodayAppointment - Loading appointments for user:', user.id);
        
        const response = await apiService.getPatientAppointments();
        console.log('🏠 TodayAppointment - API response:', response);

        if (response.success && response.data) {
          // Get today's date in YYYY-MM-DD format (local timezone)
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const today = `${year}-${month}-${day}`;
          
          // Filter for today's scheduled appointments only
          const todayScheduled = response.data
            .filter((appointment: any) => {
              // Format appointment date in local timezone
              let appointmentDate: string;
              if (appointment.appointmentDate) {
                const date = new Date(appointment.appointmentDate);
                const appYear = date.getFullYear();
                const appMonth = String(date.getMonth() + 1).padStart(2, '0');
                const appDay = String(date.getDate()).padStart(2, '0');
                appointmentDate = `${appYear}-${appMonth}-${appDay}`;
              } else {
                appointmentDate = appointment.date;
              }
              
              // Only show appointments for today
              if (appointmentDate !== today) {
                return false;
              }
              
              // Check status
              if (appointment.status !== "scheduled" && 
                  appointment.status !== "confirmed" && 
                  appointment.status !== "pending" &&
                  appointment.status !== "in-progress") {
                return false;
              }
              
              // Check if appointment time has passed
              const appointmentTime = appointment.appointmentTime || appointment.time || '00:00';
              const [year, month, day] = appointmentDate.split('-').map(Number);
              const [hours, minutes] = appointmentTime.split(':').map(Number);
              const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
              
              // If appointment time has passed more than 1 hour ago, don't show it
              const diff = appointmentDateTime.getTime() - now.getTime();
              const oneHourInMs = 60 * 60 * 1000;
              
              // Show if appointment is in the future or within 1 hour after appointment time
              return diff >= -oneHourInMs;
            })
            .map((appointment: any) => {
              // Format appointment date in local timezone
              let appointmentDate: string;
              if (appointment.appointmentDate) {
                const date = new Date(appointment.appointmentDate);
                const appYear = date.getFullYear();
                const appMonth = String(date.getMonth() + 1).padStart(2, '0');
                const appDay = String(date.getDate()).padStart(2, '0');
                appointmentDate = `${appYear}-${appMonth}-${appDay}`;
              } else {
                appointmentDate = appointment.date;
              }
              const rawId = appointment._id ?? appointment.id;
              return {
                ...appointment,
                formattedDate: appointmentDate,
                id: rawId != null ? String(rawId) : "",
              };
            });

          // Sort by time (closest first)
          todayScheduled.sort((a: any, b: any) => {
            const timeA = a.appointmentTime || a.time || '00:00';
            const timeB = b.appointmentTime || b.time || '00:00';
            return timeA.localeCompare(timeB);
          });

          console.log('🏠 TodayAppointment - Today\'s appointments:', todayScheduled);
          setTodayAppointments(todayScheduled);
        }
      } catch (error) {
        console.log('🏠 TodayAppointment - Error loading appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTodayAppointments();
  }, [isAuthenticated, user?.id]);

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // If loading or no appointments for today, don't show banner
  if (loading || todayAppointments.length === 0) {
    return null;
  }

  // Get the first appointment (or closest one)
  const appointment = todayAppointments[0];

  const isVideoConsultation = (() => {
    const t = appointment.type;
    if (t == null || t === "") return true;
    return String(t).toLowerCase() === "video";
  })();

  // Appointment is always today since we filtered for today only
  const isToday = true;

  // Check if appointment is within 1 hour from now
  const isUrgent = () => {
    // Use formattedDate that we already calculated
    const appointmentDate = appointment.formattedDate || appointment.date || '';
    const appointmentTime = appointment.time || appointment.appointmentTime || '00:00';
    
    // Create date from YYYY-MM-DD and HH:MM in local timezone
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    const diff = appointmentDateTime.getTime() - currentTime.getTime();
    return diff > 0 && diff <= 60 * 60 * 1000; // 1 hour
  };

  // Check if join button should be active
  // Button is active from appointment time until 1 hour after appointment time
  const isJoinButtonActive = () => {
    // Only show for scheduled or in-progress appointments
    if (appointment.status !== "scheduled" && appointment.status !== "in-progress" && appointment.status !== "confirmed" && appointment.status !== "pending") {
      return false;
    }

    // Use formattedDate that we already calculated
    const appointmentDate = appointment.formattedDate || appointment.date || '';
    const appointmentTime = appointment.time || appointment.appointmentTime || '00:00';
    
    // Parse appointment date and time
    const appointmentDateTime = new Date(
      `${appointmentDate}T${appointmentTime}`
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

  // კონსულტაციის დრო + 1 საათი გავიდა — ღილაკის ნაცვლად "დრო უკვე გავიდა"
  const isConsultationTimePassed = () => {
    const appointmentDate = appointment.formattedDate || appointment.date || '';
    const appointmentTime = appointment.time || appointment.appointmentTime || '00:00';
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const diff = appointmentDateTime.getTime() - currentTime.getTime();
    const oneHourInMs = 60 * 60 * 1000;
    return diff < -oneHourInMs;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, isUrgent() && styles.containerUrgent]}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={isUrgent() ? "alarm" : "calendar"}
            size={24}
            color="#FFFFFF"
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isUrgent() 
              ? "კონსულტაცია მალე!" 
              : isToday 
                ? "დღეს გაქვთ ჯავშანი"
                : "გაქვთ ჯავშანი"}
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="medical" size={16} color="#FFFFFF" />
            <Text style={styles.doctorName}>
              {appointment.doctorName || appointment.doctorId?.name || 'ექიმი'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            <Text style={styles.time}>
              {appointment.time || appointment.appointmentTime}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>დღევანდელი ჯავშანი</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Ionicons name="medical" size={20} color="#06B6D4" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>ექიმი</Text>
                    <Text style={styles.detailValue}>
                      {appointment.doctorName || appointment.doctorId?.name || 'ექიმი'}
                    </Text>
                    <Text style={styles.detailSubValue}>
                      {appointment.doctorSpecialty || appointment.doctorId?.specialization || ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>დრო</Text>
                    <Text style={styles.detailValue}>
                      დანიშნულია {appointment.time || appointment.appointmentTime}-ზე
                    </Text>
                  </View>
                </View>
              </View>

              {isConsultationTimePassed() ? (
                <View style={styles.timePassedContainer}>
                  <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                  <Text style={styles.timePassedText}>დრო უკვე გავიდა</Text>
                </View>
              ) : isJoinButtonActive() && isVideoConsultation ? (
                <TouchableOpacity
                  style={[styles.joinCallButton, isUrgent() && styles.joinCallButtonUrgent]}
                  onPress={() => {
                    const appointmentId = String(
                      appointment.id ||
                        appointment._id ||
                        "",
                    ).trim();
                    if (!appointmentId) {
                      return;
                    }
                    const doctorName =
                      appointment.doctorName ||
                      (typeof appointment.doctorId === "object" &&
                      appointment.doctorId != null
                        ? (appointment.doctorId as { name?: string }).name
                        : undefined) ||
                      "ექიმი";
                    setShowModal(false);
                    router.push({
                      pathname: "/screens/video-call",
                      params: {
                        appointmentId,
                        doctorName: String(doctorName),
                        roomName: `medicare-${appointmentId}`,
                      },
                    });
                  }}
                >
                  <Ionicons name="videocam" size={20} color="#FFFFFF" />
                  <Text style={styles.joinCallText}>
                    შესვლა კონსულტაციაზე
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => {
                  setShowModal(false);
                  router.push("/(tabs)/appointment");
                }}
              >
                <Text style={styles.viewAllText}>ყველა ჯავშნის ნახვა</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  containerUrgent: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    animationDuration: "1s",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  doctorName: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
  },
  time: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
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
  detailCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
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
  detailSubValue: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  joinCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  joinCallButtonUrgent: {
    backgroundColor: "#EF4444",
  },
  joinCallText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  timePassedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  timePassedText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default TodayAppointment;

