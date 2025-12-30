import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppointmentWaitingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId: string;
    doctorName: string;
    date: string;
    time: string;
    timeRemaining: string;
  }>();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState(params.timeRemaining || "");

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      updateTimeRemaining();
    }, 60000); // Update every minute

    updateTimeRemaining();
    return () => clearInterval(interval);
  }, []);

  const updateTimeRemaining = () => {
    if (!params.date || !params.time) return;

    const appointmentDateTime = new Date(`${params.date}T${params.time}`);
    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    if (diff < 0) {
      setTimeRemaining("დრო გავიდა");
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      setTimeRemaining(`${days} დღე ${hours % 24} საათი`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours} საათი ${minutes} წუთი`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes} წუთი`);
    } else {
      setTimeRemaining("ნაკლები წუთი");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>კონსულტაციის მოლოდინი</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={64} color="#06B6D4" />
          </View>
        </View>

        <Text style={styles.title}>კონსულტაცია ჯერ არ არის მოსული</Text>
        <Text style={styles.subtitle}>
          კონსულტაციაზე შესვლა შესაძლებელია 5 წუთით ადრე
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>ექიმი:</Text>
            <Text style={styles.infoValue}>{params.doctorName || "ექიმი"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>თარიღი:</Text>
            <Text style={styles.infoValue}>
              {formatDate(params.date)} {params.time}
            </Text>
          </View>
        </View>

        <View style={styles.timeRemainingCard}>
          <Text style={styles.timeRemainingLabel}>დარჩენილი დრო:</Text>
          <Text style={styles.timeRemainingValue}>{timeRemaining}</Text>
        </View>

        <TouchableOpacity
          style={styles.backButtonLarge}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>უკან დაბრუნება</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 40,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    minWidth: 60,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  timeRemainingCard: {
    backgroundColor: "#06B6D4",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
    marginBottom: 32,
  },
  timeRemainingLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 8,
  },
  timeRemainingValue: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  backButtonLarge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "100%",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
});

