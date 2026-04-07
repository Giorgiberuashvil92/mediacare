import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../_services/api";
import { useAuth } from "../contexts/AuthContext";

// 24-საათიანი სლოტები (საათობრივი ინტერვალით)
const AVAILABLE_HOURS = Array.from(
  { length: 24 },
  (_, h) => `${String(h).padStart(2, "0")}:00`,
);

export default function DoctorSchedule() {
  const { user, refreshUser } = useAuth();

  // ორი ცალკე განრიგი და თარიღები: ვიდეო და ბინაზე ვიზიტები
  const [videoSchedules, setVideoSchedules] = useState<{
    [key: string]: string[];
  }>({});
  const [homeVisitSchedules, setHomeVisitSchedules] = useState<{
    [key: string]: string[];
  }>({});
  const [videoSelectedDates, setVideoSelectedDates] = useState<string[]>([]);
  const [homeVisitSelectedDates, setHomeVisitSelectedDates] = useState<
    string[]
  >([]);
  // დაჯავშნილი საათები თითოეული თარიღისთვის და ტიპისთვის
  const [bookedSlots, setBookedSlots] = useState<{ [key: string]: string[] }>(
    {},
  );

  const [mode, setMode] = useState<"video" | "home-visit">("video");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [currentEditDate, setCurrentEditDate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showDateDeleteConfirmModal, setShowDateDeleteConfirmModal] =
    useState(false);
  const [dateToDelete, setDateToDelete] = useState<{
    date: Date;
    mode: "video" | "home-visit";
  } | null>(null);
  const [hasSaved, setHasSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      // 🔍 Debug: ვნახოთ რა მოდის backend-იდან
      console.log(`\n🌐 [Load] Backend Response:`);
      console.log(`   ✅ success:`, response.success);
      console.log(`   📦 data length:`, response.data?.length || 0);
      console.log(
        `   📋 Full response.data:`,
        JSON.stringify(response.data, null, 2),
      );

      // დაჯავშნილი სლოტების გამოთვლა appointments-ებიდან
      let appointmentsBookedSlots: { [key: string]: string[] } = {};
      try {
        const appointmentsResponse =
          await apiService.getDoctorDashboardAppointments(100);
        if (appointmentsResponse.success && appointmentsResponse.data) {
          console.log(
            `\n📅 [Load] Loading appointments for booked slots calculation...`,
          );
          const appointments = appointmentsResponse.data as any[];

          appointments.forEach((appointment: any) => {
            if (appointment.isFollowUp === true) return;

            // Format date to YYYY-MM-DD
            let appointmentDate = appointment.date;
            if (appointmentDate && appointmentDate.includes("T")) {
              const date = new Date(appointmentDate);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              appointmentDate = `${year}-${month}-${day}`;
            }

            // Format time to HH:MM
            let appointmentTime = appointment.time;
            if (appointmentTime && appointmentTime.length === 5) {
              // Already in HH:MM format
            } else if (appointmentTime) {
              // Try to parse if in different format
              const timeMatch = appointmentTime.match(/(\d{1,2}):(\d{2})/);
              if (timeMatch) {
                appointmentTime = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
              }
            }

            if (appointmentDate && appointmentTime && appointment.type) {
              const type =
                appointment.type === "home-visit" ? "home-visit" : "video";
              const dateKey = `${appointmentDate}-${type}`;

              if (!appointmentsBookedSlots[dateKey]) {
                appointmentsBookedSlots[dateKey] = [];
              }

              if (!appointmentsBookedSlots[dateKey].includes(appointmentTime)) {
                appointmentsBookedSlots[dateKey].push(appointmentTime);
                console.log(
                  `   🔒 დაჯავშნილი სლოტი: ${dateKey} -> ${appointmentTime}`,
                );
              }
            }
          });

          console.log(`\n📊 [Load] Appointments booked slots summary:`);
          const bookedKeys = Object.keys(appointmentsBookedSlots);
          if (bookedKeys.length === 0) {
            console.log(
              `   ⚠️  დაჯავშნილი სლოტები არ მოიძებნა appointments-ებიდან`,
            );
          } else {
            bookedKeys.forEach((key) => {
              const slots = appointmentsBookedSlots[key];
              console.log(`   🔑 ${key}: ${slots.length} დაჯავშნილი ->`, slots);
            });
          }
        }
      } catch (error) {
        console.error("Error loading appointments for booked slots:", error);
      }

      if (response.success && response.data) {
        const loadedVideoSchedules: { [key: string]: string[] } = {};
        const loadedHomeVisitSchedules: { [key: string]: string[] } = {};
        const videoDates: string[] = [];
        const homeVisitDates: string[] = [];
        const loadedBookedSlots: { [key: string]: string[] } = {};

        response.data.forEach((avail: any) => {
          // 🔍 Debug: ვნახოთ თითოეული availability object-ის სრული შინაარსი
          console.log(`\n📦 [Load] Processing availability object:`);
          console.log(
            `   📋 Full avail object:`,
            JSON.stringify(avail, null, 2),
          );
          console.log(`   🔑 Available keys:`, Object.keys(avail));
          console.log(
            `   📅 avail.date:`,
            avail.date,
            `(type: ${typeof avail.date})`,
          );
          console.log(`   🎯 avail.type:`, avail.type);
          console.log(
            `   ⏱️  avail.timeSlots:`,
            avail.timeSlots,
            `(type: ${typeof avail.timeSlots}, isArray: ${Array.isArray(avail.timeSlots)})`,
          );
          console.log(
            `   🔒 avail.bookedSlots:`,
            avail.bookedSlots,
            `(type: ${typeof avail.bookedSlots}, isArray: ${Array.isArray(avail.bookedSlots)})`,
          );
          console.log(
            `   📊 avail.bookedSlots?.length:`,
            avail.bookedSlots?.length,
          );

          // შევამოწმოთ სხვა შესაძლო ველები
          if (avail.bookedTimeSlots) {
            console.log(
              `   ⚠️  Found 'bookedTimeSlots' field:`,
              avail.bookedTimeSlots,
            );
          }
          if (avail.booked) {
            console.log(`   ⚠️  Found 'booked' field:`, avail.booked);
          }
          if (avail.appointments) {
            console.log(
              `   ⚠️  Found 'appointments' field:`,
              avail.appointments,
            );
          }
          const type = avail.type === "home-visit" ? "home-visit" : "video";
          // დავრწმუნდეთ, რომ avail.date არის YYYY-MM-DD ფორმატში
          const dateStr =
            typeof avail.date === "string"
              ? avail.date
              : formatDate(new Date(avail.date));
          const dateKey = `${dateStr}-${type}`;

          // დაჯავშნილი საათების შენახვა - მნიშვნელოვანია, რომ ეს ყოველთვის შევინახოთ, თუნდაც ცარიელი array-ია
          if (avail.bookedSlots && Array.isArray(avail.bookedSlots)) {
            if (avail.bookedSlots.length > 0) {
              loadedBookedSlots[dateKey] = avail.bookedSlots;
              console.log(
                `🔒 [Load] ✅ დაჯავშნილი სლოტები ნაპოვნია backend-იდან!`,
              );
              console.log(`   📅 თარიღი: ${dateStr}`);
              console.log(`   🎯 ტიპი: ${type}`);
              console.log(`   🔑 Key: ${dateKey}`);
              console.log(`   ⏰ დაჯავშნილი საათები:`, avail.bookedSlots);
              console.log(
                `   📊 სულ დაჯავშნილი: ${avail.bookedSlots.length} საათი`,
              );
            } else {
              console.log(
                `🔒 [Load] ⚠️  bookedSlots არის ცარიელი array: ${dateStr} (${type})`,
              );
            }
          } else {
            console.log(
              `🔒 [Load] ⚠️  bookedSlots არ არის array ან არ არსებობს: ${dateStr} (${type})`,
            );
          }

          // შევაერთოთ appointments-ებიდან გამოთვლილი bookedSlots
          if (
            appointmentsBookedSlots[dateKey] &&
            appointmentsBookedSlots[dateKey].length > 0
          ) {
            if (!loadedBookedSlots[dateKey]) {
              loadedBookedSlots[dateKey] = [];
            }
            // დავამატოთ appointments-ებიდან მოდებული სლოტები, თუ არ არის უკვე დამატებული
            appointmentsBookedSlots[dateKey].forEach((slot: string) => {
              if (!loadedBookedSlots[dateKey].includes(slot)) {
                loadedBookedSlots[dateKey].push(slot);
                console.log(
                  `🔒 [Load] ✅ დაემატა appointments-ებიდან: ${dateKey} -> ${slot}`,
                );
              }
            });
          }

          // ექიმის სქედულისთვის დღე უნდა გამოჩნდეს მაშინაც კი,
          // თუ ყველა სლოტი უკვე დაჯავშნილია (isAvailable შეიძლება იყოს false),
          // ამიტომ timeSlots-ზე ან bookedSlots-ზე ვამოწმებთ.
          const hasTimeSlots =
            avail.timeSlots &&
            Array.isArray(avail.timeSlots) &&
            avail.timeSlots.length > 0;
          const hasBookedSlots =
            avail.bookedSlots &&
            Array.isArray(avail.bookedSlots) &&
            avail.bookedSlots.length > 0;

          console.log(`🔍 [Load] Date ${dateStr} (${type}):`);
          console.log(
            `   ⏱️  hasTimeSlots: ${hasTimeSlots}`,
            hasTimeSlots ? `(${avail.timeSlots.length} საათი)` : "",
          );
          console.log(
            `   🔒 hasBookedSlots: ${hasBookedSlots}`,
            hasBookedSlots ? `(${avail.bookedSlots.length} საათი)` : "",
          );
          console.log(`   📋 timeSlots:`, avail.timeSlots || "[]");
          console.log(`   🔐 bookedSlots:`, avail.bookedSlots || "[]");

          // 🔥 მნიშვნელოვანი: დღე უნდა დაემატოს selectedDates-ში, თუ აქვს timeSlots ან bookedSlots
          // ⚠️ მაგრამ მხოლოდ თუ არ არის წარსული თარიღი
          if (hasTimeSlots || hasBookedSlots) {
            // შევამოწმოთ, არის თუ არა თარიღი წარსული
            if (isPastDate(dateStr)) {
              console.log(
                `   ⏰ წარსული თარიღი - არ დაემატება selectedDates-ში: ${dateStr}`,
              );
            } else {
              console.log(`   ✅ დღე დაემატება selectedDates-ში (${type})`);
              if (type === "video") {
                // თუ აქვს timeSlots, შევინახოთ, თუ არა - ცარიელი array
                if (hasTimeSlots) {
                  loadedVideoSchedules[dateStr] = avail.timeSlots;
                  console.log(
                    `   📝 Video schedule დაემატა: ${dateStr} -> ${avail.timeSlots.length} საათი`,
                  );
                } else {
                  // დაჯავშნილი დღისთვის ცარიელი array, რომ დღე არჩეულად გამოჩნდეს
                  loadedVideoSchedules[dateStr] = [];
                  console.log(
                    `   📝 Video schedule დაემატა (მხოლოდ დაჯავშნილი): ${dateStr} -> []`,
                  );
                }
                if (!videoDates.includes(dateStr)) {
                  videoDates.push(dateStr);
                  console.log(`   ➕ Video date დაემატა: ${dateStr}`);
                } else {
                  console.log(`   ⚠️  Video date უკვე არსებობს: ${dateStr}`);
                }
              } else {
                // თუ აქვს timeSlots, შევინახოთ, თუ არა - ცარიელი array
                if (hasTimeSlots) {
                  loadedHomeVisitSchedules[dateStr] = avail.timeSlots;
                  console.log(
                    `   📝 Home-visit schedule დაემატა: ${dateStr} -> ${avail.timeSlots.length} საათი`,
                  );
                } else {
                  // დაჯავშნილი დღისთვის ცარიელი array, რომ დღე არჩეულად გამოჩნდეს
                  loadedHomeVisitSchedules[dateStr] = [];
                  console.log(
                    `   📝 Home-visit schedule დაემატა (მხოლოდ დაჯავშნილი): ${dateStr} -> []`,
                  );
                }
                if (!homeVisitDates.includes(dateStr)) {
                  homeVisitDates.push(dateStr);
                  console.log(`   ➕ Home-visit date დაემატა: ${dateStr}`);
                } else {
                  console.log(
                    `   ⚠️  Home-visit date უკვე არსებობს: ${dateStr}`,
                  );
                }
              }
            }
          } else {
            console.log(
              `   ❌ დღე არ დაემატება (არ აქვს არც timeSlots და არც bookedSlots)`,
            );
          }
        });

        // დავამატოთ appointments-ებიდან გამოთვლილი bookedSlots იმ დღეებზე, რომლებიც არ არის backend-ის response-ში
        Object.keys(appointmentsBookedSlots).forEach((dateKey) => {
          if (
            !loadedBookedSlots[dateKey] ||
            loadedBookedSlots[dateKey].length === 0
          ) {
            loadedBookedSlots[dateKey] = [...appointmentsBookedSlots[dateKey]];
            console.log(
              `🔒 [Load] ✅ დაემატა appointments-ებიდან (ახალი დღე): ${dateKey} ->`,
              appointmentsBookedSlots[dateKey],
            );

            // თუ დღე არ არის selectedDates-ში, დავამატოთ
            // dateKey format: "YYYY-MM-DD-video" ან "YYYY-MM-DD-home-visit"
            const parts = dateKey.split("-");
            if (parts.length >= 4) {
              const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
              const type = parts.slice(3).join("-"); // "video" ან "home-visit"

              // ⚠️ შევამოწმოთ, არის თუ არა თარიღი წარსული
              if (isPastDate(dateStr)) {
                console.log(
                  `   ⏰ წარსული თარიღი - არ დაემატება appointments-ებიდან: ${dateStr}`,
                );
              } else {
                if (type === "video" && !videoDates.includes(dateStr)) {
                  videoDates.push(dateStr);
                  if (!loadedVideoSchedules[dateStr]) {
                    loadedVideoSchedules[dateStr] = [];
                  }
                  console.log(
                    `   ➕ Video date დაემატა appointments-ებიდან: ${dateStr}`,
                  );
                } else if (
                  type === "home-visit" &&
                  !homeVisitDates.includes(dateStr)
                ) {
                  homeVisitDates.push(dateStr);
                  if (!loadedHomeVisitSchedules[dateStr]) {
                    loadedHomeVisitSchedules[dateStr] = [];
                  }
                  console.log(
                    `   ➕ Home-visit date დაემატა appointments-ებიდან: ${dateStr}`,
                  );
                }
              }
            }
          }
        });

        // Merge backend dates with existing dates to preserve user selections
        // This prevents losing dates when switching between modes or when backend doesn't return all dates
        const existingVideoDates = videoSelectedDates;
        const existingHomeVisitDates = homeVisitSelectedDates;

        console.log(`\n🔄 [Load] Merge პროცესი:`);
        console.log(`   📋 Existing Video dates:`, existingVideoDates);
        console.log(`   📋 Existing Home-visit dates:`, existingHomeVisitDates);
        console.log(`   📋 Backend Video dates:`, videoDates);
        console.log(`   📋 Backend Home-visit dates:`, homeVisitDates);

        // Combine backend dates with existing dates, removing duplicates
        const mergedVideoDates = Array.from(
          new Set([...existingVideoDates, ...videoDates]),
        );
        const mergedHomeVisitDates = Array.from(
          new Set([...existingHomeVisitDates, ...homeVisitDates]),
        );

        // ⚠️ ამოვიღოთ წარსული თარიღები
        const finalVideoDates = mergedVideoDates.filter(
          (dateStr) => !isPastDate(dateStr),
        );
        const finalHomeVisitDates = mergedHomeVisitDates.filter(
          (dateStr) => !isPastDate(dateStr),
        );

        // ლოგინგი, თუ წარსული თარიღები ამოიღეს
        const removedVideoDates = mergedVideoDates.filter((dateStr) =>
          isPastDate(dateStr),
        );
        const removedHomeVisitDates = mergedHomeVisitDates.filter((dateStr) =>
          isPastDate(dateStr),
        );
        if (removedVideoDates.length > 0) {
          console.log(
            `   ⏰ წარსული Video თარიღები ამოიღეს:`,
            removedVideoDates,
          );
        }
        if (removedHomeVisitDates.length > 0) {
          console.log(
            `   ⏰ წარსული Home-visit თარიღები ამოიღეს:`,
            removedHomeVisitDates,
          );
        }

        console.log(
          `   ✅ Final Video dates (merged, past removed):`,
          finalVideoDates,
        );
        console.log(
          `   ✅ Final Home-visit dates (merged, past removed):`,
          finalHomeVisitDates,
        );

        setVideoSchedules(loadedVideoSchedules);
        setHomeVisitSchedules(loadedHomeVisitSchedules);
        setVideoSelectedDates(finalVideoDates);
        setHomeVisitSelectedDates(finalHomeVisitDates);
        setBookedSlots(loadedBookedSlots);

        // Debug: ვნახოთ რა bookedSlots ინახება
        console.log(`\n🔒 [Load] დაჯავშნილი სლოტების სრული სია:`);
        const bookedSlotsKeys = Object.keys(loadedBookedSlots);
        if (bookedSlotsKeys.length === 0) {
          console.log(`   ⚠️  დაჯავშნილი სლოტები არ მოიძებნა`);
        } else {
          bookedSlotsKeys.forEach((key) => {
            const slots = loadedBookedSlots[key];
            console.log(`   🔑 ${key}:`);
            console.log(`      ⏰ ${slots.length} დაჯავშნილი საათი:`, slots);
          });
        }

        console.log(`\n📊 [Load] შეჯამება:`);
        console.log(
          `   📅 Video dates from backend: ${videoDates.length}`,
          videoDates,
        );
        console.log(
          `   📅 Home-visit dates from backend: ${homeVisitDates.length}`,
          homeVisitDates,
        );
        console.log(
          `   ✅ Final Video selected dates: ${finalVideoDates.length}`,
          finalVideoDates,
        );
        console.log(
          `   ✅ Final Home-visit selected dates: ${finalHomeVisitDates.length}`,
          finalHomeVisitDates,
        );
        console.log(`   🔒 Total booked slots keys: ${bookedSlotsKeys.length}`);

        // შევამოწმოთ თითოეული დღე - აქვს თუ არა დაჯავშნილი სლოტები
        console.log(`\n🔍 [Load] დღეების დაჯავშნილი სლოტების შემოწმება:`);
        [...finalVideoDates, ...finalHomeVisitDates].forEach((dateStr) => {
          const videoKey = `${dateStr}-video`;
          const homeVisitKey = `${dateStr}-home-visit`;
          const videoBooked = loadedBookedSlots[videoKey] || [];
          const homeVisitBooked = loadedBookedSlots[homeVisitKey] || [];

          if (videoBooked.length > 0 || homeVisitBooked.length > 0) {
            console.log(`   📅 ${dateStr}:`);
            if (videoBooked.length > 0) {
              console.log(
                `      🎥 Video: ${videoBooked.length} დაჯავშნილი ->`,
                videoBooked,
              );
            }
            if (homeVisitBooked.length > 0) {
              console.log(
                `      🏠 Home-visit: ${homeVisitBooked.length} დაჯავშნილი ->`,
                homeVisitBooked,
              );
            }
            const isInVideoDates = finalVideoDates.includes(dateStr);
            const isInHomeVisitDates = finalHomeVisitDates.includes(dateStr);
            console.log(`      ✅ Video selectedDates-ში: ${isInVideoDates}`);
            console.log(
              `      ✅ Home-visit selectedDates-ში: ${isInHomeVisitDates}`,
            );
          }
        });

        // შევინახოთ საწყისი თარიღები და საათები, რომლებსაც backend უკვე იცნობს
        initialVideoDatesRef.current = Object.keys(loadedVideoSchedules);
        initialHomeVisitDatesRef.current = Object.keys(
          loadedHomeVisitSchedules,
        );
        // Deep copy schedules for initial state comparison
        initialVideoSchedulesRef.current = JSON.parse(
          JSON.stringify(loadedVideoSchedules),
        );
        initialHomeVisitSchedulesRef.current = JSON.parse(
          JSON.stringify(loadedHomeVisitSchedules),
        );
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

  // Refresh user data on mount to get latest status from backend
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    };
    refreshUserData();
  }, [refreshUser]);

  // Load existing availability on mount
  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Reload availability when screen comes into focus (e.g., returning from another screen)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadAvailability(true); // Pass true to indicate it's a refresh
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  // Close time modal when mode changes
  useEffect(() => {
    if (showTimeModal) {
      setShowTimeModal(false);
      setCurrentEditDate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Reload availability from backend when mode changes to ensure both modes have latest data
  useEffect(() => {
    if (user?.id) {
      loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.id]);

  // Debug: Log selected dates when mode changes
  useEffect(() => {
    const currentSelected = getCurrentModeSelectedDates();
    console.log(
      `🔄 [Mode Change] Mode: ${mode}, Selected dates:`,
      currentSelected,
    );
    console.log(`📊 [Mode Change] Video dates:`, videoSelectedDates);
    console.log(`📊 [Mode Change] Home-visit dates:`, homeVisitSelectedDates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Clean up dates without time slots when page is focused
  // NOTE: არ ვაშორებთ დღეებს, რომლებსაც არ აქვთ time slots, რადგან მომხმარებელმა შეიძლება ახლახან აირჩია
  // და ჯერ არ აირჩია საათები. დღეები აშორება მხოლოდ backend-იდან load-ის შემდეგ, თუ backend-ში არ არის.
  // useFocusEffect(
  //   useCallback(() => {
  //     const currentSchedules = getCurrentModeSchedules();
  //     const currentSelected = getCurrentModeSelectedDates();
  //
  //     // Remove dates that don't have any time slots AND don't have any booked slots
  //     const datesWithSlotsOrBooked = currentSelected.filter((dateStr) => {
  //       const slots = currentSchedules[dateStr];
  //       const hasTimeSlots = slots && slots.length > 0;
  //
  //       // Check if there are booked slots for this date and type
  //       const dateKey = `${dateStr}-${mode}`;
  //       const bookedForDate = bookedSlots[dateKey] || [];
  //       const hasBookedSlots = bookedForDate.length > 0;
  //
  //       // Keep the date if it has time slots OR booked slots
  //       return hasTimeSlots || hasBookedSlots;
  //     });

  //     // Only update if there's a difference
  //     if (datesWithSlotsOrBooked.length !== currentSelected.length) {
  //       if (mode === "video") {
  //         setVideoSelectedDates(datesWithSlotsOrBooked);
  //       } else {
  //         setHomeVisitSelectedDates(datesWithSlotsOrBooked);
  //       }
  //     }
  //     // eslint-disable-next-line react-hooks/exhaustive-deps
  //   }, [mode, videoSchedules, homeVisitSchedules, bookedSlots, getCurrentModeSchedules, getCurrentModeSelectedDates])
  // );

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
      0,
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
          },
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

  // შემოწმება: არის თუ არა თარიღი წარსული (დღესდღეობამდე)
  const isPastDate = (dateStr: string): boolean => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date < today;
    } catch (error) {
      console.error("Error checking if date is past:", error);
      return false;
    }
  };

  const isDateSelected = (date: Date) => {
    const currentSelected = getCurrentModeSelectedDates();
    const dateStr = formatDate(date);
    const isSelected = currentSelected.includes(dateStr);

    // Debug: დაჯავშნილი სლოტების შემთხვევაში ლოგინგი
    const dateKey = `${dateStr}-${mode}`;
    const bookedForDate = bookedSlots[dateKey] || [];
    if (bookedForDate.length > 0) {
      console.log(`🔍 [isDateSelected] ${dateStr} (${mode}):`);
      console.log(`   📋 currentSelected:`, currentSelected);
      console.log(`   🔒 bookedCount: ${bookedForDate.length}`, bookedForDate);
      console.log(`   ✅ isSelected: ${isSelected}`);
      if (!isSelected && bookedForDate.length > 0) {
        console.log(
          `   ⚠️  პრობლემა! დაჯავშნილი სლოტები არის, მაგრამ დღე არ არის selectedDates-ში!`,
        );
      }
    }

    return isSelected;
  };

  // Video რეჟიმისთვის თარიღის არჩევა ან საათის მოდალის გახსნა (თარიღზე დაჭერა აღარ ასუფთავებს გრაფიკს)
  const toggleDateSelectionVideo = (date: Date) => {
    if (!isDoctorActive) {
      Alert.alert(
        "შეზღუდვა",
        "გრაფიკის ჩანიშვნა შესაძლებელია მხოლოდ active სტატუსის ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.",
      );
      return;
    }

    const dateStr = formatDate(date);

    if (videoSelectedDates.includes(dateStr)) {
      // უკვე არჩეული თარიღი — ვხსნით საათის არჩევის მოდალს; საათის წაშლა მხოლოდ იქ შეუძლია
      openTimeSelector(date);
      return;
    }

    setVideoSelectedDates([...videoSelectedDates, dateStr]);
    setHasSaved(false);
  };

  // Home-visit რეჟიმისთვის თარიღის არჩევა ან საათის მოდალის გახსნა (თარიღზე დაჭერა აღარ ასუფთავებს გრაფიკს)
  const toggleDateSelectionHomeVisit = (date: Date) => {
    if (!isDoctorActive) {
      Alert.alert(
        "შეზღუდვა",
        "გრაფიკის ჩანიშვნა შესაძლებელია მხოლოდ active სტატუსის ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.",
      );
      return;
    }

    const dateStr = formatDate(date);

    if (homeVisitSelectedDates.includes(dateStr)) {
      // უკვე არჩეული თარიღი — ვხსნით საათის არჩევის მოდალს; საათის წაშლა მხოლოდ იქ შეუძლია
      openTimeSelector(date);
      return;
    }

    setHomeVisitSelectedDates([...homeVisitSelectedDates, dateStr]);
    setHasSaved(false);
  };

  // Wrapper ფუნქცია რეჟიმის მიხედვით
  const toggleDateSelection = (date: Date) => {
    if (mode === "video") {
      toggleDateSelectionVideo(date);
    } else {
      toggleDateSelectionHomeVisit(date);
    }
  };

  const openTimeSelector = (date: Date) => {
    if (!isDoctorActive) {
      Alert.alert(
        "შეზღუდვა",
        "გრაფიკის ჩანიშვნა შესაძლებელია მხოლოდ active სტატუსის ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.",
      );
      return;
    }

    setCurrentEditDate(formatDate(date));
    setShowTimeModal(true);
  };

  // Video რეჟიმისთვის საათის წაშლის შემოწმება — თუ არავინ არ არის ჩაწერილი, როცა უნდა მაშინ წაშლა
  const canDeleteSlotVideo = (_dateStr: string, _time: string): boolean => {
    return true; // დაჯავშნილი სლოტები UI-ში disabled არის, დანარჩენის წაშლა ნებისმიერ დროს
  };

  // Home-visit რეჟიმისთვის საათის წაშლის შემოწმება — თუ არავინ არ არის ჩაწერილი, როცა უნდა მაშინ წაშლა
  const canDeleteSlotHomeVisit = (_dateStr: string, _time: string): boolean => {
    return true; // დაჯავშნილი სლოტები UI-ში disabled არის, დანარჩენის წაშლა ნებისმიერ დროს
  };

  // ლოკალური თარიღი+დრო (ორივე – canAdd* და მოდალის isPast – იყენებს ამას, იდენტური ლოგიკა)
  const slotToLocalDate = (dateStr: string, time: string): Date => {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, m] = time.split(":").map(Number);
    return new Date(y, (mo || 1) - 1, d, h, m || 0, 0, 0);
  };

  const logSlotCheck = (
    label: string,
    dateStr: string,
    time: string,
    slotDate: Date,
    extra: {
      diffHours?: number;
      canAdd?: boolean;
      isPast?: boolean;
      isLockedForAddition?: boolean;
    },
  ) => {
    const now = Date.now();
    const slotMs = slotDate.getTime();
    const diffH = (slotMs - now) / (1000 * 60 * 60);
    console.log(
      `🕐 [Slot] ${label} | ${dateStr} ${time} | slot=${slotDate.toLocaleString("ka-GE")} | now=${new Date().toLocaleString("ka-GE")} | diffH=${diffH.toFixed(2)}`,
      extra,
    );
  };

  // ონლაინი: ექიმს როცა უნდა მაშინ დაამატებს გრაფიკს (მხოლოდ მომავალი დრო)
  const canAddSlotVideo = (dateStr: string, time: string): boolean => {
    try {
      const slotDateTime = slotToLocalDate(dateStr, time);
      const canAdd = slotDateTime.getTime() > Date.now();
      if (!canAdd) {
        logSlotCheck("Video", dateStr, time, slotDateTime, { canAdd });
      }
      return canAdd;
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return false;
    }
  };

  // ბინაზე ვიზიტი: ექიმს მხოლოდ 2 საათით ადრე უნდა დაამატოს გრაფიკი (მოწყობილობის ლოკალური დრო)
  const canAddSlotHomeVisit = (dateStr: string, time: string): boolean => {
    try {
      const slotDateTime = slotToLocalDate(dateStr, time);
      const diffHours = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const canAdd = diffHours >= 2;
      if (!canAdd) {
        logSlotCheck("HomeVisit", dateStr, time, slotDateTime, {
          diffHours,
          canAdd,
        });
      }
      return canAdd;
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return false;
    }
  };

  // Video რეჟიმისთვის საათის არჩევა/მოხსნა
  const toggleTimeSlotVideo = (time: string) => {
    if (!currentEditDate) return;

    if (!isDoctorActive) {
      Alert.alert(
        "შეზღუდვა",
        "გრაფიკის ჩანიშვნა შესაძლებელია მხოლოდ active სტატუსის ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.",
      );
      return;
    }

    // შემოწმება: არის თუ არა საათი დაჯავშნილი
    // ორივე type-ის appointments გავითვალისწინოთ, რადგან ექიმი არ შეუძლია ერთდროულად იყოს ორ ადგილას
    const dateKey = `${currentEditDate}-video`;
    const otherDateKey = `${currentEditDate}-home-visit`;
    const bookedForDate = bookedSlots[dateKey] || [];
    const bookedForOtherDate = bookedSlots[otherDateKey] || [];
    const allBookedSlotsForDate = Array.from(
      new Set([...bookedForDate, ...bookedForOtherDate]),
    );

    if (allBookedSlotsForDate.includes(time)) {
      Alert.alert(
        "დაჯავშნილი საათი",
        "ეს საათი უკვე დაჯავშნილია (ვიდეო ან ბინაზე ვიზიტი) და ვერ შეიცვლება. გთხოვთ აირჩიოთ სხვა საათი.",
      );
      return;
    }

    const currentSlots = videoSchedules[currentEditDate] || [];
    let newSlots;

    if (currentSlots.includes(time)) {
      // საათის წაშლა - შემოწმება: დარჩენილია თუ არა 24 საათი ან მეტი
      if (!canDeleteSlotVideo(currentEditDate, time)) {
        Alert.alert(
          "საათის წაშლა შეუძლებელია",
          "საათის წაშლა შესაძლებელია მხოლოდ 24 საათით ადრე. ამ საათამდე 24 საათზე ნაკლები დარჩენილია.",
        );
        return;
      }
      newSlots = currentSlots.filter((t) => t !== time);
    } else {
      // საათის დამატება - შემოწმება: არის თუ არა საათი არჩეული სხვა რეჟიმში
      const otherModeSlots = homeVisitSchedules[currentEditDate] || [];
      if (otherModeSlots.includes(time)) {
        Alert.alert(
          "საათი დაკავებულია",
          "ეს საათი უკვე არჩეულია ბინაზე ვიზიტისთვის. ექიმს არ შეუძლია ერთდროულად იყოს ორ ადგილას. გთხოვთ აირჩიოთ სხვა საათი.",
        );
        return;
      }

      // შემოწმება: დარჩენილია თუ არა მინიმუმ 2 საათი
      if (!canAddSlotVideo(currentEditDate, time)) {
        Alert.alert(
          "საათის დამატება შეუძლებელია",
          "ვიდეო კონსულტაციის საათის დამატება შესაძლებელია მინიმუმ 2 საათით ადრე. ამ საათამდე 2 საათზე ნაკლები დარჩენილია.",
        );
        return;
      }
      newSlots = [...currentSlots, time].sort();
    }

    const updatedSchedules = {
      ...videoSchedules,
      [currentEditDate]: newSlots,
    };
    setVideoSchedules(updatedSchedules);

    // თუ ახალი საათი დაემატა და დღე არ არის selectedDates-ში, დავამატოთ
    if (
      !currentSlots.includes(time) &&
      !videoSelectedDates.includes(currentEditDate)
    ) {
      setVideoSelectedDates([...videoSelectedDates, currentEditDate]);
    }
    // თუ ყველა საათი წაიშალა, დღე ამოვიღოთ selectedDates-დან
    if (newSlots.length === 0 && videoSelectedDates.includes(currentEditDate)) {
      setVideoSelectedDates(
        videoSelectedDates.filter((d) => d !== currentEditDate),
      );
    }

    // Reset hasSaved when slots are modified
    setHasSaved(false);
  };

  // Home-visit რეჟიმისთვის საათის არჩევა/მოხსნა
  const toggleTimeSlotHomeVisit = (time: string) => {
    if (!currentEditDate) return;

    if (!isDoctorActive) {
      Alert.alert(
        "შეზღუდვა",
        "გრაფიკის ჩანიშვნა შესაძლებელია მხოლოდ active სტატუსის ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.",
      );
      return;
    }

    // შემოწმება: არის თუ არა საათი დაჯავშნილი
    // ორივე type-ის appointments გავითვალისწინოთ, რადგან ექიმი არ შეუძლია ერთდროულად იყოს ორ ადგილას
    const dateKey = `${currentEditDate}-home-visit`;
    const otherDateKey = `${currentEditDate}-video`;
    const bookedForDate = bookedSlots[dateKey] || [];
    const bookedForOtherDate = bookedSlots[otherDateKey] || [];
    const allBookedSlotsForDate = Array.from(
      new Set([...bookedForDate, ...bookedForOtherDate]),
    );

    if (allBookedSlotsForDate.includes(time)) {
      Alert.alert(
        "დაჯავშნილი საათი",
        "ეს საათი უკვე დაჯავშნილია (ვიდეო ან ბინაზე ვიზიტი) და ვერ შეიცვლება. გთხოვთ აირჩიოთ სხვა საათი.",
      );
      return;
    }

    const currentSlots = homeVisitSchedules[currentEditDate] || [];
    let newSlots;

    if (currentSlots.includes(time)) {
      // საათის წაშლა - შემოწმება: დარჩენილია თუ არა 24 საათი ან მეტი
      if (!canDeleteSlotHomeVisit(currentEditDate, time)) {
        Alert.alert(
          "საათის წაშლა შეუძლებელია",
          "საათის წაშლა შესაძლებელია მხოლოდ 24 საათით ადრე. ამ საათამდე 24 საათზე ნაკლები დარჩენილია.",
        );
        return;
      }
      newSlots = currentSlots.filter((t) => t !== time);
    } else {
      // საათის დამატება - შემოწმება: არის თუ არა საათი არჩეული სხვა რეჟიმში
      const otherModeSlots = videoSchedules[currentEditDate] || [];
      if (otherModeSlots.includes(time)) {
        Alert.alert(
          "საათი დაკავებულია",
          "ეს საათი უკვე არჩეულია ვიდეო კონსულტაციისთვის. ექიმს არ შეუძლია ერთდროულად იყოს ორ ადგილას. გთხოვთ აირჩიოთ სხვა საათი.",
        );
        return;
      }

      // შემოწმება: დარჩენილია თუ არა მინიმუმ 2 საათი (ბინაზე ვიზიტი მხოლოდ 2 საათით ადრე)
      if (!canAddSlotHomeVisit(currentEditDate, time)) {
        Alert.alert(
          "საათის დამატება შეუძლებელია",
          "ბინაზე ვიზიტის საათის დამატება შესაძლებელია მინიმუმ 2 საათით ადრე. ამ საათამდე 2 საათზე ნაკლები დარჩენილია.",
        );
        return;
      }
      newSlots = [...currentSlots, time].sort();
    }

    const updatedSchedules = {
      ...homeVisitSchedules,
      [currentEditDate]: newSlots,
    };
    setHomeVisitSchedules(updatedSchedules);

    // თუ ახალი საათი დაემატა და დღე არ არის selectedDates-ში, დავამატოთ
    if (
      !currentSlots.includes(time) &&
      !homeVisitSelectedDates.includes(currentEditDate)
    ) {
      setHomeVisitSelectedDates([...homeVisitSelectedDates, currentEditDate]);
    }
    // თუ ყველა საათი წაიშალა, დღე ამოვიღოთ selectedDates-დან
    if (
      newSlots.length === 0 &&
      homeVisitSelectedDates.includes(currentEditDate)
    ) {
      setHomeVisitSelectedDates(
        homeVisitSelectedDates.filter((d) => d !== currentEditDate),
      );
    }

    // Reset hasSaved when slots are modified
    setHasSaved(false);
  };

  // Wrapper ფუნქცია რეჟიმის მიხედვით
  const toggleTimeSlot = (time: string) => {
    if (mode === "video") {
      toggleTimeSlotVideo(time);
    } else {
      toggleTimeSlotHomeVisit(time);
    }
  };

  // გრაფიკის გასუფთავების ფუნქცია
  const handleClearSchedule = async () => {
    // დაჯავშნილი სლოტების გათვალისწინებით გასუფთავება - მხოლოდ მიმდინარე რეჟიმისთვის
    if (mode === "video") {
      // Video რეჟიმისთვის: დავტოვოთ მხოლოდ დაჯავშნილი სლოტები
      const clearedVideoSchedules: { [key: string]: string[] } = {};
      const clearedVideoDates: string[] = [];

      Object.keys(videoSchedules).forEach((dateStr) => {
        const dateKey = `${dateStr}-video`;
        const bookedForDate = bookedSlots[dateKey] || [];
        if (bookedForDate.length > 0) {
          clearedVideoSchedules[dateStr] = bookedForDate;
          clearedVideoDates.push(dateStr);
        }
      });

      setVideoSelectedDates(clearedVideoDates);
      setVideoSchedules(clearedVideoSchedules);
      setHasSaved(false); // Mark as unsaved so save button appears
      setShowClearConfirmModal(false);

      // Backend-ზე განახლება - მხოლოდ video რეჟიმისთვის
      try {
        const allVideoDates = Array.from(
          new Set([
            ...initialVideoDatesRef.current,
            ...Object.keys(videoSchedules),
          ]),
        );

        const availabilityData: {
          date: string;
          timeSlots: string[];
          isAvailable: boolean;
          type: "video" | "home-visit";
        }[] = [];

        // Video რეჟიმისთვის
        allVideoDates.forEach((dateStr) => {
          const slots = clearedVideoSchedules[dateStr] || [];
          availabilityData.push({
            date: dateStr,
            timeSlots: slots,
            isAvailable: slots.length > 0,
            type: "video" as const,
          });
        });

        if (availabilityData.length > 0) {
          console.log(
            "📤 [Clear Video] Sending cleared schedule to backend:",
            JSON.stringify(availabilityData, null, 2),
          );
          await apiService.updateAvailability(availabilityData);
        }

        // განვაახლოთ initial references - მხოლოდ video-სთვის
        initialVideoDatesRef.current = allVideoDates;
        initialVideoSchedulesRef.current = JSON.parse(
          JSON.stringify(clearedVideoSchedules),
        );
      } catch (error: any) {
        console.error("Error clearing schedule:", error);
        Alert.alert(
          "შეცდომა",
          error?.message || "გრაფიკის გასუფთავება ვერ მოხერხდა",
        );
        // Reload availability from backend to restore the correct state
        await loadAvailability();
      }
    } else {
      // Home-visit რეჟიმისთვის: დავტოვოთ მხოლოდ დაჯავშნილი სლოტები
      const clearedHomeVisitSchedules: { [key: string]: string[] } = {};
      const clearedHomeVisitDates: string[] = [];

      Object.keys(homeVisitSchedules).forEach((dateStr) => {
        const dateKey = `${dateStr}-home-visit`;
        const bookedForDate = bookedSlots[dateKey] || [];
        if (bookedForDate.length > 0) {
          clearedHomeVisitSchedules[dateStr] = bookedForDate;
          clearedHomeVisitDates.push(dateStr);
        }
      });

      setHomeVisitSelectedDates(clearedHomeVisitDates);
      setHomeVisitSchedules(clearedHomeVisitSchedules);
      setHasSaved(false); // Mark as unsaved so save button appears
      setShowClearConfirmModal(false);

      // Backend-ზე განახლება - მხოლოდ home-visit რეჟიმისთვის
      try {
        const allHomeVisitDates = Array.from(
          new Set([
            ...initialHomeVisitDatesRef.current,
            ...Object.keys(homeVisitSchedules),
          ]),
        );

        const availabilityData: {
          date: string;
          timeSlots: string[];
          isAvailable: boolean;
          type: "video" | "home-visit";
        }[] = [];

        // Home-visit რეჟიმისთვის
        allHomeVisitDates.forEach((dateStr) => {
          const slots = clearedHomeVisitSchedules[dateStr] || [];
          availabilityData.push({
            date: dateStr,
            timeSlots: slots,
            isAvailable: slots.length > 0,
            type: "home-visit" as const,
          });
        });

        if (availabilityData.length > 0) {
          console.log(
            "📤 [Clear Home-Visit] Sending cleared schedule to backend:",
            JSON.stringify(availabilityData, null, 2),
          );
          await apiService.updateAvailability(availabilityData);
        }

        // განვაახლოთ initial references - მხოლოდ home-visit-ისთვის
        initialHomeVisitDatesRef.current = allHomeVisitDates;
        initialHomeVisitSchedulesRef.current = JSON.parse(
          JSON.stringify(clearedHomeVisitSchedules),
        );
      } catch (error: any) {
        console.error("Error clearing schedule:", error);
        Alert.alert(
          "შეცდომა",
          error?.message || "გრაფიკის გასუფთავება ვერ მოხერხდა",
        );
        // Reload availability from backend to restore the correct state
        await loadAvailability();
      }
    }
  };

  // Video რეჟიმისთვის გრაფიკის შენახვა
  const saveScheduleVideo = async () => {
    if (!isDoctorActive) {
      Alert.alert(
        "შეზღუდვა",
        "გრაფიკის შენახვა შესაძლებელია მხოლოდ active სტატუსის ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.",
      );
      return;
    }

    try {
      setIsSaving(true);

      const initialDates = initialVideoDatesRef.current;

      console.log("💾 [Save Video] მიმდინარე videoSchedules:", {
        byDate: Object.fromEntries(
          Object.entries(videoSchedules).map(([d, s]) => [d, [...(s || [])]]),
        ),
      });

      // ყველა თარიღი, რომელზეც ოდესმე იყო სქედული (საწყისი + текущი)
      const allDates = Array.from(
        new Set([...initialDates, ...Object.keys(videoSchedules)]),
      );

      // შევამოწმოთ, რომ საერთოდ რაღაც დღე მაინც არსებობს.
      // თუ allDates ცარიელია, მაშინ არც ადრე და არც ახლა არ გაქვს სქედული -> არაფრის შენახვა არ გვჭირდება.
      if (allDates.length === 0) {
        Alert.alert(
          "შეცდომა",
          "გთხოვთ აირჩიოთ მინიმუმ ერთი დრო, სანამ განრიგს შეინახავთ",
        );
        return;
      }

      // შევაგროვოთ ყველა თარიღი, რომელზეც ოდესმე იყო სქედული (video ან home-visit)
      const allVideoDates = Array.from(
        new Set([...initialDates, ...Object.keys(videoSchedules)]),
      );
      const allHomeVisitDates = Array.from(
        new Set([
          ...initialHomeVisitDatesRef.current,
          ...Object.keys(homeVisitSchedules),
        ]),
      );
      const allDatesCombined = Array.from(
        new Set([...allVideoDates, ...allHomeVisitDates]),
      );

      // სრული სია backend-ისთვის - ორივე რეჟიმის განრიგი:
      // - დღეებს, რომლებზეც სლოტები აღარ გვაქვს -> timeSlots: [], isAvailable: false
      // - სხვა დღეებს -> რეალური სლოტები
      const availabilityData: {
        date: string;
        timeSlots: string[];
        isAvailable: boolean;
        type: "video" | "home-visit";
      }[] = [];

      // Video განრიგი
      allDatesCombined.forEach((dateStr) => {
        const slots = videoSchedules[dateStr] || [];
        // თუ ამ თარიღზე ოდესმე იყო video განრიგი ან ახლა აქვს, დავამატოთ
        if (allVideoDates.includes(dateStr) || slots.length > 0) {
          availabilityData.push({
            date: dateStr,
            timeSlots: slots,
            isAvailable: slots.length > 0,
            type: "video" as const,
          });
        }
      });

      // Home-visit განრიგი
      allDatesCombined.forEach((dateStr) => {
        const slots = homeVisitSchedules[dateStr] || [];
        // თუ ამ თარიღზე ოდესმე იყო home-visit განრიგი ან ახლა აქვს, დავამატოთ
        if (allHomeVisitDates.includes(dateStr) || slots.length > 0) {
          availabilityData.push({
            date: dateStr,
            timeSlots: slots,
            isAvailable: slots.length > 0,
            type: "home-visit" as const,
          });
        }
      });

      // სავალდებულო სამუშაო დღეების შემოწმება (მომავალი 2 კვირა)
      try {
        const profileRes = await apiService.getProfile();
        const minRequired =
          (profileRes?.data?.minWorkingDaysRequired as number) ?? 0;
        if (minRequired > 0) {
          const now = new Date();
          const end14 = new Date(now);
          end14.setDate(end14.getDate() + 14);
          const workingDays = new Set<string>();
          availabilityData.forEach((d) => {
            if (d.timeSlots.length > 0) {
              const dDate = new Date(d.date + "T12:00:00");
              if (dDate >= now && dDate < end14) workingDays.add(d.date);
            }
          });
          if (workingDays.size < minRequired) {
            Alert.alert(
              "სავალდებულო დღეები",
              `მომავალი 2 კვირის განმავლობაში სავალდებულოა მინიმუმ ${minRequired} სამუშაო დღე. ახლა არჩეული გაქვთ ${workingDays.size}. გთხოვთ დაამატოთ გრაფიკი სხვა დღეებზეც, სანამ შეინახავთ.`,
            );
            setIsSaving(false);
            return;
          }
        }
      } catch {
        // პროფილის ჩატვირთვა ვერ მოხდა — ვაგრძელებთ შენახვას
      }

      // Save to backend
      const videoEntries = availabilityData.filter((d) => d.type === "video");
      console.log("💾 [Save Video] რას ვაგზავნით backend-ზე (video entries):", {
        videoEntries: videoEntries.map((e) => ({
          date: e.date,
          timeSlots: e.timeSlots,
        })),
      });
      console.log(
        "📤 [Video] Sending full schedule to backend (both modes):",
        JSON.stringify(availabilityData, null, 2),
      );
      console.log("📊 [Video] Schedule summary:", {
        totalDates: availabilityData.length,
        datesWithSlots: availabilityData.filter((d) => d.timeSlots.length > 0)
          .length,
        totalSlots: availabilityData.reduce(
          (sum, d) => sum + d.timeSlots.length,
          0,
        ),
      });
      const response = await apiService.updateAvailability(availabilityData);

      if (response.success) {
        setSaveSuccess(true);
        setHasSaved(true); // Mark as saved

        // განვაახლოთ თარიღების სიები იმ დღეებით, რომლებსაც აქვთ საათები ან დაჯავშნილი საათები
        const updatedSelectedDates = allVideoDates.filter((dateStr) => {
          const slots = videoSchedules[dateStr] || [];
          const dateKey = `${dateStr}-video`;
          const bookedForDate = bookedSlots[dateKey] || [];
          // დღე რჩება არჩეულად, თუ მას აქვს timeSlots ან bookedSlots
          return slots.length > 0 || bookedForDate.length > 0;
        });

        setVideoSelectedDates(updatedSelectedDates);
        initialVideoDatesRef.current = allVideoDates;
        // განვაახლოთ initial schedules - ახლა ეს არის backend-ზე შენახული მდგომარეობა
        initialVideoSchedulesRef.current = JSON.parse(
          JSON.stringify(videoSchedules),
        );

        // Hide success message after 2 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      } else {
        Alert.alert(
          "შეცდომა",
          response.message || "განრიგის შენახვა ვერ მოხერხდა",
        );
      }
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      Alert.alert(
        "შეცდომა",
        error.message ||
          "განრიგის შენახვა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
      );
      // Reload availability from backend to restore the correct state
      await loadAvailability();
    } finally {
      setIsSaving(false);
    }
  };

  // Home-visit რეჟიმისთვის გრაფიკის შენახვა
  const saveScheduleHomeVisit = async () => {
    if (!isDoctorActive) {
      Alert.alert(
        "შეზღუდვა",
        "გრაფიკის შენახვა შესაძლებელია მხოლოდ active სტატუსის ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.",
      );
      return;
    }

    try {
      setIsSaving(true);

      const initialDates = initialHomeVisitDatesRef.current;

      // ყველა თარიღი, რომელზეც ოდესმე იყო სქედული (საწყისი + текущი)
      const allDates = Array.from(
        new Set([...initialDates, ...Object.keys(homeVisitSchedules)]),
      );

      // შევამოწმოთ, რომ საერთოდ რაღაც დღე მაინც არსებობს.
      // თუ allDates ცარიელია, მაშინ არც ადრე და არც ახლა არ გაქვს სქედული -> არაფრის შენახვა არ გვჭირდება.
      if (allDates.length === 0) {
        Alert.alert(
          "შეცდომა",
          "გთხოვთ აირჩიოთ მინიმუმ ერთი დრო, სანამ განრიგს შეინახავთ",
        );
        return;
      }

      // შევაგროვოთ ყველა თარიღი, რომელზეც ოდესმე იყო სქედული (video ან home-visit)
      const allVideoDates = Array.from(
        new Set([
          ...initialVideoDatesRef.current,
          ...Object.keys(videoSchedules),
        ]),
      );
      const allHomeVisitDates = Array.from(
        new Set([...initialDates, ...Object.keys(homeVisitSchedules)]),
      );
      const allDatesCombined = Array.from(
        new Set([...allVideoDates, ...allHomeVisitDates]),
      );

      // სრული სია backend-ისთვის - ორივე რეჟიმის განრიგი:
      // - დღეებს, რომლებზეც სლოტები აღარ გვაქვს -> timeSlots: [], isAvailable: false
      // - სხვა დღეებს -> რეალური სლოტები
      const availabilityData: {
        date: string;
        timeSlots: string[];
        isAvailable: boolean;
        type: "video" | "home-visit";
      }[] = [];

      // Video განრიგი
      allDatesCombined.forEach((dateStr) => {
        const slots = videoSchedules[dateStr] || [];
        // თუ ამ თარიღზე ოდესმე იყო video განრიგი ან ახლა აქვს, დავამატოთ
        if (allVideoDates.includes(dateStr) || slots.length > 0) {
          availabilityData.push({
            date: dateStr,
            timeSlots: slots,
            isAvailable: slots.length > 0,
            type: "video" as const,
          });
        }
      });

      // Home-visit განრიგი
      allDatesCombined.forEach((dateStr) => {
        const slots = homeVisitSchedules[dateStr] || [];
        // თუ ამ თარიღზე ოდესმე იყო home-visit განრიგი ან ახლა აქვს, დავამატოთ
        if (allHomeVisitDates.includes(dateStr) || slots.length > 0) {
          availabilityData.push({
            date: dateStr,
            timeSlots: slots,
            isAvailable: slots.length > 0,
            type: "home-visit" as const,
          });
        }
      });

      // სავალდებულო სამუშაო დღეების შემოწმება (მომავალი 2 კვირა)
      try {
        const profileRes = await apiService.getProfile();
        const minRequired =
          (profileRes?.data?.minWorkingDaysRequired as number) ?? 0;
        if (minRequired > 0) {
          const now = new Date();
          const end14 = new Date(now);
          end14.setDate(end14.getDate() + 14);
          const workingDays = new Set<string>();
          availabilityData.forEach((d) => {
            if (d.timeSlots.length > 0) {
              const dDate = new Date(d.date + "T12:00:00");
              if (dDate >= now && dDate < end14) workingDays.add(d.date);
            }
          });
          if (workingDays.size < minRequired) {
            Alert.alert(
              "სავალდებულო დღეები",
              `მომავალი 2 კვირის განმავლობაში სავალდებულოა მინიმუმ ${minRequired} სამუშაო დღე. ახლა არჩეული გაქვთ ${workingDays.size}. გთხოვთ დაამატოთ გრაფიკი სხვა დღეებზეც, სანამ შეინახავთ.`,
            );
            setIsSaving(false);
            return;
          }
        }
      } catch {
        // პროფილის ჩატვირთვა ვერ მოხდა — ვაგრძელებთ შენახვას
      }

      // Save to backend
      console.log(
        "📤 [Home-Visit] Sending full schedule to backend (both modes):",
        JSON.stringify(availabilityData, null, 2),
      );
      console.log("📊 [Home-Visit] Schedule summary:", {
        totalDates: availabilityData.length,
        datesWithSlots: availabilityData.filter((d) => d.timeSlots.length > 0)
          .length,
        totalSlots: availabilityData.reduce(
          (sum, d) => sum + d.timeSlots.length,
          0,
        ),
      });
      const response = await apiService.updateAvailability(availabilityData);

      if (response.success) {
        setSaveSuccess(true);
        setHasSaved(true); // Mark as saved

        // განვაახლოთ თარიღების სიები იმ დღეებით, რომლებსაც აქვთ საათები ან დაჯავშნილი საათები
        const updatedSelectedDates = allHomeVisitDates.filter((dateStr) => {
          const slots = homeVisitSchedules[dateStr] || [];
          const dateKey = `${dateStr}-home-visit`;
          const bookedForDate = bookedSlots[dateKey] || [];
          // დღე რჩება არჩეულად, თუ მას აქვს timeSlots ან bookedSlots
          return slots.length > 0 || bookedForDate.length > 0;
        });

        setHomeVisitSelectedDates(updatedSelectedDates);
        initialHomeVisitDatesRef.current = allHomeVisitDates;
        // განვაახლოთ initial schedules - ახლა ეს არის backend-ზე შენახული მდგომარეობა
        initialHomeVisitSchedulesRef.current = JSON.parse(
          JSON.stringify(homeVisitSchedules),
        );

        // Hide success message after 2 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      } else {
        Alert.alert(
          "შეცდომა",
          response.message || "განრიგის შენახვა ვერ მოხერხდა",
        );
      }
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      Alert.alert(
        "შეცდომა",
        error.message ||
          "განრიგის შენახვა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
      );
      // Reload availability from backend to restore the correct state
      await loadAvailability();
    } finally {
      setIsSaving(false);
    }
  };

  // Wrapper ფუნქცია რეჟიმის მიხედვით
  const saveSchedule = async () => {
    console.log("💾 [Save] შენახვა დაიწყო", {
      mode,
      videoSchedules: JSON.stringify(videoSchedules),
      homeVisitSchedules: JSON.stringify(homeVisitSchedules),
    });
    if (mode === "video") {
      await saveScheduleVideo();
    } else {
      await saveScheduleHomeVisit();
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

  // Check if doctor has active status
  // Allow schedule selection for approved doctors
  // Doctors with 'awaiting_schedule' status should be able to select their schedule
  // The doctorStatus will be updated to 'active' automatically after they set a schedule
  // Check both approvalStatus and isActive - doctor must be approved AND active
  // If isActive is undefined, default to true (for backward compatibility)
  const isDoctorActive =
    user?.approvalStatus === "approved" && user?.isActive !== false;

  // Debug log only when user changes (moved to useEffect to prevent multiple logs)
  useEffect(() => {
    if (user?.id) {
      console.log(
        user,
        "user",
        "isDoctorActive:",
        isDoctorActive,
        "approvalStatus:",
        user?.approvalStatus,
        "isActive:",
        user?.isActive,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDoctorActive]);
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
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

            {/* Warning message if doctor is not active */}
            {!isDoctorActive && (
              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>
                    გრაფიკის ჩანიშვნა შეზღუდულია
                  </Text>
                  <Text style={styles.warningText}>
                    გრაფიკის ჩანიშვნა შესაძლებელია მხოლოდ active სტატუსის
                    ექიმებისთვის. გთხოვთ დაელოდოთ ადმინისტრატორის დამტკიცებას.
                  </Text>
                </View>
              </View>
            )}
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
        {getCurrentModeSelectedDates().length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>
                არჩეული დღეები:{" "}
                {(() => {
                  const currentSelected = getCurrentModeSelectedDates();
                  console.log("📅 არჩეული დღეები:", {
                    mode,
                    currentSelected,
                    count: currentSelected.length,
                  });
                  return currentSelected.length;
                })()}
              </Text>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.statText}>
                  {
                    Object.values(getCurrentModeSchedules()).filter(
                      (slots) => slots.length > 0,
                    ).length
                  }{" "}
                  კონფიგურირებული
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

                // დაჯავშნილი საათების რაოდენობა
                const dateKey = `${dateStr}-${mode}`;
                const bookedForDate = bookedSlots[dateKey] || [];
                const bookedCount = bookedForDate.length;

                // Debug: დაჯავშნილი სლოტების ლოგინგი
                if (bookedCount > 0) {
                  console.log(`🔒 [Calendar Render] ${dateStr} (${mode}):`);
                  console.log(`   📅 თარიღი: ${dateStr}`);
                  console.log(`   🎯 რეჟიმი: ${mode}`);
                  console.log(`   🔑 Key: ${dateKey}`);
                  console.log(`   ✅ isSelected: ${isSelected}`);
                  console.log(`   🔒 bookedCount: ${bookedCount}`);
                  console.log(`   ⏰ დაჯავშნილი საათები:`, bookedForDate);
                  console.log(
                    `   📋 hasSchedule: ${hasSchedule}`,
                    hasSchedule
                      ? `(${currentSchedules[dateStr]?.length} საათი)`
                      : "",
                  );
                  console.log(
                    `   🎨 Badge უნდა გამოჩნდეს: ${isSelected && bookedCount > 0 ? "✅ დიახ" : "❌ არა"}`,
                  );
                }

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
                        !isDoctorActive && styles.dateCardDisabled,
                      ]}
                      onPress={() => toggleDateSelection(date)}
                      disabled={!isDoctorActive}
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
                    {isSelected && bookedCount > 0 && (
                      <View style={styles.bookedSlotsIndicator}>
                        <Ionicons
                          name="lock-closed"
                          size={10}
                          color="#FFFFFF"
                        />
                        <Text style={styles.bookedSlotsIndicatorText}>
                          {bookedCount} დაჯავშნილი
                        </Text>
                      </View>
                    )}
                    {isSelected && (
                      <TouchableOpacity
                        style={[
                          styles.configureButton,
                          !isDoctorActive && styles.configureButtonDisabled,
                        ]}
                        onPress={() => openTimeSelector(date)}
                        disabled={!isDoctorActive}
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

                // დაჯავშნილი საათების რაოდენობა
                const dateKey = `${dateStr}-${mode}`;
                const bookedForDate = bookedSlots[dateKey] || [];
                const bookedCount = bookedForDate.length;

                // Debug: დაჯავშნილი სლოტების ლოგინგი
                if (bookedCount > 0) {
                  console.log(
                    `🔒 [Calendar Render - Next Month] ${dateStr} (${mode}):`,
                  );
                  console.log(`   📅 თარიღი: ${dateStr}`);
                  console.log(`   🎯 რეჟიმი: ${mode}`);
                  console.log(`   🔑 Key: ${dateKey}`);
                  console.log(`   ✅ isSelected: ${isSelected}`);
                  console.log(`   🔒 bookedCount: ${bookedCount}`);
                  console.log(`   ⏰ დაჯავშნილი საათები:`, bookedForDate);
                  console.log(
                    `   📋 hasSchedule: ${hasSchedule}`,
                    hasSchedule
                      ? `(${currentSchedules[dateStr]?.length} საათი)`
                      : "",
                  );
                  console.log(
                    `   🎨 Badge უნდა გამოჩნდეს: ${isSelected && bookedCount > 0 ? "✅ დიახ" : "❌ არა"}`,
                  );
                }

                return (
                  <View key={index} style={styles.dateWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.dateCard,
                        isSelected &&
                          (mode === "video"
                            ? styles.dateCardSelectedVideo
                            : styles.dateCardSelectedHome),
                        !isDoctorActive && styles.dateCardDisabled,
                      ]}
                      onPress={() => toggleDateSelection(date)}
                      disabled={!isDoctorActive}
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
                    {isSelected && bookedCount > 0 && (
                      <View style={styles.bookedSlotsIndicator}>
                        <Ionicons
                          name="lock-closed"
                          size={10}
                          color="#FFFFFF"
                        />
                        <Text style={styles.bookedSlotsIndicatorText}>
                          {bookedCount} დაჯავშნილი
                        </Text>
                      </View>
                    )}
                    {isSelected && (
                      <TouchableOpacity
                        style={[
                          styles.configureButton,
                          !isDoctorActive && styles.configureButtonDisabled,
                        ]}
                        onPress={() => openTimeSelector(date)}
                        disabled={!isDoctorActive}
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
      {!saveSuccess && !hasSaved && isDoctorActive && (
        <TouchableOpacity
          style={[
            styles.floatingButton,
            isSaving && styles.floatingButtonSaving,
          ]}
          onPress={saveSchedule}
          activeOpacity={0.8}
          disabled={isSaving || !isDoctorActive}
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
                <Text style={styles.floatingButtonText}>განრიგის შენახვა</Text>
                <Text style={styles.floatingButtonSubtext}>
                  {getCurrentModeSelectedDates().length} დღე •{" "}
                  {Object.values(getCurrentModeSchedules()).reduce(
                    (sum, slots) => sum + slots.length,
                    0,
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

            <View style={styles.timeLegendRow}>
              <View style={styles.timeLegendItem}>
                <View
                  style={[styles.timeLegendDot, { backgroundColor: "#22C55E" }]}
                />
                <Text style={styles.timeLegendText}>
                  მწვანე — თქვენი არჩეული (პაციენტისთვის ხელმისაწვდომი)
                </Text>
              </View>
              <View style={styles.timeLegendItem}>
                <View
                  style={[styles.timeLegendDot, { backgroundColor: "#DC2626" }]}
                />
                <Text style={styles.timeLegendText}>
                  წითელი — პაციენტის დაჯავშნილი
                </Text>
              </View>
              <View style={styles.timeLegendItem}>
                <View
                  style={[
                    styles.timeLegendDot,
                    {
                      backgroundColor: "#FACC15",
                      borderWidth: 1,
                      borderColor: "#CA8A04",
                    },
                  ]}
                />
                <Text style={styles.timeLegendText}>
                  ყვითელი — წარსული დრო ან ვადა გაუვიდა (ვერ აირჩევა)
                </Text>
              </View>
              <View style={styles.timeLegendItem}>
                <View
                  style={[
                    styles.timeLegendDot,
                    {
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    },
                  ]}
                />
                <Text style={styles.timeLegendText}>
                  თეთრი — გრაფიკში არ არის
                </Text>
              </View>
            </View>

            {/* დაჯავშნილი საათების შეტყობინება */}
            {currentEditDate &&
              (() => {
                const dateKey = `${currentEditDate}-${mode}`;
                const otherMode = mode === "video" ? "home-visit" : "video";
                const otherDateKey = `${currentEditDate}-${otherMode}`;

                // ორივე type-ის appointments გავითვალისწინოთ, რადგან ექიმი არ შეუძლია ერთდროულად იყოს ორ ადგილას
                const bookedForDate = bookedSlots[dateKey] || [];
                const bookedForOtherDate = bookedSlots[otherDateKey] || [];
                const allBookedSlotsForDate = Array.from(
                  new Set([...bookedForDate, ...bookedForOtherDate]),
                );

                const currentSchedules = getCurrentModeSchedules();
                const currentSlots = currentSchedules[currentEditDate] || [];

                // დათვლა: რამდენი საათია დაჯავშნილი, რამდენია 24 საათზე ნაკლები დარჩენილი (წაშლისთვის), და რამდენია დარჩენილი (დამატებისთვის)
                const canDeleteFn =
                  mode === "video"
                    ? canDeleteSlotVideo
                    : canDeleteSlotHomeVisit;
                const canAddFn =
                  mode === "video" ? canAddSlotVideo : canAddSlotHomeVisit;

                const lockedForDeletion = currentSlots.filter(
                  (time) =>
                    !allBookedSlotsForDate.includes(time) &&
                    !canDeleteFn(currentEditDate, time),
                );

                // დათვლა: რამდენი საათია დარჩენილი (დამატებისთვის)
                const lockedForAddition = AVAILABLE_HOURS.filter(
                  (time) =>
                    !allBookedSlotsForDate.includes(time) &&
                    !currentSlots.includes(time) &&
                    !canAddFn(currentEditDate, time),
                );

                if (
                  allBookedSlotsForDate.length > 0 ||
                  lockedForDeletion.length > 0 ||
                  lockedForAddition.length > 0
                ) {
                  return <View style={styles.expiredSlotsWarning}></View>;
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
                  // ორივე type-ის appointments გავითვალისწინოთ, რადგან ექიმი არ შეუძლია ერთდროულად იყოს ორ ადგილას
                  const dateKey = currentEditDate
                    ? `${currentEditDate}-${mode}`
                    : "";
                  const otherMode = mode === "video" ? "home-visit" : "video";
                  const otherDateKey = currentEditDate
                    ? `${currentEditDate}-${otherMode}`
                    : "";

                  const bookedForDate = bookedSlots[dateKey] || [];
                  const bookedForOtherDate = bookedSlots[otherDateKey] || [];

                  // გავაერთიანოთ ორივე type-ის booked slots
                  const allBookedSlotsForDate = Array.from(
                    new Set([...bookedForDate, ...bookedForOtherDate]),
                  );
                  const isBooked = allBookedSlotsForDate.includes(time);

                  // Debug: ვნახოთ რა ხდება
                  if (isBooked) {
                    console.log(
                      `🔒 [Modal] Time ${time} is booked (${mode} or ${otherMode}) for ${currentEditDate}`,
                      {
                        dateKey,
                        otherDateKey,
                        mode,
                        bookedForDate,
                        bookedForOtherDate,
                        allBookedSlotsForDate,
                        allBookedSlots: Object.keys(bookedSlots),
                      },
                    );
                  }

                  // შემოწმება: შეიძლება თუ არა საათის წაშლა (თუ არჩეულია და დარჩენილია 24 საათზე ნაკლები)
                  const canDeleteFn =
                    mode === "video"
                      ? canDeleteSlotVideo
                      : canDeleteSlotHomeVisit;
                  const canDelete = currentEditDate
                    ? canDeleteFn(currentEditDate, time)
                    : true;
                  const isLockedForDeletion =
                    isSelected && !canDelete && !isBooked;

                  // შემოწმება: შეიძლება თუ არა საათის დამატება (თუ არ არის არჩეული)
                  const canAddFn =
                    mode === "video" ? canAddSlotVideo : canAddSlotHomeVisit;
                  const canAdd = currentEditDate
                    ? canAddFn(currentEditDate, time)
                    : true;

                  // შემოწმება: არის თუ არა საათი არჩეული სხვა რეჟიმში
                  const otherModeSchedules =
                    mode === "video" ? homeVisitSchedules : videoSchedules;
                  const otherModeSlots = currentEditDate
                    ? otherModeSchedules[currentEditDate] || []
                    : [];
                  const isSelectedInOtherMode = otherModeSlots.includes(time);

                  const isLockedForAddition =
                    !isSelected &&
                    (!canAdd || isSelectedInOtherMode) &&
                    !isBooked;

                  // იგივე slotToLocalDate, რაც canAdd* იყენებს — ლოკალური დრო, იდენტური ლოგიკა
                  let isPast = false;
                  if (currentEditDate) {
                    if (isPastDate(currentEditDate)) {
                      isPast = true;
                    } else {
                      const slotDate = slotToLocalDate(currentEditDate, time);
                      isPast = slotDate.getTime() < Date.now();
                      if (isPast || isLockedForAddition) {
                        logSlotCheck(
                          `Modal ${mode}`,
                          currentEditDate,
                          time,
                          slotDate,
                          { isPast, isLockedForAddition },
                        );
                      }
                    }
                  }

                  const isLockedOrPast =
                    isLockedForDeletion || isLockedForAddition || isPast;
                  // ყვითელი: წარსული, ვადა გაუვიდა ან სხვა რეჟიმში არჩეული (ვერ აირჩევა)
                  const showLockedYellow = isLockedOrPast && !isBooked;

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
                        showLockedYellow ? styles.timeChipLocked : null,
                        showLockedYellow
                          ? {
                              backgroundColor: "#FACC15",
                              borderColor: "#CA8A04",
                              borderWidth: 2,
                            }
                          : null,
                      ]}
                      onPress={() => toggleTimeSlot(time)}
                      disabled={isBooked || isLockedForAddition || isPast}
                    >
                      {isBooked && (
                        <Ionicons
                          name="lock-closed"
                          size={14}
                          color="#FFFFFF"
                          style={{ marginRight: 4 }}
                        />
                      )}
                      {showLockedYellow && (
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color="#713F12"
                            style={{ marginRight: 4 }}
                          />
                        )}
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected &&
                            (mode === "video"
                              ? styles.timeChipTextSelectedVideo
                              : styles.timeChipTextSelectedHome),
                          isBooked && styles.timeChipTextBooked,
                          showLockedYellow ? styles.timeChipTextLocked : null,
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
                    const currentSlots =
                      currentSchedules[currentEditDate] || [];
                    const dateKey = `${currentEditDate}-${mode}`;
                    const otherMode = mode === "video" ? "home-visit" : "video";
                    const otherDateKey = `${currentEditDate}-${otherMode}`;

                    // ორივე type-ის appointments გავითვალისწინოთ, რადგან ექიმი არ შეუძლია ერთდროულად იყოს ორ ადგილას
                    const bookedForDate = bookedSlots[dateKey] || [];
                    const bookedForOtherDate = bookedSlots[otherDateKey] || [];
                    const allBookedSlotsForDate = Array.from(
                      new Set([...bookedForDate, ...bookedForOtherDate]),
                    );

                    // ყველა არჩევა (დაჯავშნილის გარდა, 24 საათზე ნაკლები დარჩენილი წაშლისთვის, და დარჩენილი დამატებისთვის)
                    const canDeleteFn =
                      mode === "video"
                        ? canDeleteSlotVideo
                        : canDeleteSlotHomeVisit;
                    const canAddFn =
                      mode === "video" ? canAddSlotVideo : canAddSlotHomeVisit;

                    const availableSlots = AVAILABLE_HOURS.filter(
                      (time) =>
                        !allBookedSlotsForDate.includes(time) &&
                        canDeleteFn(currentEditDate, time) &&
                        canAddFn(currentEditDate, time),
                    );

                    // დაჯავშნილი და 24 საათზე ნაკლები დარჩენილი საათები (რომლებიც ვერ წაიშლება)
                    // აქ ვტოვებთ მხოლოდ ამ რეჟიმისთვის დაჯავშნილ სლოტებს, რადგან სხვა რეჟიმის დაჯავშნილი სლოტები ამ რეჟიმში არ ჩანს
                    const nonDeletableSlots = currentSlots.filter(
                      (time) =>
                        bookedForDate.includes(time) ||
                        !canDeleteFn(currentEditDate, time),
                    );

                    let updatedSchedules: { [key: string]: string[] };

                    // შემოწმება: ყველა წაშლადი საათი არჩეულია თუ არა
                    const allDeletableSelected =
                      availableSlots.every((time) =>
                        currentSlots.includes(time),
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
                        [currentEditDate]: [
                          ...nonDeletableSlots,
                          ...availableSlots,
                        ],
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
                    const otherMode = mode === "video" ? "home-visit" : "video";
                    const otherDateKey = `${currentEditDate}-${otherMode}`;

                    // ორივე type-ის appointments გავითვალისწინოთ, რადგან ექიმი არ შეუძლია ერთდროულად იყოს ორ ადგილას
                    const bookedForDate = bookedSlots[dateKey] || [];
                    const bookedForOtherDate = bookedSlots[otherDateKey] || [];
                    const allBookedSlotsForDate = Array.from(
                      new Set([...bookedForDate, ...bookedForOtherDate]),
                    );

                    const currentSlots =
                      getCurrentModeSchedules()[currentEditDate] || [];

                    // ყველა წაშლადი საათი (დაჯავშნილის გარდა და 24 საათზე ნაკლები დარჩენილი)
                    const canDeleteFn =
                      mode === "video"
                        ? canDeleteSlotVideo
                        : canDeleteSlotHomeVisit;
                    const availableSlots = AVAILABLE_HOURS.filter(
                      (time) =>
                        !allBookedSlotsForDate.includes(time) &&
                        canDeleteFn(currentEditDate, time),
                    );

                    // შემოწმება: ყველა წაშლადი საათი არჩეულია თუ არა
                    const allDeletableSelected =
                      availableSlots.length > 0 &&
                      availableSlots.every((time) =>
                        currentSlots.includes(time),
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

      {/* Clear Confirm Modal */}
      <Modal
        visible={showClearConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowClearConfirmModal(false)}
      >
        <View style={styles.clearModalOverlay}>
          <View style={styles.clearModalContent}>
            <View style={styles.clearModalHeader}>
              <View style={styles.clearModalIconContainer}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
              <Text style={styles.clearModalTitle}>გრაფიკის გასუფთავება</Text>
              <Text style={styles.clearModalText}>
                {Object.keys(bookedSlots).length > 0
                  ? "თქვენ გაქვთ დაჯავშნილი საათები. გასუფთავებისას მხოლოდ თავისუფალი საათები წაიშლება, დაჯავშნილი საათები კი დარჩება."
                  : "დარწმუნებული ხართ, რომ გსურთ გრაფიკის გასუფთავება? ყველა თავისუფალი საათი წაიშლება."}
              </Text>
            </View>
            <View style={styles.clearModalFooter}>
              <TouchableOpacity
                style={styles.clearModalCancelButton}
                onPress={() => setShowClearConfirmModal(false)}
              >
                <Text style={styles.clearModalCancelText}>გაუქმება</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearModalConfirmButton}
                onPress={handleClearSchedule}
              >
                <Text style={styles.clearModalConfirmText}>გასუფთავება</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Delete Confirm Modal */}
      <Modal
        visible={showDateDeleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDateDeleteConfirmModal(false);
          setDateToDelete(null);
        }}
      >
        <View style={styles.clearModalOverlay}>
          <View style={styles.clearModalContent}>
            <View style={styles.clearModalHeader}>
              <View style={styles.clearModalIconContainer}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
              <Text style={styles.clearModalTitle}>თარიღის წაშლა</Text>
              <Text style={styles.clearModalText}>
                {dateToDelete &&
                  (() => {
                    const dateStr = formatDate(dateToDelete.date);
                    const dateKey = `${dateStr}-${dateToDelete.mode}`;
                    const bookedForDate = bookedSlots[dateKey] || [];
                    const currentSchedules =
                      dateToDelete.mode === "video"
                        ? videoSchedules
                        : homeVisitSchedules;
                    const currentSlots = currentSchedules[dateStr] || [];

                    if (bookedForDate.length > 0) {
                      return `დარწმუნებული ხართ, რომ გსურთ ამ თარიღის (${dateStr}) წაშლა? დაჯავშნილი ${bookedForDate.length} საათი დარჩება, მაგრამ თარიღი და ${currentSlots.length} თავისუფალი საათი წაიშლება.`;
                    } else {
                      return `დარწმუნებული ხართ, რომ გსურთ ამ თარიღის (${dateStr}) წაშლა? ყველა საათი (${currentSlots.length}) წაიშლება.`;
                    }
                  })()}
              </Text>
            </View>
            <View style={styles.clearModalFooter}>
              <TouchableOpacity
                style={styles.clearModalCancelButton}
                onPress={() => {
                  setShowDateDeleteConfirmModal(false);
                  setDateToDelete(null);
                }}
              >
                <Text style={styles.clearModalCancelText}>გაუქმება</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearModalConfirmButton}
                onPress={async () => {
                  if (!dateToDelete) return;

                  const dateStr = formatDate(dateToDelete.date);

                  if (dateToDelete.mode === "video") {
                    // ამოიღე თარიღი
                    setVideoSelectedDates(
                      videoSelectedDates.filter((d) => d !== dateStr),
                    );
                    const updatedSchedules = { ...videoSchedules };
                    delete updatedSchedules[dateStr];
                    setVideoSchedules(updatedSchedules);
                    setHasSaved(false);
                  } else {
                    // ამოიღე თარიღი
                    setHomeVisitSelectedDates(
                      homeVisitSelectedDates.filter((d) => d !== dateStr),
                    );
                    const updatedSchedules = { ...homeVisitSchedules };
                    delete updatedSchedules[dateStr];
                    setHomeVisitSchedules(updatedSchedules);
                    setHasSaved(false);
                  }

                  setShowDateDeleteConfirmModal(false);
                  setDateToDelete(null);
                }}
              >
                <Text style={styles.clearModalConfirmText}>წაშლა</Text>
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
  configureButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  bookedSlotsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#DC2626",
    borderRadius: 6,
  },
  bookedSlotsIndicatorText: {
    fontSize: 10,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  dateCardDisabled: {
    opacity: 0.5,
  },
  warningCard: {
    flexDirection: "row",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  warningContent: {
    flex: 1,
    marginLeft: 10,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#991B1B",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#B91C1C",
    lineHeight: 18,
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
  timeLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  timeLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timeLegendText: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  timeChipSelectedVideo: {
    backgroundColor: "#22C55E",
    borderColor: "#16A34A",
    borderWidth: 2,
  },
  timeChipSelectedHome: {
    backgroundColor: "#22C55E",
    borderColor: "#16A34A",
    borderWidth: 2,
  },
  timeChipText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#374151",
  },
  timeChipTextSelectedVideo: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
  },
  timeChipTextSelectedHome: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
  },
  timeChipBooked: {
    backgroundColor: "#DC2626",
    borderColor: "#B91C1C",
    borderWidth: 2,
  },
  timeChipTextBooked: {
    color: "#FFFFFF",
    fontFamily: "Poppins-Bold",
  },
  timeChipLocked: {
    backgroundColor: "#FACC15",
    borderColor: "#CA8A04",
    borderWidth: 2,
  },
  timeChipTextLocked: {
    color: "#713F12",
    fontFamily: "Poppins-Medium",
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
  expiredSlotsWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF9C3",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CA8A04",
  },
  expiredSlotsWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#713F12",
    lineHeight: 18,
  },
  clearModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  clearModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  clearModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  clearModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  clearModalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  clearModalText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  clearModalFooter: {
    flexDirection: "row",
    gap: 12,
  },
  clearModalCancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  clearModalCancelText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  clearModalConfirmButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  clearModalConfirmText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});
