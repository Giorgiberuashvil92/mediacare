import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AppointmentSuccess = () => {
  const params = useLocalSearchParams();
  const {
    doctorId,
    appointmentId,
    selectedDate,
    selectedTime,
    paymentMethod,
    patientName,
    problem,
    appointmentNumber,
  } = params;

  const handleBackToHome = () => {
    router.replace("/(tabs)");
  };

  const handleViewDetails = () => {
    // Navigate to appointment details with all available params
    // Use appointmentId (MongoDB ObjectId) if available, otherwise use appointmentNumber
    router.push({
      pathname: "/screens/appointment/appointment-details",
      params: {
        doctorId: doctorId as string,
        appointmentId: (appointmentId as string) || (appointmentNumber as string) || "",
        selectedDate: selectedDate as string,
        selectedTime: selectedTime as string,
        paymentMethod: paymentMethod as string,
        patientName: patientName as string,
        problem: problem as string,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={60} color="#FFFFFF" />
          </View>
          <View style={styles.ripple1} />
          <View style={styles.ripple2} />
          <View style={styles.ripple3} />
        </View>

        {/* Success Text */}
        <Text style={styles.successTitle}>ჯავშანი წარმატებით დაჯავშნა!</Text>
        <Text style={styles.successMessage}>
          თქვენი ჯავშანი წარმატებით დაჯავშნა. დეტალები შეგიძლიათ ნახოთ ჯავშნების ჩანართში.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.secondaryButtonText}>მთავარზე დაბრუნება</Text>
          </TouchableOpacity>

       
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  successIconContainer: {
    position: "relative",
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 4,
  },
  ripple1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(76, 175, 80, 0.3)",
    zIndex: 3,
  },
  ripple2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    zIndex: 2,
  },
  ripple3: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    zIndex: 1,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    textAlign: "center",
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 60,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default AppointmentSuccess;
