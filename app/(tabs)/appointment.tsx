import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  type: string;
  fee: string | number;
  isPaid: boolean;
  symptoms?: string;
  diagnosis?: string;
  doctorImage?: any;
  visitAddress?: string;
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

const getConsultationTypeLabel = (type: string) => {
  switch (type) {
    case "video":
      return "ვიდეო კონსულტაცია";
    case "home-visit":
      return "ბინაზე ვიზიტი";
    case "consultation":
      return "კონსულტაცია";
    case "followup":
      return "განმეორებითი";
    case "emergency":
      return "სასწრაფო";
    default:
      return type;
  }
};

// Helper function to map backend appointment to app format
const mapAppointmentFromAPI = (appointment: any, apiBaseUrl: string): PatientAppointment => {
  // Handle populated doctorId (object) or non-populated doctorId (string/ObjectId)
  let doctor: any = {};
  if (appointment.doctorId) {
    if (typeof appointment.doctorId === 'object' && appointment.doctorId.name) {
      // Populated doctor object
      doctor = appointment.doctorId;
    } else {
      // Non-populated, just ID - this shouldn't happen if backend populates correctly
      console.warn('Doctor not populated for appointment:', appointment._id);
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
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        console.log('📅 [mapAppointmentFromAPI] Date parsing:', {
          appointmentId: appointment._id || appointment.id,
          original: appointment.appointmentDate,
          dateObject: date.toISOString(),
          localYear: year,
          localMonth: month,
          localDay: day,
          formatted: formattedDate,
          utcYear: date.getUTCFullYear(),
          utcMonth: String(date.getUTCMonth() + 1).padStart(2, '0'),
          utcDay: String(date.getUTCDate()).padStart(2, '0'),
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
  const mappedStatus = statusMap[appointment.status] || appointment.status || "scheduled";

  // Determine consultation type (default to consultation)
  const consultationType = appointment.type || "video";

  // Format fee
  const fee = appointment.totalAmount || appointment.consultationFee || 0;

  return {
    id: appointment._id || appointment.id || "",
    doctorName: doctor.name || "ექიმი",
    doctorSpecialty: doctor.specialization || "",
    date: appointmentDate,
    time: appointment.appointmentTime || "",
    status: mappedStatus,
    type: consultationType,
    fee: typeof fee === 'number' ? fee : parseFloat(String(fee).replace(/[^\d.]/g, '')) || 0,
    isPaid: appointment.paymentStatus === "paid" || appointment.paymentStatus === "completed",
    symptoms: appointment.patientDetails?.problem || appointment.notes || "",
    diagnosis: appointment.diagnosis || "",
    visitAddress: appointment.visitAddress,
    doctorImage: doctorImage,
  };
};

const Appointment = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "scheduled" | "cancelled"
  >("all");
  const [filterType, setFilterType] = useState<"all" | "video" | "home-visit">(
    "all",
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<PatientAppointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
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
  const [availableSlots, setAvailableSlots] = useState<{ date: string; time: string; }[]>([]);
  const [selectedRescheduleDate, setSelectedRescheduleDate] = useState<string | null>(null);
  const [selectedRescheduleTime, setSelectedRescheduleTime] = useState<string | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Load appointments from API
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAppointments();
    } else {
      setLoading(false);
    }
     
  }, [isAuthenticated, user?.id]);

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
        console.log('🔍 response.data:', response.data);
        const apiBaseUrl = apiService.getBaseURL();
        const mappedAppointments = response.data.map((appointment: any) =>
          mapAppointmentFromAPI(appointment, apiBaseUrl)
        );
        setAppointments(mappedAppointments);
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
      `${appointment.date}T${appointment.time}`
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();

    if (diff < 0) return null; // Past appointment

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

  // Check if appointment is starting soon (within 30 minutes)
  const isAppointmentSoon = (appointment: PatientAppointment) => {
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.time}`
    );
    const diff = appointmentDateTime.getTime() - currentTime.getTime();
    return diff > 0 && diff <= 30 * 60 * 1000; // 30 minutes
  };

  const isUpcomingAppointment = (appointment: PatientAppointment) => {
    if (!appointment.date) {
      console.log('❌ [isUpcomingAppointment] No date:', appointment.id);
      return false;
    }

    // Exclude cancelled appointments
    if (appointment.status === "cancelled") {
      console.log('❌ [isUpcomingAppointment] Cancelled:', appointment.id, appointment.date);
      return false;
    }

    // Exclude completed appointments - they should go to history
    if (appointment.status === "completed") {
      console.log('❌ [isUpcomingAppointment] Completed:', appointment.id, appointment.date);
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
      const [year, month, day] = appointment.date.split('-').map(Number);
      const [hours, minutes] = appointment.time.split(':').map(Number);
      appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    } else {
      // If no time, use date only
      const [year, month, day] = appointment.date.split('-').map(Number);
      appointmentDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (Number.isNaN(appointmentDateTime.getTime())) {
      console.log('❌ [isUpcomingAppointment] Invalid date:', appointment.id, appointment.date, appointment.time);
      return false;
    }

    // Show appointments from today onwards (including today)
    // Compare dates only (ignore time for date comparison)
    const appointmentDateOnly = new Date(appointmentDateTime);
    appointmentDateOnly.setHours(0, 0, 0, 0);
    
    const isUpcoming = appointmentDateOnly.getTime() >= today.getTime();
    
    console.log('📅 [isUpcomingAppointment] Check:', {
      appointmentId: appointment.id,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      appointmentDateTime: appointmentDateTime.toISOString(),
      appointmentDateOnly: appointmentDateOnly.toISOString(),
      today: today.toISOString(),
      isUpcoming,
      diff: appointmentDateOnly.getTime() - today.getTime(),
      diffDays: (appointmentDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
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
        const [year, month, day] = appt.date.split('-').map(Number);
        const [hours, minutes] = (appt.time || '00:00').split(':').map(Number);
        return new Date(year, month - 1, day, hours || 0, minutes || 0).getTime();
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

  const openDetails = (appointment: PatientAppointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
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

  // Open reschedule modal and load doctor availability
  const handleOpenReschedule = async (appointment: PatientAppointment) => {
    setShowDetailsModal(false);
    setShowRescheduleModal(true);
    setSelectedRescheduleDate(null);
    setSelectedRescheduleTime(null);
    setLoadingAvailability(true);
    
    try {
      // Get the doctor ID from the original appointment
      const appointmentResponse = await apiService.getAppointmentById(appointment.id);
      if (appointmentResponse.success && appointmentResponse.data) {
        const doctorId = appointmentResponse.data.doctorId?._id || appointmentResponse.data.doctorId;
        
        // Load doctor availability
        const availabilityResponse = await apiService.getDoctorAvailability(doctorId);
        if (availabilityResponse.success && availabilityResponse.data) {
          // Flatten availability into slots
          const slots: { date: string; time: string }[] = [];
          const availability = availabilityResponse.data;
          
          // Get next 14 days of available slots
          const today = new Date();
          for (let i = 1; i <= 14; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            
            // Find availability for this day
            const dayAvailability = availability.find((a: any) => a.dayOfWeek?.toLowerCase() === dayOfWeek);
            if (dayAvailability?.slots) {
              dayAvailability.slots.forEach((slot: any) => {
                if (slot.available) {
                  slots.push({ date: dateStr, time: slot.time });
                }
              });
            }
          }
          setAvailableSlots(slots);
        }
      }
    } catch (err) {
      console.error('Error loading availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Handle reschedule confirmation
  const handleReschedule = async () => {
    if (!selectedAppointment || !selectedRescheduleDate || !selectedRescheduleTime) return;
    
    setRescheduleLoading(true);
    try {
      const response = await apiService.rescheduleAppointment(
        selectedAppointment.id,
        selectedRescheduleDate,
        selectedRescheduleTime
      );
      
      if (response.success) {
        setShowRescheduleModal(false);
        setSelectedRescheduleDate(null);
        setSelectedRescheduleTime(null);
        // Reload appointments to get updated data
        await loadAppointments();
      } else {
        console.error('Reschedule failed:', response.message);
      }
    } catch (err) {
      console.error('Reschedule error:', err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Get unique dates from available slots
  const uniqueDates = [...new Set(availableSlots.map(s => s.date))];
  
  // Get times for selected date
  const timesForSelectedDate = selectedRescheduleDate 
    ? availableSlots.filter(s => s.date === selectedRescheduleDate).map(s => s.time)
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
              filterStatus === "all" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("all")}
          >
            <Ionicons
              name="list"
              size={24}
              color={filterStatus === "all" ? "#06B6D4" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "all" && styles.statValueActive,
              ]}
            >
              {stats.all}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "all" && styles.statLabelActive,
              ]}
            >
              ყველა
            </Text>
          </TouchableOpacity>

      

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
              filterStatus === "cancelled" && styles.statCardActive,
            ]}
            onPress={() => setFilterStatus("cancelled")}
          >
            <Ionicons
              name="close-circle"
              size={24}
              color={filterStatus === "cancelled" ? "#EF4444" : "#6B7280"}
            />
            <Text
              style={[
                styles.statValue,
                filterStatus === "cancelled" && styles.statValueActive,
              ]}
            >
              {stats.cancelled}
            </Text>
            <Text
              style={[
                styles.statLabel,
                filterStatus === "cancelled" && styles.statLabelActive,
              ]}
            >
              გაუქმებული
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
            filteredAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => openDetails(appointment)}
                >
                  <View style={styles.appointmentHeader}>
                    <View style={styles.doctorInfo}>
                      <View style={styles.avatarContainer}>
                        {appointment.doctorImage && typeof appointment.doctorImage === 'object' && 'uri' in appointment.doctorImage ? (
                          <Image source={appointment.doctorImage} style={styles.doctorAvatarImage} />
                        ) : (
                          <Ionicons name="medical" size={24} color="#06B6D4" />
                        )}
                      </View>
                      <View style={styles.doctorDetails}>
                        <View style={styles.doctorNameRow}>
                          <Text style={styles.doctorName}>
                            {appointment.doctorName}
                          </Text>
                          {appointment.status === "scheduled" &&
                            isAppointmentSoon(appointment) && (
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
                        <Text style={styles.doctorSpecialty}>
                          {appointment.doctorSpecialty} •{" "}
                          {getConsultationTypeLabel(appointment.type)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: `${getStatusColor(
                            appointment.status
                          )}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(appointment.status) },
                        ]}
                      >
                        {getStatusLabel(appointment.status)}
                      </Text>
                    </View>
                  </View>
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
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.infoText}>{appointment.time}</Text>
                  </View>
                  {appointment.symptoms && (
                    <View style={styles.symptomsRow}>
                      <Ionicons name="medical" size={16} color="#6B7280" />
                      <Text style={styles.symptomsText}>
                        {appointment.symptoms}
                      </Text>
                    </View>
                  )}
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
                </View>

                {/* Reminder & Join Call Section */}
                {appointment.status === "scheduled" && (
                  <View style={styles.reminderSection}>
                    {getTimeUntilAppointment(appointment) && (
                      <View
                        style={[
                          styles.reminderBadge,
                          isAppointmentSoon(appointment) &&
                            styles.reminderBadgeUrgent,
                        ]}
                      >
                        <Ionicons
                          name={
                            isAppointmentSoon(appointment)
                              ? "alarm"
                              : "time-outline"
                          }
                          size={16}
                          color={
                            isAppointmentSoon(appointment)
                              ? "#EF4444"
                              : "#F59E0B"
                          }
                        />
                        <Text
                          style={[
                            styles.reminderText,
                            isAppointmentSoon(appointment) &&
                              styles.reminderTextUrgent,
                          ]}
                        >
                          {getTimeUntilAppointment(appointment)} დარჩა
                        </Text>
                        {isAppointmentSoon(appointment) && (
                          <View style={styles.urgentDot} />
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.joinCallButton,
                        isAppointmentSoon(appointment) &&
                          styles.joinCallButtonPulsing,
                      ]}
                      onPress={() => {
                        router.push({
                          pathname: "/screens/video-call",
                          params: {
                            appointmentId: appointment.id,
                            doctorName: appointment.doctorName,
                            roomName: `medicare-${appointment.id}`,
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
                  </View>
                )}

                {/* Reschedule button - only for scheduled appointments */}
                {(appointment.status === "scheduled" || appointment.status === "pending") && (
                  <TouchableOpacity
                    style={styles.rescheduleCardButton}
                    onPress={() => {
                      setSelectedAppointment(appointment);
                      handleOpenReschedule(appointment);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.rescheduleCardButtonText}>გადაჯავშნა</Text>
                    <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
                  </TouchableOpacity>
                )}

                <View style={styles.appointmentFooter}>
                  <View style={styles.feeRow}>
                    <Ionicons name="wallet" size={16} color="#6B7280" />
                    <Text style={styles.feeAmount}>
                      {typeof appointment.fee === 'number' 
                        ? `${appointment.fee} ₾`
                        : appointment.fee || "0 ₾"}
                    </Text>
                    <View
                      style={[
                        styles.paymentBadge,
                        appointment.isPaid
                          ? styles.paymentBadgePaid
                          : styles.paymentBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentText,
                          appointment.isPaid
                            ? styles.paymentTextPaid
                            : styles.paymentTextPending,
                        ]}
                      >
                        {appointment.isPaid ? "გადახდილი" : "მოსალოდნელი"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
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
                    {getConsultationTypeLabel(selectedAppointment.type)}
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

                {selectedAppointment.symptoms && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>სიმპტომები</Text>
                    <Text style={styles.detailValue}>
                      {selectedAppointment.symptoms}
                    </Text>
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

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ანაზღაურება</Text>
                  <Text style={styles.detailValue}>
                    {typeof selectedAppointment.fee === 'number' 
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
                  <Text style={styles.loadingText}>თავისუფალი დროების ჩატვირთვა...</Text>
                </View>
              ) : availableSlots.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>თავისუფალი დრო არ მოიძებნა</Text>
                </View>
              ) : (
                <>
                  {/* Date Selection */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>აირჩიეთ თარიღი</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollView}>
                      {uniqueDates.map((date) => (
                        <TouchableOpacity
                          key={date}
                          style={[
                            styles.dateChip,
                            selectedRescheduleDate === date && styles.dateChipSelected
                          ]}
                          onPress={() => {
                            setSelectedRescheduleDate(date);
                            setSelectedRescheduleTime(null);
                          }}
                        >
                          <Text style={[
                            styles.dateChipText,
                            selectedRescheduleDate === date && styles.dateChipTextSelected
                          ]}>
                            {new Date(date).toLocaleDateString('ka-GE', { weekday: 'short', day: 'numeric', month: 'short' })}
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
                              selectedRescheduleTime === time && styles.timeChipSelected
                            ]}
                            onPress={() => setSelectedRescheduleTime(time)}
                          >
                            <Text style={[
                              styles.timeChipText,
                              selectedRescheduleTime === time && styles.timeChipTextSelected
                            ]}>
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
                  (!selectedRescheduleDate || !selectedRescheduleTime) && styles.disabledButton
                ]}
                onPress={handleReschedule}
                disabled={!selectedRescheduleDate || !selectedRescheduleTime || rescheduleLoading}
              >
                {rescheduleLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.rescheduleButtonText]}>დადასტურება</Text>
                )}
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
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>საწყისი თარიღი</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
                  <Text style={[
                    styles.dateInputText,
                    !filterStartDate && styles.dateInputTextPlaceholder
                  ]}>
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
                        filterStartDate
                          ? new Date(filterStartDate)
                          : new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowStartPicker(false);
                        if (event.type === "dismissed") return;
                        if (selectedDate) {
                          setFilterStartDate(selectedDate.toISOString().split("T")[0]);
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
                  <Text style={[
                    styles.dateInputText,
                    !filterEndDate && styles.dateInputTextPlaceholder
                  ]}>
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
                        filterEndDate
                          ? new Date(filterEndDate)
                          : new Date()
                      }
                      mode="date"
                      display="default"
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowEndPicker(false);
                        if (event.type === "dismissed") return;
                        if (selectedDate) {
                          setFilterEndDate(selectedDate.toISOString().split("T")[0]);
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
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
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
    marginBottom: 12,
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
  joinCallText: {
    fontSize: 14,
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
  rescheduleCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#F3E8FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  rescheduleCardButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#8B5CF6",
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
});

export default Appointment;
