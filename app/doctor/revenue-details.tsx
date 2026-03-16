import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../_services/api";

interface PeriodStats {
  year: number;
  month: number;
  dateFrom?: string;
  dateTo?: string;
  videoCount: number;
  homeVisitCount: number;
  videoEarnings: number;
  homeVisitEarnings: number;
  totalEarnings: number;
}

interface DashboardStats {
  earnings: {
    paid: number;
    pending: number;
    thisMonth: number;
    lastMonth: number;
  };
  appointments: { completed: number; inProgress: number; uncompleted: number; total: number };
  patients: { total: number; new: number; returning: number };
  visits: { today: number; thisWeek: number; thisMonth: number; total: number };
  videoConsultations?: { total: number; completed: number; thisMonth: number; lastMonth?: number };
  homeVisits?: { total: number; completed: number; thisMonth: number; lastMonth?: number };
  periodStats?: PeriodStats;
}

const MONTHS = [
  { key: "01", label: "იანვარი" },
  { key: "02", label: "თებერვალი" },
  { key: "03", label: "მარტი" },
  { key: "04", label: "აპრილი" },
  { key: "05", label: "მაისი" },
  { key: "06", label: "ივნისი" },
  { key: "07", label: "ივლისი" },
  { key: "08", label: "აგვისტო" },
  { key: "09", label: "სექტემბერი" },
  { key: "10", label: "ოქტომბერი" },
  { key: "11", label: "ნოემბერი" },
  { key: "12", label: "დეკემბერი" },
];

const WEEKDAYS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];

function getCalendarGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const grid: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length < 42) grid.push(null);
  return grid.slice(0, 42);
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const monthLabel = MONTHS.find((x) => parseInt(x.key, 10) === m)?.label ?? "";
  return `${d} ${monthLabel} ${y}`;
}

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

export default function RevenueDetails() {
  const router = useRouter();
  const now = new Date();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(() =>
    toYYYYMMDD(startOfMonth(now)),
  );
  const [dateTo, setDateTo] = useState<string>(() => toYYYYMMDD(now));
  const [calendarOpenFor, setCalendarOpenFor] = useState<"from" | "to" | null>(
    null,
  );
  const [calendarViewYear, setCalendarViewYear] = useState(now.getFullYear());
  const [calendarViewMonth, setCalendarViewMonth] = useState(
    now.getMonth() + 1,
  );

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDoctorDashboardStats({
        dateFrom,
        dateTo,
      });
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
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const period = stats?.periodStats;
  const periodLabel =
    period != null
      ? period.dateFrom != null && period.dateTo != null
        ? `${formatDateLabel(period.dateFrom)} — ${formatDateLabel(period.dateTo)}`
        : `${MONTHS.find((m) => parseInt(m.key, 10) === period.month)?.label ?? ""} ${period.year}`
      : "";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>დეტალური სტატისტიკა</Text>
          <View style={styles.placeholder} />
        </View>

        {/* პერიოდი — დან / მდე */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>პერიოდი</Text>
          <View style={styles.periodRangeRow}>
            <TouchableOpacity
              style={styles.periodRangeField}
              onPress={() => {
                const [y, m] = dateFrom.split("-").map(Number);
                setCalendarViewYear(y);
                setCalendarViewMonth(m);
                setCalendarOpenFor("from");
              }}
            >
              <Text style={styles.periodRangeLabel}>დან</Text>
              <Text style={styles.periodRangeValue}>{formatDateLabel(dateFrom)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.periodRangeField}
              onPress={() => {
                const [y, m] = dateTo.split("-").map(Number);
                setCalendarViewYear(y);
                setCalendarViewMonth(m);
                setCalendarOpenFor("to");
              }}
            >
              <Text style={styles.periodRangeLabel}>მდე</Text>
              <Text style={styles.periodRangeValue}>{formatDateLabel(dateTo)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
            </TouchableOpacity>
          </View>

          {calendarOpenFor != null && (
            <View style={styles.customCalendar}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  hitSlop={12}
                  onPress={() => {
                    if (calendarViewMonth === 1) {
                      setCalendarViewMonth(12);
                      setCalendarViewYear(calendarViewYear - 1);
                    } else {
                      setCalendarViewMonth(calendarViewMonth - 1);
                    }
                  }}
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {MONTHS.find((m) => parseInt(m.key, 10) === calendarViewMonth)?.label ?? ""}{" "}
                  {calendarViewYear}
                </Text>
                <TouchableOpacity
                  hitSlop={12}
                  onPress={() => {
                    if (calendarViewMonth === 12) {
                      setCalendarViewMonth(1);
                      setCalendarViewYear(calendarViewYear + 1);
                    } else {
                      setCalendarViewMonth(calendarViewMonth + 1);
                    }
                  }}
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-forward" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={styles.weekdayLabel}>
                    {wd}
                  </Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {getCalendarGrid(calendarViewYear, calendarViewMonth).map(
                  (day, i) => {
                    if (day === null) {
                      return <View key={i} style={styles.calendarCell} />;
                    }
                    const cellDate = toYYYYMMDD(
                      new Date(calendarViewYear, calendarViewMonth - 1, day),
                    );
                    const isSelected =
                      (calendarOpenFor === "from" && cellDate === dateFrom) ||
                      (calendarOpenFor === "to" && cellDate === dateTo);
                    const isToday = cellDate === toYYYYMMDD(now);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={styles.calendarCell}
                        onPress={() => {
                          if (calendarOpenFor === "from") {
                            setDateFrom(cellDate);
                            if (cellDate > dateTo) setDateTo(cellDate);
                          } else {
                            setDateTo(cellDate);
                            if (cellDate < dateFrom) setDateFrom(cellDate);
                          }
                          setCalendarOpenFor(null);
                        }}
                      >
                        <View
                          style={[
                            styles.calendarDayInner,
                            isToday && styles.calendarDayToday,
                            isSelected && styles.calendarDaySelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              isToday && styles.calendarDayTextToday,
                              isSelected && styles.calendarDayTextToday,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </View>
          )}
        </View>

        {/* კონსულტაციების ტიპები - არჩეული პერიოდის მიხედვით */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>კონსულტაციების ტიპები</Text>
          <View style={styles.consultationTypesRow}>
            <View style={styles.consultationTypeCard}>
              <View style={[styles.consultationTypeIcon, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="videocam" size={28} color="#0EA5E9" />
              </View>
              <Text style={styles.consultationTypeValue}>
                {period?.videoCount ?? 0}
              </Text>
              <Text style={styles.consultationTypeLabel}>ვიდეო კონსულტაციები</Text>
            </View>
            <View style={styles.consultationTypeCard}>
              <View style={[styles.consultationTypeIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="home" size={28} color="#10B981" />
              </View>
              <Text style={styles.consultationTypeValue}>
                {period?.homeVisitCount ?? 0}
              </Text>
              <Text style={styles.consultationTypeLabel}>ბინაზე ვიზიტები</Text>
            </View>
          </View>
        </View>

        {/* ფინანსური მიმოხილვა - არჩეული პერიოდის შემოსავალი (ექიმის წილი) */}
        <View style={[styles.section, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>ფინანსური მიმოხილვა</Text>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>
              {periodLabel ? `${periodLabel} — თქვენი შემოსავალი` : "არჩეული პერიოდი"}
            </Text>
            <Text style={styles.revenueValue}>
              ₾{(period?.totalEarnings ?? 0).toLocaleString()}
            </Text>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueDetails}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueItemLabel}>ვიდეო (60%)</Text>
                <Text style={styles.revenueItemValue}>
                  ₾{(period?.videoEarnings ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueItemLabel}>ბინაზე ვიზიტი (50%)</Text>
                <Text style={styles.revenueItemValue}>
                  ₾{(period?.homeVisitEarnings ?? 0).toLocaleString()}
                </Text>
              </View>
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
  periodRangeRow: {
    flexDirection: "row",
    gap: 12,
  },
  periodRangeField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  periodRangeLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginRight: 4,
  },
  periodRangeValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  customCalendar: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarTitle: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#64748B",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDayInner: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 36,
    maxHeight: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDayToday: {
    backgroundColor: "#06B6D4",
  },
  calendarDaySelected: {
    backgroundColor: "#06B6D4",
  },
  calendarDayText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#334155",
  },
  calendarDayTextToday: {
    color: "#FFFFFF",
  },
  // Consultation Types Row
  consultationTypesRow: {
    flexDirection: "row",
    gap: 12,
  },
  consultationTypeCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  consultationTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  consultationTypeValue: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  consultationTypeLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
    textAlign: "center",
    marginTop: 4,
  },
  consultationTypeSubLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 4,
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
  // Appointment Statistics
  appointmentStatsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  appointmentStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentStatCompleted: {
    borderBottomWidth: 3,
    borderBottomColor: "#10B981",
  },
  appointmentStatInProgress: {
    borderBottomWidth: 3,
    borderBottomColor: "#F59E0B",
  },
  appointmentStatCancelled: {
    borderBottomWidth: 3,
    borderBottomColor: "#EF4444",
  },
  appointmentStatValue: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  appointmentStatLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
  },
});
