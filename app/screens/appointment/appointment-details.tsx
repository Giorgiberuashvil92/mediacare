import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Helper function to map backend doctor to app format
const mapDoctorFromAPI = (doctor: any, apiBaseUrl: string) => {
  let imageSource;
  if (doctor.profileImage) {
    if (doctor.profileImage.startsWith("http")) {
      imageSource = { uri: doctor.profileImage };
    } else {
      imageSource = { uri: `${apiBaseUrl}/${doctor.profileImage}` };
    }
  } else {
    imageSource = require("@/assets/images/doctors/doctor1.png");
  }

  return {
    id: doctor.id,
    name: doctor.name || "",
    specialization: doctor.specialization || "",
    rating: doctor.rating || 0,
    reviewCount: doctor.reviewCount || 0,
    image: imageSource,
    degrees: doctor.degrees || "",
    consultationFee: doctor.consultationFee || 0,
  };
};

const AppointmentDetails = () => {
  const {
    doctorId,
    appointmentId,
    selectedDate,
    selectedTime,
    paymentMethod,
    patientName,
    problem,
  } = useLocalSearchParams();
  const [doctor, setDoctor] = useState<any>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<
    { url: string; name?: string; type?: string; uploadedAt?: string; isExternalLabResult?: boolean }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingLabResult, setUploadingLabResult] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId, appointmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled. Please disable USE_MOCK_API.",
        );
      }

      // Load doctor
      if (doctorId) {
        const doctorResponse = await apiService.getDoctorById(doctorId as string);
        if (doctorResponse.success && doctorResponse.data) {
          const apiBaseUrl = apiService.getBaseURL();
          const mappedDoctor = mapDoctorFromAPI(doctorResponse.data, apiBaseUrl);
          setDoctor(mappedDoctor);
        }
      }

      // Load appointment details if appointmentId is provided
      if (appointmentId) {
        const appointmentResponse = await apiService.getAppointmentById(
          appointmentId as string
        );
        if (appointmentResponse.success && appointmentResponse.data) {
          setAppointment(appointmentResponse.data);
        }

        const docsResponse = await apiService.getAppointmentDocuments(
          appointmentId as string
        );
        if (docsResponse.success && docsResponse.data) {
          setDocuments(docsResponse.data);
        }
      }
    } catch (err: any) {
      setError(err.message || "მონაცემების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!appointmentId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;

      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert("შეცდომა", "ფაილი უნდა იყოს 5MB-მდე");
        return;
      }

      setUploading(true);
      const uploadResp = await apiService.uploadAppointmentDocument(
        appointmentId as string,
        {
          uri: file.uri,
          name: file.name || "document",
          type: file.mimeType || "application/pdf",
        }
      );

      if (uploadResp.success && uploadResp.data) {
        setDocuments((prev) => [uploadResp.data, ...prev]);
        Alert.alert("წარმატება", "ფაილი აიტვირთა");
      } else {
        Alert.alert("შეცდომა", uploadResp?.message || "ატვირთვა ვერ მოხერხდა");
      }
    } catch (err: any) {
      console.error("Document upload error:", err);
      Alert.alert("შეცდომა", err?.message || "ფაილის ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadExternalLabResult = async () => {
    if (!appointmentId) return;
    
    Alert.prompt(
      "კვლევის სახელი",
      "შეიყვანეთ კვლევის დასახელება (არასავალდებულო)",
      [
        { text: "გაუქმება", style: "cancel" },
        {
          text: "ატვირთვა",
          onPress: async (testName?: string) => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"],
                copyToCacheDirectory: true,
              });

              if (result.canceled) return;
              const file = result.assets?.[0];
              if (!file) return;

              if (file.size && file.size > 10 * 1024 * 1024) {
                Alert.alert("შეცდომა", "ფაილი უნდა იყოს 10MB-მდე");
                return;
              }

              setUploadingLabResult(true);
              const uploadResp = await apiService.uploadExternalLabResult(
                appointmentId as string,
                {
                  uri: file.uri,
                  name: file.name || "lab-result",
                  type: file.mimeType || "application/pdf",
                },
                testName
              );

              if (uploadResp.success && uploadResp.data) {
                setDocuments((prev) => [uploadResp.data as any, ...prev]);
                Alert.alert("წარმატება", "ლაბორატორიული შედეგი აიტვირთა");
              } else {
                Alert.alert("შეცდომა", uploadResp?.message || "ატვირთვა ვერ მოხერხდა");
              }
            } catch (err: any) {
              console.error("Lab result upload error:", err);
              Alert.alert("შეცდომა", err?.message || "ფაილის ატვირთვა ვერ მოხერხდა");
            } finally {
              setUploadingLabResult(false);
            }
          },
        },
      ],
      "plain-text",
      ""
    );
  };

  const openDocument = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert("შეცდომა", "ფაილის გახსნა ვერ მოხერხდა")
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20BEB8" />
          <Text style={styles.loadingText}>მონაცემების ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor || error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "ექიმი არ მოიძებნა"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Use appointment data if available, otherwise use params
  const appointmentDate = appointment?.appointmentDate || selectedDate;
  const appointmentTime = appointment?.appointmentTime || selectedTime;
  const finalPatientName = appointment?.patientDetails?.name || patientName;
  const finalProblem = appointment?.notes || problem;
  const consultationFee = appointment?.consultationFee || doctor.consultationFee;
  const totalAmount = appointment?.totalAmount || (consultationFee * 1.05);

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleBackToHome = () => {
    router.replace("/(tabs)");
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
        <Text style={styles.headerTitle}>ჯავშნის დეტალები</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>დადასტურებული</Text>
            <Text style={styles.statusSubtitle}>
              თქვენი ჯავშანი დადასტურებულია
            </Text>
          </View>
        </View>

        {/* Doctor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ექიმის ინფორმაცია</Text>
          <View style={styles.doctorCard}>
            <View style={styles.doctorImagePlaceholder}>
              {doctor.image && typeof doctor.image === 'object' && 'uri' in doctor.image ? (
                <Image source={doctor.image} style={styles.doctorImage} />
              ) : (
                <Text style={styles.doctorInitials}>
                  {doctor.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </Text>
              )}
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.specialty}>{doctor.specialization}</Text>
              <Text style={styles.degrees}>{doctor.degrees}</Text>
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, index) => (
                  <Ionicons key={index} name="star" size={16} color="#FFD700" />
                ))}
                <Text style={styles.ratingText}>({doctor.rating})</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Appointment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ჯავშნის დეტალები</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#20BEB8" />
              <Text style={styles.detailLabel}>თარიღი</Text>
              <Text style={styles.detailValue}>
                {formatDate(appointmentDate as string)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color="#20BEB8" />
              <Text style={styles.detailLabel}>დრო</Text>
              <Text style={styles.detailValue}>{appointmentTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color="#20BEB8" />
              <Text style={styles.detailLabel}>პაციენტი</Text>
              <Text style={styles.detailValue}>
                {finalPatientName || "არ არის მითითებული"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="card-outline" size={20} color="#20BEB8" />
              <Text style={styles.detailLabel}>გადახდის მეთოდი</Text>
              <Text style={styles.detailValue}>
                {appointment?.paymentMethod || paymentMethod || "მოსალოდნელი"}
              </Text>
            </View>
          </View>
        </View>

        {/* Problem Description */}
        {finalProblem && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>პრობლემის აღწერა</Text>
            <View style={styles.problemCard}>
              <Text style={styles.problemText}>{finalProblem}</Text>
            </View>
          </View>
        )}

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>გადახდის ინფორმაცია</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>კონსულტაციის საფასური</Text>
              <Text style={styles.paymentAmount}>
                {typeof consultationFee === 'number' 
                  ? `${consultationFee} ₾`
                  : consultationFee || "0 ₾"}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>დღგ (5%)</Text>
              <Text style={styles.paymentAmount}>
                {Math.round((typeof consultationFee === 'number' ? consultationFee : parseFloat(String(consultationFee).replace(/[^\d.]/g, '')) || 0) * 0.05)} ₾
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.paymentRow}>
              <Text style={styles.netAmountLabel}>საერთო თანხა</Text>
              <Text style={styles.netAmountValue}>
                {typeof totalAmount === 'number' 
                  ? `${Math.round(totalAmount)} ₾`
                  : totalAmount || "0 ₾"}
              </Text>
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>მნიშვნელოვანი შენიშვნები</Text>
          <View style={styles.notesCard}>
            <View style={styles.noteItem}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#FF9800"
              />
              <Text style={styles.noteText}>
                გთხოვთ მოხვდეთ 15 წუთით ადრე თქვენი ჯავშნის დრომდე
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#FF9800"
              />
              <Text style={styles.noteText}>
                წაიღეთ პირადობის მოწმობა და შესაბამისი სამედიცინო დოკუმენტები
              </Text>
            </View>
            <View style={styles.noteItem}>
              <Ionicons name="call-outline" size={20} color="#FF9800" />
              <Text style={styles.noteText}>
                დაგვიკავშირდით თუ გჭირდებათ ჯავშნის გადადება ან გაუქმება
              </Text>
            </View>
          </View>
        </View>

        {/* Documents */}
        {appointmentId && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>კვლევის დოკუმენტები</Text>
              <View style={styles.uploadButtonsRow}>
                <TouchableOpacity
                  style={[styles.uploadBtn, styles.labResultBtn]}
                  onPress={handleUploadExternalLabResult}
                  disabled={uploadingLabResult}
                >
                  <Ionicons name="flask-outline" size={16} color="#fff" />
                  <Text style={styles.uploadBtnText}>
                    {uploadingLabResult ? "..." : "კვლევა"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handleUploadDocument}
                  disabled={uploading}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                  <Text style={styles.uploadBtnText}>
                    {uploading ? "..." : "ფაილი"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {documents.length === 0 ? (
              <Text style={styles.emptyDocs}>ჯერჯერობით დოკუმენტი არ არის.</Text>
            ) : (
              documents.map((doc, idx) => (
                <TouchableOpacity
                  key={`${doc.url}-${idx}`}
                  style={[styles.docItem, doc.isExternalLabResult && styles.labResultItem]}
                  onPress={() => openDocument(doc.url)}
                >
                  <Ionicons 
                    name={doc.isExternalLabResult ? "flask-outline" : "document-text-outline"} 
                    size={20} 
                    color={doc.isExternalLabResult ? "#7C3AED" : "#20BEB8"} 
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.docName}>{doc.name || "დოკუმენტი"}</Text>
                      {doc.isExternalLabResult && (
                        <View style={styles.labResultBadge}>
                          <Text style={styles.labResultBadgeText}>კვლევა</Text>
                        </View>
                      )}
                    </View>
                    {doc.type ? (
                      <Text style={styles.docMeta}>{doc.type}</Text>
                    ) : null}
                    {doc.uploadedAt ? (
                      <Text style={styles.docMeta}>
                        ატვირთულია: {new Date(doc.uploadedAt).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="open-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Back to Home Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.homeButton} onPress={handleBackToHome}>
          <Text style={styles.homeButtonText}>მთავარზე დაბრუნება</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginBottom: 12,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIcon: {
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  doctorCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#20BEB8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  doctorInitials: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#333333",
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
    marginBottom: 4,
  },
  degrees: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#999999",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#999999",
    marginLeft: 4,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#666666",
    marginLeft: 12,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  problemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  problemText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    lineHeight: 20,
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  paymentAmount: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 12,
  },
  netAmountLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  netAmountValue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#333333",
  },
  notesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  homeButton: {
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  homeButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#20BEB8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#20BEB8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  labResultBtn: {
    backgroundColor: "#7C3AED",
  },
  uploadBtnText: {
    color: "#fff",
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
  emptyDocs: {
    color: "#6B7280",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  labResultItem: {
    borderColor: "#7C3AED",
    borderWidth: 1.5,
    backgroundColor: "#FAF5FF",
  },
  docName: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: "#111827",
  },
  docMeta: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#6B7280",
  },
  labResultBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labResultBadgeText: {
    fontFamily: "Poppins-Medium",
    fontSize: 10,
    color: "#FFFFFF",
  },
  doctorImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
});

export default AppointmentDetails;
