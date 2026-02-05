import { apiService, AppointmentType } from "@/app/_services/api";
import { useAuth } from "@/app/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const PaymentMethods = () => {
  const { user } = useAuth();
  const {
    doctorId,
    selectedDate,
    selectedTime,
    amount,
    consultationFee,
    appointmentType,
    visitAddress,
    problemDescription,
    uploadedFile,
  } = useLocalSearchParams();
  const [selectedMethod, setSelectedMethod] = useState<string>("card");
  const [loading, setLoading] = useState(false);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "card",
      name: "საბანკო ბარათი",
      icon: "card-outline",
      color: "#0EA5E9",
    },

  ];

  const totalAmount = amount ? parseFloat(amount as string) : 0;
  const consultationFeeAmount = consultationFee
    ? parseFloat(consultationFee as string)
    : totalAmount / 1.05;
  const vatAmount = Math.round(consultationFeeAmount * 0.05);

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handlePayNow = async () => {
    if (!user) {
      Alert.alert("შეცდომა", "გთხოვთ შეხვიდეთ სისტემაში");
      return;
    }

    try {
      setLoading(true);

      // Validate required fields
      if (!doctorId || !selectedDate || !selectedTime || !amount) {
        Alert.alert("შეცდომა", "დაკარგულია საჭირო ინფორმაცია");
        return;
      }

      const fee = consultationFee
        ? parseFloat(consultationFee as string)
        : parseFloat(amount as string) / 1.05;
      const total = parseFloat(amount as string);

      // Create appointment via API
      const appointmentPayload = {
        doctorId: doctorId as string,
        appointmentDate: selectedDate as string,
        appointmentTime: selectedTime as string,
        type: (appointmentType as AppointmentType) || "video",
        consultationFee: fee,
        totalAmount: total,
        paymentMethod: selectedMethod,
        paymentStatus: "paid", // Payment is completed
        patientDetails: {
          // User info is already in the system from registration
          problem: problemDescription as string || "",
        },
        documents: [], // Documents will be uploaded after appointment creation
        notes: problemDescription as string || "",
        visitAddress:
          appointmentType === "home-visit" && visitAddress
            ? (visitAddress as string)
            : undefined,
      };

      console.log("💳 Creating appointment after payment:", appointmentPayload);

      const response = await apiService.createAppointment(appointmentPayload);

      if (!response.success) {
        Alert.alert("შეცდომა", response.message || "ჯავშნის შექმნა ვერ მოხერხდა");
        setLoading(false);
        return;
      }

      const appointmentId = response.data?._id || response.data?.id || "";

      if (!appointmentId) {
        Alert.alert("შეცდომა", "ჯავშნის ID ვერ მოიძებნა");
        setLoading(false);
        return;
      }

      // Upload document if one was selected
      if (uploadedFile) {
        try {
          const fileData = JSON.parse(uploadedFile as string);
          if (fileData.uri && fileData.name && fileData.type) {
            await apiService.uploadAppointmentDocument(appointmentId, {
              uri: fileData.uri,
              name: fileData.name,
              type: fileData.type,
            });
            console.log("✅ Document uploaded successfully");
          }
        } catch (uploadErr: any) {
          console.error("❌ Error uploading document:", uploadErr);
          // Don't fail the appointment if document upload fails
          Alert.alert(
            "გაფრთხილება",
            "ჯავშანი შეიქმნა, მაგრამ დოკუმენტის ატვირთვა ვერ მოხერხდა. შეგიძლიათ დოკუმენტი მოგვიანებით ატვირთოთ."
          );
        }
      }

      // Navigate to success page
      router.push({
        pathname: "/screens/appointment/appointment-success",
        params: {
          doctorId: doctorId as string,
          appointmentId: appointmentId,
          selectedDate: selectedDate as string,
          selectedTime: selectedTime as string,
          paymentMethod: selectedMethod,
          patientName: user.name || "",
          problem: problemDescription as string || "",
          appointmentNumber: response.data?.appointmentNumber || "",
        },
      });
    } catch (error: any) {
      console.error("Error processing payment:", error);
      Alert.alert(
        "შეცდომა",
        error.message || "გადახდის დამუშავება ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>გადახდა</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>გადახდის დეტალები</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>კონსულტაციის საფასური</Text>
            <Text style={styles.summaryValue}>{consultationFeeAmount} ₾</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{vatAmount} ₾</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>საერთო თანხა</Text>
            <Text style={styles.totalValue}>{totalAmount} ₾</Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>გადახდის მეთოდი</Text>
          <Text style={styles.sectionSubtitle}>
            აირჩიეთ თქვენთვის მოსახერხებელი გადახდის მეთოდი
          </Text>

          <View style={styles.paymentMethodsList}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedMethod === method.id && styles.paymentMethodCardActive,
                ]}
                onPress={() => handlePaymentMethodSelect(method.id)}
              >
                <View style={styles.paymentMethodLeft}>
                  <View
                    style={[
                      styles.paymentIcon,
                      selectedMethod === method.id && {
                        backgroundColor: method.color,
                      },
                      selectedMethod !== method.id && {
                        backgroundColor: "#F3F4F6",
                      },
                    ]}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={24}
                      color={
                        selectedMethod === method.id ? "#FFFFFF" : "#6B7280"
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.paymentMethodName,
                      selectedMethod === method.id &&
                        styles.paymentMethodNameActive,
                    ]}
                  >
                    {method.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedMethod === method.id &&
                      styles.radioButtonActive,
                  ]}
                >
                  {selectedMethod === method.id && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.securityCard}>
          <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
          <Text style={styles.securityText}>
            ყველა გადახდა დაცულია და დაშიფრულია. თქვენი მონაცემები უსაფრთხოა.
          </Text>
        </View>
      </ScrollView>

      {/* Pay Now Button */}
      <View style={styles.buttonContainer}>
        <View style={styles.amountDisplay}>
          <Text style={styles.amountLabel}>გადასახდელი თანხა</Text>
          <Text style={styles.amountValue}>{totalAmount} ₾</Text>
        </View>
        <TouchableOpacity
          style={[styles.payNowButton, loading && styles.payNowButtonDisabled]}
          onPress={handlePayNow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.payNowButtonText}>გადახდა</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#0EA5E9",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 16,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentMethodCardActive: {
    borderColor: "#0EA5E9",
    backgroundColor: "#F0F9FF",
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  paymentMethodNameActive: {
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonActive: {
    borderColor: "#0EA5E9",
  },
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0EA5E9",
  },
  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#166534",
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  amountDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  amountValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
  },
  payNowButton: {
    backgroundColor: "#22C55E",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 4,
  },
  payNowButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  payNowButtonDisabled: {
    opacity: 0.6,
  },
});

export default PaymentMethods;
