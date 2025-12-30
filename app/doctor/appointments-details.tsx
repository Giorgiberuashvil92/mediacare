import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Consultation,
  getConsultationTypeLabel,
  getStatusColor,
  getStatusLabel,
} from "../../assets/data/doctorDashboard";
import { apiService } from "../services/api";

export default function AppointmentsDetails() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = (await apiService.getDoctorDashboardAppointments(
        100,
      )) as {
        success: boolean;
        data: Consultation[];
      };

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

  // Calculate statistics from real data
  const stats = {
    total: consultations.length,
    completed: consultations.filter((c) => c.status === "completed").length,
    scheduled: consultations.filter((c) => c.status === "scheduled").length,
    inProgress: consultations.filter((c) => c.status === "in-progress").length,
    cancelled: consultations.filter((c) => c.status === "cancelled").length,
    uncompleted: consultations.filter(
      (c) => c.status !== "completed" && c.status !== "cancelled"
    ).length,
  };

  // Calculate percentages
  const appointmentCompletionRate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>მონაცემების ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchConsultations}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>დანიშვნების დეტალები</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Appointment Statistics Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>დანიშვნების სტატისტიკა</Text>
          <View style={styles.appointmentStats}>
            <View style={styles.appointmentStatItem}>
              <View
                style={[
                  styles.appointmentStatIcon,
                  { backgroundColor: "#10B98120" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.appointmentStatValue}>
                {stats.completed}
              </Text>
              <Text style={styles.appointmentStatLabel}>დასრულებული</Text>
            </View>
            <View style={styles.appointmentStatItem}>
              <View
                style={[
                  styles.appointmentStatIcon,
                  { backgroundColor: "#F59E0B20" },
                ]}
              >
                <Ionicons name="time" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.appointmentStatValue}>
                {stats.inProgress}
              </Text>
              <Text style={styles.appointmentStatLabel}>მიმდინარე</Text>
            </View>
            <View style={styles.appointmentStatItem}>
              <View
                style={[
                  styles.appointmentStatIcon,
                  { backgroundColor: "#EF444420" },
                ]}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </View>
              <Text style={styles.appointmentStatValue}>
                {stats.uncompleted}
              </Text>
              <Text style={styles.appointmentStatLabel}>შეუსრულებელი</Text>
            </View>
          </View>
        </View>

        {/* Completion Rate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>შესრულების მაჩვენებელი</Text>
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionLabel}>შესრულების რეიტინგი</Text>
              <Text style={styles.completionValue}>
                {appointmentCompletionRate}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${appointmentCompletionRate}%` },
                ]}
              />
            </View>
            <Text style={styles.completionDescription}>
              {stats.completed} შესრულებული {stats.total} სულ დანიშვნიდან
            </Text>
          </View>
        </View>

        {/* Appointment Status Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>დანიშვნების სტატუსის დაყოფა</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.statusGradient}
              >
                <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
                <Text style={styles.statusValue}>
                  {stats.completed}
                </Text>
                <Text style={styles.statusLabel}>დასრულებული</Text>
                <Text style={styles.statusPercentage}>
                  {stats.total > 0
                    ? Math.round((stats.completed / stats.total) * 100)
                    : 0}
                  %
                </Text>
              </LinearGradient>
            </View>
            <View style={styles.statusCard}>
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                style={styles.statusGradient}
              >
                <Ionicons name="time" size={32} color="#FFFFFF" />
                <Text style={styles.statusValue}>
                  {stats.inProgress}
                </Text>
                <Text style={styles.statusLabel}>მიმდინარე</Text>
                <Text style={styles.statusPercentage}>
                  {stats.total > 0
                    ? Math.round((stats.inProgress / stats.total) * 100)
                    : 0}
                  %
                </Text>
              </LinearGradient>
            </View>
            <View style={styles.statusCard}>
              <LinearGradient
                colors={["#EF4444", "#DC2626"]}
                style={styles.statusGradient}
              >
                <Ionicons name="close-circle" size={32} color="#FFFFFF" />
                <Text style={styles.statusValue}>
                  {stats.uncompleted}
                </Text>
                <Text style={styles.statusLabel}>შეუსრულებელი</Text>
                <Text style={styles.statusPercentage}>
                  {stats.total > 0
                    ? Math.round((stats.uncompleted / stats.total) * 100)
                    : 0}
                  %
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Recent Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ბოლო დანიშვნები</Text>
            <TouchableOpacity
              onPress={() => router.push("/(doctor-tabs)/appointments")}
            >
              <Text style={styles.viewAll}>ყველას ნახვა</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.appointmentsCard}>
            {consultations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>
                  დანიშვნები ჯერ არ არის
                </Text>
              </View>
            ) : (
              consultations.slice(0, 8).map((consultation, index) => (
              <View key={consultation.id}>
                <View style={styles.appointmentItem}>
                  <View
                    style={[
                      styles.appointmentIcon,
                      {
                        backgroundColor: `${getStatusColor(
                          consultation.status
                        )}20`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        consultation.status === "completed"
                          ? "checkmark-done"
                          : consultation.status === "in-progress"
                          ? "time"
                          : consultation.status === "cancelled"
                          ? "close"
                          : "calendar"
                      }
                      size={20}
                      color={getStatusColor(consultation.status)}
                    />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentPatient}>
                      {consultation.patientName}
                    </Text>
                    <Text style={styles.appointmentDetails}>
                      {consultation.date} • {consultation.time} •{" "}
                      {consultation.patientAge} წლის
                    </Text>
                    <Text style={styles.appointmentType}>
                      {getConsultationTypeLabel(consultation.type)}
                    </Text>
                    {consultation.symptoms && (
                      <Text style={styles.appointmentSymptoms}>
                        {consultation.symptoms}
                      </Text>
                    )}
                  </View>
                  <View style={styles.appointmentRight}>
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
                    <Text style={styles.appointmentFee}>
                      ₾{consultation.fee}
                    </Text>
                    <Text
                      style={[
                        styles.paymentStatus,
                        {
                          color: consultation.isPaid ? "#10B981" : "#F59E0B",
                        },
                      ]}
                    >
                      {consultation.isPaid ? "გადახდილი" : "მოსალოდნელი"}
                    </Text>
                  </View>
                </View>
                {index < Math.min(7, consultations.length - 1) && (
                  <View style={styles.appointmentDivider} />
                )}
              </View>
              ))
            )}
          </View>
        </View>

        {/* Appointment Insights */}
        <View style={[styles.section, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>დანიშვნების ანალიზი</Text>
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <Ionicons name="calendar" size={32} color="#06B6D4" />
              <Text style={styles.insightValue}>
                {stats.total}
              </Text>
              <Text style={styles.insightLabel}>სულ დანიშვნები</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={styles.insightValue}>
                {appointmentCompletionRate}%
              </Text>
              <Text style={styles.insightLabel}>შესრულების რეიტინგი</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="time" size={32} color="#F59E0B" />
              <Text style={styles.insightValue}>
                {stats.inProgress}
              </Text>
              <Text style={styles.insightLabel}>მიმდინარე</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="close-circle" size={32} color="#EF4444" />
              <Text style={styles.insightValue}>
                {stats.uncompleted}
              </Text>
              <Text style={styles.insightLabel}>შეუსრულებელი</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  placeholder: {
    width: 44,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  viewAll: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  appointmentStats: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentStatItem: {
    flex: 1,
    alignItems: "center",
  },
  appointmentStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  appointmentStatValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  appointmentStatLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
  },
  completionCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  completionLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  completionValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#10B981",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 12,
  },
  progressFill: {
    height: 8,
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  completionDescription: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusCard: {
    width: "31%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statusValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginTop: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  statusPercentage: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  appointmentsCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentPatient: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  appointmentDetails: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 2,
  },
  appointmentType: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
    marginBottom: 2,
  },
  appointmentSymptoms: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  appointmentRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  appointmentFee: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
  },
  appointmentDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },
  insightsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  insightCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#EF4444",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#06B6D4",
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
});
