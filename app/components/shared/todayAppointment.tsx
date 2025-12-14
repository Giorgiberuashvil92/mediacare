import { apiService } from "@/app/services/api";
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
}

const TodayAppointment = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);

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
          
          // Filter for today's scheduled appointments
          const todayScheduled = response.data.filter((appointment: any) => {
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
            
            return appointmentDate === today && 
                   (appointment.status === "scheduled" || 
                    appointment.status === "confirmed" || 
                    appointment.status === "pending");
          });

          // Sort by time (closest first) - show the appointment with the nearest time
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

  // If loading or no appointments for today, don't show banner
  if (loading || todayAppointments.length === 0) {
    return null;
  }

  // Get the first appointment (or closest one)
  const appointment = todayAppointments[0];

  // Calculate time until appointment
  const getTimeUntil = () => {
    // Get appointment date in local timezone
    let appointmentDate: string;
    if (appointment.appointmentDate) {
      const date = new Date(appointment.appointmentDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      appointmentDate = `${year}-${month}-${day}`;
    } else {
      appointmentDate = appointment.date || '';
    }
    
    const appointmentTime = appointment.time || appointment.appointmentTime || '00:00';
    
    // Create date from YYYY-MM-DD and HH:MM in local timezone
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    const now = new Date();
    const diff = appointmentDateTime.getTime() - now.getTime();

    if (diff < 0) return "ახლა";

    const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursUntil > 0) {
      return `${hoursUntil} საათში`;
    } else if (minutesUntil > 0) {
      return `${minutesUntil} წუთში`;
    } else {
      return "ახლა";
    }
  };

  // Check if appointment is within 1 hour from now
  const isUrgent = () => {
    // Get appointment date in local timezone
    let appointmentDate: string;
    if (appointment.appointmentDate) {
      const date = new Date(appointment.appointmentDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      appointmentDate = `${year}-${month}-${day}`;
    } else {
      appointmentDate = appointment.date || '';
    }
    
    const appointmentTime = appointment.time || appointment.appointmentTime || '00:00';
    
    // Create date from YYYY-MM-DD and HH:MM in local timezone
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    const now = new Date();
    const diff = appointmentDateTime.getTime() - now.getTime();
    return diff > 0 && diff <= 60 * 60 * 1000; // 1 hour
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
            {isUrgent() ? "კონსულტაცია მალე!" : "დღეს გაქვთ ჯავშანი"}
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
                      {appointment.time || appointment.appointmentTime}
                    </Text>
                    <Text style={styles.detailSubValue}>{getTimeUntil()} დარჩა</Text>
                  </View>
                </View>

                {(appointment.symptoms || appointment.patientDetails?.problem) && (
                  <View style={styles.detailRow}>
                    <Ionicons name="pulse" size={20} color="#EF4444" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>სიმპტომები</Text>
                      <Text style={styles.detailValue}>
                        {appointment.symptoms || appointment.patientDetails?.problem}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.joinCallButton, isUrgent() && styles.joinCallButtonUrgent]}
                onPress={() => {
                  setShowModal(false);
                  router.push({
                    pathname: "/screens/video-call",
                    params: {
                      appointmentId: appointment.id,
                      doctorName: appointment.doctorName,
                      roomName: `medicare-${appointment.id}`,
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

