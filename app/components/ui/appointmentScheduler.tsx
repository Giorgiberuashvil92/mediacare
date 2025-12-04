import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
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
  bookedSlots?: string[]; // დაჯავშნული დროები
  isAvailable: boolean;
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
}

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  workingHours,
  availability,
  totalReviews,
  reviews,
  doctorId,
}) => {
  const [mode, setMode] = useState<"video" | "home-visit">("video");
  const [selectedDate, setSelectedDate] = useState<string>(
    availability[0]?.date || "",
  );
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Dynamic month/year based on selected date
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
  const filteredAvailability: DayAvailability[] = availability.filter((day) => {
    if (mode === "video") {
      return (day.videoSlots && day.videoSlots.length > 0) || day.timeSlots.length > 0;
    }
    // home-visit
    return day.homeVisitSlots && day.homeVisitSlots.length > 0;
  });

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

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const selectedDayAvailability = filteredAvailability.find(
    (day) => day.date === selectedDate
  );

  const getVisibleTimeSlots = () => {
    if (!selectedDayAvailability) return [];
    if (mode === "video" && selectedDayAvailability.videoSlots) {
      return selectedDayAvailability.videoSlots;
    }
    if (mode === "home-visit" && selectedDayAvailability.homeVisitSlots) {
      return selectedDayAvailability.homeVisitSlots;
    }
    return selectedDayAvailability.timeSlots || [];
  };

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
            onPress={() => {
              setMode("video");
              setSelectedTime("");
            }}
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
            onPress={() => {
              setMode("home-visit");
              setSelectedTime("");
            }}
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
        <View style={styles.timeGrid}>
          {getVisibleTimeSlots().map((time) => {
            const isBooked =
              selectedDayAvailability?.bookedSlots?.includes(time) || false;
            return (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  selectedTime === time && styles.selectedTimeSlot,
                  isBooked && styles.bookedTimeSlot,
                ]}
                onPress={() => !isBooked && handleTimeSelect(time)}
                disabled={isBooked}
              >
                <Text
                  style={[
                    styles.timeText,
                    selectedTime === time && styles.selectedTimeText,
                    isBooked && styles.bookedTimeText,
                  ]}
                >
                  {time}
                </Text>
                {isBooked && (
                  <View style={styles.bookedIndicator}>
                    <Ionicons name="lock-closed" size={12} color="#EF4444" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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

          try {
            // გადამოწმება: ისევ თავისუფალია ეს დრო ამ ტიპისთვის?
            const response = await apiService.getDoctorAvailability(doctorId);

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

            const availableSlots: string[] = daysForType.flatMap(
              (d) => d.timeSlots || [],
            );

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

            router.push({
              pathname: "/screens/appointment/make-appointment",
              params: {
                doctorId,
                selectedDate,
                selectedTime,
                appointmentType: mode,
              },
            });
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
