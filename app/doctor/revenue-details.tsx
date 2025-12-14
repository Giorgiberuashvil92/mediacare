import Ionicons from "@expo/vector-icons/Ionicons";
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
import { apiService } from "../services/api";

interface DashboardStats {
  earnings: {
    paid: number;
    pending: number;
    thisMonth: number;
    lastMonth: number;
  };
  appointments: {
    completed: number;
    inProgress: number;
    uncompleted: number;
    total: number;
  };
  patients: {
    total: number;
    new: number;
    returning: number;
  };
  visits: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
}

export default function RevenueDetails() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getDoctorDashboardStats();

      if (response.success && response.data) {
        setStats(response.data as DashboardStats);
      } else {
        setError("სტატისტიკის ჩატვირთვა ვერ მოხერხდა");
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("სტატისტიკის ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

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

  if (error || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {error || "სტატისტიკის ჩატვირთვა ვერ მოხერხდა"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchStats}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate percentages
  const revenueChange =
    stats.earnings.thisMonth > stats.earnings.lastMonth ? "up" : "down";
  const revenueChangePercent =
    stats.earnings.lastMonth > 0
      ? Math.abs(
          Math.round(
            ((stats.earnings.thisMonth - stats.earnings.lastMonth) /
              stats.earnings.lastMonth) *
              100
          )
        )
      : 0;

  // Calculate total revenue
  const totalRevenue = stats.earnings.paid + stats.earnings.pending;

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
          <Text style={styles.headerTitle}>შემოსავლების დეტალები</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Current Month Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>მიმდინარე თვის მიმოხილვა</Text>
          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <View>
                <Text style={styles.revenueLabel}>მიმდინარე თვე</Text>
                <Text style={styles.revenueValue}>
                  ₾{stats.earnings.thisMonth.toLocaleString()}
                </Text>
              </View>
              <View
                style={[
                  styles.changeIndicator,
                  revenueChange === "up" ? styles.changeUp : styles.changeDown,
                ]}
              >
                <Ionicons
                  name={
                    revenueChange === "up" ? "trending-up" : "trending-down"
                  }
                  size={16}
                  color={revenueChange === "up" ? "#10B981" : "#EF4444"}
                />
                <Text
                  style={[
                    styles.changeText,
                    revenueChange === "up"
                      ? styles.changeTextUp
                      : styles.changeTextDown,
                  ]}
                >
                  {revenueChangePercent}%
                </Text>
              </View>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueDetails}>
              <View style={styles.revenueItem}>
                <View style={styles.revenueIndicator} />
                <View>
                  <Text style={styles.revenueItemLabel}>გადახდილი</Text>
                  <Text style={styles.revenueItemValue}>
                    ₾{stats.earnings.paid.toLocaleString()}
                  </Text>
                </View>
              </View>
             
            </View>
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>შემოსავლების დაყოფა</Text>
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.breakdownValue}>
                ₾{stats.earnings.paid.toLocaleString()}
              </Text>
              <Text style={styles.breakdownLabel}>გადახდილი</Text>
              <Text style={styles.breakdownPercentage}>
                {Math.round((stats.earnings.paid / totalRevenue) * 100)}%
              </Text>
            </View>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownIcon}>
                <Ionicons name="time" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.breakdownValue}>
                ₾{stats.earnings.pending.toLocaleString()}
              </Text>
              <Text style={styles.breakdownLabel}>მოსალოდნელი</Text>
              <Text style={styles.breakdownPercentage}>
                {Math.round((stats.earnings.pending / totalRevenue) * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Revenue History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ყოველთვიური შემოსავალი</Text>
          <View style={styles.historyCard}>
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                ყოველთვიური ისტორია ჯერ არ არის ხელმისაწვდომი
              </Text>
            </View>
          </View>
        </View>

        {/* Top Patients by Revenue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            პაციენტების სტატისტიკა
          </Text>
          <View style={styles.patientsCard}>
            <View style={styles.patientStatsGrid}>
              <View style={styles.patientStatItem}>
                <Ionicons name="people" size={24} color="#06B6D4" />
                <Text style={styles.patientStatValue}>
                  {stats.patients.total}
                </Text>
                <Text style={styles.patientStatLabel}>სულ პაციენტები</Text>
              </View>
              <View style={styles.patientStatItem}>
                <Ionicons name="person-add" size={24} color="#10B981" />
                <Text style={styles.patientStatValue}>
                  {stats.patients.new}
                </Text>
                <Text style={styles.patientStatLabel}>ახალი</Text>
              </View>
              <View style={styles.patientStatItem}>
                <Ionicons name="repeat" size={24} color="#F59E0B" />
                <Text style={styles.patientStatValue}>
                  {stats.patients.returning}
                </Text>
                <Text style={styles.patientStatLabel}>განმეორებითი</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Revenue Statistics */}
        <View style={[styles.section, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>შემოსავლის სტატისტიკა</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={32} color="#10B981" />
              <Text style={styles.statValue}>
                ₾{stats.earnings.thisMonth.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>მიმდინარე თვე</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={32} color="#06B6D4" />
              <Text style={styles.statValue}>
                {stats.visits.thisMonth}
              </Text>
              <Text style={styles.statLabel}>ამ თვის ვიზიტები</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>
                ₾
                {stats.appointments.total > 0
                  ? Math.round(
                      totalRevenue / stats.appointments.total
                    ).toLocaleString()
                  : 0}
              </Text>
              <Text style={styles.statLabel}>საშუალო ღირებულება</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color="#8B5CF6" />
              <Text style={styles.statValue}>{stats.patients.total}</Text>
              <Text style={styles.statLabel}>სულ პაციენტები</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 12,
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
  breakdownGrid: {
    flexDirection: "row",
    gap: 12,
  },
  breakdownCard: {
    flex: 1,
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
  breakdownIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 4,
  },
  breakdownPercentage: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyInfo: {
    flex: 1,
  },
  historyMonth: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  historyConsultations: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  historyRevenue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginRight: 12,
  },
  historyBar: {
    height: 4,
    backgroundColor: "#06B6D4",
    borderRadius: 2,
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  patientsCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  patientRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#06B6D420",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  patientRankText: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: "#06B6D4",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  patientVisits: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  patientRevenue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#10B981",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
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
  statValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
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
    textAlign: "center",
  },
  patientStatsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  patientStatItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
  },
  patientStatValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  patientStatLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
  },
});
