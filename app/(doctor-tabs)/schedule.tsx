import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useSchedule } from "../contexts/ScheduleContext";
import { apiService } from "../services/api";

const AVAILABLE_HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export default function DoctorSchedule() {
  const { schedules, selectedDates, setSchedules, setSelectedDates } =
    useSchedule();
  const { user } = useAuth();
  const [mode, setMode] = useState<"video" | "home-visit">("video");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [currentEditDate, setCurrentEditDate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing availability on mount
  useEffect(() => {
    const loadAvailability = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiService.getDoctorAvailability(user.id);

        if (response.success && response.data) {
          // Convert availability to schedules format
          const loadedSchedules: { [key: string]: string[] } = {};
          const loadedDates: string[] = [];

          response.data.forEach((avail: any) => {
            if (avail.isAvailable && avail.timeSlots && avail.timeSlots.length > 0) {
              loadedSchedules[avail.date] = avail.timeSlots;
              loadedDates.push(avail.date);
            }
          });

          setSchedules(loadedSchedules);
          setSelectedDates(loadedDates);
        }
      } catch (error) {
        console.error("Error loading availability:", error);
        // Don't show error, just start with empty schedule
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [user?.id, setSchedules, setSelectedDates]);

  // Generate calendar by months
  const generateCalendarByMonths = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Current month days (from today onwards)
    const currentMonthDays = [];
    const daysInCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();
    for (let day = today.getDate(); day <= daysInCurrentMonth; day++) {
      currentMonthDays.push(new Date(currentYear, currentMonth, day));
    }

    // Next month days (all days)
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
    const nextMonthValue = nextMonth > 11 ? 0 : nextMonth;
    const nextMonthDays = [];
    const daysInNextMonth = new Date(nextYear, nextMonthValue + 1, 0).getDate();
    for (let day = 1; day <= daysInNextMonth; day++) {
      nextMonthDays.push(new Date(nextYear, nextMonthValue, day));
    }

    return {
      currentMonth: {
        name: today.toLocaleDateString("ka-GE", {
          month: "long",
          year: "numeric",
        }),
        days: currentMonthDays,
      },
      nextMonth: {
        name: new Date(nextYear, nextMonthValue, 1).toLocaleDateString(
          "ka-GE",
          {
            month: "long",
            year: "numeric",
          }
        ),
        days: nextMonthDays,
      },
    };
  };

  const calendar = generateCalendarByMonths();

  const getDayName = (date: Date) => {
    const days = [
      "კვირა",
      "ორშაბათი",
      "სამშაბათი",
      "ოთხშაბათი",
      "ხუთშაბათი",
      "პარასკევი",
      "შაბათი",
    ];
    return days[date.getDay()];
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.includes(formatDate(date));
  };

  const toggleDateSelection = (date: Date) => {
    const dateStr = formatDate(date);
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
      // Remove schedule for this date
      const newSchedules = { ...schedules };
      delete newSchedules[dateStr];
      setSchedules(newSchedules);
    } else {
      setSelectedDates([...selectedDates, dateStr]);
      setHasSaved(false); // Reset hasSaved when new date is selected
    }
  };

  const openTimeSelector = (date: Date) => {
    setCurrentEditDate(formatDate(date));
    setShowTimeModal(true);
  };

  const toggleTimeSlot = (time: string) => {
    if (!currentEditDate) return;

    const currentSlots = schedules[currentEditDate] || [];
    let newSlots;

    if (currentSlots.includes(time)) {
      newSlots = currentSlots.filter((t) => t !== time);
    } else {
      newSlots = [...currentSlots, time].sort();
    }

    setSchedules({
      ...schedules,
      [currentEditDate]: newSlots,
    });

    // Reset hasSaved when slots are modified
    setHasSaved(false);
  };

  const saveSchedule = async () => {
    if (!allDatesHaveSlots()) {
      Alert.alert(
        "შეცდომა",
        "გთხოვთ დაამატოთ საათები ყველა არჩეულ დღეს"
      );
      return;
    }

    try {
      setIsSaving(true);

      // Prepare availability data for API
      const availabilityData = selectedDates.map((dateStr) => ({
        date: dateStr,
        timeSlots: schedules[dateStr] || [],
        isAvailable: (schedules[dateStr] || []).length > 0,
        type: mode,
      }));

      // Save to backend
      const response = await apiService.updateAvailability(availabilityData);

      if (response.success) {
        setSaveSuccess(true);
        setHasSaved(true); // Mark as saved

        // Hide success message after 2 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      } else {
        Alert.alert(
          "შეცდომა",
          response.message || "განრიგის შენახვა ვერ მოხერხდა"
        );
      }
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      Alert.alert(
        "შეცდომა",
        error.message || "განრიგის შენახვა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if all selected dates have at least one time slot
  const allDatesHaveSlots = () => {
    return selectedDates.every((dateStr) => {
      const slots = schedules[dateStr];
      return slots && slots.length > 0;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            განრიგის ჩატვირთვა...
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
          <View style={styles.headerCard}>
            <Text style={styles.title}>განრიგის დაგეგმვა</Text>
            <Text style={styles.subtitle}>
              აირჩიეთ რომელ დღეებში და საათებში გინდათ მუშაობა
            </Text>
            <View style={styles.modePill}>
              <Text style={styles.modePillText}>
                {mode === "video"
                  ? "ვიდეო კონსულტაციის გრაფიკი"
                  : "ბინაზე ვიზიტების გრაფიკი"}
              </Text>
            </View>

            {/* Mode selector cards */}
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modeCard,
                  mode === "video" && styles.modeCardActiveVideo,
                ]}
                onPress={() => setMode("video")}
                activeOpacity={0.9}
              >
                <View style={styles.modeIconCircle}>
                  <Ionicons
                    name="videocam-outline"
                    size={20}
                    color={mode === "video" ? "#0EA5E9" : "#2563EB"}
                  />
                </View>
                <Text style={styles.modeTitle}>ვიდეო კონსულტაციები</Text>
                <Text style={styles.modeSubtitleCard}>
                  ონლაინ ვიზიტებისთვის ხელმისაწვდომი დროები
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeCard,
                  mode === "home-visit" && styles.modeCardActiveHome,
                ]}
                onPress={() => setMode("home-visit")}
                activeOpacity={0.9}
              >
                <View style={styles.modeIconCircle}>
                  <Ionicons
                    name="home-outline"
                    size={20}
                    color={mode === "home-visit" ? "#22C55E" : "#16A34A"}
                  />
                </View>
                <Text style={styles.modeTitle}>ბინაზე ვიზიტები</Text>
                <Text style={styles.modeSubtitleCard}>
                  პაციენტის მისამართზე წასვლის დღეები
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionIconContainer}>
            <Ionicons name="information-circle" size={24} color="#06B6D4" />
          </View>
          <View style={styles.instructionContent}>
            <Text style={styles.instructionTitle}>როგორ გამოვიყენოთ?</Text>
            <Text style={styles.instructionText}>
              1. აირჩიეთ დღეები კალენდარიდან{"\n"}2. თითოეულ დღეს დააჭირეთ
              საათების შესარჩევად{"\n"}3. შეინახეთ თქვენი განრიგი
            </Text>
          </View>
        </View>

        {/* Selected Days Summary */}
        {selectedDates.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>
                არჩეული დღეები: {selectedDates.length}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDates([]);
                  setSchedules({});
                }}
              >
                <Text style={styles.clearText}>გასუფთავება</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.statText}>
                  {
                    Object.values(schedules).filter((slots) => slots.length > 0)
                      .length
                  }{" "}
                  კონფიგურირებული
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons
                  name={
                    allDatesHaveSlots()
                      ? "checkmark-done-circle"
                      : "alert-circle"
                  }
                  size={20}
                  color={allDatesHaveSlots() ? "#10B981" : "#EF4444"}
                />
                <Text
                  style={[
                    styles.statText,
                    !allDatesHaveSlots() && { color: "#EF4444" },
                  ]}
                >
                  {
                    selectedDates.filter(
                      (d) => !schedules[d] || schedules[d].length === 0
                    ).length
                  }{" "}
                  {allDatesHaveSlots() ? "მზადაა შესანახად" : "საათების გარეშე"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Calendar */}
        <View style={styles.calendarSection}>
          {/* Current Month */}
          <View style={styles.monthSection}>
            <View style={styles.monthHeader}>
              <Ionicons name="calendar" size={20} color="#06B6D4" />
              <Text style={styles.monthTitle}>
                {calendar.currentMonth.name}
              </Text>
              <View style={styles.monthBadge}>
                <Text style={styles.monthBadgeText}>
                  {calendar.currentMonth.days.length} დღე
                </Text>
              </View>
            </View>
            <View style={styles.calendarGrid}>
              {calendar.currentMonth.days.map((date, index) => {
                const isSelected = isDateSelected(date);
                const dateStr = formatDate(date);
                const hasSchedule = schedules[dateStr]?.length > 0;
                const today = isToday(date);

                return (
                  <View key={index} style={styles.dateWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.dateCard,
                        isSelected &&
                          (mode === "video"
                            ? styles.dateCardSelectedVideo
                            : styles.dateCardSelectedHome),
                        today && styles.dateCardToday,
                      ]}
                      onPress={() => toggleDateSelection(date)}
                    >
                      {today && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>დღეს</Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.dateDayName,
                          isSelected && styles.dateTextSelected,
                        ]}
                      >
                        {getDayName(date)}
                      </Text>
                      <Text
                        style={[
                          styles.dateNumber,
                          isSelected && styles.dateTextSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkMark}>
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                    {isSelected && (
                      <TouchableOpacity
                        style={styles.configureButton}
                        onPress={() => openTimeSelector(date)}
                      >
                        <Ionicons
                          name={hasSchedule ? "create" : "time-outline"}
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.configureButtonText}>
                          {hasSchedule
                            ? `${schedules[dateStr].length} საათი`
                            : "საათის არჩევა"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Next Month */}
          <View style={styles.monthSection}>
            <View style={styles.monthHeader}>
              <Ionicons name="calendar-outline" size={20} color="#10B981" />
              <Text style={styles.monthTitle}>{calendar.nextMonth.name}</Text>
              <View
                style={[styles.monthBadge, { backgroundColor: "#10B98120" }]}
              >
                <Text style={[styles.monthBadgeText, { color: "#10B981" }]}>
                  {calendar.nextMonth.days.length} დღე
                </Text>
              </View>
            </View>
            <View style={styles.calendarGrid}>
              {calendar.nextMonth.days.map((date, index) => {
                const isSelected = isDateSelected(date);
                const dateStr = formatDate(date);
                const hasSchedule = schedules[dateStr]?.length > 0;

                return (
                  <View key={index} style={styles.dateWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.dateCard,
                        isSelected &&
                          (mode === "video"
                            ? styles.dateCardSelectedVideo
                            : styles.dateCardSelectedHome),
                      ]}
                      onPress={() => toggleDateSelection(date)}
                    >
                      <Text
                        style={[
                          styles.dateDayName,
                          isSelected && styles.dateTextSelected,
                        ]}
                      >
                        {getDayName(date)}
                      </Text>
                      <Text
                        style={[
                          styles.dateNumber,
                          isSelected && styles.dateTextSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkMark}>
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                    {isSelected && (
                      <TouchableOpacity
                        style={styles.configureButton}
                        onPress={() => openTimeSelector(date)}
                      >
                        <Ionicons
                          name={hasSchedule ? "create" : "time-outline"}
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.configureButtonText}>
                          {hasSchedule
                            ? `${schedules[dateStr].length} საათი`
                            : "საათის არჩევა"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      {selectedDates.length > 0 &&
        allDatesHaveSlots() &&
        !saveSuccess &&
        !hasSaved && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              isSaving && styles.floatingButtonSaving,
            ]}
            onPress={saveSchedule}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            {isSaving ? (
              <View style={styles.floatingButtonContent}>
                <View style={styles.loadingSpinner}>
                  <Ionicons name="hourglass" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.floatingButtonTextContainer}>
                  <Text style={styles.floatingButtonText}>შენახვა...</Text>
                  <Text style={styles.floatingButtonSubtext}>
                    გთხოვთ დაელოდოთ
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.floatingButtonContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="save-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.floatingButtonTextContainer}>
                  <Text style={styles.floatingButtonText}>
                    განრიგის შენახვა
                  </Text>
                  <Text style={styles.floatingButtonSubtext}>
                    {selectedDates.length} დღე •{" "}
                    {Object.values(schedules).reduce(
                      (sum, slots) => sum + slots.length,
                      0
                    )}{" "}
                    საათი
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward-circle"
                  size={28}
                  color="rgba(255, 255, 255, 0.8)"
                />
              </View>
            )}
          </TouchableOpacity>
        )}

      {/* Success Message */}
      {saveSuccess && (
        <View style={styles.successMessage}>
          <View style={styles.successContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>წარმატებით შეინახა!</Text>
            <Text style={styles.successSubtitle}>თქვენი განრიგი განახლდა</Text>
          </View>
        </View>
      )}

      {/* Time Selector Modal */}
      <Modal
        visible={showTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>საათების არჩევა</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTimeModal(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {currentEditDate && (
              <View style={styles.modalDateInfo}>
                <Ionicons name="calendar" size={20} color="#06B6D4" />
                <Text style={styles.modalDateText}>
                  {new Date(currentEditDate).toLocaleDateString("ka-GE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            )}

            <ScrollView style={styles.timeSlotsList}>
              <View style={styles.timeGrid}>
                {AVAILABLE_HOURS.map((time) => {
                  const isSelected =
                    currentEditDate &&
                    schedules[currentEditDate]?.includes(time);

                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        isSelected &&
                          (mode === "video"
                            ? styles.timeChipSelectedVideo
                            : styles.timeChipSelectedHome),
                      ]}
                      onPress={() => toggleTimeSlot(time)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected &&
                            (mode === "video"
                              ? styles.timeChipTextSelectedVideo
                              : styles.timeChipTextSelectedHome),
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => {
                  if (currentEditDate) {
                    const currentSlots = schedules[currentEditDate] || [];
                    if (currentSlots.length === AVAILABLE_HOURS.length) {
                      // Deselect all
                      setSchedules({
                        ...schedules,
                        [currentEditDate]: [],
                      });
                    } else {
                      // Select all
                      setSchedules({
                        ...schedules,
                        [currentEditDate]: [...AVAILABLE_HOURS],
                      });
                    }
                  }
                }}
              >
                <Text style={styles.selectAllText}>
                  {currentEditDate &&
                  schedules[currentEditDate]?.length === AVAILABLE_HOURS.length
                    ? "ყველას მოხსნა"
                    : "ყველას არჩევა"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.doneButtonText}>მზადაა</Text>
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
    backgroundColor: "#F3F4F6",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    marginBottom: 10,
  },
  modePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5F3FF",
    marginBottom: 14,
  },
  modePillText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  modeRow: {
    flexDirection: "row",
    marginTop: 4,
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  modeCardActiveVideo: {
    backgroundColor: "#E0F2FE",
    shadowOpacity: 0.12,
  },
  modeCardActiveHome: {
    backgroundColor: "#DCFCE7",
    shadowOpacity: 0.12,
  },
  modeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
    marginBottom: 4,
  },
  modeSubtitleCard: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  instructionsCard: {
    flexDirection: "row",
    backgroundColor: "#ECFEFF",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
  },
  instructionIconContainer: {
    marginRight: 12,
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#EF4444",
  },
  summaryStats: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  calendarSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  monthSection: {
    marginBottom: 32,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
  },
  monthTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  monthBadge: {
    backgroundColor: "#06B6D420",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  dateWrapper: {
    width: "31%",
    marginBottom: 10,
  },
  dateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 2,
    borderColor: "#F3F4F6",
    position: "relative",
  },
  dateCardSelectedVideo: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  dateCardSelectedHome: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  dateCardToday: {
    borderColor: "#F59E0B",
  },
  todayBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 8,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  dateDayName: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  dateMonth: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  dateTextSelected: {
    color: "#FFFFFF",
  },
  checkMark: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  configureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#10B981",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  configureButtonText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#06B6D4",
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  floatingButtonSaving: {
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
  },
  floatingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSpinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingButtonTextContainer: {
    flex: 1,
  },
  floatingButtonText: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  floatingButtonSubtext: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "rgba(255, 255, 255, 0.95)",
  },
  successMessage: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  successContent: {
    alignItems: "center",
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10B98115",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#10B981",
    marginBottom: 6,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalDateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDFA",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalDateText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  timeSlotsList: {
    paddingHorizontal: 20,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeChip: {
    minWidth: "30%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  timeChipSelectedVideo: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  timeChipSelectedHome: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  timeChipText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#374151",
  },
  timeChipTextSelectedVideo: {
    color: "#FFFFFF",
  },
  timeChipTextSelectedHome: {
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  selectAllButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  selectAllText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  doneButton: {
    flex: 1,
    backgroundColor: "#06B6D4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});
