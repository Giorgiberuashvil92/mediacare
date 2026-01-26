import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

interface VisitRecord {
  id: string;
  date: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentId?: string;
}

export default function MedicalRecordsScreen() {
  const { user } = useAuth();
  const [patientVisits, setPatientVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadMedicalRecords();
    }
     
  }, [user?.id]);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        setLoading(false);
        return;
      }

      const response = await apiService.getPatientAppointments();

      if (response.success && response.data) {
        // Map appointments to visit records
        const visits: VisitRecord[] = response.data.map((apt: any) => {
          const doctor = apt.doctorId || {};
          return {
            id: apt._id || apt.id || "",
            date: apt.appointmentDate || "",
            doctorName: doctor.name || "ექიმი",
            doctorSpecialty: doctor.specialization || "",
            appointmentId: apt._id || apt.id || "",
          };
        });
        setPatientVisits(visits);
      } else {
        setPatientVisits([]);
      }
    } catch (err: any) {
      console.error("Error loading medical records:", err);
      setError(err.message || "მედიცინური ჩანაწერების ჩატვირთვა ვერ მოხერხდა");
      setPatientVisits([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ka-GE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (date: string) => {
    const visitDate = new Date(date);
    const today = new Date();
    const diffTime = today.getTime() - visitDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return "#10B981"; // ახალი
    if (diffDays <= 30) return "#F59E0B"; // ბოლო თვე
    return "#6B7280"; // ძველი
  };

  const renderVisitCard = (visit: VisitRecord) => {
    const statusColor = getStatusColor(visit.date);

    return (
      <View key={visit.id} style={styles.visitCard}>
        <TouchableOpacity
          style={styles.visitHeader}
          onPress={() =>
            router.push({
              pathname: "/screens/appointment/appointment-details",
              params: {
                appointmentId: visit.appointmentId || visit.id,
                doctorId: "",
              },
            })
          }
        >
          <View style={styles.visitHeaderLeft}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <View style={styles.visitHeaderInfo}>
              <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
              <Text style={styles.doctorName}>{visit.doctorName}</Text>
              <Text style={styles.doctorSpecialty}>
                {visit.doctorSpecialty}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#06B6D4" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <View style={styles.backButtonIcon}>
            <Ionicons name="arrow-back" size={20} color="#06B6D4" />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>პირადი კაბინეტი</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Stats */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="document-text" size={24} color="#06B6D4" />
          </View>
          <Text style={styles.summaryValue}>{patientVisits.length}</Text>
          <Text style={styles.summaryLabel}>სულ ვიზიტი</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="medical" size={24} color="#10B981" />
          </View>
          <Text style={styles.summaryValue}>
            {patientVisits.filter((v) => {
              const visitDate = new Date(v.date);
              const today = new Date();
              const diffDays = Math.ceil((today.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays <= 15;
            }).length}
          </Text>
          <Text style={styles.summaryLabel}>ბოლო 15 დღე</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="calendar" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.summaryValue}>
            {patientVisits.filter((v) => {
              const visitDate = new Date(v.date);
              const today = new Date();
              return visitDate >= today;
            }).length}
          </Text>
          <Text style={styles.summaryLabel}>მომავალი</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>მონაცემების ჩატვირთვა...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadMedicalRecords}
          >
            <Text style={styles.retryButtonText}>ხელახლა ცდა</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#06B6D4" />
            <Text style={styles.infoText}>
              დააჭირეთ ვიზიტს დეტალური ინფორმაციისთვის
            </Text>
          </View>

          {/* Visits List */}
          <View style={styles.visitsSection}>
            {patientVisits.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>
                  მედიცინური ჩანაწერები ვერ მოიძებნა
                </Text>
                <Text style={styles.emptyStateText}>
                  თქვენ არ გაქვთ დაჯავშნილი ვიზიტები
                </Text>
              </View>
            ) : (
              patientVisits.map((visit) => renderVisitCard(visit))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {},
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  summarySection: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F0FDFA",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#06B6D4",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#0F766E",
  },
  visitsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  visitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  visitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  visitHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  visitHeaderInfo: {
    flex: 1,
  },
  visitDate: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
    padding: 40,
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
});
