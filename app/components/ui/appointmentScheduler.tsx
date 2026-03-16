import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DayAvailability {
  date: string;
  dayOfWeek: string;
  timeSlots: string[];
  videoSlots?: string[];
  homeVisitSlots?: string[];
  bookedSlots?: string[];
  isAvailable: boolean;
  type?: "video" | "home-visit"; // Backend-იდან მოდის type ველი
}

interface Review {
  id: number;
  reviewerName: string;
  reviewDate: string;
  rating: number;
  comment: string;
}

interface AppointmentSchedulerProps {
  workingHours: string;
  availability: DayAvailability[];
  totalReviews: number;
  reviews: Review[];
  doctorId?: string;
  initialMode?: "video" | "home-visit";
  lockMode?: boolean;
  followUpAppointmentId?: string;
  isFollowUp?: boolean;
}

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  workingHours,
  availability,
  totalReviews,
  reviews,
  doctorId,
  initialMode = "video",
  lockMode = false,
  followUpAppointmentId,
  isFollowUp = false,
}) => {
  const isTwentyFourSeven = workingHours?.includes("24");
  const [mode, setMode] = useState<"video" | "home-visit">(initialMode);
  const [selectedDate, setSelectedDate] = useState<string>(
    availability[0]?.date || "",
  );
  const [selectedTime, setSelectedTime] = useState<string>("");

  const generateFullDaySlots = () => {
    return Array.from({ length: 24 }, (_, hour) =>
      `${hour.toString().padStart(2, "0")}:00`,
    );
  };

  useEffect(() => {
    setMode(initialMode);
    setSelectedTime("");
  }, [initialMode]);

  const handleModeChange = (nextMode: "video" | "home-visit") => {
    if (lockMode && nextMode !== initialMode) {
      return;
    }
    setMode(nextMode);
    setSelectedTime("");
  };

  const getCurrentMonth = () => {
    if (!selectedDate) return "";
    const date = new Date(selectedDate);
    const months = [
      "იანვარი",
      "თებერვალი",
      "მარტი",
      "აპრილი",
      "მაისი",
      "ივნისი",
      "ივლისი",
      "აგვისტო",
      "სექტემბერი",
      "ოქტომბერი",
      "ნოემბერი",
      "დეკემბერი",
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const currentMonth = getCurrentMonth();

  // Filter availability by current mode so რომ თითო ტაბში მხოლოდ შესაბამისი ტიპის დღეები ჩანდეს
  // Backend-იდან მოდის type ველი (video ან home-visit), ასე რომ უნდა ვფილტროთ type-ის მიხედვით
  // პაციენტისთვის: მხოლოდ ის დღეები, სადაც არის თავისუფალი დრო (timeSlots არ არის ცარიელი)
  // ასევე: გავლილი დღეები არ უნდა ჩანდეს
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredAvailability: DayAvailability[] = availability
    .filter((day) => {
      // გავლილი დღეების ფილტრაცია
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      if (dayDate < today) {
        console.log(`🚫 [AppointmentScheduler] Filtering out past date: ${day.date}`);
        return false;
      }

      // თუ day-ს აქვს type ველი, გამოვიყენოთ იგი
      if (day.type) {
        const typeMatches = day.type === mode;
        // პაციენტისთვის: მხოლოდ ის დღეები, სადაც არის თავისუფალი დრო
        if (typeMatches && day.timeSlots && day.timeSlots.length === 0) {
          return false; // თუ timeSlots ცარიელია, ეს დღე არ ჩანს
        }
        return typeMatches;
      }
      
      // Legacy support: თუ type არ არის, გამოვიყენოთ ძველი ლოგიკა
      if (isTwentyFourSeven) {
        return day.isAvailable !== false;
      }
      if (mode === "video") {
        return (day.videoSlots && day.videoSlots.length > 0) || day.timeSlots.length > 0;
      }
      // home-visit
      return day.homeVisitSlots && day.homeVisitSlots.length > 0;
    })
    // დავრწმუნდეთ, რომ თარიღები unique-ები არიან (თუ რამე პრობლემაა)
    .filter((day, index, self) => 
      index === self.findIndex((d) => d.date === day.date)
    );

  // Ensure selected date always belongs to current filtered list
  if (
    filteredAvailability.length > 0 &&
    !filteredAvailability.find((d) => d.date === selectedDate)
  ) {
    // Default to first available date for this mode
     
    setSelectedDate(filteredAvailability[0].date);
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time selection when date changes
  };

  // Helper function to check if a time slot can be booked (at least 2 hours in advance)
  const canBookTimeSlot = (dateStr: string, time: string): boolean => {
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const slotDateTime = new Date(dateStr);
      slotDateTime.setHours(hours, minutes || 0, 0, 0);
      
      const now = new Date();
      const diffMs = slotDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // ონლაინის შემთხვევაში: 2 საათით ადრე
      // ბინაზე ვიზიტისას: 12 საათით ადრე
      const requiredHours = mode === "video" ? 2 : 12;
      return diffHours >= requiredHours;
    } catch (error) {
      console.error("Error calculating time difference:", error);
      return false;
    }
  };

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    
    // Check if booking is allowed (at least 2 hours for video, 12 hours for home-visit)
    if (!canBookTimeSlot(selectedDate, time)) {
      const requiredHours = mode === "video" ? 2 : 12;
      Alert.alert(
        "დრო არ არის ხელმისაწვდომი",
        `ჯავშნის გაკეთება შესაძლებელია მინიმუმ ${requiredHours} საათით ადრე. გთხოვთ აირჩიოთ სხვა დრო.`
      );
      return;
    }
    
    setSelectedTime(time);
  };

  const selectedDayAvailability = filteredAvailability.find(
    (day) => day.date === selectedDate
  );

  const getVisibleTimeSlots = () => {
    if (!selectedDayAvailability) {
      console.log('📅 AppointmentScheduler - No selectedDayAvailability');
      return [];
    }

    console.log('📅 AppointmentScheduler - selectedDayAvailability:', {
      date: selectedDayAvailability.date,
      timeSlots: selectedDayAvailability.timeSlots,
      bookedSlots: selectedDayAvailability.bookedSlots,
      videoSlots: selectedDayAvailability.videoSlots,
      homeVisitSlots: selectedDayAvailability.homeVisitSlots,
      mode,
    });

    // Get current time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Helper function to check if a time slot has passed
    const isTimeSlotPassed = (dateStr: string, timeStr: string): boolean => {
      // If date is in the past, time slot has passed
      if (dateStr < currentDate) {
        return true;
      }
      
      // If date is today, check if time has passed
      if (dateStr === currentDate) {
        return timeStr <= currentTime;
      }
      
      // If date is in the future, time slot hasn't passed
      return false;
    };

    // Full-day override if declared 24/7
    if (isTwentyFourSeven) {
      const fullDaySlots = generateFullDaySlots();
      // Filter out passed time slots
      const availableSlots = fullDaySlots.filter((time) => {
        if (!selectedDate) return false;
        return !isTimeSlotPassed(selectedDate, time);
      });
      
      console.log('📅 AppointmentScheduler - 24/7 mode (filtered):', {
        fullDaySlots,
        availableSlots,
        bookedSlots: selectedDayAvailability.bookedSlots || [],
        selectedDate,
        currentDate,
        currentTime,
      });
      
      return availableSlots;
    }

    const videoSlots = selectedDayAvailability.videoSlots || [];
    const homeVisitSlots = selectedDayAvailability.homeVisitSlots || [];
    const genericSlots = selectedDayAvailability.timeSlots || [];
    const bookedSlots = selectedDayAvailability.bookedSlots || [];

    // Choose slots by mode
    const slotsByMode =
      mode === "video"
        ? videoSlots.length > 0
          ? videoSlots
          : genericSlots
        : homeVisitSlots.length > 0
          ? homeVisitSlots
          : genericSlots;

    // Filter out passed time slots
    const availableSlots = slotsByMode.filter((time) => {
      if (!selectedDate) return false;
      return !isTimeSlotPassed(selectedDate, time);
    });

    // Return filtered slots (excluding passed times)
    // The booked slots will be filtered out visually using isBooked check in render
    console.log('📅 AppointmentScheduler - Available slots (filtered):', {
      slotsByMode,
      availableSlots,
      bookedSlots,
      selectedDate,
      currentDate,
      currentTime,
      passedSlots: slotsByMode.filter((time) => {
        if (!selectedDate) return false;
        return isTimeSlotPassed(selectedDate, time);
      }),
    });
    
    return availableSlots;
  };

  // Log availability data when component mounts or availability changes
  useEffect(() => {
    console.log('📅 AppointmentScheduler - Full availability array:', JSON.stringify(availability, null, 2));
    console.log('📅 AppointmentScheduler - Availability data:', {
      availability,
      isFollowUp,
      followUpAppointmentId,
      mode,
      selectedDate,
    });
    
    if (selectedDate) {
      const selectedDay = availability.find((day: any) => day.date === selectedDate);
      console.log('📅 AppointmentScheduler - Selected day data (full):', JSON.stringify(selectedDay, null, 2));
      console.log('📅 AppointmentScheduler - Selected day data:', {
        date: selectedDate,
        selectedDay,
        timeSlots: selectedDay?.timeSlots,
        bookedSlots: selectedDay?.bookedSlots,
        allKeys: selectedDay ? Object.keys(selectedDay) : [],
      });
    }
  }, [availability, selectedDate, isFollowUp, followUpAppointmentId, mode]);

  return (
    <View style={styles.container}>
      {/* Working Time Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>სამუშაო საათები</Text>
        <Text style={styles.workingHours}>{workingHours}</Text>
      </View>

      {/* Schedule Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>განრიგი</Text>

        {/* Mode selector pills */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modePill,
              mode === "video" && styles.modePillActiveVideo,
            ]}
            onPress={() => handleModeChange("video")}
            disabled={lockMode && initialMode !== "video"}
          >
            <Ionicons
              name="videocam-outline"
              size={16}
              color={mode === "video" ? "#0EA5E9" : "#4B5563"}
            />
            <Text
              style={[
                styles.modePillText,
                mode === "video" && styles.modePillTextActive,
              ]}
            >
              ვიდეო
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modePill,
              mode === "home-visit" && styles.modePillActiveHome,
            ]}
            onPress={() => handleModeChange("home-visit")}
            disabled={lockMode && initialMode !== "home-visit"}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={mode === "home-visit" ? "#22C55E" : "#4B5563"}
            />
            <Text
              style={[
                styles.modePillText,
                mode === "home-visit" && styles.modePillTextActive,
              ]}
            >
              ბინაზე
            </Text>
          </TouchableOpacity>
        </View>

        {/* Month/Year Selector */}
        <View style={styles.monthSelector}>
          <Text style={styles.monthText}>{currentMonth}</Text>
          <Ionicons name="chevron-down" size={16} color="#666666" />
        </View>

        {/* Day Selection */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayScroll}
          contentContainerStyle={styles.dayContainer}
        >
          {filteredAvailability.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayCard,
                selectedDate === day.date && styles.selectedDayCard,
              ]}
              onPress={() => handleDateSelect(day.date)}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedDate === day.date && styles.selectedDayText,
                ]}
              >
                {day.dayOfWeek}
              </Text>
              <Text
                style={[
                  styles.dateText,
                  selectedDate === day.date && styles.selectedDateText,
                ]}
              >
                {day.date.split("-")[2]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Time Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>დრო</Text>
        <ScrollView
          style={styles.timeGridScroll}
          contentContainerStyle={styles.timeGridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.timeGrid}>
            {getVisibleTimeSlots().map((time) => {
              const isBooked =
                selectedDayAvailability?.bookedSlots?.includes(time) || false;
              const canBook = selectedDate ? canBookTimeSlot(selectedDate, time) : true;
              const isTooSoon = !canBook && !isBooked;
              
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.selectedTimeSlot,
                    isBooked && styles.bookedTimeSlot,
                    isTooSoon && styles.disabledTimeSlot,
                  ]}
                  onPress={() => !isBooked && !isTooSoon && handleTimeSelect(time)}
                  disabled={isBooked || isTooSoon}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === time && styles.selectedTimeText,
                      isBooked && styles.bookedTimeText,
                      isTooSoon && styles.disabledTimeText,
                    ]}
                  >
                    {time}
                  </Text>
                  {isBooked && (
                    <View style={styles.bookedIndicator}>
                      <Ionicons name="lock-closed" size={12} color="#EF4444" />
                    </View>
                  )}
                  {isTooSoon && (
                    <View style={styles.bookedIndicator}>
                      <Ionicons name="time-outline" size={12} color="#F59E0B" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Reviews Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>შეფასებები ({totalReviews})</Text>
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.avatar} />
              <View style={styles.reviewInfo}>
                <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                <Text style={styles.reviewDate}>{review.reviewDate}</Text>
              </View>
            </View>
            <View style={styles.ratingContainer}>
              {[...Array(5)].map((_, index) => (
                <Ionicons key={index} name="star" size={16} color="#FFD700" />
              ))}
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))}
      </View>

      {/* Book Appointment Button */}
      <TouchableOpacity
        style={[
          styles.bookButton,
          (!selectedDate || !selectedTime) && styles.disabledButton,
        ]}
        disabled={!selectedDate || !selectedTime}
        onPress={async () => {
          if (!selectedDate || !selectedTime || !doctorId) return;

          // Validate: booking must be at least 2 hours for video, 12 hours for home-visit
          if (!canBookTimeSlot(selectedDate, selectedTime)) {
            const requiredHours = mode === "video" ? 2 : 12;
            Alert.alert(
              "დრო არ არის ხელმისაწვდომი",
              `ჯავშნის გაკეთება შესაძლებელია მინიმუმ ${requiredHours} საათით ადრე. გთხოვთ აირჩიოთ სხვა დრო.`
            );
            return;
          }

          try {
            // გადამოწმება: ისევ თავისუფალია ეს დრო ამ ტიპისთვის?
            // პაციენტისთვის: forPatient=true, რომ დაჯავშნილი სლოტები ჩანდეს
            const response = await apiService.getDoctorAvailability(doctorId, undefined, true);

            if (!response.success || !response.data) {
              Alert.alert(
                "შეცდომა",
                "ექიმის განრიგის გადამოწმება ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
              );
              return;
            }

            const daysForType = (response.data as any[]).filter(
              (d) => d.date === selectedDate && d.type === mode && d.isAvailable,
            );

            let availableSlots: string[] = daysForType.flatMap(
              (d) => d.timeSlots || [],
            );

            // If backend has no slots but working hours are 24/7, allow full-day selection
            if (
              availableSlots.length === 0 &&
              workingHours?.includes("24")
            ) {
              availableSlots = generateFullDaySlots();
            }

            // Debug log რომ ზუსტად ვნახოთ რა სტატუსია
            console.log("[AppointmentScheduler] availability check", {
              mode,
              selectedDate,
              selectedTime,
              rawData: response.data,
              daysForType,
              availableSlots,
            });

            if (!availableSlots.includes(selectedTime)) {
              Alert.alert(
                "დრო დაკავებულია",
                "არჩეული დრო ძალაში აღარ არის. გთხოვთ აირჩიოთ სხვა დრო.",
              );
              return;
            }

            // If this is a follow-up appointment, schedule it directly
            if (isFollowUp && followUpAppointmentId) {
              try {
                const followUpResponse = await apiService.scheduleFollowUpAppointment(
                  followUpAppointmentId,
                  {
                    date: selectedDate,
                    time: selectedTime,
                    type: mode,
                  },
                  false // isDoctor = false for patient side
                );

                if (followUpResponse.success) {
                  Alert.alert(
                    "წარმატება",
                    "განმეორებითი ვიზიტი წარმატებით დაჯავშნა!",
                    [
                      {
                        text: "კარგი",
                        onPress: () => {
                          router.back();
                        },
                      },
                    ]
                  );
                } else {
                  Alert.alert(
                    "შეცდომა",
                    followUpResponse.message || "განმეორებითი ვიზიტის დაჯავშნა ვერ მოხერხდა"
                  );
                }
              } catch (error: any) {
                console.error("Failed to schedule follow-up appointment:", error);
                Alert.alert(
                  "შეცდომა",
                  error.message || "განმეორებითი ვიზიტის დაჯავშნა ვერ მოხერხდა"
                );
              }
              return;
            }

            // Get doctor info to calculate payment amount
            try {
              const doctorResponse = await apiService.getDoctorById(doctorId);
              
              if (!doctorResponse.success || !doctorResponse.data) {
                Alert.alert(
                  "შეცდომა",
                  "ექიმის ინფორმაციის მიღება ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
                );
                return;
              }

              const doctor = doctorResponse.data;
              
              // Log full doctor object to see what we're getting
              console.log("💰 [AppointmentScheduler] Full doctor object:", JSON.stringify(doctor, null, 2));
              console.log("💰 [AppointmentScheduler] Doctor fee data:", {
                mode,
                consultationFee: doctor.consultationFee,
                videoConsultationFee: doctor.videoConsultationFee,
                homeVisitFee: doctor.homeVisitFee,
                followUpFee: doctor.followUpFee,
                consultationFeeType: typeof doctor.consultationFee,
                videoConsultationFeeType: typeof doctor.videoConsultationFee,
                homeVisitFeeType: typeof doctor.homeVisitFee,
                allDoctorKeys: Object.keys(doctor),
              });
              
              // Determine consultation fee based on appointment type
              let consultationFee = 0;
              
              if (mode === "video") {
                // Prefer videoConsultationFee, fallback to consultationFee
                if (typeof doctor.videoConsultationFee === 'number' && doctor.videoConsultationFee > 0) {
                  consultationFee = doctor.videoConsultationFee;
                  console.log("✅ [AppointmentScheduler] Using videoConsultationFee:", consultationFee);
                } else if (typeof doctor.consultationFee === 'number' && doctor.consultationFee > 0) {
                  consultationFee = doctor.consultationFee;
                  console.log("✅ [AppointmentScheduler] Using consultationFee (fallback):", consultationFee);
                } else {
                  const parsed = parseFloat(String(doctor.videoConsultationFee || doctor.consultationFee || '0').replace(/[^\d.]/g, '')) || 0;
                  consultationFee = parsed;
                  console.log("✅ [AppointmentScheduler] Using parsed fee:", consultationFee);
                }
              } else if (mode === "home-visit") {
                // Prefer homeVisitFee, fallback to consultationFee
                if (typeof doctor.homeVisitFee === 'number' && doctor.homeVisitFee > 0) {
                  consultationFee = doctor.homeVisitFee;
                  console.log("✅ [AppointmentScheduler] Using homeVisitFee:", consultationFee);
                } else if (typeof doctor.consultationFee === 'number' && doctor.consultationFee > 0) {
                  consultationFee = doctor.consultationFee;
                  console.log("✅ [AppointmentScheduler] Using consultationFee (fallback):", consultationFee);
                } else {
                  const parsed = parseFloat(String(doctor.homeVisitFee || doctor.consultationFee || '0').replace(/[^\d.]/g, '')) || 0;
                  consultationFee = parsed;
                  console.log("✅ [AppointmentScheduler] Using parsed fee:", consultationFee);
                }
              } else {
                // Default to consultationFee
                if (typeof doctor.consultationFee === 'number' && doctor.consultationFee > 0) {
                  consultationFee = doctor.consultationFee;
                  console.log("✅ [AppointmentScheduler] Using consultationFee:", consultationFee);
                } else {
                  const parsed = parseFloat(String(doctor.consultationFee || '0').replace(/[^\d.]/g, '')) || 0;
                  consultationFee = parsed;
                  console.log("✅ [AppointmentScheduler] Using parsed fee:", consultationFee);
                }
              }
              
              console.log("💰 [AppointmentScheduler] Final consultation fee:", consultationFee);
              
              // If still 0, use default fee
              if (consultationFee === 0 || isNaN(consultationFee)) {
                console.warn("⚠️ [AppointmentScheduler] Consultation fee is 0 or undefined, using default fee");
                consultationFee = 10; // Default consultation fee in GEL
              }
              
              const vat = Math.round(consultationFee * 0.05);
              const totalAmount = consultationFee + vat;

              console.log("💰 [AppointmentScheduler] Payment calculation:", {
                consultationFee,
                vat,
                totalAmount,
                mode,
              });

              // ჯავშნის გაკეთება -> make-appointment (პრობლემის აღწერა, ფაილი) -> patient-details -> payment
              router.push({
                pathname: "/screens/appointment/make-appointment",
                params: {
                  doctorId: doctorId || "",
                  selectedDate,
                  selectedTime,
                  appointmentType: mode,
                  paymentMethod: "visa",
                },
              });
            } catch (doctorError) {
              console.error("Failed to get doctor info:", doctorError);
              Alert.alert(
                "შეცდომა",
                "ექიმის ინფორმაციის მიღება ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
              );
            }
          } catch (error) {
            console.error("Failed to validate availability before booking", error);
            Alert.alert(
              "შეცდომა",
              "ვერ მოხერხდა დროის გადამოწმება. გთხოვთ სცადოთ თავიდან.",
            );
          }
        }}
      >
        <Text style={styles.bookButtonText}>ჯავშნის გაკეთება</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  section: {
    backgroundColor: "#FFFFFF",
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  modePillActiveVideo: {
    backgroundColor: "#E0F2FE",
  },
  modePillActiveHome: {
    backgroundColor: "#DCFCE7",
  },
  modePillText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  modePillTextActive: {
    color: "#0F172A",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 12,
  },
  workingHours: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  monthText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#333333",
    marginRight: 8,
  },
  dayScroll: {
    marginHorizontal: -20,
  },
  dayContainer: {
    paddingHorizontal: 20,
  },
  dayCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
    minWidth: 60,
  },
  selectedDayCard: {
    backgroundColor: "#06B6D4",
  },
  dayText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#666666",
    marginBottom: 4,
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
  dateText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  selectedDateText: {
    color: "#FFFFFF",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeGridScroll: {
    maxHeight: 320,
  },
  timeGridContainer: {
    paddingBottom: 8,
  },
  timeSlot: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: "center",
  },
  selectedTimeSlot: {
    backgroundColor: "#06B6D4",
  },
  timeText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#666666",
  },
  selectedTimeText: {
    color: "#FFFFFF",
  },
  bookedTimeSlot: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    opacity: 0.6,
  },
  bookedTimeText: {
    color: "#EF4444",
    textDecorationLine: "line-through",
  },
  disabledTimeSlot: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    opacity: 0.7,
  },
  disabledTimeText: {
    color: "#F59E0B",
  },
  bookedIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  reviewCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E5E5",
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    lineHeight: 20,
  },
  bookButton: {
    backgroundColor: "#06B6D4",
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  bookButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default AppointmentScheduler;
