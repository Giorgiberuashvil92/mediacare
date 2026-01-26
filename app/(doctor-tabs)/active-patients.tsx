import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../_services/api";

interface LabTest {
  id: string;
  productId: string;
  productName: string;
  status: "pending" | "in-cart" | "paid" | "completed";
  hasResult: boolean;
  resultFileUrl?: string | null;
}

interface ActivePatient {
  id: string;
  patientId: string;
  patientName: string;
  patientImage?: string;
  appointmentDate: string;
  appointmentTime: string;
  status: "confirmed" | "in-progress" | "completed";
  type: "video" | "home-visit" | "followup";
  problem?: string;
  visitAddress?: string;
  // Form 100 status
  hasForm100: boolean;
  form100?: {
    id?: string;
    pdfUrl?: string;
    fileName?: string;
    issueDate?: string;
  };
  // Lab results - dynamic from appointment
  labTests: LabTest[];
  labResultsCompleted: number;
  labResultsTotal: number;
}

export default function ActivePatientsScreen() {
  const { type } = useLocalSearchParams<{ type: "video" | "home-visit" }>();
  const [patients, setPatients] = useState<ActivePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ActivePatient | null>(null);
  const [showLabModal, setShowLabModal] = useState(false);

  const isVideoType = type === "video";
  const title = isVideoType ? "ვიდეო კონსულტაცია" : "ბინაზე გამოძახება";
  const accentColor = isVideoType ? "#0EA5E9" : "#10B981";

  const loadPatients = useCallback(async () => {
    try {
      const response = await apiService.getDoctorDashboardAppointments(100);
      
      if (response.success && Array.isArray(response.data)) {
        const relevantStatuses = ["scheduled", "confirmed", "in-progress", "completed"];
        const filtered = response.data
          .filter((apt: any) => {
            // For followup appointments, check originalType instead of type
            // For regular appointments, check type directly
            const matchesType = apt.type === "followup" 
              ? apt.originalType === type 
              : apt.type === type;
            const isRelevant = relevantStatuses.includes(apt.status);
            return matchesType && isRelevant;
          })
          .map((apt: any): ActivePatient => {
            if (apt.laboratoryTests && apt.laboratoryTests.length > 0) {
              console.log('🧪 [ActivePatients] Lab tests for appointment:', apt._id || apt.id);
              console.log('🧪 [ActivePatients] Patient:', apt.patientName);
              console.log('🧪 [ActivePatients] Raw laboratoryTests:', JSON.stringify(apt.laboratoryTests, null, 2));
            }
            
            // Extract lab tests from appointment
            const labTests: LabTest[] = (apt.laboratoryTests || []).map((test: any) => {
              return {
                id: test._id || test.productId,
                productId: test.productId,
                productName: test.productName || "უცნობი კვლევა",
                status: test.resultFile?.url ? "completed" : (test.status || "pending"),
                hasResult: !!(test.resultFile?.url),
                resultFileUrl: test.resultFile?.url || null,
              };
            });
            
            const labResultsCompleted = labTests.filter(t => t.hasResult).length;
            const labResultsTotal = labTests.length;

            return {
              id: apt._id || apt.id,
              patientId: apt.patientId?._id || apt.patientId || "",
              // patientName comes directly from dashboard API, or fallback to patientDetails
              patientName: apt.patientName 
                || (apt.patientDetails?.name && apt.patientDetails?.lastName
                  ? `${apt.patientDetails.name} ${apt.patientDetails.lastName}`
                  : apt.patientId?.name || "უცნობი პაციენტი"),
              patientImage: apt.patientId?.profileImage,
              // date/time might come as 'date'/'time' or 'appointmentDate'/'appointmentTime'
              appointmentDate: apt.date || apt.appointmentDate?.split("T")[0] || "",
              appointmentTime: apt.time || apt.appointmentTime || "",
              status: apt.status === "scheduled" ? "confirmed" : (apt.status || "confirmed"),
              type: apt.type || "video",
              problem: apt.symptoms || apt.patientDetails?.problem || apt.notes,
              visitAddress: apt.visitAddress,
              // Form 100 status
              hasForm100: !!(apt.form100?.pdfUrl || apt.form100?.id),
              form100: apt.form100 ? {
                id: apt.form100.id,
                pdfUrl: apt.form100.pdfUrl,
                fileName: apt.form100.fileName,
                issueDate: apt.form100.issueDate,
              } : undefined,
              // Lab results - dynamic from appointment
              labTests,
              labResultsCompleted,
              labResultsTotal,
            };
          });
        
        // Sort by date and time (earliest first)
        // Parse dates in local timezone (same as patient side)
        filtered.sort((a: ActivePatient, b: ActivePatient) => {
          const [yearA, monthA, dayA] = a.appointmentDate.split('-').map(Number);
          const [hoursA, minutesA] = a.appointmentTime.split(':').map(Number);
          const dateTimeA = new Date(yearA, monthA - 1, dayA, hoursA, minutesA, 0, 0);
          
          const [yearB, monthB, dayB] = b.appointmentDate.split('-').map(Number);
          const [hoursB, minutesB] = b.appointmentTime.split(':').map(Number);
          const dateTimeB = new Date(yearB, monthB - 1, dayB, hoursB, minutesB, 0, 0);
          
          return dateTimeA.getTime() - dateTimeB.getTime();
        });
        
        setPatients(filtered);
      }
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  }, [loadPatients]);

  const filteredPatients = patients.filter((p) =>
    p.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "დანიშნული";
      case "in-progress": return "მიმდინარე";
      case "completed": return "დასრულებული";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "#10B981";
      case "in-progress": return "#0EA5E9";
      case "completed": return "#6B7280";
      default: return "#6B7280";
    }
  };

  const renderPatientItem = ({ item }: { item: ActivePatient }) => {
    // Lab status: complete if all results are received, or no tests assigned
    const hasLabTests = item.labResultsTotal > 0;
    const labComplete = hasLabTests && item.labResultsCompleted === item.labResultsTotal;
    const labPending = hasLabTests && item.labResultsCompleted < item.labResultsTotal;

    return (
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => {
          // If it's a followup consultation, navigate to patients (recurring) tab
          // Otherwise, navigate to appointments (current) tab
          const targetPath = item.type === "followup" 
            ? "/(doctor-tabs)/patients" 
            : "/(doctor-tabs)/appointments";
          router.push({
            pathname: targetPath as any,
            params: { appointmentId: item.id },
          });
        }}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.patientHeader}>
          <View style={styles.avatarContainer}>
            {item.patientImage ? (
              <Image
                source={{ uri: item.patientImage }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: accentColor }]}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <View style={styles.appointmentRow}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.appointmentText}>
                {new Date(item.appointmentDate).toLocaleDateString("ka-GE")} • {item.appointmentTime}
              </Text>
            </View>
            {item.problem && (
              <Text style={styles.problemText} numberOfLines={1}>
                {item.problem}
              </Text>
            )}
            {!isVideoType && item.visitAddress && (
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={12} color="#10B981" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {item.visitAddress}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Form 100 & Lab Status */}
        <View style={styles.statusRow}>
          {/* Form 100 */}
          <TouchableOpacity
            style={[
              styles.statusItem,
              item.hasForm100 ? styles.statusItemGreen : styles.statusItemRed,
            ]}
            onPress={() => {
              // Navigate to appointment details to upload/view Form 100
              router.push({
                pathname: "/(doctor-tabs)/appointments" as any,
                params: { appointmentId: item.id },
              });
            }}
          >
            <Ionicons
              name="document-text"
              size={18}
              color={item.hasForm100 ? "#10B981" : "#EF4444"}
            />
            <Text style={[styles.statusItemText, { color: item.hasForm100 ? "#10B981" : "#EF4444" }]}>
              {item.hasForm100 ? "ფორმა 100 ✓" : "ფორმა 100 ❌"}
            </Text>
            {!item.hasForm100 && (
              <View style={styles.alertDot} />
            )}
          </TouchableOpacity>

          {/* Lab Results - Temporarily commented out */}
          {/* <TouchableOpacity
            style={[
              styles.statusItem,
              !hasLabTests ? styles.statusItemGray : (labComplete ? styles.statusItemGreen : styles.statusItemYellow),
            ]}
            onPress={() => {
              setSelectedPatient(item);
              setShowLabModal(true);
            }}
          >
            <Ionicons
              name={hasLabTests ? "flask" : "flask-outline"}
              size={18}
              color={!hasLabTests ? "#9CA3AF" : (labComplete ? "#10B981" : "#F59E0B")}
            />
            <View style={styles.labStatusContent}>
              <Text style={[
                styles.statusItemText, 
                { color: !hasLabTests ? "#9CA3AF" : (labComplete ? "#10B981" : "#F59E0B") }
              ]}>
                {!hasLabTests 
                  ? "ლაბ. კვლევა: —" 
                  : `ლაბ. პასუხები: ${item.labResultsCompleted}/${item.labResultsTotal}`
                }
              </Text>
              {labPending && (
                <Text style={styles.labWaitingText}>
                  ⏳ {item.labResultsTotal - item.labResultsCompleted} კვლევას ველოდებით
                </Text>
              )}
            </View>
            {labPending && (
              <View style={[styles.alertDot, { backgroundColor: "#F59E0B" }]} />
            )}
          </TouchableOpacity> */}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          

          

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#F59E0B20" }]}
            onPress={() => {
              router.push({
                pathname: "/(doctor-tabs)/laboratory" as any,
                params: { 
                  patientId: item.patientId, 
                  patientName: item.patientName,
                  appointmentId: item.id,
                },
              });
            }}
          >
            <Ionicons name="flask-outline" size={18} color="#F59E0B" />
            <Text style={[styles.actionButtonText, { color: "#F59E0B" }]}>კვლევები</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>პაციენტების ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={[styles.headerIcon, { backgroundColor: accentColor }]}>
            <Ionicons
              name={isVideoType ? "videocam" : "home"}
              size={16}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={styles.statLabel}>სულ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: "#EF4444" }]}>
            {patients.filter(p => !p.hasForm100).length}
          </Text>
          <Text style={styles.statLabel}>ფორმა 100 ❌</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: "#F59E0B" }]}>
            {patients.filter(p => p.labResultsTotal > 0 && p.labResultsCompleted < p.labResultsTotal).length}
          </Text>
          <Text style={styles.statLabel}>ლაბ. მოლოდინში</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="პაციენტის ძებნა..."
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

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        renderItem={renderPatientItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={isVideoType ? "videocam-outline" : "home-outline"}
              size={64}
              color="#D1D5DB"
            />
            <Text style={styles.emptyTitle}>პაციენტები არ მოიძებნა</Text>
            <Text style={styles.emptySubtitle}>
              აქტიური {isVideoType ? "ვიდეო კონსულტაციები" : "ბინაზე ვიზიტები"} აქ გამოჩნდება
            </Text>
          </View>
        }
      />

      {/* Lab Tests Modal */}
      <Modal
        visible={showLabModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLabModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.labModalContainer}>
            {/* Modal Header */}
            <View style={styles.labModalHeader}>
              <View style={styles.labModalHeaderIcon}>
                <Ionicons name="flask" size={24} color="#F59E0B" />
              </View>
              <View style={styles.labModalHeaderText}>
                <Text style={styles.labModalTitle}>ლაბორატორიული კვლევები</Text>
                {selectedPatient && (
                  <Text style={styles.labModalSubtitle}>
                    {selectedPatient.patientName} • {selectedPatient.appointmentDate}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.labModalCloseButton}
                onPress={() => setShowLabModal(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Lab Tests List */}
            <ScrollView style={styles.labModalContent}>
              {selectedPatient && selectedPatient.labTests.length > 0 ? (
                <>
                  {/* Summary */}
                  <View style={styles.labSummary}>
                    <View style={styles.labSummaryItem}>
                      <Text style={styles.labSummaryValue}>{selectedPatient.labResultsTotal}</Text>
                      <Text style={styles.labSummaryLabel}>სულ კვლევა</Text>
                    </View>
                    <View style={styles.labSummaryDivider} />
                    <View style={styles.labSummaryItem}>
                      <Text style={[styles.labSummaryValue, { color: "#10B981" }]}>
                        {selectedPatient.labResultsCompleted}
                      </Text>
                      <Text style={styles.labSummaryLabel}>დასრულებული</Text>
                    </View>
                    <View style={styles.labSummaryDivider} />
                    <View style={styles.labSummaryItem}>
                      <Text style={[styles.labSummaryValue, { color: "#F59E0B" }]}>
                        {selectedPatient.labResultsTotal - selectedPatient.labResultsCompleted}
                      </Text>
                      <Text style={styles.labSummaryLabel}>მოლოდინში</Text>
                    </View>
                  </View>

                  {/* Tests List */}
                  <Text style={styles.labTestsHeader}>დანიშნული კვლევები:</Text>
                  {selectedPatient.labTests.map((test, index) => (
                    <View key={`${test.id}-${index}`} style={styles.labTestItem}>
                      <View style={[
                        styles.labTestStatusDot,
                        { backgroundColor: test.hasResult ? "#10B981" : "#F59E0B" }
                      ]} />
                      <View style={styles.labTestInfo}>
                        <Text style={styles.labTestName}>{test.productName}</Text>
                        <Text style={[
                          styles.labTestStatus,
                          { color: test.hasResult ? "#10B981" : "#F59E0B" }
                        ]}>
                          {test.hasResult ? "✓ შედეგი მიღებულია" : "⏳ მოლოდინში"}
                        </Text>
                      </View>
                      {test.hasResult && test.resultFileUrl && (
                        <TouchableOpacity 
                          style={styles.labTestViewButton}
                          onPress={async () => {
                            console.log('🧪 [ActivePatients] Opening result file:', test.resultFileUrl);
                            try {
                              const canOpen = await Linking.canOpenURL(test.resultFileUrl!);
                              if (canOpen) {
                                await Linking.openURL(test.resultFileUrl!);
                              } else {
                                Alert.alert("შეცდომა", "ფაილის გახსნა ვერ მოხერხდა");
                              }
                            } catch (error) {
                              console.error('Error opening result file:', error);
                              Alert.alert("შეცდომა", "ფაილის გახსნა ვერ მოხერხდა");
                            }
                          }}
                        >
                          <Ionicons name="eye-outline" size={20} color="#0EA5E9" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.labEmptyState}>
                  <Ionicons name="flask-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.labEmptyText}>
                    ლაბორატორიული კვლევა არ არის დანიშნული
                  </Text>
                  <Text style={styles.labEmptySubtext}>
                    დააჭირეთ ქვემოთ მოცემულ ღილაკს ახალი კვლევის დასანიშნად
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Modal Footer - Add New Test Button */}
            <View style={styles.labModalFooter}>
              <TouchableOpacity
                style={styles.addLabTestButton}
                onPress={() => {
                  setShowLabModal(false);
                  router.push({
                    pathname: "/(doctor-tabs)/laboratory" as any,
                    params: {
                      appointmentId: selectedPatient?.id,
                      patientId: selectedPatient?.patientId,
                      patientName: selectedPatient?.patientName,
                    },
                  });
                }}
              >
                <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
                <Text style={styles.addLabTestButtonText}>ახალი კვლევის დამატება</Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  headerRight: {
    width: 40,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  appointmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  appointmentText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  problemText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 4,
    fontStyle: "italic",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  statusRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statusItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  statusItemGreen: {
    backgroundColor: "#ECFDF5",
  },
  statusItemRed: {
    backgroundColor: "#FEF2F2",
  },
  statusItemYellow: {
    backgroundColor: "#FFFBEB",
  },
  statusItemGray: {
    backgroundColor: "#F3F4F6",
  },
  statusItemText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  labStatusContent: {
    flex: 1,
    flexDirection: "column",
  },
  labWaitingText: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#F59E0B",
    marginTop: 2,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#4B5563",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  // Lab Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  labModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  labModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  labModalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  labModalHeaderText: {
    flex: 1,
  },
  labModalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  labModalSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  labModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  labModalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: 400,
  },
  labSummary: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  labSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  labSummaryValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  labSummaryLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  labSummaryDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  labTestsHeader: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#4B5563",
    marginBottom: 12,
  },
  labTestItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  labTestStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  labTestInfo: {
    flex: 1,
  },
  labTestName: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  labTestStatus: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginTop: 2,
  },
  labTestViewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  labEmptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  labEmptyText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#4B5563",
    marginTop: 16,
  },
  labEmptySubtext: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  labModalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  addLabTestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addLabTestButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

