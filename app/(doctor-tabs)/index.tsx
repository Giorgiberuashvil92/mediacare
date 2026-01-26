import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  RefreshControl,
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
import { apiService } from "../_services/api";
import { useAuth } from "../contexts/AuthContext";
import { useSchedule } from "../contexts/ScheduleContext";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { schedules, selectedDates } = useSchedule();
  const [stats, setStats] = useState<DoctorStatistics | null>(null);
  const [recentConsultations, setRecentConsultations] = useState<
    Consultation[]
  >([]);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<
    "all" | "video" | "home-visit"
  >("all");
  const [slotsModalVisible, setSlotsModalVisible] = useState(false);
  const [slotsModalDate, setSlotsModalDate] = useState<string | null>(null);
  const [slotsModalTimes, setSlotsModalTimes] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const getTypeMeta = (type?: string) => {
    switch (type) {
      case "home-visit":
        return {
          label: "ბინაზე ვიზიტი",
          color: "#8B5CF6", // იასამნისფერი
          bg: "#F4F1FF",
          chipColor: "#EDE9FE",
        };
      case "video":
      default:
        return {
          label: "ონლაინ კონსულტაცია",
          color: "#0EA5E9",
          bg: "#E0F2FE",
          chipColor: "#0EA5E933",
        };
    }
  };

  const upcomingConsultation = useMemo(() => {
    if (!recentConsultations?.length) return null;

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const parseDateTime = (date: string, time: string) => {
      // Parse date and time in local timezone (same as patient side)
      // This ensures consistent time display across doctor and patient apps
      try {
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const dateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
        return isNaN(dateTime.getTime()) ? null : dateTime;
      } catch {
        return null;
      }
    };

    // Filter for today's consultations only
    const todayConsultations = recentConsultations
      .filter((c) => c.status === "scheduled" || c.status === "in-progress")
      .map((c) => {
        const dt = parseDateTime(c.date, c.time);
        return dt ? { ...c, dateTime: dt } : null;
      })
      .filter((c): c is Consultation & { dateTime: Date } => !!c)
      .filter((c) => {
        // Check if consultation is today
        const consultationDate = new Date(c.dateTime);
        consultationDate.setHours(0, 0, 0, 0);
        return consultationDate.getTime() === today.getTime() && c.dateTime >= now;
      })
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    return todayConsultations[0] || null;
  }, [recentConsultations]);

  // Group upcoming available hours (doctor's schedule) by date for the selected type
  const groupedUpcomingByDate = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const acc: Record<string, { date: string; slots: string[] }[]> = {};

    availability.forEach((a: any) => {
      if (!a?.date || !Array.isArray(a.timeSlots) || !a.timeSlots.length) {
        return;
      }

      // Filter by type tab
      if (scheduleFilter !== "all" && a.type !== scheduleFilter) {
        return;
      }

      const dateOnly = new Date(a.date);
      dateOnly.setHours(0, 0, 0, 0);
      // Only today and future
      if (dateOnly < today) return;

      const key = a.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        date: a.date,
        slots: a.timeSlots || [],
      });
    });

    return acc;
  })();

  const upcomingDateKeys = Object.keys(groupedUpcomingByDate).sort();

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const [
        statsResponse,
        appointmentsResponse,
        scheduleResponse,
        availabilityResponse,
      ] = await Promise.all([
        apiService.getDoctorDashboardStats(),
        apiService.getDoctorDashboardAppointments(5),
        apiService.getDoctorDashboardSchedule(),
        apiService.getDoctorAvailability(user.id),
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
      if (
        availabilityResponse.success &&
        Array.isArray(availabilityResponse.data)
      ) {
        setAvailability(availabilityResponse.data as any[]);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("დეშბორდის მონაცემების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    void loadDashboardData();
  }, [loadDashboardData]);

  // Reload when tab/screen gains focus (e.g. back from schedule)
  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
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
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 16, color: "#EF4444", marginBottom: 12 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              setLoading(true);
              const fetchDashboardData = async () => {
                try {
                  const [
                    statsResponse,
                    appointmentsResponse,
                    scheduleResponse,
                  ] = await Promise.all([
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
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            მონაცემები არ მოიძებნა
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

        {upcomingConsultation && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push(
                {
                  pathname: "/(doctor-tabs)/appointments" as any,
                  params: { id: upcomingConsultation.id },
                } as any,
              )
            }
            style={[
              styles.upcomingCard,
              { backgroundColor: getTypeMeta(upcomingConsultation.type).bg },
            ]}
          >
            <View style={styles.upcomingRow}>
              <View style={styles.upcomingLeft}>
                <View style={styles.upcomingBadgeRow}>
                  <View
                    style={[
                      styles.upcomingBadge,
                      { backgroundColor: getTypeMeta(upcomingConsultation.type).chipColor },
                    ]}
                  >
                    <Ionicons
                      name={upcomingConsultation.type === "home-visit" ? "home" : "videocam"}
                      size={16}
                      color={getTypeMeta(upcomingConsultation.type).color}
                    />
                    <Text
                      style={[
                        styles.upcomingBadgeText,
                        { color: getTypeMeta(upcomingConsultation.type).color },
                      ]}
                    >
                      {getTypeMeta(upcomingConsultation.type).label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.upcomingTitle}>
                  დღეს გაქვთ კონსულტაცია {upcomingConsultation.patientName}-თან
                </Text>
                <Text style={styles.upcomingSubtitle}>
                  {new Date(upcomingConsultation.dateTime).toLocaleDateString("ka-GE", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                  , {upcomingConsultation.time}
                </Text>

                <View style={styles.upcomingMetaRow}>
                  <View style={styles.upcomingMetaPill}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={getTypeMeta(upcomingConsultation.type).color}
                    />
                    <Text style={styles.upcomingMetaText}>{upcomingConsultation.time}</Text>
                  </View>
                  <View style={styles.upcomingMetaPill}>
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={getTypeMeta(upcomingConsultation.type).color}
                    />
                    <Text style={styles.upcomingMetaText}>
                      {upcomingConsultation.type === "home-visit" ? "ბინაზე ვიზიტი" : "ონლაინ"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.upcomingRight}>
                <View
                  style={[
                    styles.upcomingAvatar,
                    { borderColor: getTypeMeta(upcomingConsultation.type).color },
                  ]}
                >
                  <Ionicons
                    name="calendar"
                    size={28}
                    color={getTypeMeta(upcomingConsultation.type).color}
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.quickActionsTitle}>სწრაფი მოქმედებები</Text>
          <View style={styles.quickActionsGrid}>
            {/* Chat */}
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionChat]}
              onPress={() => router.push("/(doctor-tabs)/chat" as any)}
              activeOpacity={0.85}
            >
              <View style={styles.quickActionIconWrapper}>
                <Ionicons name="chatbubbles" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>ჩატი</Text>
              <Text style={styles.quickActionSubLabel}>პაციენტებთან</Text>
            </TouchableOpacity>

            {/* Active Patients - Video */}
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionVideo]}
              onPress={() =>
                router.push("/(doctor-tabs)/active-patients?type=video" as any)
              }
              activeOpacity={0.85}
            >
              <View style={styles.quickActionIconWrapper}>
                <Ionicons name="videocam" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>ვიდეო</Text>
              <Text style={styles.quickActionSubLabel}>აქტიური პაციენტები</Text>
            </TouchableOpacity>

            {/* Active Patients - Home Visit */}
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionHomeVisit]}
              onPress={() =>
                router.push(
                  "/(doctor-tabs)/active-patients?type=home-visit" as any
                )
              }
              activeOpacity={0.85}
            >
              <View style={styles.quickActionIconWrapper}>
                <Ionicons name="home" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>ბინაზე</Text>
              <Text style={styles.quickActionSubLabel}>აქტიური პაციენტები</Text>
            </TouchableOpacity>

            {/* Laboratory */}
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionLab]}
              onPress={() => router.push("/(doctor-tabs)/laboratory" as any)}
              activeOpacity={0.85}
            >
              <View style={styles.quickActionIconWrapper}>
                <Ionicons name="flask" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>ლაბორატორია</Text>
              <Text style={styles.quickActionSubLabel}>კვლევების დანიშვნა</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats */}
       

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
                    ხელმისაწვდომი საათი (სულ)
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
                    {todaySchedule.consultations?.length || 0} ჯამში
                  </Text>
                </View>
              </View>

              {/* Video vs Home-visit summary */}
              <View style={styles.scheduleTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.scheduleTypeCard,
                    scheduleFilter === "video" && styles.scheduleTypeCardActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setScheduleFilter(
                      scheduleFilter === "video" ? "all" : "video"
                    )
                  }
                >
                  <View style={styles.scheduleTypeIconVideo}>
                    <Ionicons
                      name="videocam-outline"
                      size={18}
                      color="#0EA5E9"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleTypeTitle}>
                      ვიდეო კონსულტაციები
                    </Text>
                    <Text style={styles.scheduleTypeSubtitle}>
                      {todaySchedule.video?.appointments || 0} ჯავშანი •{" "}
                      {todaySchedule.video?.availableSlots?.length || 0}{" "}
                      თავისუფალი
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scheduleTypeCard,
                    scheduleFilter === "home-visit" &&
                      styles.scheduleTypeCardActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setScheduleFilter(
                      scheduleFilter === "home-visit" ? "all" : "home-visit"
                    )
                  }
                >
                  <View style={styles.scheduleTypeIconHome}>
                    <Ionicons name="home-outline" size={18} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scheduleTypeTitle}>
                      ბინაზე ვიზიტები
                    </Text>
                    <Text style={styles.scheduleTypeSubtitle}>
                      {todaySchedule.homeVisit?.appointments || 0} ჯავშანი •{" "}
                      {todaySchedule.homeVisit?.availableSlots?.length || 0}{" "}
                      თავისუფალი
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {todaySchedule.consultations &&
                todaySchedule.consultations
                  .filter((consultation: any) => {
                    if (scheduleFilter === "all") return true;
                    return consultation.type === scheduleFilter;
                  })
                  .slice(0, 3)
                  .map((consultation: any) => (
                    <View key={consultation.id} style={styles.consultationItem}>
                      <View style={styles.consultationTime}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                        />
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

              {/* Upcoming days list for selected type */}
              {upcomingDateKeys.length > 0 && (
                <View style={styles.upcomingDaysSection}>
                  <Text style={styles.upcomingDaysTitle}>
                    მომავალი დღეები (
                    {scheduleFilter === "all"
                      ? "ყველა ტიპი"
                      : scheduleFilter === "video"
                      ? "ვიდეო"
                      : "ბინაზე"}
                    )
                  </Text>
                  {upcomingDateKeys.slice(0, 5).map((dateKey) => {
                    const items = groupedUpcomingByDate[dateKey] || [];
                    const allSlots = items.flatMap((it) => it.slots || []);
                    const uniqueSlots = Array.from(new Set(allSlots));
                    const totalSlots = uniqueSlots.length;
                    const d = new Date(dateKey);
                    return (
                      <View key={dateKey} style={styles.upcomingDayRow}>
                        <View style={styles.upcomingDayLeft}>
                          <Text style={styles.upcomingDayDate}>
                            {d.toLocaleDateString("ka-GE", {
                              day: "numeric",
                              month: "short",
                            })}
                          </Text>
                          <Text style={styles.upcomingDayWeekday}>
                            {d.toLocaleDateString("ka-GE", {
                              weekday: "short",
                            })}
                          </Text>
                        </View>
                        <View style={styles.upcomingDayRight}>
                          <Text style={styles.upcomingDayCount}>
                            {totalSlots === 1
                              ? "1 ხელმისაწვდომი საათი"
                              : `${totalSlots} ხელმისაწვდომი საათი`}
                          </Text>
                          <View style={styles.upcomingDayTimes}>
                            {uniqueSlots.slice(0, 3).map((time) => (
                              <View key={time} style={styles.upcomingTimeChip}>
                                <Text style={styles.upcomingTimeChipText}>
                                  {time}
                                </Text>
                              </View>
                            ))}
                            {totalSlots > 3 && (
                              <View>
                                <TouchableOpacity
                                  style={styles.upcomingMoreChip}
                                  onPress={() => {
                                    setSlotsModalDate(dateKey);
                                    setSlotsModalTimes(uniqueSlots);
                                    setSlotsModalVisible(true);
                                  }}
                                >
                                  <Text style={styles.upcomingMoreChipText}>
                                    +{totalSlots - 3}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
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
      {/* Full list of hours modal */}
      <Modal
        visible={slotsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSlotsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ხელმისაწვდომი საათები</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSlotsModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {slotsModalDate && (
              <Text style={styles.modalDateText}>
                {new Date(slotsModalDate).toLocaleDateString("ka-GE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            )}

            <View style={styles.modalTimesGrid}>
              {slotsModalTimes.map((time) => (
                <View key={time} style={styles.modalTimeChip}>
                  <Text style={styles.modalTimeChipText}>{time}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalOkButton}
              onPress={() => setSlotsModalVisible(false)}
            >
              <Text style={styles.modalOkButtonText}>კარგი</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create<any>({
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
  // Upcoming banner
  upcomingCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  upcomingRow: {
    flexDirection: "row",
    gap: 12,
  },
  upcomingLeft: {
    flex: 1,
    gap: 6,
  },
  upcomingRight: {
    width: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  upcomingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  upcomingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  upcomingBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  upcomingStatus: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#111827",
  },
  upcomingTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#111827",
  },
  upcomingSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
  },
  upcomingMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  upcomingMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15, 118, 110, 0.06)",
  },
  upcomingMetaText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#111827",
  },
  upcomingAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#0EA5E9",
  },
  upcomingRightLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Poppins-Medium",
  },
  upcomingRightValue: {
    fontSize: 11,
    color: "#111827",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 14,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: "48%",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  quickActionChat: {
    backgroundColor: "#8B5CF6",
  },
  quickActionVideo: {
    backgroundColor: "#0EA5E9",
  },
  quickActionHomeVisit: {
    backgroundColor: "#10B981",
  },
  quickActionLab: {
    backgroundColor: "#F59E0B",
  },
  quickActionIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  quickActionSubLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },
  // Stats Cards Section
  statsCardsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCardsTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 14,
  },
  statsCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
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
  statsCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statsCardValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  statsCardLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
    textAlign: "center",
    marginTop: 2,
  },
  statsCardSubLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 2,
  },
  detailedStatsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  detailedStatsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailedStatsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailedStatsTitle: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  detailedStatsSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
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
  // Today's schedule - type summary (video vs home-visit)
  scheduleTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  scheduleTypeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scheduleTypeCardActive: {
    backgroundColor: "#ECFEFF",
    borderColor: "#06B6D4",
  },
  scheduleTypeIconVideo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  scheduleTypeIconHome: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  scheduleTypeTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
    marginBottom: 2,
  },
  scheduleTypeSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  upcomingDaysSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  upcomingDaysTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#374151",
    marginBottom: 4,
  },
  upcomingDayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  upcomingDayLeft: {
    minWidth: 70,
  },
  upcomingDayDate: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
  },
  upcomingDayWeekday: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  upcomingDayRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  upcomingDayCount: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
    marginBottom: 2,
  },
  upcomingDayTimes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  },
  upcomingTimeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  upcomingTimeChipText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#374151",
  },
  upcomingMoreChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#06B6D420",
  },
  upcomingMoreChipText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  // Modal for full list of hours
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalDateText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 12,
  },
  modalTimesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  modalTimeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  modalTimeChipText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#111827",
  },
  modalOkButton: {
    alignSelf: "center",
    marginTop: 4,
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#06B6D4",
  },
  modalOkButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
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
