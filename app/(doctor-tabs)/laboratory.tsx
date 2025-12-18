import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { apiService } from "../services/api";
import { showToast } from "../utils/toast";

interface LabTest {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
}

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  date: string;
  time: string;
  type: "video" | "home-visit";
  status: string;
}

interface PrescribedTest {
  id: string;
  testId: string;
  testName: string;
  patientId: string;
  patientName: string;
  prescribedDate: string;
  doctorName: string;
  status: "pending" | "in-cart" | "paid" | "completed";
}

export default function LaboratoryScreen() {
  const params = useLocalSearchParams<{ 
    patientId?: string; 
    patientName?: string;
    appointmentId?: string;
  }>();
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescribedTests, setPrescribedTests] = useState<PrescribedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [preSelectedApplied, setPreSelectedApplied] = useState(false);
  
  // Modal states
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState("");
  
  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([
    { id: "all", name: "ყველა" },
  ]);

  const loadData = useCallback(async () => {
    try {
      // Load lab products and appointments in parallel
      const [overviewResponse, appointmentsResponse] = await Promise.all([
        apiService.getMedicineShopOverview(),
        apiService.getDoctorDashboardAppointments(100),
      ]);
      
      // Load lab tests from API
      if (overviewResponse.success && overviewResponse.data) {
        // First, build category map from laboratoryCategories
        const categoryMap: Record<string, string> = {};
        if (overviewResponse.data.laboratoryCategories) {
          overviewResponse.data.laboratoryCategories.forEach((cat: any) => {
            const catId = cat._id || cat.id;
            categoryMap[catId] = cat.name;
          });
        }
        
        // Map lab products with category names
        const labProducts = (overviewResponse.data.laboratoryProducts || []).map((p: any): LabTest => ({
          id: p._id || p.id,
          name: p.name,
          category: p.category || "other",
          price: p.price || 0,
          description: p.description,
        }));
        setLabTests(labProducts);
        
        // Build dynamic categories from laboratoryCategories
        const dynamicCategories = [
          { id: "all", name: "ყველა" },
          ...(overviewResponse.data.laboratoryCategories || []).map((cat: any) => ({
            id: cat._id || cat.id,
            name: cat.name,
          })),
        ];
        setCategories(dynamicCategories);
      }
      
      // Build appointments list for lab test assignment
      if (appointmentsResponse.success && Array.isArray(appointmentsResponse.data)) {
        const allowedStatuses = ["scheduled", "confirmed", "in-progress", "completed"];
        const appointmentList: Appointment[] = appointmentsResponse.data
          .filter((apt: any) => allowedStatuses.includes(apt.status))
          .map((apt: any): Appointment => ({
            id: apt.id,
            patientName: apt.patientName || "უცნობი პაციენტი",
            patientId: apt.patientId || "",
            date: apt.date || "",
            time: apt.time || "",
            type: apt.type || "video",
            status: apt.status,
          }));
        
        // Sort by date (newest first)
        appointmentList.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
          const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        setAppointments(appointmentList);
        
        // If came from active-patients screen with appointment - pre-select it
        if (!preSelectedApplied && (params.appointmentId || params.patientId)) {
          // Prioritize appointmentId if provided
          if (params.appointmentId) {
            const matchingApt = appointmentList.find((a) => a.id === params.appointmentId);
            if (matchingApt) {
              setSelectedAppointment(matchingApt);
              setPreSelectedApplied(true);
            }
          } else if (params.patientId || params.patientName) {
            // Fallback to patientId/patientName matching
            const matchingApt = appointmentList.find(
              (a) => a.patientId === params.patientId || a.patientName === params.patientName
            );
            if (matchingApt) {
              setSelectedAppointment(matchingApt);
              setPreSelectedApplied(true);
            }
          }
        }
      }
      
      // Load prescribed tests from appointments
      if (appointmentsResponse.success && Array.isArray(appointmentsResponse.data)) {
        const allPrescribed: PrescribedTest[] = [];
        appointmentsResponse.data.forEach((apt: any) => {
          if (apt.laboratoryTests && Array.isArray(apt.laboratoryTests)) {
            apt.laboratoryTests.forEach((test: any) => {
              allPrescribed.push({
                id: `${apt.id}-${test.productId}`,
                testId: test.productId,
                testName: test.productName,
                patientId: apt.patientId || "",
                patientName: apt.patientName || "უცნობი პაციენტი",
                prescribedDate: apt.date || "",
                doctorName: "თქვენ",
                status: test.resultFile ? "completed" : (test.status || "pending"),
              });
            });
          }
        });
        setPrescribedTests(allPrescribed);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [params.appointmentId, params.patientId, params.patientName, preSelectedApplied]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredTests = labTests.filter((test) => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });


  const toggleTestSelection = (test: LabTest) => {
    setSelectedTests((prev) =>
      prev.find((t) => t.id === test.id)
        ? prev.filter((t) => t.id !== test.id)
        : [...prev, test]
    );
  };

  const handlePrescribe = async () => {
    if (!selectedAppointment) {
      showToast.error("გთხოვთ აირჩიოთ ჯავშანი", "შეცდომა");
      return;
    }
    if (selectedTests.length === 0) {
      showToast.error("გთხოვთ აირჩიოთ კვლევები", "შეცდომა");
      return;
    }

    try {
      // Call API to assign lab tests to appointment
      const testsToSend = selectedTests.map((test) => ({
        productId: test.id,
        productName: test.name,
      }));
      
      const response = await apiService.assignLaboratoryTests(
        selectedAppointment.id,
        testsToSend
      );

      if (response.success) {
        const newPrescribed: PrescribedTest[] = selectedTests.map((test, idx) => ({
          id: `new-${Date.now()}-${idx}`,
          testId: test.id,
          testName: test.name,
          patientId: selectedAppointment.patientId,
          patientName: selectedAppointment.patientName,
          prescribedDate: new Date().toISOString().split("T")[0],
          doctorName: "თქვენ",
          status: "pending" as const,
        }));

        setPrescribedTests((prev) => [...newPrescribed, ...prev]);
        setSelectedTests([]);
        setSelectedAppointment(null);
        setShowTestModal(false);
        
        showToast.success(
          `${selectedTests.length} კვლევა დაენიშნა`,
          "წარმატება"
        );
      } else {
        showToast.error(response.message || "კვლევების დანიშვნა ვერ მოხერხდა", "შეცდომა");
      }
    } catch (error) {
      console.error("Error prescribing tests:", error);
      showToast.error("კვლევების დანიშვნა ვერ მოხერხდა", "შეცდომა");
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "მოლოდინში";
      case "in-cart": return "კალათაში";
      case "paid": return "გადახდილი";
      case "completed": return "შესრულებული";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#9CA3AF";
      case "in-cart": return "#F59E0B";
      case "paid": return "#0EA5E9";
      case "completed": return "#10B981";
      default: return "#6B7280";
    }
  };

  const renderTestItem = ({ item }: { item: LabTest }) => {
    const isSelected = selectedTests.find((t) => t.id === item.id);
    return (
      <TouchableOpacity
        style={[styles.testItem, isSelected && styles.testItemSelected]}
        onPress={() => toggleTestSelection(item)}
        activeOpacity={0.7}
      >
        <View style={styles.testInfo}>
          <Text style={styles.testName}>{item.name}</Text>
          <Text style={styles.testPrice}>{item.price} ₾</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPrescribedItem = ({ item }: { item: PrescribedTest }) => (
    <View style={styles.prescribedCard}>
      <View style={styles.prescribedHeader}>
        <View style={styles.prescribedIcon}>
          <Ionicons name="flask" size={20} color="#F59E0B" />
        </View>
        <View style={styles.prescribedInfo}>
          <Text style={styles.prescribedTestName}>{item.testName}</Text>
          <Text style={styles.prescribedPatient}>{item.patientName}</Text>
        </View>
        <View style={[styles.prescribedStatus, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.prescribedStatusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      <View style={styles.prescribedFooter}>
        <Text style={styles.prescribedDate}>
          <Ionicons name="calendar-outline" size={12} color="#9CA3AF" /> {item.prescribedDate}
        </Text>
        <Text style={styles.prescribedDoctor}>დანიშნა: {item.doctorName}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIcon}>
            <Ionicons name="flask" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>ლაბორატორია</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Prescribe Card */}
        <View style={styles.prescribeCard}>
          <Text style={styles.prescribeTitle}>კვლევების დანიშვნა</Text>
          <Text style={styles.prescribeSubtitle}>
            აირჩიეთ ჯავშანი და ლაბორატორიული კვლევები
          </Text>

          {/* Appointment Selection */}
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setShowAppointmentModal(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={[styles.selectionText, selectedAppointment && styles.selectionTextActive]}>
              {selectedAppointment
                ? `${selectedAppointment.patientName} • ${selectedAppointment.date} ${selectedAppointment.time}`
                : "აირჩიეთ ჯავშანი"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Tests Selection */}
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setShowTestModal(true)}
          >
            <Ionicons name="flask-outline" size={20} color="#6B7280" />
            <Text style={[styles.selectionText, selectedTests.length > 0 && styles.selectionTextActive]}>
              {selectedTests.length > 0
                ? `${selectedTests.length} კვლევა არჩეულია`
                : "აირჩიეთ კვლევები"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Selected Tests Preview */}
          {selectedTests.length > 0 && (
            <View style={styles.selectedPreview}>
              {selectedTests.slice(0, 3).map((test) => (
                <View key={test.id} style={styles.selectedChip}>
                  <Text style={styles.selectedChipText}>{test.name}</Text>
                  <TouchableOpacity onPress={() => toggleTestSelection(test)}>
                    <Ionicons name="close-circle" size={16} color="#F59E0B" />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedTests.length > 3 && (
                <View style={styles.moreChip}>
                  <Text style={styles.moreChipText}>+{selectedTests.length - 3}</Text>
                </View>
              )}
            </View>
          )}

          {/* Total & Prescribe Button */}
          {selectedTests.length > 0 && (
            <View style={styles.prescribeFooter}>
              <View>
                <Text style={styles.totalLabel}>ჯამი:</Text>
                <Text style={styles.totalValue}>
                  {selectedTests.reduce((sum, t) => sum + t.price, 0)} ₾
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.prescribeButton, !selectedAppointment && styles.prescribeButtonDisabled]}
                onPress={handlePrescribe}
                disabled={!selectedAppointment}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.prescribeButtonText}>დანიშვნა</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Prescribed Tests History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>დანიშნული კვლევები</Text>
          {prescribedTests.length > 0 ? (
            prescribedTests.map((item, index) => (
              <View key={`${item.id}-${index}`}>{renderPrescribedItem({ item })}</View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>დანიშნული კვლევები არ არის</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Appointment Selection Modal */}
      <Modal
        visible={showAppointmentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>აირჩიეთ ჯავშანი</Text>
              <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearch}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="პაციენტის სახელი..."
                placeholderTextColor="#9CA3AF"
                value={appointmentSearchQuery}
                onChangeText={setAppointmentSearchQuery}
              />
            </View>

            <FlatList
              data={appointments.filter((apt) =>
                apt.patientName.toLowerCase().includes(appointmentSearchQuery.toLowerCase())
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.patientItem,
                    selectedAppointment?.id === item.id && styles.patientItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAppointment(item);
                    setShowAppointmentModal(false);
                  }}
                >
                  <View style={[styles.patientAvatar, { backgroundColor: item.type === "video" ? "#0EA5E9" : "#10B981" }]}>
                    <Ionicons name={item.type === "video" ? "videocam" : "home"} size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{item.patientName}</Text>
                    <Text style={styles.patientId}>
                      {item.date} • {item.time} • {item.status === "scheduled" || item.status === "confirmed" ? "დანიშნული" : item.status === "in-progress" ? "მიმდინარე" : "დასრულებული"}
                    </Text>
                  </View>
                  {selectedAppointment?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
              ListEmptyComponent={
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>ჯავშნები არ მოიძებნა</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Test Selection Modal */}
      <Modal
        visible={showTestModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>აირჩიეთ კვლევები</Text>
              <TouchableOpacity onPress={() => setShowTestModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryContent}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Search */}
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="კვლევის ძებნა..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredTests}
              keyExtractor={(item) => item.id}
              renderItem={renderTestItem}
              contentContainerStyle={styles.modalList}
            />

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>
                არჩეულია: {selectedTests.length} კვლევა
              </Text>
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setShowTestModal(false)}
              >
                <Text style={styles.modalDoneButtonText}>მზადაა</Text>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F59E0B",
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
  prescribeCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  prescribeTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  prescribeSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 16,
  },
  selectionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  selectionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  selectionTextActive: {
    color: "#1F2937",
    fontFamily: "Poppins-Medium",
  },
  selectedPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#92400E",
  },
  moreChip: {
    backgroundColor: "#F59E0B",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  moreChipText: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  prescribeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  prescribeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  prescribeButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  prescribeButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 12,
  },
  prescribedCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  prescribedHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  prescribedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  prescribedInfo: {
    flex: 1,
  },
  prescribedTestName: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  prescribedPatient: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  prescribedStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prescribedStatusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  prescribedFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  prescribedDate: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  prescribedDoctor: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  emptySection: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptySectionText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
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
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  modalSearch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 44,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  categoryChipActive: {
    backgroundColor: "#F59E0B",
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  modalList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  testItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  testItemSelected: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginBottom: 2,
  },
  testPrice: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#F59E0B",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#F59E0B",
    borderColor: "#F59E0B",
  },
  patientItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  patientItemSelected: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  patientId: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalFooterText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  modalDoneButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalDoneButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

