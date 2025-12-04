import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  doctorStatistics,
  monthlyRevenue,
  patientVisitHistory,
} from "../../assets/data/doctorDashboard";

export default function RevenueDetails() {
  const router = useRouter();
  const stats = doctorStatistics;

  // Calculate percentages
  const revenueChange =
    stats.earnings.thisMonth > stats.earnings.lastMonth ? "up" : "down";
  const revenueChangePercent = Math.abs(
    Math.round(
      ((stats.earnings.thisMonth - stats.earnings.lastMonth) /
        stats.earnings.lastMonth) *
        100
    )
  );

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
                  ${stats.earnings.thisMonth.toLocaleString()}
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
                    ${stats.earnings.paid.toLocaleString()}
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
                ${stats.earnings.paid.toLocaleString()}
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
                ${stats.earnings.pending.toLocaleString()}
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
            {monthlyRevenue.slice(-6).map((month, index) => (
              <View key={month.month} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyMonth}>{month.month}</Text>
                  <Text style={styles.historyConsultations}>
                    {month.consultations} კონსულტაცია
                  </Text>
                </View>
                <Text style={styles.historyRevenue}>
                  ${month.revenue.toLocaleString()}
                </Text>
                <View
                  style={[
                    styles.historyBar,
                    {
                      width: `${
                        (month.revenue /
                          Math.max(...monthlyRevenue.map((m) => m.revenue))) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Top Patients by Revenue */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ტოპ პაციენტები შემოსავლის მიხედვით
          </Text>
          <View style={styles.patientsCard}>
            {patientVisitHistory
              .sort((a, b) => b.totalSpent - a.totalSpent)
              .slice(0, 5)
              .map((patient, index) => (
                <View key={patient.patientId} style={styles.patientItem}>
                  <View style={styles.patientRank}>
                    <Text style={styles.patientRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>
                      {patient.patientName}
                    </Text>
                    <Text style={styles.patientVisits}>
                      {patient.totalVisits} ვიზიტი
                    </Text>
                  </View>
                  <Text style={styles.patientRevenue}>
                    ${patient.totalSpent.toLocaleString()}
                  </Text>
                </View>
              ))}
          </View>
        </View>

        {/* Revenue Statistics */}
        <View style={[styles.section, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>შემოსავლის სტატისტიკა</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={32} color="#10B981" />
              <Text style={styles.statValue}>
                $
                {Math.round(
                  monthlyRevenue.reduce(
                    (sum, month) => sum + month.revenue,
                    0
                  ) / monthlyRevenue.length
                ).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>საშუალო თვიური</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={32} color="#06B6D4" />
              <Text style={styles.statValue}>
                {Math.round(
                  monthlyRevenue.reduce(
                    (sum, month) => sum + month.consultations,
                    0
                  ) / monthlyRevenue.length
                )}
              </Text>
              <Text style={styles.statLabel}>საშუალო კონსულტაცია</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>
                $
                {Math.round(
                  monthlyRevenue.reduce(
                    (sum, month) => sum + month.revenue,
                    0
                  ) /
                    monthlyRevenue.reduce(
                      (sum, month) => sum + month.consultations,
                      0
                    )
                )}
              </Text>
              <Text style={styles.statLabel}>საშუალო ღირებულება</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people" size={32} color="#8B5CF6" />
              <Text style={styles.statValue}>{patientVisitHistory.length}</Text>
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
});
