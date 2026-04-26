import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Consultation,
  getConsultationTypeLabel,
  getStatusColor,
  getStatusLabel,
  hasForm100ForVisitCompletion,
} from "../../assets/data/doctorDashboard";
import { apiService, Clinic, ShopProduct } from "../_services/api";
import { useAuth } from "../contexts/AuthContext";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

/** ატვირთული ფაილის სახელის ჩვენებისთვის (შემოკლება) */
function truncateFileName(name: string | undefined, maxLen = 22): string {
  if (!name) return "";
  return name.length <= maxLen ? name : name.slice(0, maxLen - 3) + "...";
}

/** consultationSummary.medications (JSON string) → Medication[] */
function parseMedicationsList(
  medicationsJson: string | undefined,
): Medication[] {
  if (!medicationsJson || typeof medicationsJson !== "string") return [];
  try {
    const parsed = JSON.parse(medicationsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DoctorPatients() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const FORM100_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const createEmptyAppointmentData = () => ({
    diagnosis: "",
    symptoms: "",
    medications: [] as Medication[],
    followUpRequired: false,
    followUpDate: "",
    followUpTime: "",
    followUpType: "video" as "video" | "home-visit",
    followUpVisitAddress: "",
    followUpReason: "",
    notes: "",
  });

  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "scheduled" | "in-progress" | "cancelled"
  >("scheduled");
  const [filterType, setFilterType] = useState<"all" | "video" | "home-visit">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(
    null,
  );
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [showFollowUpScheduleModal, setShowFollowUpScheduleModal] =
    useState(false);
  const [followUpAvailability, setFollowUpAvailability] = useState<any[]>([]);
  const [loadingFollowUpAvailability, setLoadingFollowUpAvailability] =
    useState(false);

  // Expandable consultations state
  const [expandedConsultations, setExpandedConsultations] = useState<
    Set<string>
  >(new Set());
  const [consultationDocumentsCount, setConsultationDocumentsCount] = useState<
    Record<string, number>
  >({});
  const [consultationDocuments, setConsultationDocuments] = useState<
    Record<
      string,
      {
        url: string;
        name?: string;
        type?: string;
        uploadedAt?: string;
      }[]
    >
  >({});

  // Laboratory tests state
  const [laboratoryProducts, setLaboratoryProducts] = useState<ShopProduct[]>(
    [],
  );
  const [instrumentalProducts, setInstrumentalProducts] = useState<
    ShopProduct[]
  >([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedLaboratoryTests, setSelectedLaboratoryTests] = useState<
    {
      productId: string;
      productName: string;
      clinicId?: string;
      clinicName?: string;
      // თუ უკვე ატვირთულია პასუხი, შევინახოთ resultFile, რომ ექიმმა Modal-ში დაინახოს
      resultFile?: {
        url: string;
        publicId?: string;
        name?: string;
        type?: string;
        size?: number;
        uploadedAt?: string | Date;
      };
    }[]
  >([]);
  const [selectedInstrumentalTests, setSelectedInstrumentalTests] = useState<
    {
      productId: string;
      productName: string;
      notes?: string;
    }[]
  >([]);
  const [loadingLaboratoryData, setLoadingLaboratoryData] = useState(false);

  const resetAppointmentForm = () => {
    setAppointmentData(createEmptyAppointmentData());
    setForm100File(null);
    setDoctorAttachmentFile(null);
    setSelectedLaboratoryTests([]);
    setSelectedInstrumentalTests([]);
  };
  const [currentTime, setCurrentTime] = useState(new Date());
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Track if we've already opened an appointment from params to prevent reopening on refresh
  const openedAppointmentIdRef = useRef<string | null>(null);

  // Appointment form state
  const [appointmentData, setAppointmentData] = useState(
    createEmptyAppointmentData,
  );
  const [form100File, setForm100File] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  /** ექიმის ატვირთული ფაილი — იტვირთება როგორც ჩვეულებრივი დოკუმენტი (პაციენტს ჩანს ჩვეულებრივ ფაილად, არა ფორმა 100) */
  const [doctorAttachmentFile, setDoctorAttachmentFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // Fetch consultations from API
  const fetchConsultations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = (await apiService.getDoctorDashboardAppointments(
        100,
      )) as {
        success: boolean;
        data: Consultation[];
      };

      console.log(
        "🔍 Frontend - getDoctorDashboardAppointments response:",
        response,
      );

      // Log response for debugging

      if (response.success) {
        const consultationsData = response.data as any;
        setConsultations(consultationsData);

        // Load documents count for each consultation
        const docsCountPromises = consultationsData.map(
          async (consultation: Consultation) => {
            try {
              const docsResponse = await apiService.getAppointmentDocuments(
                consultation.id,
              );
              if (docsResponse.success && docsResponse.data) {
                return { id: consultation.id, count: docsResponse.data.length };
              }
              return { id: consultation.id, count: 0 };
            } catch (error) {
              console.error(
                `Error loading documents for consultation ${consultation.id}:`,
                error,
              );
              return { id: consultation.id, count: 0 };
            }
          },
        );

        const docsCounts = await Promise.all(docsCountPromises);
        const docsCountMap: Record<string, number> = {};
        docsCounts.forEach(({ id, count }) => {
          docsCountMap[id] = count;
        });
        setConsultationDocumentsCount(docsCountMap);
      } else {
        setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
      }
    } catch (err) {
      console.error("Error fetching consultations:", err);
      setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  // როდესაც მომხმარებელი ტაბზე დაბრუნდება/დააჭერს, სია თავიდან განახლდეს
  useFocusEffect(
    useCallback(() => {
      // პირველი ჩატვირთვისას useEffect აკეთებს fetch-ს; შემდეგ ფოკუსზე refresh
      if (!loading) {
        fetchConsultations(true);
      }
    }, [loading]),
  );

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      fetchConsultations(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Auto-open consultation details if appointmentId is provided
  useEffect(() => {
    if (params.appointmentId && consultations.length > 0) {
      // Check if we've already opened this appointment to prevent reopening on refresh
      if (openedAppointmentIdRef.current === params.appointmentId) {
        return;
      }

      const consultation = consultations.find(
        (c) => c.id === params.appointmentId,
      );
      if (consultation) {
        openedAppointmentIdRef.current = params.appointmentId;
        openAppointment(consultation);
        // Remove appointmentId parameter after opening to prevent reopening
        router.setParams({ appointmentId: undefined });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.appointmentId, consultations]);

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Debug modal state

  // Function to calculate time until consultation
  const getTimeUntilConsultation = (consultation: Consultation) => {
    const consultationDateTime = new Date(
      `${consultation.date}T${consultation.time}`,
    );
    const diff = consultationDateTime.getTime() - currentTime.getTime();

    if (diff < 0) return null; // Past consultation

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} დღეში`;
    } else if (hours > 0) {
      return `${hours} საათში`;
    } else if (minutes > 0) {
      return `${minutes} წუთში`;
    } else {
      return "ახლა";
    }
  };

  // Check if consultation is starting soon (within 30 minutes)
  const isConsultationSoon = (consultation: Consultation) => {
    const consultationDateTime = new Date(
      `${consultation.date}T${consultation.time}`,
    );
    const diff = consultationDateTime.getTime() - currentTime.getTime();
    return diff > 0 && diff <= 30 * 60 * 1000; // 30 minutes
  };

  // "შესვლა კონსულტაციაზე" ღილაკი აქტიურია ჯავშნამდე და ჯავშნიდან 1 საათის განმავლობაში
  const isJoinButtonActive = (consultation: Consultation) => {
    if (
      consultation.status !== "scheduled" &&
      consultation.status !== "in-progress"
    ) {
      return false;
    }

    const consultationDateTime = new Date(
      `${consultation.date}T${consultation.time}`,
    );
    const diff = consultationDateTime.getTime() - currentTime.getTime();
    const oneHourInMs = 60 * 60 * 1000;

    return diff >= -oneHourInMs;
  };

  // Filter consultations - only show followup consultations
  const filteredConsultations = consultations
    .filter((consultation) => {
      const isFollowup = (consultation as any).isFollowUp === true;
      const matchesStatus =
        filterStatus === "all" || consultation.status === filterStatus;
      const matchesType =
        filterType === "all" || consultation.type === filterType;
      const matchesSearch = consultation.patientName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return isFollowup && matchesStatus && matchesType && matchesSearch;
    })
    .sort((a, b) => {
      // Sort by date and time - newest first
      // Parse dates in local timezone (same as patient side)
      const [yearA, monthA, dayA] = a.date.split("-").map(Number);
      const [hoursA, minutesA] = a.time.split(":").map(Number);
      const dateA = new Date(
        yearA,
        monthA - 1,
        dayA,
        hoursA,
        minutesA,
        0,
        0,
      ).getTime();

      const [yearB, monthB, dayB] = b.date.split("-").map(Number);
      const [hoursB, minutesB] = b.time.split(":").map(Number);
      const dateB = new Date(
        yearB,
        monthB - 1,
        dayB,
        hoursB,
        minutesB,
        0,
        0,
      ).getTime();

      return dateB - dateA; // Descending order (newest first)
    });

  // Stats - only count followup consultations
  const followupConsultations = consultations.filter(
    (c) => (c as any).isFollowUp === true,
  );
  const stats = {
    all: followupConsultations.length,
    completed: followupConsultations.filter((c) => c.status === "completed")
      .length,
    scheduled: followupConsultations.filter((c) => c.status === "scheduled")
      .length,
    inProgress: followupConsultations.filter((c) => c.status === "in-progress")
      .length,
  };

  const updateConsultationState = (updated: Consultation) => {
    setConsultations((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const buildFileUrl = (filePath?: string | null) => {
    if (!filePath) {
      return null;
    }
    if (filePath.startsWith("http")) {
      return filePath;
    }
    const base = apiService.getBaseURL();
    const normalized = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    return `${base}/${normalized}`;
  };

  const downloadAndOpenFile = async (fileUrl: string, fileName?: string) => {
    try {
      // Build full URL if needed
      const fullUrl = fileUrl.startsWith("http")
        ? fileUrl
        : `${apiService.getBaseURL()}/${fileUrl}`;

      // Try to download and share the file
      try {
        // Get file extension from URL or filename
        const extension = fileName?.split(".").pop() || "pdf";
        // Use cacheDirectory if available, otherwise fallback to a temp path
        // @ts-ignore - FileSystem.cacheDirectory exists at runtime
        const cacheDir = FileSystem.cacheDirectory || "";
        const fileUri = `${cacheDir}${fileName || `file_${Date.now()}.${extension}`}`;

        // Download file
        const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);

        if (downloadResult.status === 200) {
          // Check if sharing is available
          const isAvailable = await Sharing.isAvailableAsync();

          if (isAvailable) {
            // Share/open the file
            await Sharing.shareAsync(downloadResult.uri);
            return;
          }
        }
      } catch (downloadError) {
        console.log("Download failed, falling back to URL:", downloadError);
      }

      // Fallback to opening URL if download fails or sharing is not available
      Linking.openURL(fullUrl).catch(() =>
        Alert.alert("შეცდომა", "ფაილის გახსნა ვერ მოხერხდა"),
      );
    } catch (error: any) {
      console.error("Error opening file:", error);
      Alert.alert("შეცდომა", error?.message || "ფაილის გახსნა ვერ მოხერხდა");
    }
  };

  const openForm100File = (filePath?: string | null) => {
    const url = buildFileUrl(filePath);
    if (!url) {
      Alert.alert("ფაილი ვერ მოიძებნა");
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert("შეცდომა", "ფაილის გახსნა ვერ მოხერხდა"),
    );
  };

  const handlePickForm100File = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        return;
      }

      if (asset.size && asset.size > FORM100_MAX_FILE_SIZE) {
        Alert.alert(
          "ფაილი ძალიან დიდია",
          "მაქსიმუმ 5MB ზომის PDF ან გამოსახულება აირჩიეთ.",
        );
        return;
      }

      setForm100File(asset);
    } catch (error) {
      console.error("Failed to pick Form 100 file", error);
      Alert.alert("შეცდომა", "ფორმა 100-ის ატვირთვა ვერ მოხერხდა");
    }
  };

  const handlePickAttachmentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      const maxSize = 5 * 1024 * 1024;
      if (asset.size && asset.size > maxSize) {
        Alert.alert("შეცდომა", "ფაილი უნდა იყოს 5MB-მდე");
        return;
      }
      setDoctorAttachmentFile(asset);
    } catch (error) {
      console.error("Failed to pick attachment file", error);
      Alert.alert("შეცდომა", "ფაილის არჩევა ვერ მოხერხდა");
    }
  };

  const toggleConsultationExpansion = async (consultation: Consultation) => {
    const isExpanded = expandedConsultations.has(consultation.id);

    if (!isExpanded) {
      // Fetch full appointment details when expanding
      try {
        const appointmentResponse = await apiService.getAppointmentById(
          consultation.id,
        );
        if (appointmentResponse.success && appointmentResponse.data) {
          const fullAppointment = appointmentResponse.data as any;

          // Format date to local timezone if it's in ISO format
          let formattedDate = fullAppointment.date || consultation.date;
          if (formattedDate && formattedDate.includes("T")) {
            const date = new Date(formattedDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            formattedDate = `${year}-${month}-${day}`;
          }

          // Update consultation in the list with full details including patient details
          setConsultations((prev) =>
            prev.map((cons) =>
              cons.id === consultation.id
                ? {
                    ...cons,
                    date: formattedDate,
                    instrumentalTests: fullAppointment.instrumentalTests || [],
                    laboratoryTests: fullAppointment.laboratoryTests || [],
                    symptoms:
                      fullAppointment.symptoms ||
                      fullAppointment.patientDetails?.problem ||
                      cons.symptoms,
                    diagnosis:
                      fullAppointment.diagnosis ||
                      fullAppointment.consultationSummary?.diagnosis ||
                      cons.diagnosis,
                    patientDetails:
                      fullAppointment.patientDetails ||
                      (cons as any).patientDetails,
                    patientPhone:
                      fullAppointment.patientId?.phone ||
                      (cons as any).patientPhone,
                    patientEmail:
                      fullAppointment.patientId?.email ||
                      (cons as any).patientEmail,
                    patientId:
                      fullAppointment.patientId || (cons as any).patientId,
                  }
                : cons,
            ),
          );
        }

        // Load appointment documents
        try {
          const docsResponse = await apiService.getAppointmentDocuments(
            consultation.id,
          );
          if (docsResponse.success && docsResponse.data) {
            // Store documents count and full documents
            setConsultationDocumentsCount((prev) => ({
              ...prev,
              [consultation.id]: docsResponse.data.length,
            }));
            setConsultationDocuments((prev) => ({
              ...prev,
              [consultation.id]: docsResponse.data,
            }));
          } else {
            setConsultationDocuments((prev) => ({
              ...prev,
              [consultation.id]: [],
            }));
          }
        } catch (error) {
          console.error("Error fetching appointment documents:", error);
          setConsultationDocuments((prev) => ({
            ...prev,
            [consultation.id]: [],
          }));
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error);
      }
    }

    setExpandedConsultations((prev) => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.delete(consultation.id);
      } else {
        newSet.add(consultation.id);
      }
      return newSet;
    });
  };

  const openDetails = async (consultation: Consultation) => {
    setLoadingDetails(true);
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);

    try {
      // Fetch full appointment details to get patient email and phone
      const appointmentResponse = await apiService.getAppointmentById(
        consultation.id,
      );

      if (appointmentResponse.success && appointmentResponse.data) {
        const appointment = appointmentResponse.data as any;
        // Merge patient contact info from populated patientId
        const updatedConsultation = {
          ...consultation,
          patientPhone:
            appointment.patientId?.phone || (consultation as any).patientPhone,
          patientEmail:
            appointment.patientId?.email || (consultation as any).patientEmail,
        };
        setSelectedConsultation(updatedConsultation as Consultation);
      }
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      // Keep original consultation if API call fails
    } finally {
      setLoadingDetails(false);
    }
  };

  const openAppointment = async (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    const summary = consultation.consultationSummary;
    let followUpTime = "";
    if (consultation.followUp?.date) {
      const followUpDate = new Date(consultation.followUp.date);
      if (!Number.isNaN(followUpDate.getTime())) {
        followUpTime =
          followUpDate.toISOString().split("T")[1]?.slice(0, 5) || "";
      }
    }
    // Parse medications from JSON string to array
    let medications: Medication[] = [];
    if (summary?.medications) {
      try {
        medications = JSON.parse(summary.medications);
      } catch {
        // Fallback: if not JSON, treat as empty array
        medications = [];
      }
    }

    setAppointmentData({
      diagnosis: summary?.diagnosis || consultation.diagnosis || "",
      symptoms: summary?.symptoms || consultation.symptoms || "",
      medications,
      notes: summary?.notes || "",
      followUpRequired: consultation.followUp?.required ?? false,
      followUpDate: consultation.followUp?.date
        ? consultation.followUp?.date.split("T")[0]
        : "",
      followUpTime,
      followUpType: (consultation as any).followUpType || "video",
      followUpVisitAddress: (consultation as any).followUpVisitAddress || "",
      followUpReason: consultation.followUp?.reason || "",
    });
    setForm100File(null);
    setDoctorAttachmentFile(null);

    // Load existing laboratory tests if appointment has them
    if ((consultation as any).laboratoryTests) {
      setSelectedLaboratoryTests(
        (consultation as any).laboratoryTests.map((test: any) => ({
          productId: test.productId,
          productName: test.productName,
          clinicId: test.clinicId,
          clinicName: test.clinicName,
          // გადავიტანოთ უკვე ატვირთული პასუხი, თუ არსებობს
          resultFile: test.resultFile,
        })),
      );
    } else {
      setSelectedLaboratoryTests([]);
    }

    if ((consultation as any).instrumentalTests?.length) {
      setSelectedInstrumentalTests(
        (consultation as any).instrumentalTests.map((test: any) => ({
          productId: test.productId,
          productName: test.productName,
          notes: test.notes,
        })),
      );
    } else {
      setSelectedInstrumentalTests([]);
    }

    // Load laboratory products and clinics (available when completing appointment)
    loadLaboratoryData();

    setShowAppointmentModal(true);
  };

  const loadLaboratoryData = async () => {
    try {
      setLoadingLaboratoryData(true);
      const [overviewResponse, clinicsResponse] = await Promise.all([
        apiService.getMedicineShopOverview(),
        apiService.getClinics(),
      ]);

      if (overviewResponse.success) {
        setLaboratoryProducts(overviewResponse.data.laboratoryProducts || []);
        setInstrumentalProducts(overviewResponse.data.equipmentProducts || []);
      }

      if (clinicsResponse.success) {
        setClinics(clinicsResponse.data.filter((c) => c.isActive));
      }
    } catch (err) {
      console.error("Failed to load laboratory data:", err);
    } finally {
      setLoadingLaboratoryData(false);
    }
  };

  const handleSaveAppointment = async () => {
    if (!selectedConsultation) {
      return;
    }

    if (!appointmentData.diagnosis.trim()) {
      alert("გთხოვთ შეიყვანოთ დიაგნოზი");
      return;
    }

    if (
      appointmentData.followUpRequired &&
      (!appointmentData.followUpDate.trim() ||
        !appointmentData.followUpTime.trim())
    ) {
      alert("გთხოვთ მიუთითოთ განმეორებითი ვიზიტის თარიღი და დრო");
      return;
    }

    const isHomeVisitComplete = selectedConsultation.type === "home-visit";
    /** სიიდან არჩეულ ჯავშანს ხშირად არ აქვს `misForm100AvailableAt` — შენახვამდე ერთი HIS GET ასინქრონებს ბაზას და სტეითს. */
    let consultationForForm100Check: Consultation = selectedConsultation;
    if (!isHomeVisitComplete) {
      try {
        const misRes = await apiService.getMisPrintForms(
          selectedConsultation.id,
          true,
        );
        if (misRes.success && misRes.data) {
          const at = misRes.data.misForm100AvailableAt;
          if (at !== undefined) {
            consultationForForm100Check = {
              ...selectedConsultation,
              misForm100AvailableAt: at,
            };
            setSelectedConsultation(consultationForForm100Check);
          }
        }
      } catch (e) {
        console.warn("[DoctorPatients] getMisPrintForms before save", e);
      }
      if (!hasForm100ForVisitCompletion(consultationForForm100Check)) {
        alert(
          "ფორმა IV–100 უნდა ჩანდეს HIS mis-print-forms-ზე (ჯავშანზე HIS ფორმების ჩატვირთვა). ატვირთული PDF დასრულებისთვის არ ითვლება.",
        );
        return;
      }
    }

    try {
      setSavingAppointment(true);

      let latestConsultation: Consultation | null = selectedConsultation;

      if (!isHomeVisitComplete && form100File) {
        const formResponse = await apiService.uploadForm100Document(
          selectedConsultation.id,
          {
            diagnosis: appointmentData.diagnosis.trim() || undefined,
          },
          {
            uri: form100File.uri,
            name: form100File.name,
            mimeType: form100File.mimeType,
          },
        );
        if (!formResponse.success) {
          Alert.alert(
            "შეცდომა",
            (formResponse as { message?: string }).message ||
              "ფორმა 100 ვერ აიტვირთა",
          );
          return;
        }
        if (formResponse.data) {
          latestConsultation = formResponse.data as Consultation;
          updateConsultationState(latestConsultation);
          setSelectedConsultation(latestConsultation);
        }
        setForm100File(null);
      }

      // Convert medications array to JSON string for backend
      const medicationsString =
        appointmentData.medications.length > 0
          ? JSON.stringify(appointmentData.medications)
          : undefined;

      const payload = {
        status: "completed" as const,
        consultationSummary: {
          diagnosis: appointmentData.diagnosis.trim(),
          symptoms: appointmentData.symptoms.trim() || undefined,
          medications: medicationsString,
          notes: appointmentData.notes.trim() || undefined,
        },
        followUp: appointmentData.followUpRequired
          ? {
              required: true,
              date: appointmentData.followUpDate
                ? new Date(appointmentData.followUpDate).toISOString()
                : undefined,
              reason: appointmentData.followUpReason.trim() || undefined,
            }
          : { required: false },
      };

      const response = (await apiService.updateDoctorAppointment(
        selectedConsultation.id,
        payload,
      )) as { success: boolean; data?: Consultation };

      if (response.success && response.data) {
        latestConsultation = response.data;
        updateConsultationState(latestConsultation);
      }

      // Save laboratory tests after status is updated to "completed"
      // This allows doctors to assign tests when completing the appointment
      if (selectedLaboratoryTests.length > 0) {
        try {
          // Filter out clinicId and clinicName as they will be selected by patient
          const testsToSend = selectedLaboratoryTests.map((test) => ({
            productId: test.productId,
            productName: test.productName,
            // clinicId and clinicName are not sent - patient will select clinic when booking
          }));
          await apiService.assignLaboratoryTests(
            selectedConsultation.id,
            testsToSend,
          );
        } catch (err) {
          console.error("Failed to assign laboratory tests:", err);
          Alert.alert(
            "შეცდომა",
            "ლაბორატორიული კვლევების დამატება ვერ მოხერხდა",
          );
        }
      }

      if (selectedInstrumentalTests.length > 0) {
        try {
          const testsToSend = selectedInstrumentalTests.map((test) => ({
            productId: test.productId,
            productName: test.productName,
            notes: test.notes,
          }));
          const instrumentalResponse = await apiService.assignInstrumentalTests(
            selectedConsultation.id,
            testsToSend,
          );
          if (instrumentalResponse?.success && instrumentalResponse?.data) {
            latestConsultation = instrumentalResponse.data as Consultation;
            updateConsultationState(latestConsultation);
          }
        } catch (err) {
          console.error("Failed to assign instrumental tests:", err);
          Alert.alert(
            "შეცდომა",
            "ინსტრუმენტული კვლევების დამატება ვერ მოხერხდა",
          );
        }
      }

      if (
        appointmentData.followUpRequired &&
        appointmentData.followUpDate.trim() &&
        appointmentData.followUpTime.trim()
      ) {
        // Validate visit address for home-visit
        if (
          appointmentData.followUpType === "home-visit" &&
          !appointmentData.followUpVisitAddress.trim()
        ) {
          alert("გთხოვთ მიუთითოთ ბინაზე ვიზიტის მისამართი");
          return;
        }

        const followUpResponse = await apiService.scheduleFollowUpAppointment(
          selectedConsultation.id,
          {
            date: appointmentData.followUpDate.trim(),
            time: appointmentData.followUpTime.trim(),
            type: appointmentData.followUpType,
            visitAddress:
              appointmentData.followUpType === "home-visit"
                ? appointmentData.followUpVisitAddress.trim()
                : undefined,
            reason: appointmentData.followUpReason.trim() || undefined,
          },
          true, // isDoctor = true for doctor side
        );

        if (followUpResponse.success && followUpResponse.data) {
          setConsultations((prev) => [
            followUpResponse.data as Consultation,
            ...prev,
          ]);
        }
      }

      if (doctorAttachmentFile) {
        const uploadResp = await apiService.uploadAppointmentDocument(
          selectedConsultation.id,
          {
            uri: doctorAttachmentFile.uri,
            name: doctorAttachmentFile.name || "document",
            type: doctorAttachmentFile.mimeType || "application/pdf",
          },
        );
        if (uploadResp.success && uploadResp.data) {
          setConsultationDocuments((prev) => ({
            ...prev,
            [selectedConsultation.id]: [
              uploadResp.data!,
              ...(prev[selectedConsultation.id] || []),
            ],
          }));
          setConsultationDocumentsCount((prev) => ({
            ...prev,
            [selectedConsultation.id]: (prev[selectedConsultation.id] || 0) + 1,
          }));
        }
      }

      if (isHomeVisitComplete && form100File) {
        const formResponse = await apiService.uploadForm100Document(
          selectedConsultation.id,
          {
            diagnosis: appointmentData.diagnosis.trim() || undefined,
          },
          {
            uri: form100File.uri,
            name: form100File.name,
            mimeType: form100File.mimeType,
          },
        );
        if (formResponse.success && formResponse.data) {
          latestConsultation = formResponse.data as Consultation;
          updateConsultationState(latestConsultation);
        }
        setForm100File(null);
      }

      if (latestConsultation) {
        setSelectedConsultation(latestConsultation);
      }

      // Close follow-up schedule modal if open
      if (showFollowUpScheduleModal) {
        setShowFollowUpScheduleModal(false);
        // Wait a bit for modal to close before showing success modal
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setShowAppointmentModal(false);
      setShowSuccessModal(true);
      resetAppointmentForm();
    } catch (error: any) {
      console.error("Failed to save appointment summary", error);
      alert(
        error?.message || "დანიშნულების შენახვა ვერ მოხერხდა, სცადეთ თავიდან",
      );
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleStatusUpdate = async (
    consultation: Consultation,
    nextStatus: "in-progress" | "cancelled",
  ) => {
    try {
      setStatusActionLoading(`${consultation.id}-${nextStatus}`);
      const response = (await apiService.updateDoctorAppointment(
        consultation.id,
        { status: nextStatus },
      )) as { success: boolean; data?: Consultation };
      if (response.success && response.data) {
        updateConsultationState(response.data);
      }
    } catch (error: any) {
      console.error("Failed to update appointment status", error);
      alert(error?.message || "სტატუსის განახლება ვერ მოხერხდა");
    } finally {
      setStatusActionLoading(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            კონსულტაციების ჩატვირთვა...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text style={{ fontSize: 16, color: "#EF4444", marginBottom: 12 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                setLoading(true);
                setError(null);
                const response =
                  (await apiService.getDoctorDashboardAppointments(100)) as {
                    success: boolean;
                    data: Consultation[];
                  };
                if (response.success) {
                  setConsultations(response.data as any);
                } else {
                  setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
                }
              } catch (err) {
                console.error("Error fetching consultations:", err);
                setError("კონსულტაციების ჩატვირთვა ვერ მოხერხდა");
              } finally {
                setLoading(false);
              }
            }}
            style={{
              backgroundColor: "#06B6D4",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
              ხელახლა ცდა
            </Text>
          </TouchableOpacity>
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
            onRefresh={() => fetchConsultations(true)}
            colors={["#06B6D4"]}
            tintColor="#06B6D4"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>განმეორებითი კონსულტაციები</Text>
            <Text style={styles.subtitle}>
              მხოლოდ განმეორებითი კონსულტაციები
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="ძებნა პაციენტის სახელით..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={[
              styles.statCard,
              filterStatus === "scheduled" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("scheduled")}
          >
            <Ionicons
              name="calendar"
              size={24}
              color={filterStatus === "scheduled" ? "#8B5CF6" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "scheduled" && styles.statValueActive,
              ]}
            >
              {stats.scheduled}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "scheduled" && styles.statLabelActive,
              ]}
            >
              დანიშნული
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.statCard,
              filterStatus === "completed" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("completed")}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={filterStatus === "completed" ? "#10B981" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "completed" && styles.statValueActive,
              ]}
            >
              {stats.completed}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "completed" && styles.statLabelActive,
              ]}
            >
              დასრულებული
            </Text>
          </TouchableOpacity>
        </View>

        {/* Type Filter */}

        {/* Consultations List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredConsultations.length} კონსულტაცია
            </Text>
          </View>

          {filteredConsultations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>
                კონსულტაციები ვერ მოიძებნა
              </Text>
              <Text style={styles.emptyStateText}>
                სცადეთ განსხვავებული ფილტრები
              </Text>
            </View>
          ) : (
            filteredConsultations.map((consultation) => {
              const isExpanded = expandedConsultations.has(consultation.id);

              return (
                <View key={consultation.id} style={styles.consultationCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.consultationHeader}>
                      <View style={styles.patientInfo}>
                        <Image
                          source={{
                            uri:
                              consultation.patientProfileImage ||
                              `https://picsum.photos/seed/${consultation.patientName}/200/200`,
                          }}
                          style={styles.avatarImage}
                        />
                        <View style={styles.patientDetails}>
                          <View style={styles.patientNameRow}>
                            <Text style={styles.patientName}>
                              {consultation.patientName}
                            </Text>
                            {consultation.status !== "completed" &&
                              consultationDocumentsCount[consultation.id] >
                                0 && (
                                <View style={styles.fileIndicatorBadge}>
                                  <Ionicons
                                    name="document-attach"
                                    size={12}
                                    color="#0EA5E9"
                                  />
                                  <Text style={styles.fileIndicatorBadgeText}>
                                    {
                                      consultationDocumentsCount[
                                        consultation.id
                                      ]
                                    }
                                  </Text>
                                </View>
                              )}
                            {consultation.status === "scheduled" &&
                              isConsultationSoon(consultation) && (
                                <View style={styles.soonBadge}>
                                  <Ionicons
                                    name="alarm"
                                    size={12}
                                    color="#EF4444"
                                  />
                                  <Text style={styles.soonText}>მალე</Text>
                                </View>
                              )}
                          </View>
                          <Text style={styles.patientAge}>
                            {consultation.patientAge} წლის •{" "}
                            {getConsultationTypeLabel(
                              consultation.type,
                              (consultation as any).isFollowUp,
                            )}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${getStatusColor(
                              consultation.status,
                            )}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(consultation.status) },
                          ]}
                        >
                          {getStatusLabel(consultation.status)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => toggleConsultationExpansion(consultation)}
                      style={styles.expandDetailsRow}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.expandDetailsButtonText}>
                        {isExpanded ? "დეტალების დაფარვა" : "დეტალების ნახვა"}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#06B6D4"
                      />
                    </TouchableOpacity>

                    <View style={styles.consultationBody}>
                      <View style={styles.datetimeRow}>
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.infoText}>
                            {(consultation as any).date ||
                              (consultation as any).appointmentDate?.split?.(
                                "T",
                              )?.[0] ||
                              "—"}
                          </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.infoText}>
                            {(consultation as any).time ||
                              (consultation as any).appointmentTime ||
                              "—"}
                          </Text>
                        </View>
                      </View>
                      {/* მხოლოდ problem (ჩივილები) - სიმპტომი არ ვაჩვენოთ აქ */}
                      {consultation.status !== "completed" &&
                      consultation.patientDetails?.problem ? (
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text style={styles.infoText} numberOfLines={2}>
                            <Text
                              style={{ fontWeight: "600", color: "#374151" }}
                            >
                              ჩივილები:{" "}
                            </Text>
                            {consultation.patientDetails.problem}
                          </Text>
                        </View>
                      ) : null}
                      {consultation.type === "home-visit" &&
                        (consultation as any).visitAddress && (
                          <View style={styles.symptomsRow}>
                            <Ionicons
                              name="home-outline"
                              size={16}
                              color="#6B7280"
                            />
                            <Text style={styles.symptomsText}>
                              {(consultation as any).visitAddress}
                            </Text>
                          </View>
                        )}
                      {/* File indicator - show if user has uploaded files or waiting */}
                      {/* Diagnosis - სიმპტომები არ ვაჩვენოთ აქ, მხოლოდ problem (ჩივილები) ზემოთ */}
                      {consultation.type !== "home-visit" && (
                        <>
                          {consultation.status === "completed" ? (
                            <>
                              {(consultation.consultationSummary?.diagnosis ||
                                consultation.diagnosis) && (
                                <View style={styles.infoRow}>
                                  <MaterialCommunityIcons
                                    name="file-document"
                                    size={16}
                                    color="#10B981"
                                  />
                                  <Text style={styles.infoText}>
                                    დიაგნოზი ჩანს დეტალებში
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            <>
                              {(consultation.consultationSummary?.diagnosis ||
                                consultation.diagnosis) && (
                                <View style={styles.diagnosisRow}>
                                  <MaterialCommunityIcons
                                    name="file-document"
                                    size={16}
                                    color="#10B981"
                                  />
                                  <Text
                                    style={styles.diagnosisText}
                                    numberOfLines={isExpanded ? undefined : 2}
                                  >
                                    {consultation.consultationSummary
                                      ?.diagnosis || consultation.diagnosis}
                                  </Text>
                                </View>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      {/* Patient Details */}
                      {consultation.status !== "completed" && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>
                            პაციენტის ინფორმაცია
                          </Text>
                          <View style={styles.patientInfoCard}>
                            <View style={styles.patientInfoRow}>
                              <Text style={styles.patientInfoLabel}>
                                სახელი:
                              </Text>
                              <Text style={styles.patientInfoValue}>
                                {(consultation as any).patientDetails?.name ||
                                  consultation.patientName ||
                                  "არ არის მითითებული"}
                              </Text>
                            </View>

                            {(consultation as any).patientDetails?.lastName && (
                              <View style={styles.patientInfoRow}>
                                <Text style={styles.patientInfoLabel}>
                                  გვარი:
                                </Text>
                                <Text style={styles.patientInfoValue}>
                                  {
                                    (consultation as any).patientDetails
                                      .lastName
                                  }
                                </Text>
                              </View>
                            )}

                            <View style={styles.patientInfoRow}>
                              <Text style={styles.patientInfoLabel}>
                                ასაკი:
                              </Text>
                              <Text style={styles.patientInfoValue}>
                                {(consultation as any).patientDetails
                                  ?.dateOfBirth
                                  ? new Date(
                                      (consultation as any).patientDetails
                                        .dateOfBirth,
                                    ).toLocaleDateString("ka-GE", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : consultation.patientAge
                                    ? `${consultation.patientAge} წელი`
                                    : "არ არის მითითებული"}
                              </Text>
                            </View>

                            {(consultation as any).patientDetails
                              ?.personalId && (
                              <View style={styles.patientInfoRow}>
                                <Text style={styles.patientInfoLabel}>
                                  პირადი ნომერი:
                                </Text>
                                <Text style={styles.patientInfoValue}>
                                  {
                                    (consultation as any).patientDetails
                                      .personalId
                                  }
                                </Text>
                              </View>
                            )}

                            {(consultation as any).patientDetails?.address && (
                              <View style={styles.patientInfoRow}>
                                <Text style={styles.patientInfoLabel}>
                                  მისამართი:
                                </Text>
                                <Text style={styles.patientInfoValue}>
                                  {(consultation as any).patientDetails.address}
                                </Text>
                              </View>
                            )}

                            {((consultation as any).patientEmail ||
                              (consultation as any).patientId?.email) && (
                              <View style={styles.patientInfoRow}>
                                <Text style={styles.patientInfoLabel}>
                                  Email:
                                </Text>
                                <Text style={styles.patientInfoValue}>
                                  {(consultation as any).patientEmail ||
                                    (consultation as any).patientId?.email}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      {/* მხოლოდ ჩივილები (problem) - დასრულებულზეც და დანიშნულზეც, სიმპტომი არ ვაჩვენოთ */}
                      {!(consultation as any).isFollowUp &&
                        consultation.patientDetails?.problem && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              ჩივილები
                            </Text>
                            <View style={styles.symptomsCard}>
                              <Ionicons
                                name="chatbubble-ellipses-outline"
                                size={18}
                                color="#6B7280"
                              />
                              <Text style={styles.symptomsTextExpanded}>
                                {consultation.patientDetails.problem}
                              </Text>
                            </View>
                          </View>
                        )}

                      {/* Diagnosis - Full View */}
                      {(consultation.consultationSummary?.diagnosis ||
                        consultation.diagnosis) && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>
                            დიაგნოზი
                          </Text>
                          <View style={styles.diagnosisCard}>
                            <MaterialCommunityIcons
                              name="file-document-outline"
                              size={18}
                              color="#10B981"
                            />
                            <Text style={styles.diagnosisTextExpanded}>
                              {consultation.consultationSummary?.diagnosis ||
                                consultation.diagnosis}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Medications */}
                      {(() => {
                        const meds = parseMedicationsList(
                          consultation.consultationSummary?.medications,
                        );
                        if (meds.length === 0) return null;
                        return (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              დანიშნული მედიკამენტები
                            </Text>
                            {meds.map((med, index) => (
                              <View
                                key={index}
                                style={styles.medicationItemCard}
                              >
                                <View style={styles.medicationItemHeader}>
                                  <Ionicons
                                    name="medkit-outline"
                                    size={18}
                                    color="#8B5CF6"
                                  />
                                  <Text style={styles.medicationItemName}>
                                    {med.name || "—"}
                                  </Text>
                                </View>
                                <View style={styles.medicationItemDetails}>
                                  {(med.dosage ||
                                    med.frequency ||
                                    med.duration) && (
                                    <Text style={styles.medicationItemMeta}>
                                      {[med.dosage, med.frequency, med.duration]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </Text>
                                  )}
                                  {med.instructions && (
                                    <Text
                                      style={styles.medicationItemInstructions}
                                    >
                                      {med.instructions}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        );
                      })()}

                      {/* Laboratory Tests */}
                      {consultation.laboratoryTests &&
                        consultation.laboratoryTests.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              ლაბორატორიული კვლევები
                            </Text>
                            {consultation.laboratoryTests.map(
                              (test: any, index: number) => (
                                <View key={index} style={styles.testCard}>
                                  <View style={styles.testHeader}>
                                    <Ionicons
                                      name="flask-outline"
                                      size={18}
                                      color="#06B6D4"
                                    />
                                    <View style={styles.testInfo}>
                                      <Text style={styles.testName}>
                                        {test.productName}
                                      </Text>
                                      {test.clinicName && (
                                        <Text style={styles.testNotes}>
                                          კლინიკა: {test.clinicName}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                </View>
                              ),
                            )}
                          </View>
                        )}

                      {/* Instrumental Tests */}
                      {consultation.instrumentalTests &&
                        (consultation as any).instrumentalTests.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              ინსტრუმენტული კვლევები
                            </Text>
                            {(consultation as any).instrumentalTests.map(
                              (test: any, index: number) => (
                                <View key={index} style={styles.testCard}>
                                  <View style={styles.testHeader}>
                                    <Ionicons
                                      name="pulse-outline"
                                      size={18}
                                      color="#8B5CF6"
                                    />
                                    <View style={styles.testInfo}>
                                      <Text style={styles.testName}>
                                        {test.productName}
                                      </Text>
                                      {test.notes && (
                                        <Text style={styles.testNotes}>
                                          შენიშვნა: {test.notes}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                </View>
                              ),
                            )}
                          </View>
                        )}

                      {/* Notes */}
                      {consultation.consultationSummary?.notes && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>
                            შენიშვნები
                          </Text>
                          <View style={styles.notesCard}>
                            <Ionicons
                              name="document-text-outline"
                              size={18}
                              color="#6B7280"
                            />
                            <Text style={styles.notesTextExpanded}>
                              {consultation.consultationSummary.notes}
                            </Text>
                          </View>
                        </View>
                      )}

                      {consultation.status !== "completed" && (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailSectionTitle}>
                            პაციენტის ატვირთული ფაილები
                            {consultationDocuments[consultation.id] &&
                              consultationDocuments[consultation.id].length >
                                0 && (
                                <Text
                                  style={{
                                    color: "#0EA5E9",
                                    fontWeight: "400",
                                  }}
                                >
                                  {" "}
                                  (
                                  {
                                    consultationDocuments[consultation.id]
                                      .length
                                  }
                                  )
                                </Text>
                              )}
                          </Text>
                          {consultationDocuments[consultation.id] &&
                          consultationDocuments[consultation.id].length > 0 ? (
                            <>
                              {consultationDocuments[consultation.id].map(
                                (doc, index) => (
                                  <TouchableOpacity
                                    key={index}
                                    style={styles.viewFileButton}
                                    onPress={() => {
                                      const url = doc.url.startsWith("http")
                                        ? doc.url
                                        : `${apiService.getBaseURL()}/${doc.url}`;
                                      downloadAndOpenFile(url, doc.name);
                                    }}
                                  >
                                    <Ionicons
                                      name={
                                        doc.type?.startsWith("image/")
                                          ? "image-outline"
                                          : "document-text-outline"
                                      }
                                      size={18}
                                      color="#0EA5E9"
                                    />
                                    <Text
                                      style={styles.viewFileButtonText}
                                      numberOfLines={1}
                                    >
                                      {truncateFileName(doc.name) ||
                                        "ფაილის ნახვა"}
                                    </Text>
                                    <Ionicons
                                      name="open-outline"
                                      size={16}
                                      color="#0EA5E9"
                                      style={{ marginLeft: "auto" }}
                                    />
                                  </TouchableOpacity>
                                ),
                              )}
                            </>
                          ) : (
                            <View style={styles.notesCard}>
                              <Ionicons
                                name="document-attach-outline"
                                size={18}
                                color="#9CA3AF"
                              />
                              <Text
                                style={[
                                  styles.notesTextExpanded,
                                  { color: "#9CA3AF" },
                                ]}
                              >
                                ფაილები არ არის ატვირთული
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.statusActionsRow}>
                    {consultation.status !== "cancelled" && (
                      <TouchableOpacity
                        style={styles.statusActionButtonPrimary}
                        onPress={() => openAppointment(consultation)}
                        disabled={savingAppointment}
                      >
                        <Ionicons
                          name="document-text"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.statusActionPrimaryText}>
                          {consultation.consultationSummary
                            ? "რედაქტირება"
                            : consultation.status === "completed"
                              ? "რედაქტირება"
                              : "დასრულება"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {consultation.type === "video" &&
                      isJoinButtonActive(consultation) && (
                        <TouchableOpacity
                          style={[
                            styles.joinCallButton,
                            isConsultationSoon(consultation) &&
                              styles.joinCallButtonPulsing,
                          ]}
                          activeOpacity={0.85}
                          onPress={async () => {
                            try {
                              await apiService.joinCall(consultation.id);
                            } catch (err) {
                              console.error(
                                "Failed to track doctor join time:",
                                err,
                              );
                            }
                            router.push({
                              pathname: "/screens/video-call",
                              params: {
                                appointmentId: consultation.id,
                                patientName:
                                  consultation.patientName || "პაციენტი",
                                roomName: `medicare-${consultation.id}`,
                              },
                            });
                          }}
                        >
                          <Ionicons name="videocam" size={20} color="#FFFFFF" />
                          <Text style={styles.joinCallText}>
                            შესვლა კონსულტაციაზე
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal && !showFollowUpScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>კონსულტაციის დეტალები</Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loadingDetails ? (
              <View style={styles.modalBody}>
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 40,
                  }}
                >
                  <ActivityIndicator size="large" color="#06B6D4" />
                  <Text
                    style={{ marginTop: 16, fontSize: 14, color: "#6B7280" }}
                  >
                    მონაცემების ჩატვირთვა...
                  </Text>
                </View>
              </View>
            ) : selectedConsultation ? (
              <ScrollView style={styles.modalBody}>
                {/* Patient Details Section - for Form 100 generation */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    კონსულტაციის ისტორია
                  </Text>

                  <View style={styles.patientInfoCard}>
                    <View style={styles.patientInfoRow}>
                      <Text style={styles.patientInfoLabel}>სახელი:</Text>
                      <Text style={styles.patientInfoValue}>
                        {(selectedConsultation as any).patientDetails?.name ||
                          selectedConsultation.patientName ||
                          "არ არის მითითებული"}
                      </Text>
                    </View>

                    {(selectedConsultation as any).patientDetails?.lastName && (
                      <View style={styles.patientInfoRow}>
                        <Text style={styles.patientInfoLabel}>გვარი:</Text>
                        <Text style={styles.patientInfoValue}>
                          {
                            (selectedConsultation as any).patientDetails
                              .lastName
                          }
                        </Text>
                      </View>
                    )}

                    <View style={styles.patientInfoRow}>
                      <Text style={styles.patientInfoLabel}>
                        დაბადების თარიღი:
                      </Text>
                      <Text style={styles.patientInfoValue}>
                        {(selectedConsultation as any).patientDetails
                          ?.dateOfBirth
                          ? new Date(
                              (selectedConsultation as any).patientDetails
                                .dateOfBirth,
                            ).toLocaleDateString("ka-GE", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : selectedConsultation.patientAge
                            ? `${selectedConsultation.patientAge} წელი`
                            : "არ არის მითითებული"}
                      </Text>
                    </View>

                    {(selectedConsultation as any).patientDetails
                      ?.personalId && (
                      <View style={styles.patientInfoRow}>
                        <Text style={styles.patientInfoLabel}>
                          პირადი ნომერი:
                        </Text>
                        <Text style={styles.patientInfoValue}>
                          {
                            (selectedConsultation as any).patientDetails
                              .personalId
                          }
                        </Text>
                      </View>
                    )}

                    {(selectedConsultation as any).patientDetails?.address && (
                      <View style={styles.patientInfoRow}>
                        <Text style={styles.patientInfoLabel}>მისამართი:</Text>
                        <Text style={styles.patientInfoValue}>
                          {(selectedConsultation as any).patientDetails.address}
                        </Text>
                      </View>
                    )}

                    {((selectedConsultation as any).patientPhone ||
                      (selectedConsultation as any).patientEmail ||
                      (selectedConsultation as any).patientId?.phone ||
                      (selectedConsultation as any).patientId?.email) && (
                      <>
                        {((selectedConsultation as any).patientPhone ||
                          (selectedConsultation as any).patientId?.phone) && (
                          <View style={styles.patientInfoRow}>
                            <Text style={styles.patientInfoLabel}>
                              ტელეფონი:
                            </Text>
                            <Text style={styles.patientInfoValue}>
                              {(selectedConsultation as any).patientPhone ||
                                (selectedConsultation as any).patientId?.phone}
                            </Text>
                          </View>
                        )}

                        {((selectedConsultation as any).patientEmail ||
                          (selectedConsultation as any).patientId?.email) && (
                          <View style={styles.patientInfoRow}>
                            <Text style={styles.patientInfoLabel}>Email:</Text>
                            <Text style={styles.patientInfoValue}>
                              {(selectedConsultation as any).patientEmail ||
                                (selectedConsultation as any).patientId?.email}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>პაციენტი</Text>
                  <Text style={styles.detailValue}>
                    {selectedConsultation.patientName}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ასაკი</Text>
                  <Text style={styles.detailValue}>
                    {selectedConsultation.patientAge} წელი
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>თარიღი და დრო</Text>
                  <Text style={styles.detailValue}>
                    {selectedConsultation.date} • {selectedConsultation.time}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ტიპი</Text>
                  <Text style={styles.detailValue}>
                    {getConsultationTypeLabel(
                      selectedConsultation.type,
                      (selectedConsultation as any).isFollowUp,
                    )}
                  </Text>
                </View>

                {selectedConsultation.type === "home-visit" &&
                  (selectedConsultation as any).visitAddress && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>ვიზიტის მისამართი</Text>
                      <Text style={styles.detailValue}>
                        {(selectedConsultation as any).visitAddress}
                      </Text>
                    </View>
                  )}

                {(selectedConsultation as any).patientDetails?.problem && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ჩივილები</Text>
                    <Text style={styles.detailValue}>
                      {(selectedConsultation as any).patientDetails.problem}
                    </Text>
                  </View>
                )}

                {selectedConsultation.diagnosis && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>დიაგნოზი</Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.diagnosis}
                    </Text>
                  </View>
                )}

                {(() => {
                  const meds = parseMedicationsList(
                    selectedConsultation.consultationSummary?.medications,
                  );
                  if (meds.length === 0) return null;
                  return (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        დანიშნული მედიკამენტები
                      </Text>
                      {meds.map((med, index) => (
                        <View key={index} style={styles.medicationItemCard}>
                          <View style={styles.medicationItemHeader}>
                            <Ionicons
                              name="medkit-outline"
                              size={18}
                              color="#8B5CF6"
                            />
                            <Text style={styles.medicationItemName}>
                              {med.name || "—"}
                            </Text>
                          </View>
                          <View style={styles.medicationItemDetails}>
                            {(med.dosage || med.frequency || med.duration) && (
                              <Text style={styles.medicationItemMeta}>
                                {[med.dosage, med.frequency, med.duration]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </Text>
                            )}
                            {med.instructions && (
                              <Text style={styles.medicationItemInstructions}>
                                {med.instructions}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })()}
                {selectedConsultation.laboratoryTests &&
                  selectedConsultation.laboratoryTests.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        ლაბორატორიული კვლევები
                      </Text>
                      {selectedConsultation.laboratoryTests.map((test: any) => (
                        <View
                          key={test.productId}
                          style={styles.laboratoryTestCard}
                        >
                          <View style={styles.laboratoryTestHeader}>
                            <Ionicons
                              name="flask-outline"
                              size={18}
                              color="#06B6D4"
                            />
                            <View style={styles.laboratoryTestInfo}>
                              <Text style={styles.laboratoryTestName}>
                                {test.productName}
                              </Text>
                              {test.resultFile?.name && (
                                <Text style={styles.laboratoryTestMeta}>
                                  ატვირთული შედეგი • {test.resultFile.name}
                                </Text>
                              )}
                            </View>
                            {test.resultFile?.url && (
                              <TouchableOpacity
                                style={styles.viewResultPill}
                                onPress={() => {
                                  Linking.openURL(test.resultFile.url).catch(
                                    () =>
                                      Alert.alert(
                                        "შეცდომა",
                                        "ფაილის გახსნა ვერ მოხერხდა",
                                      ),
                                  );
                                }}
                              >
                                <Ionicons
                                  name="document-text-outline"
                                  size={14}
                                  color="#0369A1"
                                />
                                <Text style={styles.viewResultPillText}>
                                  შედეგის ნახვა
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                {selectedConsultation.consultationSummary?.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>შენიშვნები</Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.consultationSummary.notes}
                    </Text>
                  </View>
                )}

                {selectedConsultation.followUp?.required && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>განმეორებითი ვიზიტი</Text>
                    {selectedConsultation.followUp.date && (
                      <Text style={styles.detailValue}>
                        {selectedConsultation.followUp.date.split("T")[0]}
                      </Text>
                    )}
                    {selectedConsultation.followUp.reason && (
                      <Text style={styles.detailValue}>
                        {selectedConsultation.followUp.reason}
                      </Text>
                    )}
                  </View>
                )}

                {selectedConsultation.form100?.pdfUrl && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ფორმა 100</Text>
                    <TouchableOpacity
                      style={styles.viewFileButton}
                      onPress={() =>
                        openForm100File(selectedConsultation.form100?.pdfUrl)
                      }
                    >
                      <Ionicons
                        name="document-text"
                        size={18}
                        color="#4C1D95"
                      />
                      <Text style={styles.viewFileButtonText}>
                        {selectedConsultation.form100?.fileName ||
                          "ფაილის ნახვა"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ანაზღაურება</Text>
                  <Text style={styles.detailValue}>
                    ${selectedConsultation.fee}
                  </Text>
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.modalButtonText}>დახურვა</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appointment Form Modal */}
      <Modal
        visible={showAppointmentModal && !showFollowUpScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>დანიშნულება</Text>
                  {selectedConsultation && (
                    <Text style={styles.modalSubtitle}>
                      {selectedConsultation.patientName}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setShowAppointmentModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {/* Diagnosis */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>დიაგნოზი *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="მიუთითეთ დიაგნოზი"
                    placeholderTextColor="#9CA3AF"
                    value={appointmentData.diagnosis}
                    onChangeText={(text) =>
                      setAppointmentData({
                        ...appointmentData,
                        diagnosis: text,
                      })
                    }
                  />
                </View>

                {/* Symptoms */}

                {/* განმეორებით ვიზიტის დასრულებისას არ ვაჩვენოთ განმეორებითი ვიზიტის ღილაკი */}
                {!(selectedConsultation as any)?.isFollowUp && (
                  <View style={styles.formSection}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() =>
                        setAppointmentData({
                          ...appointmentData,
                          followUpRequired: !appointmentData.followUpRequired,
                        })
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          appointmentData.followUpRequired &&
                            styles.checkboxChecked,
                        ]}
                      >
                        {appointmentData.followUpRequired && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        საჭიროა განმეორებითი ვიზიტი
                      </Text>
                    </TouchableOpacity>

                    {appointmentData.followUpRequired && (
                      <>
                        {/* Follow-up Type Selection */}
                        <View style={styles.formSection}>
                          <Text style={styles.formLabel}>
                            კონსულტაციის ტიპი
                          </Text>
                          <View style={styles.typeSelectorContainer}>
                            <TouchableOpacity
                              style={[
                                styles.typeChip,
                                appointmentData.followUpType === "video" &&
                                  styles.typeChipActive,
                              ]}
                              onPress={() =>
                                setAppointmentData({
                                  ...appointmentData,
                                  followUpType: "video",
                                  followUpVisitAddress: "",
                                })
                              }
                            >
                              <Ionicons
                                name="videocam-outline"
                                size={18}
                                color={
                                  appointmentData.followUpType === "video"
                                    ? "#FFFFFF"
                                    : "#4B5563"
                                }
                              />
                              <Text
                                style={[
                                  styles.typeChipText,
                                  appointmentData.followUpType === "video" &&
                                    styles.typeChipTextActive,
                                ]}
                              >
                                ვიდეო კონსულტაცია
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.typeChip,
                                appointmentData.followUpType === "home-visit" &&
                                  styles.typeChipActive,
                              ]}
                              onPress={() =>
                                setAppointmentData({
                                  ...appointmentData,
                                  followUpType: "home-visit",
                                })
                              }
                            >
                              <Ionicons
                                name="home-outline"
                                size={18}
                                color={
                                  appointmentData.followUpType === "home-visit"
                                    ? "#FFFFFF"
                                    : "#4B5563"
                                }
                              />
                              <Text
                                style={[
                                  styles.typeChipText,
                                  appointmentData.followUpType ===
                                    "home-visit" && styles.typeChipTextActive,
                                ]}
                              >
                                ბინაზე ვიზიტი
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Visit Address for Home Visit */}
                        {appointmentData.followUpType === "home-visit" && (
                          <View style={styles.formSection}>
                            <Text style={styles.formLabel}>
                              ვიზიტის მისამართი *
                            </Text>
                            <TextInput
                              style={styles.textInput}
                              placeholder="მიუთითეთ ზუსტი მისამართი"
                              placeholderTextColor="#9CA3AF"
                              value={appointmentData.followUpVisitAddress}
                              onChangeText={(text) =>
                                setAppointmentData({
                                  ...appointmentData,
                                  followUpVisitAddress: text,
                                })
                              }
                            />
                          </View>
                        )}

                        {/* Date and Time Selection */}
                        <View style={styles.formSection}>
                          <Text style={styles.formLabel}>თარიღი და დრო</Text>
                          <TouchableOpacity
                            style={styles.scheduleButton}
                            onPress={async () => {
                              if (!user?.id) {
                                Alert.alert(
                                  "შეცდომა",
                                  "ექიმის ID ვერ მოიძებნა",
                                );
                                return;
                              }

                              setLoadingFollowUpAvailability(true);
                              try {
                                const response =
                                  await apiService.getDoctorAvailability(
                                    user.id,
                                    appointmentData.followUpType,
                                  );

                                if (response.success && response.data) {
                                  // Filter availability by selected type
                                  const filteredAvailability = (
                                    response.data || []
                                  ).filter(
                                    (day: any) =>
                                      day.type === appointmentData.followUpType,
                                  );

                                  setFollowUpAvailability(filteredAvailability);
                                  setShowFollowUpScheduleModal(true);
                                } else {
                                  console.error(
                                    "❌ Response not successful:",
                                    response,
                                  );
                                  Alert.alert(
                                    "შეცდომა",
                                    "განრიგის ჩატვირთვა ვერ მოხერხდა",
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "❌ Error loading availability:",
                                  error,
                                );
                                Alert.alert(
                                  "შეცდომა",
                                  "განრიგის ჩატვირთვა ვერ მოხერხდა",
                                );
                              } finally {
                                setLoadingFollowUpAvailability(false);
                              }
                            }}
                          >
                            <Ionicons
                              name="calendar-outline"
                              size={20}
                              color="#06B6D4"
                            />
                            <Text style={styles.scheduleButtonText}>
                              {appointmentData.followUpDate &&
                              appointmentData.followUpTime
                                ? `${appointmentData.followUpDate} • ${appointmentData.followUpTime}`
                                : "აირჩიე თარიღი და დრო"}
                            </Text>
                            {loadingFollowUpAvailability && (
                              <ActivityIndicator size="small" color="#06B6D4" />
                            )}
                          </TouchableOpacity>
                        </View>

                        <View style={styles.formSection}>
                          <Text style={styles.formLabel}>მიზეზი</Text>
                          <TextInput
                            style={styles.textInput}
                            placeholder="მიუთითეთ მიზეზი"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={2}
                            value={appointmentData.followUpReason}
                            onChangeText={(text) =>
                              setAppointmentData({
                                ...appointmentData,
                                followUpReason: text,
                              })
                            }
                          />
                        </View>
                      </>
                    )}
                  </View>
                )}
                {/* Medications */}
                <View style={styles.formSection}>
                  <View style={styles.medicationsHeader}>
                    <Text style={styles.formLabel}>
                      დანიშნული მედიკამენტები
                    </Text>
                    <TouchableOpacity
                      style={styles.addMedicationButton}
                      onPress={() => {
                        setAppointmentData({
                          ...appointmentData,
                          medications: [
                            ...appointmentData.medications,
                            {
                              name: "",
                              dosage: "",
                              frequency: "",
                              duration: "",
                              instructions: "",
                            },
                          ],
                        });
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color="#06B6D4" />
                      <Text style={styles.addMedicationText}>დამატება</Text>
                    </TouchableOpacity>
                  </View>

                  {appointmentData.medications.map((med, index) => (
                    <View key={index} style={styles.medicationCard}>
                      <View style={styles.medicationCardHeader}>
                        <Ionicons
                          name="medkit-outline"
                          size={20}
                          color="#8B5CF6"
                        />
                        <TextInput
                          style={styles.medicationNameInput}
                          placeholder="მედიკამენტის სახელი"
                          placeholderTextColor="#9CA3AF"
                          value={med.name}
                          onChangeText={(text) => {
                            const newMedications = [
                              ...appointmentData.medications,
                            ];
                            newMedications[index].name = text;
                            setAppointmentData({
                              ...appointmentData,
                              medications: newMedications,
                            });
                          }}
                        />
                        {appointmentData.medications.length > 0 && (
                          <TouchableOpacity
                            onPress={() => {
                              const newMedications =
                                appointmentData.medications.filter(
                                  (_, i) => i !== index,
                                );
                              setAppointmentData({
                                ...appointmentData,
                                medications: newMedications,
                              });
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.medicationDetails}>
                        <View style={styles.medicationDetailRow}>
                          <Text style={styles.medicationDetailLabel}>
                            დოზა:
                          </Text>
                          <TextInput
                            style={styles.medicationDetailInput}
                            placeholder="მაგ: 10მგ"
                            placeholderTextColor="#9CA3AF"
                            value={med.dosage}
                            onChangeText={(text) => {
                              const newMedications = [
                                ...appointmentData.medications,
                              ];
                              newMedications[index].dosage = text;
                              setAppointmentData({
                                ...appointmentData,
                                medications: newMedications,
                              });
                            }}
                          />
                        </View>
                        <View style={styles.medicationDetailRow}>
                          <Text style={styles.medicationDetailLabel}>
                            სიხშირე:
                          </Text>
                          <TextInput
                            style={styles.medicationDetailInput}
                            placeholder="მაგ: დღეში 1-ჯერ"
                            placeholderTextColor="#9CA3AF"
                            value={med.frequency}
                            onChangeText={(text) => {
                              const newMedications = [
                                ...appointmentData.medications,
                              ];
                              newMedications[index].frequency = text;
                              setAppointmentData({
                                ...appointmentData,
                                medications: newMedications,
                              });
                            }}
                          />
                        </View>
                        <View style={styles.medicationDetailRow}>
                          <Text style={styles.medicationDetailLabel}>
                            ხანგრძლივობა:
                          </Text>
                          <TextInput
                            style={styles.medicationDetailInput}
                            placeholder="მაგ: 7 დღე"
                            placeholderTextColor="#9CA3AF"
                            value={med.duration}
                            onChangeText={(text) => {
                              const newMedications = [
                                ...appointmentData.medications,
                              ];
                              newMedications[index].duration = text;
                              setAppointmentData({
                                ...appointmentData,
                                medications: newMedications,
                              });
                            }}
                          />
                        </View>
                        <View style={styles.medicationInstructionsRow}>
                          <Text style={styles.medicationDetailLabel}>
                            ინსტრუქცია:
                          </Text>
                          <TextInput
                            style={styles.medicationInstructionsInput}
                            placeholder="დამატებითი ინსტრუქცია (არასავალდებულო)"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={2}
                            value={med.instructions || ""}
                            onChangeText={(text) => {
                              const newMedications = [
                                ...appointmentData.medications,
                              ];
                              newMedications[index].instructions = text;
                              setAppointmentData({
                                ...appointmentData,
                                medications: newMedications,
                              });
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Follow Up */}

                {/* Notes */}

                {/* Laboratory Tests - არ ვაჩვენოთ განმეორებით ჯავშანზე */}
                {(selectedConsultation?.status === "completed" ||
                  selectedConsultation?.status === "scheduled" ||
                  selectedConsultation?.status === "in-progress") && (
                  <View style={styles.formSection}>
                    <View style={styles.medicationsHeader}>
                      <Text style={styles.formLabel}>
                        ლაბორატორიული კვლევები
                      </Text>
                      {!(selectedConsultation as any)?.isFollowUp && (
                        <TouchableOpacity
                          style={styles.addMedicationButton}
                          onPress={() => {
                            // Show product selection modal (clinic will be selected by patient)
                            Alert.alert(
                              "პროდუქტის არჩევა",
                              "აირჩიეთ პროდუქტი",
                              [
                                ...laboratoryProducts.map((product) => ({
                                  text: product.name,
                                  onPress: () => {
                                    setSelectedLaboratoryTests([
                                      ...selectedLaboratoryTests,
                                      {
                                        productId: product.id,
                                        productName: product.name,
                                        // clinicId and clinicName will be selected by patient when booking
                                      },
                                    ]);
                                  },
                                })),
                                { text: "გაუქმება", style: "cancel" },
                              ],
                            );
                          }}
                        >
                          <Ionicons
                            name="add-circle"
                            size={20}
                            color="#06B6D4"
                          />
                          <Text style={styles.addMedicationText}>დამატება</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {selectedLaboratoryTests.map((test, index) => (
                      <View key={index} style={styles.medicationCard}>
                        <View style={styles.medicationCardHeader}>
                          <Ionicons
                            name="flask-outline"
                            size={20}
                            color="#06B6D4"
                          />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.medicationNameInput}>
                              {test.productName}
                            </Text>
                            <Text style={styles.clinicNameText}>
                              კლინიკა აირჩევა პაციენტის მიერ დაჯავშნისას
                            </Text>
                            {test.resultFile?.name && (
                              <Text style={styles.clinicNameText}>
                                ატვირთული შედეგი: {test.resultFile.name}
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedLaboratoryTests(
                                selectedLaboratoryTests.filter(
                                  (_, i) => i !== index,
                                ),
                              );
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {loadingLaboratoryData && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#06B6D4" />
                        <Text style={styles.loadingText}>იტვირთება...</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ინსტრუმენტული კვლევები — როგორც ლაბორატორიული */}
                {(selectedConsultation?.status === "completed" ||
                  selectedConsultation?.status === "scheduled" ||
                  selectedConsultation?.status === "in-progress") && (
                  <View style={styles.formSection}>
                    <View style={styles.medicationsHeader}>
                      <Text style={styles.formLabel}>
                        ინსტრუმენტული კვლევები
                      </Text>
                      {!(selectedConsultation as any)?.isFollowUp && (
                        <TouchableOpacity
                          style={styles.addMedicationButton}
                          onPress={() => {
                            if (instrumentalProducts.length === 0) {
                              Alert.alert(
                                "ინფორმაცია",
                                "ინსტრუმენტული კვლევების სია ჯერ იტვირთება ან ცარიელია",
                              );
                              return;
                            }
                            Alert.alert(
                              "კვლევის არჩევა",
                              "აირჩიეთ ინსტრუმენტული კვლევა",
                              [
                                ...instrumentalProducts.map((product) => ({
                                  text: product.name,
                                  onPress: () => {
                                    setSelectedInstrumentalTests([
                                      ...selectedInstrumentalTests,
                                      {
                                        productId: product.id,
                                        productName: product.name,
                                      },
                                    ]);
                                  },
                                })),
                                { text: "გაუქმება", style: "cancel" },
                              ],
                            );
                          }}
                        >
                          <Ionicons
                            name="add-circle"
                            size={20}
                            color="#8B5CF6"
                          />
                          <Text style={styles.addMedicationText}>დამატება</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {selectedInstrumentalTests.map((test, index) => (
                      <View key={index} style={styles.medicationCard}>
                        <View style={styles.medicationCardHeader}>
                          <Ionicons
                            name="pulse-outline"
                            size={20}
                            color="#8B5CF6"
                          />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.medicationNameInput}>
                              {test.productName}
                            </Text>
                            <TextInput
                              style={[
                                styles.textInput,
                                {
                                  marginTop: 8,
                                  minHeight: 44,
                                  fontSize: 13,
                                },
                              ]}
                              placeholder="შენიშვნა (არასავალდებულო)"
                              placeholderTextColor="#9CA3AF"
                              value={test.notes || ""}
                              onChangeText={(text) => {
                                const next = [...selectedInstrumentalTests];
                                next[index] = { ...next[index], notes: text };
                                setSelectedInstrumentalTests(next);
                              }}
                            />
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedInstrumentalTests(
                                selectedInstrumentalTests.filter(
                                  (_, i) => i !== index,
                                ),
                              );
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>ინსტრუქცია კვლევებზე</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="დამატებითი ინფორმაცია..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    value={appointmentData.notes}
                    onChangeText={(text) =>
                      setAppointmentData({ ...appointmentData, notes: text })
                    }
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>ფაილის ატვირთვა</Text>
                  <Text style={styles.selectedFileHint}>
                    პაციენტს ჩანს ჩვეულებრივ ფაილად (დოკუმენტების სიაში)
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handlePickAttachmentFile}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={18}
                      color="#06B6D4"
                    />
                    <Text style={styles.uploadButtonText}>
                      {doctorAttachmentFile?.name ||
                        "აირჩიეთ PDF ან გამოსახულება"}
                    </Text>
                  </TouchableOpacity>
                  {doctorAttachmentFile ? (
                    <>
                      <Text style={styles.selectedFileHint}>
                        ფაილი აიტვირთება შენახვისას
                      </Text>
                      <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={() => setDoctorAttachmentFile(null)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#EF4444"
                        />
                        <Text style={styles.removeFileText}>ფაილის წაშლა</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setShowAppointmentModal(false)}
                >
                  <Text style={styles.modalButtonTextSecondary}>გაუქმება</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleSaveAppointment}
                >
                  <Text style={styles.modalButtonTextPrimary}>შენახვა</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal && !showFollowUpScheduleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successModalTitle}>შენახულია</Text>
            <Text style={styles.successModalMessage}>
              დანიშნულება წარმატებით დამატებულია
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successModalButtonText}>კარგი</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Follow-up Schedule Modal - Must be last to appear on top */}
      <Modal
        visible={showFollowUpScheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          console.log("🔒 Modal close requested");
          setShowFollowUpScheduleModal(false);
        }}
      >
        <View style={styles.followUpModalOverlay}>
          <View style={styles.followUpScheduleModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>აირჩიე თარიღი და დრო</Text>
              <TouchableOpacity
                onPress={() => setShowFollowUpScheduleModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {followUpAvailability.length === 0 ? (
                <View style={styles.followUpEmptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.followUpEmptyStateText}>
                    ამ ტიპის კონსულტაციისთვის თავისუფალი დრო არ არის
                  </Text>
                </View>
              ) : (
                followUpAvailability.map((day: any, index: number) => {
                  if (
                    !day.isAvailable ||
                    !day.timeSlots ||
                    day.timeSlots.length === 0
                  ) {
                    return null;
                  }

                  return (
                    <View
                      key={`${day.date}-${day.type || "video"}-${index}`}
                      style={styles.availabilityDayCard}
                    >
                      <View style={styles.availabilityDayHeader}>
                        <Text style={styles.availabilityDayName}>
                          {day.dayOfWeek}
                        </Text>
                        <Text style={styles.availabilityDayDate}>
                          {day.date}
                        </Text>
                      </View>
                      <View style={styles.timeSlotsContainer}>
                        {day.timeSlots.map(
                          (time: string, timeIndex: number) => (
                            <TouchableOpacity
                              key={`${day.date}-${time}-${timeIndex}`}
                              style={[
                                styles.timeSlotChip,
                                appointmentData.followUpDate === day.date &&
                                  appointmentData.followUpTime === time &&
                                  styles.timeSlotChipActive,
                              ]}
                              onPress={() => {
                                setAppointmentData({
                                  ...appointmentData,
                                  followUpDate: day.date,
                                  followUpTime: time,
                                });
                                setShowFollowUpScheduleModal(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.timeSlotText,
                                  appointmentData.followUpDate === day.date &&
                                    appointmentData.followUpTime === time &&
                                    styles.timeSlotTextActive,
                                ]}
                              >
                                {time}
                              </Text>
                            </TouchableOpacity>
                          ),
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
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
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  statCardActive: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0FDFA",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 8,
  },
  statValueActive: {
    color: "#06B6D4",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  statLabelActive: {
    color: "#06B6D4",
  },
  typeFilterSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  typeFilterTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 12,
  },
  typeFilterRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeFilterCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  typeFilterCardActive: {
    backgroundColor: "#6B7280",
    borderColor: "#6B7280",
  },
  typeFilterCardActiveVideo: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  typeFilterCardActiveHome: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  typeFilterText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  typeFilterTextActive: {
    color: "#FFFFFF",
  },
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sortText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  consultationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  consultationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#06B6D4",
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E6FFFA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#06B6D4",
  },
  patientDetails: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  patientName: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  soonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  soonText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#EF4444",
  },
  patientAge: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  consultationBody: {
    gap: 10,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  datetimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  symptomsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  symptomsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#92400E",
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  diagnosisText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#065F46",
  },
  consultationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 12,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  feeAmount: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentBadgePaid: {
    backgroundColor: "#10B98120",
  },
  paymentBadgePending: {
    backgroundColor: "#F59E0B20",
  },
  paymentText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  paymentTextPaid: {
    color: "#10B981",
  },
  paymentTextPending: {
    color: "#F59E0B",
  },
  reminderSection: {
    marginTop: 12,
    gap: 10,
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  reminderBadgeUrgent: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  reminderText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#D97706",
  },
  reminderTextUrgent: {
    color: "#DC2626",
  },
  urgentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  joinCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#10B981",
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinCallButtonPulsing: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  joinCallText: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
    maxHeight: "100%",
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  patientInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  patientInfoRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  patientInfoLabel: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
    width: 120,
    marginRight: 8,
  },
  patientInfoValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonSecondary: {
    backgroundColor: "#F3F4F6",
  },
  modalButtonPrimary: {
    backgroundColor: "#06B6D4",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  formSection: {
    marginBottom: 20,
  },
  vitalSignsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vitalSignCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
  },
  vitalSignLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  vitalSignValue: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginTop: 4,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginBottom: 8,
  },
  statusActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  statusActionText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#2563EB",
  },
  statusActionButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statusActionPrimaryText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#ECFEFF",
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  selectedFileHint: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  removeFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  removeFileText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#EF4444",
  },
  existingFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginBottom: 8,
  },
  existingFileText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#4C1D95",
  },
  viewFileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F5F3FF",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  viewFileButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#4C1D95",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formFieldHalf: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 40,
    minWidth: 280,
  },
  successModalIconContainer: {
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  successModalButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    minWidth: 120,
  },
  successModalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  medicationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addMedicationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  addMedicationText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  medicationCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  medicationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  medicationNameInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
  },
  clinicNameText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 4,
  },
  laboratoryTestCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  laboratoryTestName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  laboratoryTestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  laboratoryTestInfo: {
    flex: 1,
    marginLeft: 8,
  },
  laboratoryTestMeta: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  viewResultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
  },
  viewResultPillText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  medicationDetails: {
    gap: 8,
  },
  medicationDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  medicationDetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    minWidth: 80,
  },
  medicationDetailInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
  },
  medicationInstructionsRow: {
    marginTop: 4,
  },
  medicationInstructionsInput: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    minHeight: 60,
  },
  typeSelectorContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  typeChipActive: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  typeChipText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  scheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ECFEFF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  scheduleButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  followUpModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  followUpScheduleModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "90%",
    maxHeight: 600,
    minHeight: 200,
    padding: 0,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  availabilityDayCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  availabilityDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  availabilityDayName: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  availabilityDayDate: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  timeSlotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlotChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timeSlotChipActive: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  timeSlotTextActive: {
    color: "#FFFFFF",
  },
  followUpEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  followUpEmptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  fileIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#E0F2FE",
    borderRadius: 12,
  },
  fileIndicatorBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#0EA5E9",
  },
  expandDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  expandDetailsButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  symptomsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  symptomsTextExpanded: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    lineHeight: 20,
  },
  diagnosisCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  diagnosisTextExpanded: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#065F46",
    lineHeight: 20,
  },
  medicationsCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F5F3FF",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  medicationsTextExpanded: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B21A8",
    lineHeight: 20,
  },
  medicationItemCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
  },
  medicationItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  medicationItemName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#5B21B6",
  },
  medicationItemDetails: {
    paddingLeft: 26,
  },
  medicationItemMeta: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 4,
  },
  medicationItemInstructions: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  notesCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notesTextExpanded: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    lineHeight: 20,
  },
  testCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  testNotes: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
});
