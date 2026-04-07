import { apiService, AppointmentType } from "@/app/_services/api";
import { useAuth } from "@/app/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView, { WebViewNavigation } from "react-native-webview";

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

  // ლოგი: payment-მა რა params მიიღო make-appointment-დან
  console.log("📥 [payment-methods] მიღებული params:", {
    doctorId,
    selectedDate,
    selectedTime,
    appointmentType,
    uploadedFileType: typeof uploadedFile,
    uploadedFileLength: (uploadedFile as string)?.length ?? 0,
    uploadedFilePreview: (uploadedFile as string)?.slice(0, 150) ?? "",
  });

  const [selectedMethod, setSelectedMethod] = useState<string>("card");
  const [loading, setLoading] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [paymentOrderId, setPaymentOrderId] = useState<string>("");

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
        setLoading(false);
        return;
      }

      const total = parseFloat(amount as string);
      const fee = consultationFee
        ? parseFloat(consultationFee as string)
        : total / 1.05;

      // Generate unique order ID (external_order_id for BOG)
      const externalOrderId = `MEDEKSES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create BOG payment order
      console.log("💳 [Payment] Creating BOG payment order:", {
        amount: total,
        externalOrderId,
        description: `კონსულტაცია - ${selectedDate} ${selectedTime}`,
      });

      // Get base URL for callback
      const baseUrl =
        process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
      const callbackUrl = `${baseUrl}/payment/callback`;

      const paymentResponse = await apiService.createPaymentOrder({
        amount: total,
        currency: "GEL",
        orderId: externalOrderId,
        description: `კონსულტაცია - ${selectedDate} ${selectedTime}`,
        callbackUrl: callbackUrl,
        captureMethod: "AUTO",
      });

      if (!paymentResponse.success || !paymentResponse.paymentUrl) {
        Alert.alert(
          "შეცდომა",
          paymentResponse.error ||
            "გადახდის შექმნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
        );
        setLoading(false);
        return;
      }

      // paymentResponse.orderId is BOG's order ID (UUID), which we need for status checks
      const bogOrderId = paymentResponse.orderId;
      if (bogOrderId) {
        setPaymentOrderId(bogOrderId);
      }

      console.log("✅ [Payment] Payment order created:", {
        externalOrderId,
        bogOrderId: paymentResponse.orderId,
        paymentUrl: paymentResponse.paymentUrl,
      });

      // Open payment URL in WebView
      setPaymentUrl(paymentResponse.paymentUrl);
      setShowPaymentWebView(true);
      setLoading(false);
    } catch (error: any) {
      console.error("❌ [Payment] Error creating payment order:", error);
      Alert.alert(
        "შეცდომა",
        error.message ||
          "გადახდის დამუშავება ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
      );
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      setLoading(true);
      setShowPaymentWebView(false);

      // Wait a bit for BOG to process the payment
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check payment status
      const statusResponse = await apiService.getPaymentStatus(paymentOrderId);

      // BOG API returns status as "completed" for successful payments
      const isPaymentSuccessful =
        statusResponse.status === "SUCCESS" ||
        statusResponse.status === "PAID" ||
        statusResponse.status === "completed" ||
        statusResponse.status?.toLowerCase() === "completed";

      if (!statusResponse.success || !isPaymentSuccessful) {
        Alert.alert(
          "შეცდომა",
          "გადახდის დადასტურება ვერ მოხერხდა. გთხოვთ დაელოდოთ ან დაგვიკავშირდეთ.",
        );
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!doctorId || !selectedDate || !selectedTime || !amount) {
        Alert.alert("შეცდომა", "დაკარგულია საჭირო ინფორმაცია");
        setLoading(false);
        return;
      }

      const total = parseFloat(amount as string);
      const fee = consultationFee
        ? parseFloat(consultationFee as string)
        : total / 1.05;

      // Create appointment via API
      const appointmentPayload = {
        doctorId: doctorId as string,
        appointmentDate: selectedDate as string,
        appointmentTime: selectedTime as string,
        type: (appointmentType as AppointmentType) || "video",
        consultationFee: fee,
        totalAmount: total,
        paymentMethod: "bog_card",
        paymentStatus: "paid",
        paymentOrderId: paymentOrderId,
        patientDetails: {
          problem: (problemDescription as string) || "",
        },
        documents: [],
        notes: (problemDescription as string) || "",
        visitAddress:
          appointmentType === "home-visit" && visitAddress
            ? (visitAddress as string)
            : undefined,
      };

      console.log(
        "💳 [Payment] Creating appointment after payment:",
        appointmentPayload,
      );

      const response = await apiService.createAppointment(appointmentPayload);

      if (!response.success) {
        Alert.alert(
          "შეცდომა",
          response.message || "ჯავშნის შექმნა ვერ მოხერხდა",
        );
        setLoading(false);
        return;
      }

      const appointmentId = response.data?._id || response.data?.id || "";

      if (!appointmentId) {
        Alert.alert("შეცდომა", "ჯავშნის ID ვერ მოიძებნა");
        setLoading(false);
        return;
      }

      // Upload documents (one or multiple)
      if (uploadedFile) {
        try {
          const parsed = JSON.parse(uploadedFile as string);
          const files = Array.isArray(parsed) ? parsed : [parsed];
          console.log("📤 [payment-methods] დოკუმენტების ატვირთვა:", {
            appointmentId,
            parsedIsArray: Array.isArray(parsed),
            filesCount: files.length,
            files: files.map((f: any) => ({
              name: f?.name,
              type: f?.type,
              hasUri: !!f?.uri,
            })),
          });
          for (let i = 0; i < files.length; i++) {
            const fileData = files[i];
            if (fileData?.uri && fileData?.name && fileData?.type) {
              console.log(
                `📤 [payment-methods] ატვირთვა ${i + 1}/${files.length}:`,
                fileData.name,
              );
              const uploadRes = await apiService.uploadAppointmentDocument(
                appointmentId,
                {
                  uri: fileData.uri,
                  name: fileData.name,
                  type: fileData.type,
                },
              );
              console.log(
                `✅ [payment-methods] ატვირთული ${i + 1}:`,
                uploadRes?.success,
                uploadRes?.data,
              );
            } else {
              console.warn(
                `⚠️ [payment-methods] ფაილი ${i + 1} გამოტოვებული (არასრული):`,
                fileData,
              );
            }
          }
          if (files.length > 0) {
            console.log(
              `✅ [payment-methods] სულ ${files.length} დოკუმენტის ატვირთვა დასრულებული`,
            );
          }
        } catch (uploadErr: any) {
          console.error(
            "❌ [payment-methods] დოკუმენტის ატვირთვის შეცდომა:",
            uploadErr,
          );
          Alert.alert(
            "გაფრთხილება",
            "ჯავშანი შეიქმნა, მაგრამ დოკუმენტის ატვირთვა ვერ მოხერხდა. შეგიძლიათ დოკუმენტი მოგვიანებით ატვირთოთ.",
          );
        }
      } else {
        console.log(
          "📥 [payment-methods] uploadedFile params არ არის — დოკუმენტი არ იტვირთება",
        );
      }

      // Navigate to success page
      router.push({
        pathname: "/screens/appointment/appointment-success",
        params: {
          doctorId: doctorId as string,
          appointmentId: appointmentId,
          selectedDate: selectedDate as string,
          selectedTime: selectedTime as string,
          paymentMethod: "bog_card",
          patientName: user?.name || "",
          problem: (problemDescription as string) || "",
          appointmentNumber: response.data?.appointmentNumber || "",
        },
      });
    } catch (error: any) {
      console.error("❌ [Payment] Error processing payment success:", error);
      Alert.alert(
        "შეცდომა",
        error.message ||
          "გადახდის დამუშავება ვერ მოხერხდა. გთხოვთ დაგვიკავშირდეთ.",
      );
    } finally {
      setLoading(false);
    }
  };

  // დროებით: გადახდის გარეშე ჯავშნის შექმნა
  const handleBookWithoutPayment = async () => {
    if (!user) {
      Alert.alert("შეცდომა", "გთხოვთ შეხვიდეთ სისტემაში");
      return;
    }

    try {
      setLoading(true);

      // Validate required fields
      if (!doctorId || !selectedDate || !selectedTime || !amount) {
        Alert.alert("შეცდომა", "დაკარგულია საჭირო ინფორმაცია");
        setLoading(false);
        return;
      }

      const total = parseFloat(amount as string);
      const fee = consultationFee
        ? parseFloat(consultationFee as string)
        : total / 1.05;

      // Create appointment without payment
      const appointmentPayload = {
        doctorId: doctorId as string,
        appointmentDate: selectedDate as string,
        appointmentTime: selectedTime as string,
        type: (appointmentType as AppointmentType) || "video",
        consultationFee: fee,
        totalAmount: total,
        paymentMethod: "pending",
        paymentStatus: "pending",
        patientDetails: {
          problem: (problemDescription as string) || "",
        },
        documents: [],
        notes: (problemDescription as string) || "",
        visitAddress:
          appointmentType === "home-visit" && visitAddress
            ? (visitAddress as string)
            : undefined,
      };

      console.log(
        "📅 [Payment] Creating appointment without payment:",
        appointmentPayload,
      );

      const response = await apiService.createAppointment(appointmentPayload);

      if (!response.success) {
        Alert.alert(
          "შეცდომა",
          response.message || "ჯავშნის შექმნა ვერ მოხერხდა",
        );
        setLoading(false);
        return;
      }

      const appointmentId = response.data?._id || response.data?.id || "";

      if (!appointmentId) {
        Alert.alert("შეცდომა", "ჯავშნის ID ვერ მოიძებნა");
        setLoading(false);
        return;
      }

      // Upload documents (one or multiple) — გადახდის გარეშე ფლოუ
      if (uploadedFile) {
        try {
          const parsed = JSON.parse(uploadedFile as string);
          const files = Array.isArray(parsed) ? parsed : [parsed];
          console.log("📤 [payment-methods] (free) დოკუმენტების ატვირთვა:", {
            appointmentId,
            filesCount: files.length,
            files: files.map((f: any) => ({
              name: f?.name,
              type: f?.type,
              hasUri: !!f?.uri,
            })),
          });
          for (const fileData of files) {
            if (fileData?.uri && fileData?.name && fileData?.type) {
              await apiService.uploadAppointmentDocument(appointmentId, {
                uri: fileData.uri,
                name: fileData.name,
                type: fileData.type,
              });
            }
          }
          if (files.length > 0) {
            console.log(
              `✅ [payment-methods] (free) ${files.length} document(s) uploaded`,
            );
          }
        } catch (uploadErr: any) {
          console.error(
            "❌ [payment-methods] (free) დოკუმენტის ატვირთვის შეცდომა:",
            uploadErr,
          );
          Alert.alert(
            "გაფრთხილება",
            "ჯავშანი შეიქმნა, მაგრამ დოკუმენტის ატვირთვა ვერ მოხერხდა. შეგიძლიათ დოკუმენტი მოგვიანებით ატვირთოთ.",
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
          paymentMethod: "pending",
          patientName: user?.name || "",
          problem: (problemDescription as string) || "",
          appointmentNumber: response.data?.appointmentNumber || "",
        },
      });
    } catch (error: any) {
      console.error(
        "❌ [Payment] Error creating appointment without payment:",
        error,
      );
      Alert.alert(
        "შეცდომა",
        error.message || "ჯავშნის შექმნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewNavigation = (navState: WebViewNavigation): void => {
    const url = navState.url;
    console.log("🌐 [Payment] WebView navigation:", url);

    // Check if payment was successful
    if (
      url.includes("success") ||
      url.includes("callback") ||
      url.includes("paid")
    ) {
      console.log("✅ [Payment] Payment success detected");
      handlePaymentSuccess();
    } else if (
      url.includes("cancel") ||
      url.includes("error") ||
      url.includes("fail")
    ) {
      console.log("❌ [Payment] Payment cancelled or failed");
      setShowPaymentWebView(false);
      Alert.alert(
        "გადახდა გაუქმდა",
        "გადახდა გაუქმდა ან ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.",
      );
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
                  selectedMethod === method.id &&
                    styles.paymentMethodCardActive,
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
                    selectedMethod === method.id && styles.radioButtonActive,
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

        {/* დროებით: გადახდის გარეშე ჯავშნის გაკეთების ღილაკი */}
        <TouchableOpacity
          style={[
            styles.bookWithoutPaymentButton,
            loading && styles.bookWithoutPaymentButtonDisabled,
          ]}
          onPress={handleBookWithoutPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0EA5E9" />
          ) : (
            <>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#0EA5E9"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.bookWithoutPaymentButtonText}>
                გადახდის გარეშე ჯავშნის გაკეთება
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payNowButton, loading && styles.payNowButtonDisabled]}
          onPress={handlePayNow}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="lock-closed"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.payNowButtonText}>გადახდა</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* BOG Payment WebView Modal */}
      <Modal
        visible={showPaymentWebView}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPaymentWebView(false);
          Alert.alert("გადახდა გაუქმდა", "გადახდის პროცესი გაუქმდა.");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <SafeAreaView style={styles.webViewContainer}>
              <View style={styles.webViewHeader}>
                <Text style={styles.webViewTitle}>BOG გადახდა</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowPaymentWebView(false);
                    Alert.alert("გადახდა გაუქმდა", "გადახდის პროცესი გაუქმდა.");
                  }}
                  style={styles.webViewCloseButton}
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              {paymentUrl ? (
                <WebView
                  source={{ uri: paymentUrl }}
                  style={styles.webView}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  onNavigationStateChange={handleWebViewNavigation}
                  onError={(syntheticEvent: any) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error("❌ [Payment] WebView error:", nativeEvent);
                    Alert.alert(
                      "შეცდომა",
                      "გადახდის გვერდის ჩატვირთვა ვერ მოხერხდა.",
                    );
                  }}
                />
              ) : (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color="#0EA5E9" />
                  <Text style={styles.webViewLoadingText}>იტვირთება...</Text>
                </View>
              )}
            </SafeAreaView>
          </View>
        </View>
      </Modal>
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
  bookWithoutPaymentButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0EA5E9",
    marginBottom: 12,
  },
  bookWithoutPaymentButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#0EA5E9",
  },
  bookWithoutPaymentButtonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    height: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  webViewTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  webViewCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  webViewLoadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
});

export default PaymentMethods;
