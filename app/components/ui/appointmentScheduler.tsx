import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
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
  onTimeSlotBlocked?: () => void; // Callback after blocking time slot
}

// Function to temporarily block a time slot
const blockTimeSlot = async (doctorId: string, date: string, time: string) => {
  try {
    const response = await apiService.blockTimeSlot({
      doctorId,
      date,
      time,
    });
    return response;
  } catch (error) {
    console.error('Error blocking time slot:', error);
    throw error;
  }
};

const AppointmentScheduler: React.FC<AppointmentSchedulerProps> = ({
  workingHours,
  availability,
  totalReviews,
  reviews,
  doctorId,
  onTimeSlotBlocked,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    availability[0]?.date || ""
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

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time selection when date changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const selectedDayAvailability = availability.find(
    (day) => day.date === selectedDate
  );

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
          {availability.map((day) => (
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
          {selectedDayAvailability?.timeSlots.map((time) => {
            const isBooked = selectedDayAvailability?.bookedSlots?.includes(time) || false;
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
          if (selectedDate && selectedTime && doctorId) {
            try {
              // Block the time slot temporarily before navigating
              await blockTimeSlot(doctorId, selectedDate, selectedTime);
              
              // Call callback to refresh doctor data
              if (onTimeSlotBlocked) {
                onTimeSlotBlocked();
              }
              
              router.push({
                pathname: "/screens/appointment/make-appointment",
                params: {
                  doctorId: doctorId,
                  selectedDate: selectedDate,
                  selectedTime: selectedTime,
                },
              });
            } catch (error) {
              console.error('Failed to block time slot:', error);
              // Still navigate even if blocking fails
              router.push({
                pathname: "/screens/appointment/make-appointment",
                params: {
                  doctorId: doctorId,
                  selectedDate: selectedDate,
                  selectedTime: selectedTime,
                },
              });
            }
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
