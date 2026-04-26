import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

interface PatientAppointment {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  time: string;
  status: string;
  type: string; // "video" | "home-visit" — ტიპი არ იცვლება განმეორებითზე
  isFollowUp?: boolean; // true = განმეორებითი ვიზიტი
  fee: string | number;
  isPaid: boolean;
  symptoms?: string;
  diagnosis?: string;
  doctorImage?: any;
  visitAddress?: string;
  homeVisitCompletedAt?: string; // When patient marked home visit as completed
  instrumentalTests?: any[];
  laboratoryTests?: any[];
  rescheduleRequest?: {
    requestedBy?: "doctor" | "patient";
    requestedDate?: string;
    requestedTime?: string;
    reason?: string;
    status?: "pending" | "approved" | "rejected";
    requestedAt?: string;
    respondedAt?: string;
    respondedBy?: string;
  };
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed":
      return "დასრულებული";
    case "scheduled":
      return "დანიშნული";
    case "cancelled":
      return "გაუქმებული";
    case "in-progress":
      return "მიმდინარე";
    case "pending":
      return "მოლოდინში";
    case "confirmed":
      return "დადასტურებული";
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "#10B981"; // green
    case "scheduled":
      return "#8B5CF6"; // purple
    case "cancelled":
      return "#EF4444"; // red
    case "in-progress":
      return "#F59E0B"; // orange
    default:
      return "#6B7280"; // gray
  }
};

const getConsultationTypeLabel = (type: string, isFollowUp?: boolean) => {
  if (isFollowUp === true) return "განმეორებითი";
  switch (type) {
    case "video":
      return "ვიდეო კონსულტაცია";
    case "home-visit":
      return "ბინაზე ვიზიტი";
    case "consultation":
      return "კონსულტაცია";
    case "emergency":
      return "სასწრაფო";
    default:
      return type;
  }
};

// Helper function to map backend appointment to app format
const mapAppointmentFromAPI = (
  appointment: any,
  apiBaseUrl: string,
): PatientAppointment => {
  // Handle populated doctorId (object) or non-populated doctorId (string/ObjectId)
  let doctor: any = {};
  if (appointment.doctorId) {
    if (typeof appointment.doctorId === "object" && appointment.doctorId.name) {
      // Populated doctor object
      doctor = appointment.doctorId;
    } else {
      // Non-populated, just ID - this shouldn't happen if backend populates correctly
      console.warn("Doctor not populated for appointment:", appointment._id);
      doctor = {};
    }
  }

  let doctorImage;
  if (doctor.profileImage) {
    if (doctor.profileImage.startsWith("http")) {
      doctorImage = { uri: doctor.profileImage };
    } else {
      doctorImage = { uri: `${apiBaseUrl}/${doctor.profileImage}` };
    }
  } else {
    doctorImage = require("@/assets/images/doctors/doctor1.png");
  }

  // Format date from ISO to YYYY-MM-DD
  // Use LOCAL methods to get the date as it appears in user's timezone
  // Backend stores dates in UTC, but we want to display them in user's local timezone
  const appointmentDate = appointment.appointmentDate
    ? (() => {
        const date = new Date(appointment.appointmentDate);
        // Use LOCAL methods to get the date as it appears in user's timezone
        // This ensures the date matches what the user expects to see
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        console.log("📅 [mapAppointmentFromAPI] Date parsing:", {
          appointmentId: appointment._id || appointment.id,
          original: appointment.appointmentDate,
          dateObject: date.toISOString(),
          localYear: year,
          localMonth: month,
          localDay: day,
          formatted: formattedDate,
          utcYear: date.getUTCFullYear(),
          utcMonth: String(date.getUTCMonth() + 1).padStart(2, "0"),
          utcDay: String(date.getUTCDate()).padStart(2, "0"),
          timezoneOffset: date.getTimezoneOffset(),
        });

        return formattedDate;
      })()
    : "";

  // Map status
  const statusMap: { [key: string]: string } = {
    pending: "scheduled",
    confirmed: "scheduled",
    completed: "completed",
    cancelled: "cancelled",
    "in-progress": "in-progress",
  };
  const mappedStatus =
    statusMap[appointment.status] || appointment.status || "scheduled";

  // Determine consultation type (default to video); type ყოველთვის video | home-visit, განმეორებითი = isFollowUp
  const consultationType = appointment.type || "video";
  const isFollowUp = appointment.isFollowUp === true;

  // Format fee
  const fee = appointment.totalAmount || appointment.consultationFee || 0;

  // Format reschedule request date if exists
  let rescheduleRequestDate = undefined;
  if (appointment.rescheduleRequest?.requestedDate) {
    const reqDate = new Date(appointment.rescheduleRequest.requestedDate);
    const year = reqDate.getFullYear();
    const month = String(reqDate.getMonth() + 1).padStart(2, "0");
    const day = String(reqDate.getDate()).padStart(2, "0");
    rescheduleRequestDate = `${year}-${month}-${day}`;
  }

  return {
    id: appointment._id || appointment.id || "",
    doctorName: doctor.name || "ექიმი",
    doctorSpecialty: doctor.specialization || "",
    date: appointmentDate,
    time: appointment.appointmentTime || "",
    status: mappedStatus,
    type: consultationType,
    isFollowUp,
    fee:
      typeof fee === "number"
        ? fee
        : parseFloat(String(fee).replace(/[^\d.]/g, "")) || 0,
    isPaid:
      appointment.paymentStatus === "paid" ||
      appointment.paymentStatus === "completed",
    // პაციენტის ტექსტი არა appointment.notes-ში (იქ ბინის/სხვა შენიშვნა შეიძლება იყოს)
    symptoms:
      appointment.patientDetails?.problem ||
      appointment.consultationSummary?.symptoms ||
      "",
    diagnosis: (
      appointment.consultationSummary?.diagnosis ||
      appointment.diagnosis ||
      ""
    ).trim(),
    visitAddress: appointment.visitAddress,
    homeVisitCompletedAt: appointment.homeVisitCompletedAt,
    doctorImage: doctorImage,
    rescheduleRequest: appointment.rescheduleRequest
      ? {
          requestedBy: appointment.rescheduleRequest.requestedBy,
          requestedDate: rescheduleRequestDate,
          requestedTime: appointment.rescheduleRequest.requestedTime,
          reason: appointment.rescheduleRequest.reason,
          status: appointment.rescheduleRequest.status,
          requestedAt: appointment.rescheduleRequest.requestedAt,
          respondedAt: appointment.rescheduleRequest.respondedAt,
          respondedBy: appointment.rescheduleRequest.respondedBy,
        }
      : undefined,
  };
};

const Appointment = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ filterType?: string }>();
  const { isAuthenticated, user } = useAuth();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "scheduled" | "cancelled"
  >("scheduled");
  const [filterType, setFilterType] = useState<"all" | "video" | "home-visit">(
    (params.filterType as "all" | "video" | "home-visit") || "all",
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<PatientAppointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [appointmentDocuments, setAppointmentDocuments] = useState<
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
  const [expandedAppointments, setExpandedAppointments] = useState<Set<string>>(
    new Set(),
  );
  const [uploadingDocForId, setUploadingDocForId] = useState<string | null>(
    null,
  );
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Reschedule states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<
    { date: string; time: string }[]
  >([]);
  const [selectedRescheduleDate, setSelectedRescheduleDate] = useState<
    string | null
  >(null);
  const [selectedRescheduleTime, setSelectedRescheduleTime] = useState<
    string | null
  >(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Approve reschedule states (when doctor requested without date/time)
  const [showApproveRescheduleModal, setShowApproveRescheduleModal] =
    useState(false);
  const [approveRescheduleAppointmentId, setApproveRescheduleAppointmentId] =
    useState<string | null>(null);
  const [approveRescheduleDate, setApproveRescheduleDate] = useState<
    string | null
  >(null);
  const [approveRescheduleTime, setApproveRescheduleTime] = useState<
    string | null
  >(null);
  const [approveRescheduleLoading, setApproveRescheduleLoading] =
    useState(false);

  // Modal for "consultation time not yet" message
  const [showConsultationTimeModal, setShowConsultationTimeModal] =
    useState(false);

  // Cancel states
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<
    string | null
  >(null);

  // Load appointments from API
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Update filterType from params
  useEffect(() => {
    if (
      params.filterType &&
      (params.filterType === "video" || params.filterType === "home-visit")
    ) {
      setFilterType(params.filterType as "video" | "home-visit");
    }
  }, [params.filterType]);

  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        throw new Error(
          "Mock API mode is disabled. Please disable USE_MOCK_API.",
        );
      }

      const response = await apiService.getPatientAppointments();

      if (response.success && response.data) {
        const raw = response.data;
        console.log("📋 [getPatientAppointments] სულ ჯავშანი:", raw.length);
        console.log(
          "📋 [getPatientAppointments] თითოეულის type/status (raw API):",
          raw.map((a: any) => ({
            id: String(a._id || a.id || ""),
            type: a.type,
            status: a.status,
            appointmentDate: a.appointmentDate,
            appointmentTime: a.appointmentTime,
            followUpAppointmentId: a.followUpAppointmentId,
            parentAppointmentId: a.parentAppointmentId,
          })),
        );
        if (raw[0]) {
          console.log(
            "📋 [getPatientAppointments] პირველი ჯავშნის სრული raw (keys):",
            Object.keys(raw[0]),
          );
          console.log(
            "📋 [getPatientAppointments] პირველი ჯავშნის raw:",
            JSON.stringify(raw[0], null, 2),
          );
        }
        const apiBaseUrl = apiService.getBaseURL();
        const mappedAppointments = response.data.map((appointment: any) =>
          mapAppointmentFromAPI(appointment, apiBaseUrl),
        );
        console.log(
          "📋 [getPatientAppointments] map-ის შემდეგ (type ველი):",
          mappedAppointments.map((m) => ({
            id: m.id,
            type: m.type,
            isFollowup: m.isFollowUp,
          })),
        );
        setAppointments(mappedAppointments);

        // Pre-load documents count for all appointments to show indicators
        const docsPromises = mappedAppointments.map(
          async (apt: PatientAppointment) => {
            try {
              const docsResponse = await apiService.getAppointmentDocuments(
                apt.id,
              );
              if (docsResponse.success && docsResponse.data) {
                setAppointmentDocuments((prev) => {
                  const newDocs = { ...prev };
                  newDocs[apt.id] = docsResponse.data;
                  return newDocs;
                });
              } else {
                setAppointmentDocuments((prev) => {
                  const newDocs = { ...prev };
                  newDocs[apt.id] = [];
                  return newDocs;
                });
              }
            } catch (error) {
              console.error(
                `Error loading documents for appointment ${apt.id}:`,
                error,
              );
              setAppointmentDocuments((prev) => {
                const newDocs = { ...prev };
                newDocs[apt.id] = [];
                return newDocs;
              });
            }
          },
        );
        // Load documents in background, don't wait
        Promise.all(docsPromises).catch((err) =>
          console.error("Error loading documents:", err),
        );
      } else {
        setAppointments([]);
      }
    } catch (err: any) {
      console.log("Error loading appointments:", err);
      setError(err.message || "ჯავშნების ჩატვირთვა ვერ მოხერხდა");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to calculate time until appointment
  const getTimeUntilAppointment = (appointment: PatientAppointment) => {
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    if (diff < 0) return null; // Past appointment

    // Calculate total hours (round up to nearest hour)
    const totalHours = Math.ceil(diff / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);

    if (days > 0) {
      return `${days} დღე`;
    } else if (totalHours > 0) {
      return `${totalHours} საათი`;
    } else {
      return "ახლა";
    }
  };

  // Check if appointment is starting soon (within 30 minutes)
  const isAppointmentSoon = (appointment: PatientAppointment) => {
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();
    return diff > 0 && diff <= 30 * 60 * 1000; // 30 minutes
  };

  // Check if appointment time has passed (for red styling)
  const isAppointmentTimePassed = (appointment: PatientAppointment) => {
    if (appointment.status !== "scheduled") return false;
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();
    return diff < 0; // Past appointment
  };

  // Check if join button should be active
  // Button is active before appointment time and until 1 hour after appointment time
  const isJoinButtonActive = (appointment: PatientAppointment) => {
    // scheduled / in-progress + raw API სტატუსები (todayAppointment-თან ერთნაირი ლოგიკა)
    if (
      appointment.status !== "scheduled" &&
      appointment.status !== "in-progress" &&
      appointment.status !== "confirmed" &&
      appointment.status !== "pending"
    ) {
      return false;
    }

    // Parse appointment date and time
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );

    // Calculate time difference (negative means past)
    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    // One hour in milliseconds
    const oneHourInMs = 60 * 60 * 1000;

    // Button is active:
    // - Before appointment time (diff > 0) - always show
    // - From appointment time until 1 hour after (diff <= 0 && diff >= -oneHourInMs)
    // So: diff >= -oneHourInMs covers both cases
    return diff >= -oneHourInMs;
  };

  /** დღევანდელი თარიღი YYYY-MM-DD (ლოკალური) — join ღილაკი მხოლოდ ამ დღის ვიდეოზე */
  const isAppointmentDateTodayLocal = (a: PatientAppointment) => {
    if (!a.date) return false;
    const n = currentTime;
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, "0");
    const d = String(n.getDate()).padStart(2, "0");
    return a.date === `${y}-${m}-${d}`;
  };

  /** სლოტიდან 1+ საათი გასული — ვიდეო ზარზე შესვლის ფანჯარა დაკეტილი */
  const isVideoJoinWindowClosed = (a: PatientAppointment) => {
    if (!a.date || !a.time) return true;
    const appointmentDateTime = new Date(`${a.date}T${a.time}`);
    const diff = appointmentDateTime.getTime() - currentTime.getTime();
    return diff < -60 * 60 * 1000;
  };

  const canShowJoinVideoConsultation = (a: PatientAppointment) => {
    if (a.type !== "video") return false;
    if (!isAppointmentDateTodayLocal(a)) return false;
    if (!isJoinButtonActive(a)) return false;
    if (isVideoJoinWindowClosed(a)) return false;
    return true;
  };

  // Check if consultation time has not yet arrived (more than 30 minutes before)
  const isConsultationTimeNotYet = (appointment: PatientAppointment) => {
    if (
      appointment.status !== "scheduled" &&
      appointment.status !== "in-progress"
    ) {
      return false;
    }

    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );

    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    // 30 minutes in milliseconds
    const thirtyMinutesInMs = 30 * 60 * 1000;

    // Consultation time has not yet arrived if diff > 30 minutes
    return diff > thirtyMinutesInMs;
  };

  // Get time remaining until appointment (for waiting screen)
  const getTimeRemaining = (appointment: PatientAppointment) => {
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`,
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    if (diff < 0) return null; // Past appointment

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} დღე ${hours % 24} საათი`;
    } else if (hours > 0) {
      return `${hours} საათი ${minutes} წუთი`;
    } else if (minutes > 0) {
      return `${minutes} წუთი`;
    } else {
      return "ნაკლები წუთი";
    }
  };

  const isUpcomingAppointment = (appointment: PatientAppointment) => {
    if (!appointment.date) {
      console.log("❌ [isUpcomingAppointment] No date:", appointment.id);
      return false;
    }

    // "in-progress" appointments ALWAYS show in appointments (მიმდინარე)
    // regardless of date - this is the active appointment
    if (appointment.status === "in-progress") {
      console.log(
        "✅ [isUpcomingAppointment] In-progress -> show in appointments:",
        appointment.id,
        appointment.date,
      );
      return true;
    }

    // Exclude cancelled appointments - they go to history
    if (appointment.status === "cancelled") {
      console.log(
        "❌ [isUpcomingAppointment] Cancelled -> history:",
        appointment.id,
        appointment.date,
      );
      return false;
    }

    // Exclude completed appointments - they should go to history
    if (appointment.status === "completed") {
      console.log(
        "❌ [isUpcomingAppointment] Completed -> history:",
        appointment.id,
        appointment.date,
      );
      return false;
    }

    // Get today's date in local timezone (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse appointment date and time
    // appointment.date is in YYYY-MM-DD format (from backend UTC converted to local)
    // appointment.time is in HH:MM format
    let appointmentDateTime: Date;

    if (appointment.time) {
      // Create date from YYYY-MM-DD and HH:MM in local timezone
      const [year, month, day] = appointment.date.split("-").map(Number);
      const [hours, minutes] = appointment.time.split(":").map(Number);
      appointmentDateTime = new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
        0,
        0,
      );
    } else {
      // If no time, use date only
      const [year, month, day] = appointment.date.split("-").map(Number);
      appointmentDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (Number.isNaN(appointmentDateTime.getTime())) {
      console.log(
        "❌ [isUpcomingAppointment] Invalid date:",
        appointment.id,
        appointment.date,
        appointment.time,
      );
      return false;
    }

    // Show appointments from today onwards (including today)
    // Compare dates only (ignore time for date comparison)
    const appointmentDateOnly = new Date(appointmentDateTime);
    appointmentDateOnly.setHours(0, 0, 0, 0);

    const isUpcoming = appointmentDateOnly.getTime() >= today.getTime();

    console.log("📅 [isUpcomingAppointment] Check:", {
      appointmentId: appointment.id,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      appointmentDateTime: appointmentDateTime.toISOString(),
      appointmentDateOnly: appointmentDateOnly.toISOString(),
      today: today.toISOString(),
      isUpcoming,
      diff: appointmentDateOnly.getTime() - today.getTime(),
      diffDays:
        (appointmentDateOnly.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    });

    return isUpcoming;
  };

  const upcomingAppointments = appointments.filter(isUpcomingAppointment);

  // Filter appointments
  const filteredAppointments = upcomingAppointments
    .filter((appointment) => {
      const matchesStatus =
        filterStatus === "all" || appointment.status === filterStatus;
      const matchesType =
        filterType === "all" || appointment.type === filterType;
      const matchesStart =
        !filterStartDate || appointment.date >= filterStartDate.trim();
      const matchesEnd =
        !filterEndDate || appointment.date <= filterEndDate.trim();
      return matchesStatus && matchesType && matchesStart && matchesEnd;
    })
    // Sort by date and time - nearest appointment first
    .sort((a, b) => {
      // Parse date and time for comparison
      const getDateTime = (appt: PatientAppointment) => {
        if (!appt.date) return Infinity;
        const [year, month, day] = appt.date.split("-").map(Number);
        const [hours, minutes] = (appt.time || "00:00").split(":").map(Number);
        return new Date(
          year,
          month - 1,
          day,
          hours || 0,
          minutes || 0,
        ).getTime();
      };
      return getDateTime(a) - getDateTime(b);
    });

  // Stats
  const stats = {
    all: upcomingAppointments.length,
    completed: upcomingAppointments.filter((a) => a.status === "completed")
      .length,
    scheduled: upcomingAppointments.filter((a) => a.status === "scheduled")
      .length,
    cancelled: upcomingAppointments.filter((a) => a.status === "cancelled")
      .length,
  };

  const toggleAppointmentExpansion = async (
    appointment: PatientAppointment,
  ) => {
    const isExpanded = expandedAppointments.has(appointment.id);

    if (!isExpanded) {
      // Fetch full appointment details when expanding
      try {
        const appointmentResponse = await apiService.getAppointmentById(
          appointment.id,
        );
        if (appointmentResponse.success && appointmentResponse.data) {
          const fullAppointment = appointmentResponse.data as any;
          // Update appointment in the list with full details
          setAppointments((prev) =>
            prev.map((apt) =>
              apt.id === appointment.id
                ? {
                    ...apt,
                    instrumentalTests: fullAppointment.instrumentalTests || [],
                    laboratoryTests: fullAppointment.laboratoryTests || [],
                    symptoms:
                      fullAppointment.patientDetails?.problem ||
                      fullAppointment.consultationSummary?.symptoms ||
                      apt.symptoms,
                    diagnosis: (
                      fullAppointment.consultationSummary?.diagnosis ||
                      fullAppointment.diagnosis ||
                      apt.diagnosis ||
                      ""
                    ).trim(),
                  }
                : apt,
            ),
          );
        }

        // Load appointment documents
        try {
          const docsResponse = await apiService.getAppointmentDocuments(
            appointment.id,
          );
          if (docsResponse.success && docsResponse.data) {
            // Store documents per appointment
            setAppointmentDocuments((prev) => {
              const newDocs = { ...prev };
              newDocs[appointment.id] = docsResponse.data;
              return newDocs;
            });
          } else {
            // Ensure empty array if no documents
            setAppointmentDocuments((prev) => {
              const newDocs = { ...prev };
              newDocs[appointment.id] = [];
              return newDocs;
            });
          }
        } catch (error) {
          console.error("Error fetching appointment documents:", error);
          setAppointmentDocuments((prev) => {
            const newDocs = { ...prev };
            newDocs[appointment.id] = [];
            return newDocs;
          });
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error);
      }
    }

    setExpandedAppointments((prev) => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.delete(appointment.id);
      } else {
        newSet.add(appointment.id);
      }
      return newSet;
    });
  };

  const handleUploadDocumentForAppointment = async (appointmentId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert("შეცდომა", "ფაილი უნდა იყოს 5MB-მდე");
        return;
      }
      setUploadingDocForId(appointmentId);
      const uploadResp = await apiService.uploadAppointmentDocument(
        appointmentId,
        {
          uri: file.uri,
          name: file.name || "document",
          type: file.mimeType || "application/pdf",
        },
      );
      if (uploadResp.success && uploadResp.data) {
        setAppointmentDocuments((prev) => {
          const next = { ...prev };
          next[appointmentId] = [
            uploadResp.data!,
            ...(prev[appointmentId] || []),
          ];
          return next;
        });
        Alert.alert("წარმატება", "ფაილი აიტვირთა");
      } else {
        Alert.alert("შეცდომა", "ატვირთვა ვერ მოხერხდა");
      }
    } catch (err: any) {
      console.error("Document upload error:", err);
      Alert.alert("შეცდომა", err?.message || "ფაილის ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploadingDocForId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>ჯავშნები</Text>
          <Text style={styles.subtitle}>
            გთხოვთ შეხვიდეთ სისტემაში ჯავშნების სანახავად
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>ჯავშნების ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadAppointments}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const canShowRescheduleAndCancel = (appointment: PatientAppointment) => {
    const dateStr = appointment.date;
    const timeStr = appointment.time || "00:00";
    if (!dateStr) return false;
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(appointmentDateTime.getTime())) return false;
    const diffMs = appointmentDateTime.getTime() - currentTime.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const sixHoursMs = 6 * 60 * 60 * 1000;
    if (appointment.type === "home-visit") {
      return diffMs >= sixHoursMs;
    }
    return diffMs >= twoHoursMs; // video ან სხვა
  };

  // Open reschedule modal and load doctor availability
  const handleOpenReschedule = async (appointment: PatientAppointment) => {
    setShowDetailsModal(false);
    setShowRescheduleModal(true);
    setSelectedRescheduleDate(null);
    setSelectedRescheduleTime(null);
    setLoadingAvailability(true);

    try {
      const appointmentResponse = await apiService.getAppointmentById(
        appointment.id,
      );
      if (appointmentResponse.success && appointmentResponse.data) {
        const apt = appointmentResponse.data as any;
        const doctorId = apt.doctorId?._id || apt.doctorId;
        const appointmentType = apt.type || appointment.type; // video or home-visit
        const availabilityResponse = await apiService.getDoctorAvailability(
          doctorId,
          appointmentType as "video" | "home-visit",
          true,
        );
        console.log(
          "📅 Availability response for type",
          appointmentType,
          ":",
          JSON.stringify(availabilityResponse.data, null, 2),
        );

        if (availabilityResponse.success && availabilityResponse.data) {
          // Flatten availability into slots
          const slots: { date: string; time: string }[] = [];
          const availability = availabilityResponse.data;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // API returns: { date, dayOfWeek, timeSlots, bookedSlots, isAvailable, type }
          availability.forEach((day: any) => {
            // Check if date is in the future
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);

            // Only show future dates and matching type
            if (
              day.isAvailable &&
              day.timeSlots &&
              dayDate >= today &&
              day.type === appointmentType
            ) {
              const bookedSet = new Set(day.bookedSlots || []);
              day.timeSlots.forEach((time: string) => {
                // Only add if not booked
                if (!bookedSet.has(time)) {
                  slots.push({ date: day.date, time });
                }
              });
            }
          });

          console.log(
            "📅 Parsed slots (filtered by type and future dates):",
            slots,
          );
          setAvailableSlots(slots);
        }
      }
    } catch (err) {
      console.error("Error loading availability:", err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Handle reschedule request (patient requests reschedule)
  const handleReschedule = async () => {
    if (
      !selectedAppointment ||
      !selectedRescheduleDate ||
      !selectedRescheduleTime
    )
      return;

    setRescheduleLoading(true);
    try {
      const response = await apiService.requestReschedule(
        selectedAppointment.id,
        selectedRescheduleDate,
        selectedRescheduleTime,
      );

      if (response.success) {
        setShowRescheduleModal(false);
        setSelectedRescheduleDate(null);
        setSelectedRescheduleTime(null);
        // Reload appointments to get updated data
        await loadAppointments();
        Alert.alert("წარმატება", "გადაჯავშნის მოთხოვნა გაიგზავნა ექიმთან");
      } else {
        Alert.alert("შეცდომა", response.message || "გადაჯავშნა ვერ მოხერხდა");
      }
    } catch (err: any) {
      console.error("Reschedule error:", err);
      Alert.alert("შეცდომა", err.message || "გადაჯავშნა ვერ მოხერხდა");
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Handle approve reschedule request
  const handleApproveReschedule = async (
    appointmentId: string,
    appointment?: PatientAppointment,
  ) => {
    // If doctor requested without date/time, patient must choose date/time
    if (
      appointment?.rescheduleRequest &&
      !appointment.rescheduleRequest.requestedDate &&
      !appointment.rescheduleRequest.requestedTime
    ) {
      // Open modal to select date and time
      setApproveRescheduleAppointmentId(appointmentId);
      setApproveRescheduleDate(null);
      setApproveRescheduleTime(null);

      // Load doctor availability
      try {
        setLoadingAvailability(true);
        const appointmentResponse =
          await apiService.getAppointmentById(appointmentId);
        if (appointmentResponse.success && appointmentResponse.data) {
          const apt = appointmentResponse.data as any;
          const doctorId = apt.doctorId?._id || apt.doctorId;

          if (doctorId) {
            const response = await apiService.getDoctorAvailability(
              doctorId.toString(),
              apt.type as "video" | "home-visit",
              true, // forPatient
            );
            if (response.success && response.data) {
              const slots = (response.data as any[]).flatMap((slot: any) => {
                const date = new Date(slot.date);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                return (slot.timeSlots || []).map((time: string) => ({
                  date: dateStr,
                  time,
                }));
              });
              setAvailableSlots(slots);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load availability:", err);
        Alert.alert("შეცდომა", "ხელმისაწვდომი დროების ჩატვირთვა ვერ მოხერხდა");
      } finally {
        setLoadingAvailability(false);
      }

      setShowApproveRescheduleModal(true);
      return;
    }

    // If doctor specified date/time, approve directly
    try {
      const response = await apiService.approveReschedule(appointmentId);
      if (response.success) {
        await loadAppointments();
        Alert.alert("წარმატება", "გადაჯავშნა დამტკიცდა");
      } else {
        Alert.alert("შეცდომა", response.message || "დამტკიცება ვერ მოხერხდა");
      }
    } catch (err: any) {
      console.error("Approve reschedule error:", err);
      Alert.alert("შეცდომა", err.message || "დამტკიცება ვერ მოხერხდა");
    }
  };

  // Handle approve reschedule with date/time selection
  const handleApproveRescheduleWithDate = async () => {
    if (
      !approveRescheduleAppointmentId ||
      !approveRescheduleDate ||
      !approveRescheduleTime
    ) {
      Alert.alert("შეცდომა", "გთხოვთ აირჩიოთ თარიღი და დრო");
      return;
    }

    setApproveRescheduleLoading(true);
    try {
      const response = await apiService.approveReschedule(
        approveRescheduleAppointmentId,
        approveRescheduleDate,
        approveRescheduleTime,
      );
      if (response.success) {
        setShowApproveRescheduleModal(false);
        setApproveRescheduleAppointmentId(null);
        setApproveRescheduleDate(null);
        setApproveRescheduleTime(null);
        await loadAppointments();
        Alert.alert("წარმატება", "გადაჯავშნა დამტკიცდა");
      } else {
        Alert.alert("შეცდომა", response.message || "დამტკიცება ვერ მოხერხდა");
      }
    } catch (err: any) {
      console.error("Approve reschedule error:", err);
      Alert.alert("შეცდომა", err.message || "დამტკიცება ვერ მოხერხდა");
    } finally {
      setApproveRescheduleLoading(false);
    }
  };

  // Handle reject reschedule request
  const handleRejectReschedule = async (appointmentId: string) => {
    Alert.alert(
      "გადაჯავშნის უარყოფა",
      "დარწმუნებული ხართ რომ გსურთ გადაჯავშნის მოთხოვნის უარყოფა?",
      [
        { text: "გაუქმება", style: "cancel" },
        {
          text: "უარყოფა",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiService.rejectReschedule(appointmentId);
              if (response.success) {
                await loadAppointments();
                Alert.alert("წარმატება", "გადაჯავშნის მოთხოვნა უარყოფილია");
              } else {
                Alert.alert(
                  "შეცდომა",
                  response.message || "უარყოფა ვერ მოხერხდა",
                );
              }
            } catch (err: any) {
              console.error("Reject reschedule error:", err);
              Alert.alert("შეცდომა", err.message || "უარყოფა ვერ მოხერხდა");
            }
          },
        },
      ],
    );
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    // Show confirmation alert
    Alert.alert(
      "ჯავშნის გაუქმება",
      "დარწმუნებული ხართ რომ გსურთ ჯავშნის გაუქმება?",
      [
        {
          text: "არა",
          style: "cancel",
        },
        {
          text: "კი, გაუქმება",
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingAppointmentId(appointmentId);
              const response =
                await apiService.cancelAppointment(appointmentId);

              if (response.success) {
                // Reload appointments to get updated data
                await loadAppointments();
                Alert.alert(
                  "წარმატება",
                  response.message || "ჯავშანი წარმატებით გაუქმდა",
                );
              } else {
                Alert.alert(
                  "შეცდომა",
                  response.message || "ჯავშნის გაუქმება ვერ მოხერხდა",
                );
              }
            } catch (err: any) {
              console.error("Cancel appointment error:", err);
              Alert.alert(
                "შეცდომა",
                err.message || "ჯავშნის გაუქმება ვერ მოხერხდა",
              );
            } finally {
              setCancellingAppointmentId(null);
            }
          },
        },
      ],
    );
  };

  // Get unique dates from available slots
  const uniqueDates = [...new Set(availableSlots.map((s) => s.date))];

  // Get times for selected date
  const timesForSelectedDate = selectedRescheduleDate
    ? availableSlots
        .filter((s) => s.date === selectedRescheduleDate)
        .map((s) => s.time)
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>ჩემი ჯავშნები</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/screens/doctors/doctors-list")}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.typeFilterSection}>
          <TouchableOpacity
            style={[
              styles.typeFilterChip,
              filterType === "video" && styles.typeFilterChipActive,
            ]}
            onPress={() =>
              setFilterType(filterType === "video" ? "all" : "video")
            }
          >
            <Ionicons
              name="videocam-outline"
              size={16}
              color={filterType === "video" ? "#0EA5E9" : "#6B7280"}
            />
            <Text
              style={[
                styles.typeFilterText,
                filterType === "video" && styles.typeFilterTextActive,
              ]}
            >
              ვიდეო
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeFilterChip,
              filterType === "home-visit" && styles.typeFilterChipActive,
            ]}
            onPress={() =>
              setFilterType(filterType === "home-visit" ? "all" : "home-visit")
            }
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={filterType === "home-visit" ? "#22C55E" : "#6B7280"}
            />
            <Text
              style={[
                styles.typeFilterText,
                filterType === "home-visit" && styles.typeFilterTextActive,
              ]}
            >
              ბინაზე
            </Text>
          </TouchableOpacity>
        </View>

        {/* Statistics by status */}
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
              მიმდინარე
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter by consultation type (video / home-visit) */}

        {/* Appointments List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredAppointments.length} ჯავშანი
            </Text>
            {/* <TouchableOpacity style={styles.sortButton}>
              <Ionicons name="funnel-outline" size={18} color="#6B7280" />
              <Text
                style={styles.sortText}
                onPress={() => setShowFilterModal(true)}
              >
                ფილტრი
              </Text>
            </TouchableOpacity> */}
          </View>

          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>ჯავშნები ვერ მოიძებნა</Text>
              <Text style={styles.emptyStateText}>
                სცადეთ განსხვავებული ფილტრები
              </Text>
            </View>
          ) : (
            filteredAppointments.map((appointment) => {
              const isExpanded = expandedAppointments.has(appointment.id);
              const documents = appointmentDocuments[appointment.id] || [];

              return (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.appointmentHeader}>
                      <View style={styles.doctorInfo}>
                        <View style={styles.avatarContainer}>
                          {appointment.doctorImage &&
                          typeof appointment.doctorImage === "object" &&
                          "uri" in appointment.doctorImage ? (
                            <Image
                              source={appointment.doctorImage}
                              style={styles.doctorAvatarImage}
                            />
                          ) : (
                            <Ionicons
                              name="medical"
                              size={24}
                              color="#06B6D4"
                            />
                          )}
                        </View>
                        <View style={styles.doctorDetails}>
                          <View style={styles.doctorNameRow}>
                            <Text style={styles.doctorName}>
                              {appointment.doctorName}
                            </Text>
                          </View>
                          <Text style={styles.doctorSpecialty}>
                            {appointment.doctorSpecialty} •{" "}
                            {getConsultationTypeLabel(
                              appointment.type,
                              appointment.isFollowUp,
                            )}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isAppointmentTimePassed(
                              appointment,
                            )
                              ? "#EF444420"
                              : `${getStatusColor(appointment.status)}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: isAppointmentTimePassed(appointment)
                                ? "#EF4444"
                                : getStatusColor(appointment.status),
                            },
                          ]}
                        >
                          {getStatusLabel(appointment.status)}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => toggleAppointmentExpansion(appointment)}
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

                    <View style={styles.appointmentBody}>
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.infoText}>{appointment.date}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.infoText}>{appointment.time}</Text>
                      </View>
                      {appointment.diagnosis && (
                        <View style={styles.diagnosisRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10B981"
                          />
                          <Text style={styles.diagnosisText}>
                            {appointment.diagnosis}
                          </Text>
                        </View>
                      )}
                      {appointment.type === "home-visit" &&
                        appointment.visitAddress && (
                          <View style={styles.infoRow}>
                            <Ionicons
                              name="location-outline"
                              size={16}
                              color="#6B7280"
                            />
                            <Text style={styles.infoText}>
                              {appointment.visitAddress}
                            </Text>
                          </View>
                        )}

                      {canShowJoinVideoConsultation(appointment) && (
                        <TouchableOpacity
                          style={[
                            styles.joinCallButton,
                            isAppointmentSoon(appointment) &&
                              styles.joinCallButtonPulsing,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => {
                            const id = String(appointment.id || "").trim();
                            if (!id) return;
                            router.push({
                              pathname: "/screens/video-call",
                              params: {
                                appointmentId: id,
                                doctorName: appointment.doctorName || "ექიმი",
                                roomName: `medicare-${id}`,
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

                      {/* File indicator */}
                      {documents.length > 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="document-attach-outline"
                            size={16}
                            color="#0EA5E9"
                          />
                          <Text style={[styles.infoText, { color: "#0EA5E9" }]}>
                            {documents.length} ფაილი ატვირთულია
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      {/* დანიშნულება — ფაილის ატვირთვა */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>
                          დანიშნულება
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.uploadDocButton,
                            uploadingDocForId === appointment.id &&
                              styles.uploadDocButtonDisabled,
                          ]}
                          onPress={() =>
                            handleUploadDocumentForAppointment(appointment.id)
                          }
                          disabled={uploadingDocForId === appointment.id}
                        >
                          {uploadingDocForId === appointment.id ? (
                            <ActivityIndicator size="small" color="#0EA5E9" />
                          ) : (
                            <Ionicons
                              name="cloud-upload-outline"
                              size={20}
                              color="#0EA5E9"
                            />
                          )}
                          <Text style={styles.uploadDocButtonText}>
                            {uploadingDocForId === appointment.id
                              ? "იტვირთება..."
                              : "ფაილის ატვირთვა"}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.uploadDocHint, { marginTop: 0 }]}>
                          PDF ან სურათი, მაქს. 5MB
                        </Text>
                        {documents.length > 0 && (
                          <View style={styles.uploadedDocList}>
                            {documents.map((doc: any, idx: number) => (
                              <TouchableOpacity
                                key={doc.url || idx}
                                style={styles.uploadedDocItem}
                                onPress={() => {
                                  if (doc.url) Linking.openURL(doc.url);
                                }}
                              >
                                <Ionicons
                                  name="document-text"
                                  size={18}
                                  color="#0EA5E9"
                                />
                                <Text
                                  style={styles.uploadedDocName}
                                  numberOfLines={1}
                                >
                                  {doc.name || "დოკუმენტი"}
                                </Text>
                                {doc.url && (
                                  <Ionicons
                                    name="open-outline"
                                    size={16}
                                    color="#6B7280"
                                  />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Instrumental Tests */}
                      {appointment.instrumentalTests &&
                        appointment.instrumentalTests.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              დანიშნული ინსტრუმენტული კვლევები
                            </Text>
                            {appointment.instrumentalTests.map(
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

                      {/* Laboratory Tests */}
                      {appointment.laboratoryTests &&
                        appointment.laboratoryTests.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>
                              დანიშნული ლაბორატორიული კვლევები
                            </Text>
                            {appointment.laboratoryTests.map(
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
                    </View>
                  )}

                  {/* Reminder & Join Call Section - Only for video consultations */}

                  {/* Reschedule Request Status - if doctor requested reschedule */}
                  {appointment.rescheduleRequest?.status === "pending" &&
                    appointment.rescheduleRequest?.requestedBy === "doctor" && (
                      <View style={styles.rescheduleRequestCard}>
                        <View style={styles.rescheduleRequestHeader}>
                          <Ionicons
                            name="calendar-outline"
                            size={20}
                            color="#8B5CF6"
                          />
                          <Text style={styles.rescheduleRequestTitle}>
                            ექიმმა მოითხოვა გადაჯავშნა
                          </Text>
                        </View>
                        {appointment.rescheduleRequest.requestedDate &&
                        appointment.rescheduleRequest.requestedTime ? (
                          <Text style={styles.rescheduleRequestText}>
                            ახალი თარიღი:{" "}
                            {appointment.rescheduleRequest.requestedDate}{" "}
                            {appointment.rescheduleRequest.requestedTime}
                          </Text>
                        ) : (
                          <Text style={styles.rescheduleRequestText}>
                            გთხოვთ აირჩიოთ ახალი თარიღი და დრო
                          </Text>
                        )}
                        {appointment.rescheduleRequest.reason && (
                          <Text style={styles.rescheduleRequestReason}>
                            მიზეზი: {appointment.rescheduleRequest.reason}
                          </Text>
                        )}
                        <View style={styles.rescheduleRequestActions}>
                          <TouchableOpacity
                            style={[styles.approveButton, styles.actionButton]}
                            onPress={() =>
                              handleApproveReschedule(
                                appointment.id,
                                appointment,
                              )
                            }
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color="#10B981"
                            />
                            <Text style={styles.approveButtonText}>
                              დამტკიცება
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.rejectButton, styles.actionButton]}
                            onPress={() =>
                              handleRejectReschedule(appointment.id)
                            }
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="#EF4444"
                            />
                            <Text style={styles.rejectButtonText}>უარყოფა</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                  {/* Reschedule Request Status - if patient requested reschedule */}
                  {appointment.rescheduleRequest?.status === "pending" &&
                    appointment.rescheduleRequest?.requestedBy ===
                      "patient" && (
                      <View style={styles.rescheduleRequestCard}>
                        <View style={styles.rescheduleRequestHeader}>
                          <Ionicons
                            name="calendar-outline"
                            size={20}
                            color="#8B5CF6"
                          />
                          <Text style={styles.rescheduleRequestTitle}>
                            გადაჯავშნის მოთხოვნა გაიგზავნა
                          </Text>
                        </View>
                        <Text style={styles.rescheduleRequestText}>
                          ახალი თარიღი:{" "}
                          {appointment.rescheduleRequest.requestedDate}{" "}
                          {appointment.rescheduleRequest.requestedTime}
                        </Text>
                        <Text style={styles.rescheduleRequestStatus}>
                          ექიმის პასუხის მოლოდინში...
                        </Text>
                      </View>
                    )}

                  {/* Reschedule and Cancel - ჩანს მხოლოდ სანამ კონსულტაცია მოვა; განმეორებითზე გადაჯავშნა არ ჩანს */}
                  {(appointment.status === "scheduled" ||
                    appointment.status === "pending") &&
                    !(appointment.rescheduleRequest?.status === "pending") &&
                    canShowRescheduleAndCancel(appointment) &&
                    !appointment.isFollowUp && (
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={[
                            styles.rescheduleCardButton,
                            styles.actionButton,
                            { marginTop: 8 },
                          ]}
                          onPress={() => {
                            setSelectedAppointment(appointment);
                            handleOpenReschedule(appointment);
                          }}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color="#8B5CF6"
                          />
                          <Text style={styles.rescheduleCardButtonText}>
                            გადაჯავშნა
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.cancelCardButton,
                            styles.actionButton,
                            { marginTop: 8 },
                          ]}
                          onPress={() =>
                            handleCancelAppointment(appointment.id)
                          }
                          disabled={cancellingAppointmentId === appointment.id}
                        >
                          {cancellingAppointmentId === appointment.id ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                          ) : (
                            <>
                              <Ionicons
                                name="close-circle-outline"
                                size={18}
                                color="#EF4444"
                              />
                              <Text style={styles.cancelCardButtonText}>
                                გაუქმება
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
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

            {selectedAppointment && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ექიმი</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.doctorName}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>სპეციალობა</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.doctorSpecialty}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>თარიღი და დრო</Text>
                  <Text style={styles.detailValue}>
                    {selectedAppointment.date} • {selectedAppointment.time}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ტიპი</Text>
                  <Text style={styles.detailValue}>
                    {getConsultationTypeLabel(
                      selectedAppointment.type,
                      selectedAppointment.isFollowUp,
                    )}
                  </Text>
                </View>

                {selectedAppointment.type === "home-visit" &&
                  selectedAppointment.visitAddress && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>მისამართი</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.visitAddress}
                      </Text>
                    </View>
                  )}

                {/* დოკუმენტები — თქვენი და ექიმის ფაილები */}
                {appointmentDocuments[selectedAppointment.id] &&
                  appointmentDocuments[selectedAppointment.id].length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>დოკუმენტები</Text>
                      <Text style={styles.uploadDocHint}>
                        თქვენი და ექიმის ფაილები
                      </Text>
                      {appointmentDocuments[selectedAppointment.id].map(
                        (doc: any, idx: number) => (
                          <TouchableOpacity
                            key={doc.url || idx}
                            style={styles.uploadedDocItem}
                            onPress={() => {
                              if (doc.url) Linking.openURL(doc.url);
                            }}
                          >
                            <Ionicons
                              name="document-text"
                              size={18}
                              color="#0EA5E9"
                            />
                            <Text
                              style={styles.uploadedDocName}
                              numberOfLines={1}
                            >
                              {doc.name || "დოკუმენტი"}
                            </Text>
                            {doc.url && (
                              <Ionicons
                                name="open-outline"
                                size={16}
                                color="#6B7280"
                              />
                            )}
                          </TouchableOpacity>
                        ),
                      )}
                    </View>
                  )}

                {selectedAppointment.diagnosis && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>დიაგნოზი</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.diagnosis}
                    </Text>
                  </View>
                )}

                {/* Instrumental Tests */}
                {selectedAppointment.instrumentalTests &&
                  selectedAppointment.instrumentalTests.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        დანიშნული ინსტრუმენტული კვლევები
                      </Text>
                      {selectedAppointment.instrumentalTests.map(
                        (test: any, index: number) => (
                          <View key={index} style={styles.testCard}>
                            <View style={styles.testHeader}>
                              <Ionicons
                                name="pulse-outline"
                                size={20}
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

                {/* Laboratory Tests */}
                {selectedAppointment.laboratoryTests &&
                  selectedAppointment.laboratoryTests.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        დანიშნული ლაბორატორიული კვლევები
                      </Text>
                      {selectedAppointment.laboratoryTests.map(
                        (test: any, index: number) => (
                          <View key={index} style={styles.testCard}>
                            <View style={styles.testHeader}>
                              <Ionicons
                                name="flask-outline"
                                size={20}
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

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ანაზღაურება</Text>
                  <Text style={styles.detailValue}>
                    {typeof selectedAppointment.fee === "number"
                      ? `${selectedAppointment.fee} ₾`
                      : selectedAppointment.fee || "0 ₾"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>გადახდის სტატუსი</Text>
                  <View
                    style={[
                      styles.paymentBadge,
                      selectedAppointment.isPaid
                        ? styles.paymentBadgePaid
                        : styles.paymentBadgePending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentText,
                        selectedAppointment.isPaid
                          ? styles.paymentTextPaid
                          : styles.paymentTextPending,
                      ]}
                    >
                      {selectedAppointment.isPaid ? "გადახდილი" : "მოსალოდნელი"}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

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

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>გადაჯავშნა</Text>
              <TouchableOpacity
                onPress={() => setShowRescheduleModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingAvailability ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#06B6D4" />
                  <Text style={styles.loadingText}>
                    თავისუფალი დროების ჩატვირთვა...
                  </Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>
                    თავისუფალი დრო არ მოიძებნა
                  </Text>
                </View>
              ) : (
                <>
                  {/* Date Selection */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>აირჩიეთ თარიღი</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.dateScrollView}
                    >
                      {uniqueDates.map((date) => (
                        <TouchableOpacity
                          key={date}
                          style={[
                            styles.dateChip,
                            selectedRescheduleDate === date &&
                              styles.dateChipSelected,
                          ]}
                          onPress={() => {
                            setSelectedRescheduleDate(date);
                            setSelectedRescheduleTime(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.dateChipText,
                              selectedRescheduleDate === date &&
                                styles.dateChipTextSelected,
                            ]}
                          >
                            {new Date(date).toLocaleDateString("ka-GE", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Time Selection */}
                  {selectedRescheduleDate && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>აირჩიეთ დრო</Text>
                      <View style={styles.timeGrid}>
                        {timesForSelectedDate.map((time) => (
                          <TouchableOpacity
                            key={time}
                            style={[
                              styles.timeChip,
                              selectedRescheduleTime === time &&
                                styles.timeChipSelected,
                            ]}
                            onPress={() => setSelectedRescheduleTime(time)}
                          >
                            <Text
                              style={[
                                styles.timeChipText,
                                selectedRescheduleTime === time &&
                                  styles.timeChipTextSelected,
                              ]}
                            >
                              {time}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.rescheduleConfirmButton,
                  (!selectedRescheduleDate || !selectedRescheduleTime) &&
                    styles.disabledButton,
                ]}
                onPress={handleReschedule}
                disabled={
                  !selectedRescheduleDate ||
                  !selectedRescheduleTime ||
                  rescheduleLoading
                }
              >
                {rescheduleLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      styles.rescheduleButtonText,
                    ]}
                  >
                    დადასტურება
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approve Reschedule Modal - when doctor requested without date/time */}
      <Modal
        visible={showApproveRescheduleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowApproveRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>აირჩიეთ თარიღი და დრო</Text>
              <TouchableOpacity
                onPress={() => setShowApproveRescheduleModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingAvailability ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#06B6D4" />
                  <Text style={styles.loadingText}>
                    ხელმისაწვდომი დროების ჩატვირთვა...
                  </Text>
                </View>
              ) : (
                <>
                  {/* Date Selection */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>აირჩიეთ თარიღი</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.dateScrollView}
                    >
                      {Array.from(
                        new Set(availableSlots.map((s) => s.date)),
                      ).map((date) => (
                        <TouchableOpacity
                          key={date}
                          style={[
                            styles.dateChip,
                            approveRescheduleDate === date &&
                              styles.dateChipSelected,
                          ]}
                          onPress={() => {
                            setApproveRescheduleDate(date);
                            setApproveRescheduleTime(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.dateChipText,
                              approveRescheduleDate === date &&
                                styles.dateChipTextSelected,
                            ]}
                          >
                            {new Date(date).toLocaleDateString("ka-GE", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Time Selection */}
                  {approveRescheduleDate && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>აირჩიეთ დრო</Text>
                      <View style={styles.timeGrid}>
                        {availableSlots
                          .filter((s) => s.date === approveRescheduleDate)
                          .map((slot) => (
                            <TouchableOpacity
                              key={slot.time}
                              style={[
                                styles.timeChip,
                                approveRescheduleTime === slot.time &&
                                  styles.timeChipSelected,
                              ]}
                              onPress={() =>
                                setApproveRescheduleTime(slot.time)
                              }
                            >
                              <Text
                                style={[
                                  styles.timeChipText,
                                  approveRescheduleTime === slot.time &&
                                    styles.timeChipTextSelected,
                                ]}
                              >
                                {slot.time}
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowApproveRescheduleModal(false)}
              >
                <Text style={styles.modalButtonText}>გაუქმება</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.rescheduleButton,
                  (!approveRescheduleDate ||
                    !approveRescheduleTime ||
                    approveRescheduleLoading) &&
                    styles.disabledButton,
                ]}
                onPress={handleApproveRescheduleWithDate}
                disabled={
                  !approveRescheduleDate ||
                  !approveRescheduleTime ||
                  approveRescheduleLoading
                }
              >
                {approveRescheduleLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      styles.rescheduleButtonText,
                    ]}
                  >
                    დამტკიცება
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Consultation time not yet modal */}
      <Modal
        visible={showConsultationTimeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConsultationTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={[
                styles.modalHeader,
                { justifyContent: "center", flexDirection: "column", gap: 12 },
              ]}
            >
              <Ionicons name="time-outline" size={48} color="#F59E0B" />
              <Text style={styles.modalTitle}>კონსულტაციის დრო არ მოვიდა</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                ვერ შეხვალ ჯერ კონსულტაციის დრო არაა. გთხოვთ დაელოდოთ
                კონსულტაციის დროს.
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => setShowConsultationTimeModal(false)}
              >
                <Text
                  style={[styles.modalButtonText, styles.primaryButtonText]}
                >
                  გასაგებია
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ფილტრი</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>საწყისი თარიღი</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
                  <Text
                    style={[
                      styles.dateInputText,
                      !filterStartDate && styles.dateInputTextPlaceholder,
                    ]}
                  >
                    {filterStartDate || "აირჩიე თარიღი"}
                  </Text>
                  {filterStartDate && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setFilterStartDate("");
                      }}
                      style={styles.clearDateButton}
                    >
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showStartPicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={
                        filterStartDate ? new Date(filterStartDate) : new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowStartPicker(false);
                        if (event.type === "dismissed") return;
                        if (selectedDate) {
                          setFilterStartDate(
                            selectedDate.toISOString().split("T")[0],
                          );
                        }
                      }}
                    />
                  </View>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>ბოლო თარიღი</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
                  <Text
                    style={[
                      styles.dateInputText,
                      !filterEndDate && styles.dateInputTextPlaceholder,
                    ]}
                  >
                    {filterEndDate || "აირჩიე თარიღი"}
                  </Text>
                  {filterEndDate && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setFilterEndDate("");
                      }}
                      style={styles.clearDateButton}
                    >
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showEndPicker && (
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={
                        filterEndDate ? new Date(filterEndDate) : new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowEndPicker(false);
                        if (event.type === "dismissed") return;
                        if (selectedDate) {
                          setFilterEndDate(
                            selectedDate.toISOString().split("T")[0],
                          );
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>გასუფთავება</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalButtonTextPrimary,
                  ]}
                >
                  ფილტრი
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    marginBottom: 12,
    gap: 12,
  },
  typeFilterSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  typeFilterChip: {
    width: "50%",
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  typeFilterChipActive: {
    backgroundColor: "#E0F2FE",
  },
  typeFilterText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  typeFilterTextActive: {
    color: "#0F172A",
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
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#06B6D410",
    justifyContent: "center",
    alignItems: "center",
  },
  doctorDetails: {
    flex: 1,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  soonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#FEE2E2",
    borderRadius: 4,
  },
  soonText: {
    fontSize: 10,
    fontFamily: "Poppins-Bold",
    color: "#EF4444",
  },
  doctorSpecialty: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  appointmentBody: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  symptomsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 8,
  },
  symptomsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    fontStyle: "italic",
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 8,
  },
  diagnosisText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  appointmentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feeAmount: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentBadgePaid: {
    backgroundColor: "#10B98120",
  },
  paymentBadgePending: {
    backgroundColor: "#F59E0B20",
  },
  paymentText: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
  },
  paymentTextPaid: {
    color: "#10B981",
  },
  paymentTextPending: {
    color: "#F59E0B",
  },
  testCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  testHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  testNotes: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  reminderSection: {
    marginTop: 8,
    gap: 8,
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  reminderBadgeUrgent: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  reminderText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#D97706",
  },
  reminderTextUrgent: {
    color: "#DC2626",
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  joinCallButton: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#10B981",
    borderRadius: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  joinCallButtonPulsing: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  joinCallButtonDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  joinCallText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  completeHomeVisitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeHomeVisitButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.7,
  },
  completeHomeVisitButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  completeHomeVisitButtonTextDisabled: {
    color: "#6B7280",
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
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
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
  },
  detailSection: {
    marginBottom: 20,
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
  modalButtonTextPrimary: {
    color: "#FFFFFF",
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: "#06B6D4",
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minHeight: 52,
  },
  dateInputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  dateInputTextPlaceholder: {
    color: "#94A3B8",
    fontFamily: "Poppins-Regular",
  },
  clearDateButton: {
    padding: 4,
  },
  pickerContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    color: "#6B7280",
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
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  doctorAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  // Reschedule styles
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rescheduleCardButton: {
    backgroundColor: "#F3E8FF",
    borderColor: "#DDD6FE",
  },
  rescheduleCardButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#8B5CF6",
  },
  cancelCardButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
  },
  cancelCardButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#EF4444",
  },
  rescheduleButton: {
    backgroundColor: "#8B5CF6",
    flexDirection: "row",
    gap: 8,
  },
  rescheduleButtonText: {
    color: "#FFFFFF",
  },
  rescheduleConfirmButton: {
    backgroundColor: "#06B6D4",
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
  },
  rescheduleRequestCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rescheduleRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  rescheduleRequestTitle: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  rescheduleRequestText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 4,
  },
  rescheduleRequestReason: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginBottom: 12,
    fontStyle: "italic",
  },
  rescheduleRequestStatus: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#F59E0B",
    marginTop: 8,
  },
  rescheduleRequestActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#10B981",
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#EF4444",
  },
  dateScrollView: {
    marginTop: 8,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateChipSelected: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  dateChipText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  dateChipTextSelected: {
    color: "#FFFFFF",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 70,
    alignItems: "center",
  },
  timeChipSelected: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  timeChipText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#4B5563",
  },
  timeChipTextSelected: {
    color: "#FFFFFF",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  viewFileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0F2FE",
    gap: 12,
  },
  viewFileButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
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
  detailSectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 12,
  },
  uploadDocButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    marginBottom: 4,
  },
  uploadDocButtonDisabled: {
    opacity: 0.7,
  },
  uploadDocButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#0EA5E9",
  },
  uploadDocHint: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 12,
  },
  uploadedDocList: {
    gap: 8,
  },
  uploadedDocItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  uploadedDocName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#374151",
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
  fileIndicatorBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
});

export default Appointment;
