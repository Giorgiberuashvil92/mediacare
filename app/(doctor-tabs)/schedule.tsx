import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";

// 24-საათიანი სლოტები (საათობრივი ინტერვალით)
const AVAILABLE_HOURS = Array.from({ length: 24 }, (_, h) =>
  `${String(h).padStart(2, "0")}:00`
);

export default function DoctorSchedule() {
  const { user } = useAuth();

  // ორი ცალკე განრიგი და თარიღები: ვიდეო და ბინაზე ვიზიტები
  const [videoSchedules, setVideoSchedules] = useState<{ [key: string]: string[] }>({});
  const [homeVisitSchedules, setHomeVisitSchedules] = useState<{ [key: string]: string[] }>({});
  const [videoSelectedDates, setVideoSelectedDates] = useState<string[]>([]);
  const [homeVisitSelectedDates, setHomeVisitSelectedDates] = useState<string[]>([]);
  // დაჯავშნილი საათები თითოეული თარიღისთვის და ტიპისთვის
  const [bookedSlots, setBookedSlots] = useState<{ [key: string]: string[] }>({});

  const [mode, setMode] = useState<"video" | "home-visit">("video");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [currentEditDate, setCurrentEditDate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // საწყისი მდგომარეობა: ცვლილება არ არის შენახვასთან შედარებით
  const [hasSaved, setHasSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // საწყისში backend-იდან წამოღებული თარიღები (რომლის "გამორთვაც" გვინდა შენახვისას)
  const initialVideoDatesRef = useRef<string[]>([]);
  const initialHomeVisitDatesRef = useRef<string[]>([]);
  // საწყისში backend-იდან წამოღებული საათები თითოეული თარიღისთვის (რათა განვასხვაოთ ახლადარჩეული და შენახული)
  const initialVideoSchedulesRef = useRef<{ [key: string]: string[] }>({});
  const initialHomeVisitSchedulesRef = useRef<{ [key: string]: string[] }>({});

  const getCurrentModeSchedules = () =>
    mode === "video" ? videoSchedules : homeVisitSchedules;

  const getCurrentModeSelectedDates = () =>
    mode === "video" ? videoSelectedDates : homeVisitSelectedDates;

  // Load existing availability
  const loadAvailability = async (isRefresh = false) => {
    if (!user?.id) {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiService.getDoctorAvailability(user.id);

      if (response.success && response.data) {
        const loadedVideoSchedules: { [key: string]: string[] } = {};
        const loadedHomeVisitSchedules: { [key: string]: string[] } = {};
        const videoDates: string[] = [];
        const homeVisitDates: string[] = [];
        const loadedBookedSlots: { [key: string]: string[] } = {};

        response.data.forEach((avail: any) => {
          const type = avail.type === "home-visit" ? "home-visit" : "video";
          const dateKey = `${avail.date}-${type}`;

          // დაჯავშნილი საათების შენახვა
          if (avail.bookedSlots && Array.isArray(avail.bookedSlots) && avail.bookedSlots.length > 0) {
            loadedBookedSlots[dateKey] = avail.bookedSlots;
          }

          // ექიმის სქედულისთვის დღე უნდა გამოჩნდეს მაშინაც კი,
          // თუ ყველა სლოტი უკვე დაჯავშნილია (isAvailable შეიძლება იყოს false),
          // ამიტომ მხოლოდ timeSlots-ზე ვამოწმებთ.
          if (avail.timeSlots && avail.timeSlots.length > 0) {
            if (type === "video") {
              loadedVideoSchedules[avail.date] = avail.timeSlots;
              if (!videoDates.includes(avail.date)) {
                videoDates.push(avail.date);
              }
            } else {
              loadedHomeVisitSchedules[avail.date] = avail.timeSlots;
              if (!homeVisitDates.includes(avail.date)) {
                homeVisitDates.push(avail.date);
              }
            }
          }
        });

        setVideoSchedules(loadedVideoSchedules);
        setHomeVisitSchedules(loadedHomeVisitSchedules);
        setVideoSelectedDates(videoDates);
        setHomeVisitSelectedDates(homeVisitDates);
        setBookedSlots(loadedBookedSlots);

        // შევინახოთ საწყისი თარიღები და საათები, რომლებსაც backend უკვე იცნობს
        initialVideoDatesRef.current = Object.keys(loadedVideoSchedules);
        initialHomeVisitDatesRef.current = Object.keys(loadedHomeVisitSchedules);
        // Deep copy schedules for initial state comparison
        initialVideoSchedulesRef.current = JSON.parse(JSON.stringify(loadedVideoSchedules));
        initialHomeVisitSchedulesRef.current = JSON.parse(JSON.stringify(loadedHomeVisitSchedules));
      }
    } catch (error) {
      console.error("Error loading availability:", error);
      // Don't show error, just start with empty schedule
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Load existing availability on mount
  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  // Avoid timezone shift: build YYYY-MM-DD from local date parts
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isDateSelected = (date: Date) => {
    const currentSelected = getCurrentModeSelectedDates();
    return currentSelected.includes(formatDate(date));
  };

  const toggleDateSelection = async (date: Date) => {
    const dateStr = formatDate(date);
    const currentSelected = getCurrentModeSelectedDates();

    // სპეციალური ლოგიკა "დღეს" თარიღზე დაჭერისთვის
    // საჭირო, რომ დღევანდელი გრაფიკის სწრაფად მოხსნა იყოს შესაძლებელი:
    // - თუ დღევანდელ თარიღზე არ არის ჯავშნები -> მოვხსნათ მთელი გრაფიკი (ყველა სლოტი და თვითონ დღე)
    // - თუ დღევანდელ თარიღზე არის ჯავშნები   -> ყველა თავისუფალი სლოტი მოვხსნათ და დავტოვოთ მხოლოდ დაჯავშნილი საათები
    const isTodayDate = (() => {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    })();

    if (isTodayDate && currentSelected.includes(dateStr)) {
      const currentSchedules = getCurrentModeSchedules();
      const currentSlots = currentSchedules[dateStr] || [];
      const dateKey = `${dateStr}-${mode}`;
      const bookedForDate = bookedSlots[dateKey] || [];

      // თუ საერთოდ არანაირი საათი არ არის ამ დღეზე, გადავდივართ სტანდარტულ ქცევაზე
      if (currentSlots.length > 0) {
        // 1) თუ ამ დღეზე არ არის არც ერთი დაჯავშნილი საათი -> მოვხსნათ მთელი გრაფიკი დღისთვის
        if (bookedForDate.length === 0) {
          const updater =
            mode === "video" ? setVideoSelectedDates : setHomeVisitSelectedDates;
          updater(currentSelected.filter((d) => d !== dateStr));

          const updatedSchedules = { ...currentSchedules };
          delete updatedSchedules[dateStr];

          if (mode === "video") {
            setVideoSchedules(updatedSchedules);
          } else {
            setHomeVisitSchedules(updatedSchedules);
          }

          // ბექენდზე მივყიდოთ, რომ დღევანდელ თარიღზე ამ რეჟიმისთვის აღარ არის ხელმისაწვდომობა
          try {
            await apiService.updateAvailability([
              {
                date: dateStr,
                timeSlots: [],
                isAvailable: false,
                type: mode,
              },
            ]);
            setHasSaved(false);
          } catch (error: any) {
            console.error("Error updating availability for today:", error);
            Alert.alert(
              "შეცდომა",
              error?.message || "დღევანდელი დღის განრიგის განახლება ვერ მოხერხდა"
            );
            // Reload availability from backend to restore the correct state
            await loadAvailability();
          }

          return;
        }

        // 2) თუ ამ დღეზე არის დაჯავშნილი საათები -> ყველა თავისუფალი საათი მოვხსნათ და დავტოვოთ მხოლოდ დაჯავშნილი
        const newSlots = currentSlots.filter((time) =>
          bookedForDate.includes(time)
        );

        const updatedSchedules = {
          ...currentSchedules,
          [dateStr]: newSlots,
        };

        if (mode === "video") {
          setVideoSchedules(updatedSchedules);
        } else {
          setHomeVisitSchedules(updatedSchedules);
        }

        // თუ ყველა საათი მოიხსნა (თეორიულად არ უნდა მოხდეს, მაგრამ დაზღვევისათვის)
        if (newSlots.length === 0) {
          const updater =
            mode === "video" ? setVideoSelectedDates : setHomeVisitSelectedDates;
          updater(currentSelected.filter((d) => d !== dateStr));
        }

        // ბექენდზე მივყიდოთ განახლებული სლოტები დღევანდელი თარიღისთვის
        try {
          await apiService.updateAvailability([
            {
              date: dateStr,
              timeSlots: newSlots,
              isAvailable: newSlots.length > 0,
              type: mode,
            },
          ]);
          setHasSaved(false);
        } catch (error: any) {
          console.error("Error updating availability for today (booked slots kept):", error);
          Alert.alert(
            "შეცდომა",
            error?.message || "დღევანდელი დღის განრიგის განახლება ვერ მოხერხდა"
          );
          // Reload availability from backend to restore the correct state
          await loadAvailability();
        }

        return;
      }
    }

    if (currentSelected.includes(dateStr)) {
      // ამოიღე თარიღი მხოლოდ მიმდინარე რეჟიმიდან
      const updater =
        mode === "video" ? setVideoSelectedDates : setHomeVisitSelectedDates;
      updater(currentSelected.filter((d) => d !== dateStr));

      const currentSchedules = getCurrentModeSchedules();
      const updatedSchedules = { ...currentSchedules };
      delete updatedSchedules[dateStr];

      if (mode === "video") {
        setVideoSchedules(updatedSchedules);
      } else {
        setHomeVisitSchedules(updatedSchedules);
      }

      // თარიღის მოხსნა ასევე ითვლება ცვლილებად, რომელიც უნდა შენახულ იქნას
      setHasSaved(false);
    } else {
      const updater =
        mode === "video" ? setVideoSelectedDates : setHomeVisitSelectedDates;
      updater([...currentSelected, dateStr]);
      setHasSaved(false); // Reset hasSaved when new date is selected
    }
  };

  const openTimeSelector = (date: Date) => {
    setCurrentEditDate(formatDate(date));
    setShowTimeModal(true);
  };

  // ფუნქცია, რომელიც ამოწმებს, დარჩენილია თუ არა 24 საათი ან მეტი კონკრეტულ თარიღსა და საათზე
  // თუ საათი ახლახან დაემატა და ჯერ არ შენახულა backend-ზე, წაშლა შეუძლია
  const canDeleteSlot = (dateStr: string, time: string): boolean => {
    try {
      // შევამოწმოთ ეს საათი backend-იდან წამოღებულია თუ ახლახან დაემატა
      const initialSchedules = mode === "video" 
        ? initialVideoSchedulesRef.current 
        : initialHomeVisitSchedulesRef.current;
      const initialSlotsForDate = initialSchedules[dateStr] || [];
      
      // თუ ეს საათი არ იყო საწყის schedules-ში, ეს ახლახან დაემატა და წაშლა შეუძლია
      if (!initialSlotsForDate.includes(time)) {
        return true;
      }
      
      // თუ საათი backend-იდანაა, 24 საათის წესი მოქმედებს
      const [hours, minutes] = time.split(":").map(Number);
      const slotDateTime = new Date(dateStr);
      slotDateTime.setHours(hours, minutes || 0, 0, 0);
      
      const now = new Date();
      const diffMs = slotDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // თუ დარჩენილია 24 საათი ან მეტი, შეუძლია წაშლა
      return diffHours >= 24;
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return false;
    }
  };

  // ფუნქცია, რომელიც ამოწმებს, დარჩენილია თუ არა მინიმუმ 2.5 საათი ახალი საათის დამატებისთვის
  const canAddSlot = (dateStr: string, time: string): boolean => {
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const slotDateTime = new Date(dateStr);
      slotDateTime.setHours(hours, minutes || 0, 0, 0);
      
      const now = new Date();
      const diffMs = slotDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // თუ დარჩენილია მინიმუმ 2.5 საათი, შეუძლია დამატება
      return diffHours >= 2.5;
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return false;
    }
  };

  const toggleTimeSlot = (time: string) => {
    if (!currentEditDate) return;

    // შემოწმება: არის თუ არა საათი დაჯავშნილი
    const dateKey = `${currentEditDate}-${mode}`;
    const bookedForDate = bookedSlots[dateKey] || [];
    if (bookedForDate.includes(time)) {
      Alert.alert(
        "დაჯავშნილი საათი",
        "ეს საათი უკვე დაჯავშნილია და ვერ შეიცვლება. გთხოვთ აირჩიოთ სხვა საათი."
      );
      return;
    }

    const currentSchedules = getCurrentModeSchedules();
    const currentSlots = currentSchedules[currentEditDate] || [];
    let newSlots;

    if (currentSlots.includes(time)) {
      // საათის წაშლა - შემოწმება: დარჩენილია თუ არა 24 საათი ან მეტი
      if (!canDeleteSlot(currentEditDate, time)) {
        Alert.alert(
          "საათის წაშლა შეუძლებელია",
          "საათის წაშლა შესაძლებელია მხოლოდ 24 საათით ადრე. ამ საათამდე 24 საათზე ნაკლები დარჩენილია."
        );
        return;
      }
      newSlots = currentSlots.filter((t) => t !== time);
    } else {
      // საათის დამატება - შემოწმება: დარჩენილია თუ არა მინიმუმ 2.5 საათი
      if (!canAddSlot(currentEditDate, time)) {
        Alert.alert(
          "საათის დამატება შეუძლებელია",
          "საათის დამატება შესაძლებელია მინიმუმ 2.5 საათით ადრე. ამ საათამდე 2.5 საათზე ნაკლები დარჩენილია."
        );
        return;
      }
      newSlots = [...currentSlots, time].sort();
    }

    const updatedSchedules = {
      ...currentSchedules,
      [currentEditDate]: newSlots,
    };

    if (mode === "video") {
      setVideoSchedules(updatedSchedules);
      // თუ ახალი საათი დაემატა და დღე არ არის selectedDates-ში, დავამატოთ
      if (!currentSlots.includes(time) && !videoSelectedDates.includes(currentEditDate)) {
        setVideoSelectedDates([...videoSelectedDates, currentEditDate]);
      }
      // თუ ყველა საათი წაიშალა, დღე ამოვიღოთ selectedDates-დან
      if (newSlots.length === 0 && videoSelectedDates.includes(currentEditDate)) {
        setVideoSelectedDates(videoSelectedDates.filter((d) => d !== currentEditDate));
      }
    } else {
      setHomeVisitSchedules(updatedSchedules);
      // თუ ახალი საათი დაემატა და დღე არ არის selectedDates-ში, დავამატოთ
      if (!currentSlots.includes(time) && !homeVisitSelectedDates.includes(currentEditDate)) {
        setHomeVisitSelectedDates([...homeVisitSelectedDates, currentEditDate]);
      }
      // თუ ყველა საათი წაიშალა, დღე ამოვიღოთ selectedDates-დან
      if (newSlots.length === 0 && homeVisitSelectedDates.includes(currentEditDate)) {
        setHomeVisitSelectedDates(homeVisitSelectedDates.filter((d) => d !== currentEditDate));
      }
    }

    // Reset hasSaved when slots are modified
    setHasSaved(false);
  };

  const saveSchedule = async () => {
    try {
      setIsSaving(true);

      const currentSchedules = getCurrentModeSchedules();
      const initialDates =
        mode === "video"
          ? initialVideoDatesRef.current
          : initialHomeVisitDatesRef.current;

      // ყველა თარიღი, რომელზეც ოდესმე იყო სქედული (საწყისი + текущი)
      const allDates = Array.from(
        new Set([...initialDates, ...Object.keys(currentSchedules)])
      );

      // შევამოწმოთ, რომ საერთოდ რაღაც დღე მაინც არსებობს.
      // თუ allDates ცარიელია, მაშინ არც ადრე და არც ახლა არ გაქვს სქედული -> არაფრის შენახვა არ გვჭირდება.
      if (allDates.length === 0) {
        Alert.alert(
          "შეცდომა",
          "გთხოვთ აირჩიოთ მინიმუმ ერთი დრო, სანამ განრიგს შეინახავთ"
        );
        return;
      }

      // სრული სია backend-ისთვის:
      // - დღეებს, რომლებზეც სლოტები აღარ გვაქვს -> timeSlots: [], isAvailable: false
      // - სხვა დღეებს -> რეალური სლოტები
      const availabilityData = allDates.map((dateStr) => {
        const slots = currentSchedules[dateStr] || [];
        return {
          date: dateStr,
          timeSlots: slots,
          isAvailable: slots.length > 0,
          type: mode,
        };
      });

      // Save to backend
      console.log(
        "📤 [DoctorSchedule] Sending availability to backend:",
        JSON.stringify(availabilityData, null, 2)
      );
      const response = await apiService.updateAvailability(availabilityData);

      if (response.success) {
        setSaveSuccess(true);
        setHasSaved(true); // Mark as saved

        // განვაახლოთ თარიღების სიები მხოლოდ იმ დღეებით, რომლებსაც აქვთ საათები
        const updatedSelectedDates = allDates.filter((dateStr) => {
          const slots = currentSchedules[dateStr] || [];
          return slots.length > 0;
        });

        if (mode === "video") {
          setVideoSelectedDates(updatedSelectedDates);
          initialVideoDatesRef.current = allDates;
          // განვაახლოთ initial schedules - ახლა ეს არის backend-ზე შენახული მდგომარეობა
          initialVideoSchedulesRef.current = JSON.parse(JSON.stringify(currentSchedules));
        } else {
          setHomeVisitSelectedDates(updatedSelectedDates);
          initialHomeVisitDatesRef.current = allDates;
          // განვაახლოთ initial schedules - ახლა ეს არის backend-ზე შენახული მდგომარეობა
          initialHomeVisitSchedulesRef.current = JSON.parse(JSON.stringify(currentSchedules));
        }

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
      // Reload availability from backend to restore the correct state
      await loadAvailability();
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
    const currentSchedules = getCurrentModeSchedules();
    const currentSelected = getCurrentModeSelectedDates();
    return currentSelected.every((dateStr) => {
      const slots = currentSchedules[dateStr];
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
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAvailability(true)}
            colors={["#06B6D4"]}
            tintColor="#06B6D4"
          />
        }
      >
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
        {([...videoSelectedDates, ...homeVisitSelectedDates].length > 0) && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>
                არჩეული დღეები:{" "}
                {Array.from(
                  new Set([...videoSelectedDates, ...homeVisitSelectedDates])
                ).length}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setVideoSelectedDates([]);
                  setHomeVisitSelectedDates([]);
                  setVideoSchedules({});
                  setHomeVisitSchedules({});
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
                    Object.values(getCurrentModeSchedules()).filter(
                      (slots) => slots.length > 0
                    ).length
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
                    getCurrentModeSelectedDates().filter((d) => {
                      const slots = getCurrentModeSchedules()[d];
                      return !slots || slots.length === 0;
                    }).length
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
                const currentSchedules = getCurrentModeSchedules();
                const hasSchedule = currentSchedules[dateStr]?.length > 0;
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
                            ? `${currentSchedules[dateStr].length} საათი`
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
                const currentSchedules = getCurrentModeSchedules();
                const hasSchedule = currentSchedules[dateStr]?.length > 0;

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
                            ? `${currentSchedules[dateStr].length} საათი`
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
      {!saveSuccess && !hasSaved && (
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
                    {getCurrentModeSelectedDates().length} დღე •{" "}
                    {Object.values(getCurrentModeSchedules()).reduce(
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

            {/* დაჯავშნილი საათების შეტყობინება */}
            {currentEditDate && (() => {
              const dateKey = `${currentEditDate}-${mode}`;
              const bookedForDate = bookedSlots[dateKey] || [];
              const currentSchedules = getCurrentModeSchedules();
              const currentSlots = currentSchedules[currentEditDate] || [];
              
              // დათვლა: რამდენი საათია დაჯავშნილი, რამდენია 24 საათზე ნაკლები დარჩენილი (წაშლისთვის), და რამდენია 24 საათზე ნაკლები დარჩენილი (დამატებისთვის)
              const lockedForDeletion = currentSlots.filter(
                (time) => !bookedForDate.includes(time) && !canDeleteSlot(currentEditDate, time)
              );
              
              // დათვლა: რამდენი საათია 24 საათზე ნაკლები დარჩენილი (დამატებისთვის)
              const lockedForAddition = AVAILABLE_HOURS.filter(
                (time) => !bookedForDate.includes(time) && !currentSlots.includes(time) && !canAddSlot(currentEditDate, time)
              );
              
              if (bookedForDate.length > 0 || lockedForDeletion.length > 0 || lockedForAddition.length > 0) {
                return (
                  <View style={styles.bookedSlotsWarningContainer}>
                    {bookedForDate.length > 0 && (
                      <View style={styles.bookedSlotsWarning}>
                        <Ionicons name="information-circle" size={18} color="#EF4444" />
                        <Text style={styles.bookedSlotsWarningText}>
                          {bookedForDate.length} საათი დაჯავშნილია და ვერ შეიცვლება
                        </Text>
                      </View>
                    )}
                    {lockedForDeletion.length > 0 && (
                      <View style={styles.bookedSlotsWarning}>
                        <Ionicons name="information-circle" size={18} color="#EF4444" />
                        <Text style={styles.bookedSlotsWarningText}>
                          {lockedForDeletion.length} საათი 24 საათზე ნაკლები დარჩენილია და ვერ წაიშლება
                        </Text>
                      </View>
                    )}
                    {lockedForAddition.length > 0 && (
                      <View style={styles.bookedSlotsWarning}>
                        <Ionicons name="information-circle" size={18} color="#EF4444" />
                        <Text style={styles.bookedSlotsWarningText}>
                          {lockedForAddition.length} საათი 2.5 საათზე ნაკლები დარჩენილია და ვერ დაემატება
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }
              return null;
            })()}

            <ScrollView style={styles.timeSlotsList}>
              <View style={styles.timeGrid}>
                {AVAILABLE_HOURS.map((time) => {
                  const currentSchedules = getCurrentModeSchedules();
                  const isSelected =
                    currentEditDate &&
                    currentSchedules[currentEditDate]?.includes(time);
                  
                  // შემოწმება: არის თუ არა საათი დაჯავშნილი
                  const dateKey = currentEditDate ? `${currentEditDate}-${mode}` : "";
                  const bookedForDate = bookedSlots[dateKey] || [];
                  const isBooked = bookedForDate.includes(time);
                  
                  // შემოწმება: შეიძლება თუ არა საათის წაშლა (თუ არჩეულია და დარჩენილია 24 საათზე ნაკლები)
                  const canDelete = currentEditDate ? canDeleteSlot(currentEditDate, time) : true;
                  const isLockedForDeletion = isSelected && !canDelete && !isBooked;
                  
                  // შემოწმება: შეიძლება თუ არა საათის დამატება (თუ არ არის არჩეული და დარჩენილია 2.5 საათზე ნაკლები)
                  const canAdd = currentEditDate ? canAddSlot(currentEditDate, time) : true;
                  const isLockedForAddition = !isSelected && !canAdd && !isBooked;

                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        isSelected &&
                          (mode === "video"
                            ? styles.timeChipSelectedVideo
                            : styles.timeChipSelectedHome),
                        isBooked && styles.timeChipBooked,
                        isLockedForDeletion && styles.timeChipLocked,
                        isLockedForAddition && styles.timeChipLocked,
                      ]}
                      onPress={() => toggleTimeSlot(time)}
                      disabled={isBooked || isLockedForAddition}
                    >
                      {isBooked && (
                        <Ionicons name="lock-closed" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                      )}
                      {isLockedForDeletion && !isBooked && (
                        <Ionicons name="time-outline" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                      )}
                      {isLockedForAddition && !isBooked && (
                        <Ionicons name="time-outline" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected &&
                            (mode === "video"
                              ? styles.timeChipTextSelectedVideo
                              : styles.timeChipTextSelectedHome),
                          isBooked && styles.timeChipTextBooked,
                          isLockedForDeletion && styles.timeChipTextLocked,
                          isLockedForAddition && styles.timeChipTextLocked,
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
                    const currentSchedules = getCurrentModeSchedules();
                    const currentSlots = currentSchedules[currentEditDate] || [];
                    const dateKey = `${currentEditDate}-${mode}`;
                    const bookedForDate = bookedSlots[dateKey] || [];
                    
                    // ყველა არჩევა (დაჯავშნილის გარდა, 24 საათზე ნაკლები დარჩენილი წაშლისთვის, და 2.5 საათზე ნაკლები დარჩენილი დამატებისთვის)
                    const availableSlots = AVAILABLE_HOURS.filter(
                      (time) => 
                        !bookedForDate.includes(time) && 
                        canDeleteSlot(currentEditDate, time) &&
                        canAddSlot(currentEditDate, time)
                    );
                    
                    // დაჯავშნილი და 24 საათზე ნაკლები დარჩენილი საათები (რომლებიც ვერ წაიშლება)
                    const nonDeletableSlots = currentSlots.filter(
                      (time) => bookedForDate.includes(time) || !canDeleteSlot(currentEditDate, time)
                    );

                    let updatedSchedules: { [key: string]: string[] };

                    // შემოწმება: ყველა წაშლადი საათი არჩეულია თუ არა
                    const allDeletableSelected = availableSlots.every(
                      (time) => currentSlots.includes(time)
                    ) && availableSlots.length > 0;

                    if (allDeletableSelected) {
                      // ყველა წაშლადი საათის მოხსნა (დაჯავშნილი და 24 საათზე ნაკლები დარჩენილი დარჩება)
                      updatedSchedules = {
                        ...currentSchedules,
                        [currentEditDate]: [...nonDeletableSlots],
                      };
                    } else {
                      // ყველას არჩევა (დაჯავშნილის გარდა და 24 საათზე ნაკლები დარჩენილი)
                      updatedSchedules = {
                        ...currentSchedules,
                        [currentEditDate]: [...nonDeletableSlots, ...availableSlots],
                      };
                    }

                    if (mode === "video") {
                      setVideoSchedules(updatedSchedules);
                    } else {
                      setHomeVisitSchedules(updatedSchedules);
                    }
                    
                    // Reset hasSaved when slots are modified
                    setHasSaved(false);
                  }
                }}
              >
                <Text style={styles.selectAllText}>
                  {(() => {
                    if (!currentEditDate) return "ყველას არჩევა";
                    const dateKey = `${currentEditDate}-${mode}`;
                    const bookedForDate = bookedSlots[dateKey] || [];
                    const currentSlots = getCurrentModeSchedules()[currentEditDate] || [];
                    
                    // ყველა წაშლადი საათი (დაჯავშნილის გარდა და 24 საათზე ნაკლები დარჩენილი)
                    const availableSlots = AVAILABLE_HOURS.filter(
                      (time) => !bookedForDate.includes(time) && canDeleteSlot(currentEditDate, time)
                    );
                    
                    // შემოწმება: ყველა წაშლადი საათი არჩეულია თუ არა
                    const allDeletableSelected = availableSlots.length > 0 && availableSlots.every(
                      (time) => currentSlots.includes(time)
                    );
                    
                    return allDeletableSelected
                      ? "ყველას მოხსნა"
                      : "ყველას არჩევა";
                  })()}
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
    maxHeight: "90%",
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
  timeChipBooked: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    opacity: 0.7,
  },
  timeChipTextBooked: {
    color: "#EF4444",
  },
  timeChipLocked: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    opacity: 0.8,
  },
  timeChipTextLocked: {
    color: "#F59E0B",
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
  bookedSlotsWarningContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  bookedSlotsWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 12,
  },
  bookedSlotsWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#EF4444",
    lineHeight: 18,
  },
});
