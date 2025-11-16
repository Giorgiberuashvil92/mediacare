import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  Consultation,
  DoctorStatistics,
} from "../../assets/data/doctorDashboard";
import {
  getConsultationTypeLabel,
  getStatusColor,
  getStatusLabel,
} from "../../assets/data/doctorDashboard";
import { useAuth } from "../contexts/AuthContext";
import { useSchedule } from "../contexts/ScheduleContext";
import { apiService } from "../services/api";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { schedules, selectedDates } = useSchedule();
  const [stats, setStats] = useState<DoctorStatistics | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<
    Consultation[]
  >([]);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsResponse, appointmentsResponse, scheduleResponse] =
          await Promise.all([
            apiService.getDoctorDashboardStats(),
            apiService.getDoctorDashboardAppointments(5),
            apiService.getDoctorDashboardSchedule(),
          ]);

        if (statsResponse.success) {
          setStats(statsResponse.data as any);
        }
        if (appointmentsResponse.success) {
          setRecentConsultations(appointmentsResponse.data as any);
        }
        if (scheduleResponse.success) {
          setTodaySchedule(scheduleResponse.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("დეშბორდის მონაცემების ჩატვირთვა ვერ მოხერხდა");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate percentages
  const appointmentCompletionRate = stats
    ? Math.round(
        (stats.appointments.completed / stats.appointments.total) * 100
      )
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            დეშბორდის ჩატვირთვა...
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
            onPress={() => {
              setError(null);
              setLoading(true);
              const fetchDashboardData = async () => {
                try {
                  const [statsResponse, appointmentsResponse, scheduleResponse] =
                    await Promise.all([
                      apiService.getDoctorDashboardStats(),
                      apiService.getDoctorDashboardAppointments(5),
                      apiService.getDoctorDashboardSchedule(),
                    ]);

                  if (statsResponse.success) {
                    setStats(statsResponse.data as any);
                  }
                  if (appointmentsResponse.success) {
                    setRecentConsultations(appointmentsResponse.data as any);
                  }
                  if (scheduleResponse.success) {
                    setTodaySchedule(scheduleResponse.data);
                  }
                } catch (err) {
                  console.error("Error fetching dashboard data:", err);
                  setError("დეშბორდის მონაცემების ჩატვირთვა ვერ მოხერხდა");
                } finally {
                  setLoading(false);
                }
              };
              fetchDashboardData();
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

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            მონაცემები არ მოიძებნა
          </Text>
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
            <Text style={styles.greeting}>გამარჯობა, ექიმო! 👋</Text>
            <Text style={styles.headerName}>{user?.name || "Dr. Cook"}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1F2937" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>მთავარი სტატისტიკა</Text>
          <View style={styles.statsGrid}>
            {/* Earnings Card */}
            <TouchableOpacity
              onPress={() => router.push("/doctor/revenue-details" as any)}
              style={styles.statCardTouchable}
            >
              <LinearGradient
                colors={["#06B6D4", "#0891B2"]}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="wallet" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>
                  ${stats.earnings.paid.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>დარიცხული</Text>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    +${stats.earnings.pending} მოსალოდნელი
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Appointments Card */}
            <TouchableOpacity
              onPress={() => router.push("/doctor/appointments-details" as any)}
              style={styles.statCardTouchable}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="calendar" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>
                  {stats.appointments.completed}
                </Text>
                <Text style={styles.statLabel}>შესრულებული</Text>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    {appointmentCompletionRate}% შესრულება
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Patients Card */}
            <View style={styles.statCardTouchable}>
              <LinearGradient
                colors={["#8B5CF6", "#7C3AED"]}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="people" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>{stats.patients.total}</Text>
                <Text style={styles.statLabel}>პაციენტები</Text>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    +{stats.patients.new} ახალი
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Visits Card */}
            <View style={styles.statCardTouchable}>
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIconContainer}>
                  <MaterialCommunityIcons
                    name="hospital-building"
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.statValue}>{stats.visits.thisMonth}</Text>
                <Text style={styles.statLabel}>ამ თვის ვიზიტები</Text>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    {stats.visits.today} დღეს
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* My Available Schedule */}
        {selectedDates.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ჩემი ხელმისაწვდომობა</Text>
              <TouchableOpacity
                onPress={() => router.push("/(doctor-tabs)/schedule")}
              >
                <Text style={styles.viewAll}>რედაქტირება</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityHeader}>
                <View style={styles.availabilityIconContainer}>
                  <Ionicons name="calendar-outline" size={24} color="#06B6D4" />
                </View>
                <View style={styles.availabilityInfo}>
                  <Text style={styles.availabilityTitle}>
                    {selectedDates.length} დღე დაგეგმილია
                  </Text>
                  <Text style={styles.availabilitySubtitle}>
                    {Object.values(schedules).reduce(
                      (sum, slots) => sum + slots.length,
                      0
                    )}{" "}
                    ხელმისაწვდომი საათი
                  </Text>
                </View>
              </View>
              <View style={styles.availabilityDivider} />
              <View style={styles.schedulesList}>
                {selectedDates
                  .sort()
                  .slice(0, 5)
                  .map((dateStr) => {
                    const date = new Date(dateStr);
                    const slots = schedules[dateStr] || [];
                    const dayNames = [
                      "კვირა",
                      "ორშაბათი",
                      "სამშაბათი",
                      "ოთხშაბათი",
                      "ხუთშაბათი",
                      "პარასკევი",
                      "შაბათი",
                    ];
                    const dayName = dayNames[date.getDay()];

                    return (
                      <View key={dateStr} style={styles.scheduleItem}>
                        <View style={styles.scheduleItemLeft}>
                          <View style={styles.dateIndicator}>
                            <Text style={styles.dateIndicatorNumber}>
                              {date.getDate()}
                            </Text>
                            <Text style={styles.dateIndicatorMonth}>
                              {date.toLocaleDateString("ka-GE", {
                                month: "short",
                              })}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.scheduleItemDay}>
                              {dayName}
                            </Text>
                            <Text style={styles.scheduleItemDate}>
                              {date.toLocaleDateString("ka-GE")}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.scheduleItemRight}>
                          {slots.length > 0 ? (
                            <>
                              <View style={styles.slotsContainer}>
                                {slots.slice(0, 3).map((time) => (
                                  <View key={time} style={styles.timeChip}>
                                    <Text style={styles.timeChipText}>
                                      {time}
                                    </Text>
                                  </View>
                                ))}
                                {slots.length > 3 && (
                                  <View style={styles.moreChip}>
                                    <Text style={styles.moreChipText}>
                                      +{slots.length - 3}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </>
                          ) : (
                            <Text style={styles.noSlotsText}>
                              საათები არ არის არჩეული
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </View>
              {selectedDates.length > 5 && (
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => router.push("/(doctor-tabs)/schedule")}
                >
                  <Text style={styles.viewMoreText}>
                    ყველას ნახვა ({selectedDates.length - 5} დამატებითი)
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#06B6D4" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Today's Schedule */}
        {todaySchedule && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>დღევანდელი განრიგი</Text>
              <Text style={styles.dateText}>
                {new Date(todaySchedule.date).toLocaleDateString("ka-GE", {
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleDay}>
                    {todaySchedule.dayOfWeek}
                  </Text>
                  <Text style={styles.scheduleCount}>
                    {todaySchedule.consultations?.length || 0} კონსულტაცია დაგეგმილია
                  </Text>
                </View>
                <View style={styles.scheduleBadge}>
                  <Text style={styles.scheduleBadgeText}>
                    {todaySchedule.availableSlots?.length || 0} ხელმისაწვდომი
                  </Text>
                </View>
              </View>
              {todaySchedule.consultations &&
                todaySchedule.consultations.slice(0, 3).map((consultation: any) => (
              <View key={consultation.id} style={styles.consultationItem}>
                <View style={styles.consultationTime}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.consultationTimeText}>
                    {consultation.time}
                  </Text>
                </View>
                <View style={styles.consultationInfo}>
                  <Text style={styles.consultationPatient}>
                    {consultation.patientName}
                  </Text>
                  <Text style={styles.consultationDetails}>
                    {consultation.patientAge} წლის •{" "}
                    {getConsultationTypeLabel(consultation.type)}
                  </Text>
                  {consultation.symptoms && (
                    <Text style={styles.consultationSymptoms}>
                      {consultation.symptoms}
                    </Text>
                  )}
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
                ))}
              {todaySchedule.consultations &&
                todaySchedule.consultations.length > 0 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push("/(doctor-tabs)/appointments")}
                  >
                    <Text style={styles.viewAllButtonText}>
                      ყველა კონსულტაციის ნახვა
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#06B6D4" />
                  </TouchableOpacity>
                )}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ბოლო აქტივობა</Text>
            <TouchableOpacity
              onPress={() => router.push("/(doctor-tabs)/appointments")}
            >
              <Text style={styles.viewAll}>ისტორია</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityCard}>
            {recentConsultations.slice(0, 5).map((consultation, index) => (
              <View key={consultation.id}>
                <View style={styles.activityItem}>
                  <View
                    style={[
                      styles.activityIcon,
                      {
                        backgroundColor: consultation.isPaid
                          ? "#10B98120"
                          : "#F59E0B20",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        consultation.isPaid ? "checkmark-done" : "time-outline"
                      }
                      size={20}
                      color={consultation.isPaid ? "#10B981" : "#F59E0B"}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityPatient}>
                      {consultation.patientName}
                    </Text>
                    <Text style={styles.activityDetails}>
                      {consultation.date} • {consultation.time}
                    </Text>
                  </View>
                  <View style={styles.activityAmount}>
                    <Text style={styles.activityAmountText}>
                      ${consultation.fee}
                    </Text>
                    <Text
                      style={[
                        styles.activityStatus,
                        {
                          color: consultation.isPaid ? "#10B981" : "#F59E0B",
                        },
                      ]}
                    >
                      {consultation.isPaid ? "გადახდილი" : "მოსალოდნელი"}
                    </Text>
                  </View>
                </View>
                {index < 4 && <View style={styles.activityDivider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Patient Insights */}
        <View style={[styles.section, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>პაციენტების მიმოხილვა</Text>
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <Ionicons name="people" size={32} color="#06B6D4" />
              <Text style={styles.insightValue}>{stats.patients.total}</Text>
              <Text style={styles.insightLabel}>სულ პაციენტები</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="person-add" size={32} color="#10B981" />
              <Text style={styles.insightValue}>{stats.patients.new}</Text>
              <Text style={styles.insightLabel}>ახალი (ამ თვე)</Text>
            </View>
            <View style={styles.insightCard}>
              <MaterialCommunityIcons
                name="account-check"
                size={32}
                color="#8B5CF6"
              />
              <Text style={styles.insightValue}>
                {stats.patients.returning}
              </Text>
              <Text style={styles.insightLabel}>დაბრუნებული</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="pulse" size={32} color="#F59E0B" />
              <Text style={styles.insightValue}>{stats.visits.total}</Text>
              <Text style={styles.insightLabel}>სულ ვიზიტები</Text>
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
  greeting: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 4,
  },
  headerName: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  notificationButton: {
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
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
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
  dateText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCardTouchable: {
    width: "48%",
  },
  statCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 8,
  },
  statBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
  },
  revenueCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  revenueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  revenueLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changeUp: {
    backgroundColor: "#10B98120",
  },
  changeDown: {
    backgroundColor: "#EF444420",
  },
  changeText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  changeTextUp: {
    color: "#10B981",
  },
  changeTextDown: {
    color: "#EF4444",
  },
  revenueDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  revenueDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  revenueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  revenueIndicator: {
    width: 8,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#06B6D4",
  },
  revenueIndicatorPending: {
    backgroundColor: "#F59E0B",
  },
  revenueItemLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 2,
  },
  revenueItemValue: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
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
  scheduleCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleDay: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  scheduleCount: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  scheduleBadge: {
    backgroundColor: "#06B6D420",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scheduleBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  consultationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  consultationTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  consultationTimeText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  consultationInfo: {
    marginBottom: 8,
  },
  consultationPatient: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  consultationDetails: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 4,
  },
  consultationSymptoms: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  viewAllButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activityInfo: {
    flex: 1,
  },
  activityPatient: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  activityDetails: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  activityAmount: {
    alignItems: "flex-end",
  },
  activityAmountText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  activityStatus: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
  },
  activityDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
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
  availabilityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  availabilityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0FDFA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  availabilityInfo: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  availabilitySubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  availabilityDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  schedulesList: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  scheduleItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dateIndicator: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#06B6D410",
    justifyContent: "center",
    alignItems: "center",
  },
  dateIndicatorNumber: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#06B6D4",
  },
  dateIndicatorMonth: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
    textTransform: "uppercase",
  },
  scheduleItemDay: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  scheduleItemDate: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  scheduleItemRight: {
    alignItems: "flex-end",
  },
  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  timeChip: {
    backgroundColor: "#10B98120",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeChipText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: "#10B981",
  },
  moreChip: {
    backgroundColor: "#06B6D420",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moreChipText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  noSlotsText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  viewMoreText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
});
