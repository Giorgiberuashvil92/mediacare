import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { showToast } from "../utils/toast";

type ExamType = "laboratory" | "instrumental";

interface LabTest {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  type: ExamType;
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
  appointmentId?: string; // Add appointmentId to filter by specific appointment
  type?: ExamType; // Add type to filter by laboratory or instrumental
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
  const [filteredPrescribedTests, setFilteredPrescribedTests] = useState<PrescribedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [preSelectedApplied, setPreSelectedApplied] = useState<string | null>(null);
  
  // Type filter (laboratory vs instrumental)
  const [selectedType, setSelectedType] = useState<ExamType>("laboratory");
  
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
  
  // Store all categories by type
  const [allCategories, setAllCategories] = useState<{
    laboratory: { id: string; name: string }[];
    instrumental: { id: string; name: string }[];
  }>({ laboratory: [], instrumental: [] });

  const loadData = useCallback(async () => {
    try {
      // Load lab products and appointments in parallel
      const [overviewResponse, appointmentsResponse] = await Promise.all([
        apiService.getMedicineShopOverview(),
        apiService.getDoctorDashboardAppointments(100),
      ]);
      
      // Load lab tests from API
      if (overviewResponse.success && overviewResponse.data) {
        // Map laboratory products
        const labProducts = (overviewResponse.data.laboratoryProducts || []).map((p: any): LabTest => ({
          id: p._id || p.id,
          name: p.name,
          category: p.category || "other",
          price: p.price || 0,
          description: p.description,
          type: "laboratory" as ExamType,
        }));
        
        // Map equipment/instrumental products
        const instrumentalProducts = (overviewResponse.data.equipmentProducts || []).map((p: any): LabTest => ({
          id: p._id || p.id,
          name: p.name,
          category: p.category || "other",
          price: p.price || 0,
          description: p.description,
          type: "instrumental" as ExamType,
        }));
        
        // Combine all products
        setLabTests([...labProducts, ...instrumentalProducts]);
        
        // Build dynamic categories for each type
        const labCategories = [
          { id: "all", name: "ყველა" },
          ...(overviewResponse.data.laboratoryCategories || []).map((cat: any) => ({
            id: cat._id || cat.id,
            name: cat.name,
          })),
        ];
        
        const instrumentalCategories = [
          { id: "all", name: "ყველა" },
          ...(overviewResponse.data.equipmentCategories || []).map((cat: any) => ({
            id: cat._id || cat.id,
            name: cat.name,
          })),
        ];
        
        setAllCategories({
          laboratory: labCategories,
          instrumental: instrumentalCategories,
        });
        
        // Set initial categories based on selected type
        setCategories(labCategories);
      }
      
      // Build appointments list for lab test assignment
      console.log('🏥 [Laboratory] appointmentsResponse:', {
        success: appointmentsResponse.success,
        hasData: !!appointmentsResponse.data,
        dataType: Array.isArray(appointmentsResponse.data) ? 'array' : typeof appointmentsResponse.data,
        dataLength: Array.isArray(appointmentsResponse.data) ? appointmentsResponse.data.length : 'N/A',
        fullResponse: JSON.stringify(appointmentsResponse, null, 2),
      });
      
      if (appointmentsResponse.success && Array.isArray(appointmentsResponse.data)) {
        console.log('🏥 [Laboratory] Total appointments from API:', appointmentsResponse.data.length);
        console.log('🏥 [Laboratory] First 3 raw appointments:', appointmentsResponse.data.slice(0, 3));
        
        const allowedStatuses = ["scheduled", "confirmed", "in-progress"]; // მხოლოდ მიმდინარე appointments, დასრულებული აღარ
        
        // Log all appointments before filtering
        console.log('🏥 [Laboratory] All appointments statuses:', 
          appointmentsResponse.data.map((apt: any) => ({
            id: apt.id,
            status: apt.status,
            patientName: apt.patientName,
          }))
        );
        
        // სპეციალურად ვნახოთ "in-progress" და "completed" სტატუსების appointments
        const inProgressAppts = appointmentsResponse.data.filter((apt: any) => apt.status === "in-progress");
        const completedAppts = appointmentsResponse.data.filter((apt: any) => apt.status === "completed");
        
        console.log('🟡 [Laboratory] მიმდინარე appointments (in-progress):', {
          count: inProgressAppts.length,
          appointments: inProgressAppts.map((apt: any) => ({
            id: apt.id,
            patientName: apt.patientName,
            patientId: apt.patientId?._id || apt.patientId,
            date: apt.date,
            time: apt.time,
            type: apt.type,
            status: apt.status,
            fullData: apt,
          })),
        });
        
        console.log('🟢 [Laboratory] დასრულებული appointments (completed):', {
          count: completedAppts.length,
          appointments: completedAppts.map((apt: any) => ({
            id: apt.id,
            patientName: apt.patientName,
            patientId: apt.patientId?._id || apt.patientId,
            date: apt.date,
            time: apt.time,
            type: apt.type,
            status: apt.status,
            fullData: apt,
          })),
        });
        
        const appointmentList: Appointment[] = appointmentsResponse.data
          .filter((apt: any) => {
            const isAllowed = allowedStatuses.includes(apt.status);
            if (!isAllowed) {
              console.log('❌ [Laboratory] Appointment filtered out:', {
                id: apt.id,
                status: apt.status,
                patientName: apt.patientName,
              });
            }
            return isAllowed;
          })
          .map((apt: any): Appointment => {
            // Extract patientId - can be object or string
            const patientId = apt.patientId?._id || apt.patientId || "";
            
            console.log('🏥 [Laboratory] Processing appointment:', {
              id: apt.id,
              patientName: apt.patientName,
              rawPatientId: apt.patientId,
              patientIdType: typeof apt.patientId,
              extractedPatientId: patientId,
              date: apt.date,
              time: apt.time,
              type: apt.type,
              status: apt.status,
              fullApt: JSON.stringify(apt, null, 2),
            });
            
            return {
              id: apt.id,
              patientName: apt.patientName || "უცნობი პაციენტი",
              patientId: patientId,
              date: apt.date || "",
              time: apt.time || "",
              type: apt.type || "video",
              status: apt.status,
            };
          });
        
        console.log('🏥 [Laboratory] Filtered appointmentList length:', appointmentList.length);
        console.log('🏥 [Laboratory] Final appointmentList:', appointmentList);
        
        // Sort by date (newest first)
        // Parse dates in local timezone (same as patient side)
        appointmentList.sort((a, b) => {
          const [yearA, monthA, dayA] = a.date.split('-').map(Number);
          const [hoursA, minutesA] = (a.time || "00:00").split(':').map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA, hoursA, minutesA, 0, 0);
          
          const [yearB, monthB, dayB] = b.date.split('-').map(Number);
          const [hoursB, minutesB] = (b.time || "00:00").split(':').map(Number);
          const dateB = new Date(yearB, monthB - 1, dayB, hoursB, minutesB, 0, 0);
          
          return dateB.getTime() - dateA.getTime();
        });
        
        setAppointments(appointmentList);
        
        // If came from active-patients screen with appointment - pre-select it automatically
        const currentParamsKey = params.appointmentId || params.patientId || params.patientName || null;
        if (preSelectedApplied !== currentParamsKey && currentParamsKey) {
          // Prioritize appointmentId if provided - automatically select that specific appointment
          if (params.appointmentId) {
            const matchingApt = appointmentList.find((a) => a.id === params.appointmentId);
            if (matchingApt) {
              console.log('✅ [Laboratory] Auto-selecting appointment from params.appointmentId:', matchingApt.id);
              setSelectedAppointment(matchingApt);
              setPreSelectedApplied(currentParamsKey);
            }
          } else if (params.patientId || params.patientName) {
            // Fallback to patientId/patientName matching - select first matching appointment
            const matchingApt = appointmentList.find(
              (a) => a.patientId === params.patientId || a.patientName === params.patientName
            );
            if (matchingApt) {
              console.log('✅ [Laboratory] Auto-selecting appointment from params.patientId/patientName:', matchingApt.id);
              setSelectedAppointment(matchingApt);
              setPreSelectedApplied(currentParamsKey);
            }
          }
        }
      }
      
      // Load all prescribed tests from appointments (will be filtered later)
      // Build product type map locally for use in prescribed tests
      const localTypeMap = new Map<string, ExamType>();
      if (overviewResponse.success && overviewResponse.data) {
        const labProducts = overviewResponse.data.laboratoryProducts || [];
        const instrumentalProducts = overviewResponse.data.equipmentProducts || [];
        labProducts.forEach((p: any) => localTypeMap.set(p._id || p.id, "laboratory"));
        instrumentalProducts.forEach((p: any) => localTypeMap.set(p._id || p.id, "instrumental"));
      }
      
      if (appointmentsResponse.success && Array.isArray(appointmentsResponse.data)) {
        const allPrescribed: PrescribedTest[] = [];
        appointmentsResponse.data.forEach((apt: any) => {
          // Extract patientId - can be object or string
          const aptPatientId = apt.patientId?._id || apt.patientId || "";
          const aptPatientName = apt.patientName || "უცნობი პაციენტი";
          
          if (apt.laboratoryTests && Array.isArray(apt.laboratoryTests)) {
            console.log('🧪 [Laboratory] Processing lab tests for appointment:', {
              aptId: apt.id,
              patientName: aptPatientName,
              rawPatientId: apt.patientId,
              extractedPatientId: aptPatientId,
              testsCount: apt.laboratoryTests.length,
            });
            
            apt.laboratoryTests.forEach((test: any) => {
              // Determine test type based on productId using local type map
              const testType = localTypeMap.get(test.productId) || "laboratory"; // Default to laboratory if not found
              allPrescribed.push({
                id: `${apt.id}-${test.productId}`,
                testId: test.productId,
                testName: test.productName,
                patientId: aptPatientId,
                patientName: aptPatientName,
                appointmentId: apt.id, // Store appointmentId for filtering
                type: testType, // Store type for filtering
                prescribedDate: apt.date || "",
                doctorName: "თქვენ",
                status: test.resultFile ? "completed" : (test.status || "pending"),
              });
            });
          }
        });
        
        console.log('🧪 [Laboratory] All prescribed tests loaded:', allPrescribed.length);
        setPrescribedTests(allPrescribed);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [params.appointmentId, params.patientId, params.patientName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter prescribed tests based on selected appointment or patient
  useEffect(() => {
    console.log('🔄 [Laboratory] useEffect triggered for filtering');
    console.log('🔄 [Laboratory] Dependencies:', {
      prescribedTestsLength: prescribedTests.length,
      paramsAppointmentId: params.appointmentId,
      paramsPatientId: params.patientId,
      paramsPatientName: params.patientName,
      selectedAppointmentId: selectedAppointment?.id,
      selectedAppointmentPatientId: selectedAppointment?.patientId,
      preSelectedApplied: preSelectedApplied,
    });
    
    // Priority: appointmentId > selectedAppointment > patientId/patientName from params
    let filterAppointmentId: string | null = null;
    let filterPatientId: string | null = null;
    let filterPatientName: string | null = null;
    
    // If params has appointmentId, filter by that specific appointment
    if (params.appointmentId) {
      filterAppointmentId = params.appointmentId;
    } else if (selectedAppointment?.id) {
      // Use selected appointment if available
      filterAppointmentId = selectedAppointment.id;
    } else {
      // Fallback to patient filter if pre-selection was applied
      const useParamsFilter = preSelectedApplied && (params.patientId || params.patientName);
      if (useParamsFilter) {
        filterPatientId = params.patientId || null;
        filterPatientName = params.patientName || null;
      }
    }
    
    console.log('🧪 [Laboratory] Filter values:', {
      filterAppointmentId,
      filterPatientId,
      filterPatientName,
      hasFilter: !!(filterAppointmentId || filterPatientId || filterPatientName),
    });
    
    if (filterAppointmentId || filterPatientId || filterPatientName) {
      const filtered = prescribedTests.filter((test) => {
        // First filter by type (laboratory or instrumental)
        const matchesType = !test.type || test.type === selectedType;
        if (!matchesType) {
          console.log('❌ [Laboratory] Test excluded by type:', {
            testName: test.testName,
            testType: test.type,
            selectedType,
            reason: 'type mismatch',
          });
          return false;
        }
        
        // If filtering by appointmentId, match exactly
        if (filterAppointmentId) {
          const matches = test.appointmentId === filterAppointmentId;
          if (!matches) {
            console.log('❌ [Laboratory] Test excluded:', {
              testName: test.testName,
              testAppointmentId: test.appointmentId,
              filterAppointmentId,
              reason: 'appointmentId mismatch',
            });
          }
          return matches;
        }
        
        // Otherwise filter by patient
        const matchesId = filterPatientId && test.patientId === filterPatientId;
        const matchesName = filterPatientName && test.patientName === filterPatientName;
        const shouldInclude = matchesId || matchesName;
        
        if (!shouldInclude) {
          console.log('❌ [Laboratory] Test excluded:', {
            testName: test.testName,
            testPatientId: test.patientId,
            filterPatientId,
            reason: 'patientId mismatch',
          });
        } else {
          console.log('✅ [Laboratory] Test included:', {
            testName: test.testName,
            testPatientId: test.patientId,
          });
        }
        
        return shouldInclude;
      });
      
      console.log('✨ [Laboratory] Final filtered tests:', filtered.length, 'out of', prescribedTests.length);
      console.log('✨ [Laboratory] Setting filteredPrescribedTests to:', filtered.map(t => ({
        id: t.id,
        name: t.testName,
        patientName: t.patientName,
        appointmentId: t.appointmentId,
      })));
      setFilteredPrescribedTests(filtered);
    } else {
      // If no filter, show all tests matching the selected type
      const filteredByType = prescribedTests.filter((test) => !test.type || test.type === selectedType);
      console.log('🧪 [Laboratory] No filter applied, showing all tests of type', selectedType, ':', filteredByType.length);
      setFilteredPrescribedTests(filteredByType);
    }
  }, [prescribedTests, params.appointmentId, params.patientId, params.patientName, selectedAppointment, preSelectedApplied, selectedType]);

  // Reset pre-selection when params change
  useEffect(() => {
    setPreSelectedApplied(null);
    setSelectedAppointment(null);
  }, [params.appointmentId, params.patientId, params.patientName]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredTests = labTests.filter((test) => {
    const matchesType = test.type === selectedType;
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || test.category === selectedCategory;
    return matchesType && matchesSearch && matchesCategory;
  });
  
  // Update categories when type changes
  const handleTypeChange = (type: ExamType) => {
    setSelectedType(type);
    setSelectedCategory("all");
    setCategories(allCategories[type]);
    setSelectedTests([]); // Clear selected tests when changing type
  };


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
          appointmentId: selectedAppointment.id, // Store appointmentId for filtering
          type: test.type, // Store type for filtering
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
      case "completed": return "დასრულებული";
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
    const accentColor = selectedType === "instrumental" ? "#8B5CF6" : "#F59E0B";
    return (
      <TouchableOpacity
        style={[
          styles.testItem, 
          isSelected && [styles.testItemSelected, { borderColor: accentColor }]
        ]}
        onPress={() => toggleTestSelection(item)}
        activeOpacity={0.7}
      >
        <View style={styles.testInfo}>
          <Text style={styles.testName}>{item.name}</Text>
          <Text style={[styles.testPrice, { color: accentColor }]}>{item.price} ₾</Text>
        </View>
        <View style={[styles.checkbox, isSelected && [styles.checkboxSelected, { backgroundColor: accentColor, borderColor: accentColor }]]}>
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
          <View style={[styles.headerIcon, selectedType === "instrumental" && { backgroundColor: "#8B5CF6" }]}>
            <Ionicons name={selectedType === "laboratory" ? "flask" : "pulse"} size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>
            {selectedType === "laboratory" ? "ლაბორატორია" : "ინსტრუმენტული"}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Type Selector Tabs */}
      <View style={styles.typeTabsContainer}>
        <TouchableOpacity
          style={[styles.typeTab, selectedType === "laboratory" && styles.typeTabActive]}
          onPress={() => handleTypeChange("laboratory")}
        >
          <Ionicons 
            name="flask-outline" 
            size={18} 
            color={selectedType === "laboratory" ? "#F59E0B" : "#6B7280"} 
          />
          <Text style={[styles.typeTabText, selectedType === "laboratory" && styles.typeTabTextActive]}>
            ლაბორატორიული
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeTab, selectedType === "instrumental" && styles.typeTabActiveInstrumental]}
          onPress={() => handleTypeChange("instrumental")}
        >
          <Ionicons 
            name="pulse-outline" 
            size={18} 
            color={selectedType === "instrumental" ? "#8B5CF6" : "#6B7280"} 
          />
          <Text style={[styles.typeTabText, selectedType === "instrumental" && styles.typeTabTextActiveInstrumental]}>
            ინსტრუმენტული
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Prescribe Card */}
        <View style={styles.prescribeCard}>
          <Text style={styles.prescribeTitle}>
            {selectedType === "laboratory" ? "ლაბორატორიული კვლევების" : "ინსტრუმენტული გამოკვლევების"} დანიშვნა
          </Text>
          <Text style={styles.prescribeSubtitle}>
            აირჩიეთ ჯავშანი და {selectedType === "laboratory" ? "ლაბორატორიული კვლევები" : "ინსტრუმენტული გამოკვლევები"}
          </Text>

          {/* Appointment Selection */}
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => {
              // Disable if came from dashboard (has params)
              if (!params.appointmentId && !params.patientId && !params.patientName) {
                setShowAppointmentModal(true);
              }
            }}
            disabled={!!(params.appointmentId || params.patientId || params.patientName)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={[styles.selectionText, selectedAppointment && styles.selectionTextActive]}>
              {selectedAppointment
                ? `${selectedAppointment.patientName} • ${selectedAppointment.date} ${selectedAppointment.time}`
                : "აირჩიეთ ჯავშანი"}
            </Text>
            {!(params.appointmentId || params.patientId || params.patientName) && (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {/* Tests Selection */}
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setShowTestModal(true)}
          >
            <Ionicons name={selectedType === "laboratory" ? "flask-outline" : "pulse-outline"} size={20} color="#6B7280" />
            <Text style={[styles.selectionText, selectedTests.length > 0 && styles.selectionTextActive]}>
              {selectedTests.length > 0
                ? `${selectedTests.length} ${selectedType === "laboratory" ? "კვლევა" : "გამოკვლევა"} არჩეულია`
                : `აირჩიეთ ${selectedType === "laboratory" ? "კვლევები" : "გამოკვლევები"}`}
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
                style={[
                  styles.prescribeButton, 
                  !selectedAppointment && styles.prescribeButtonDisabled,
                  selectedType === "instrumental" && { backgroundColor: "#8B5CF6" }
                ]}
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
          {filteredPrescribedTests.length > 0 ? (
            filteredPrescribedTests.map((item, index) => (
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
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
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
              data={appointments.filter((apt) => {
                // Filter by search query
                const matchesSearch = apt.patientName.toLowerCase().includes(appointmentSearchQuery.toLowerCase());
                
                // If params has appointmentId, only show that specific appointment
                if (params.appointmentId) {
                  return matchesSearch && apt.id === params.appointmentId;
                }
                
                // If params has patientId or patientName, only show that patient's appointments
                const hasParamsFilter = params.patientId || params.patientName;
                let matchesPatient = true;
                
                if (hasParamsFilter) {
                  // Check if appointment matches the patient from params
                  const matchesId = params.patientId ? apt.patientId === params.patientId : false;
                  const matchesName = params.patientName ? apt.patientName === params.patientName : false;
                  matchesPatient = matchesId || matchesName;
                }
                
                return matchesSearch && matchesPatient;
              })}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.patientItem,
                    selectedAppointment?.id === item.id && styles.patientItemSelected,
                  ]}
                  onPress={() => {
                    console.log('🧪 [Laboratory] Appointment selected:', {
                      id: item.id,
                      patientId: item.patientId,
                      patientName: item.patientName,
                    });
                    // Clear pre-selection flag to allow new selection
                    setPreSelectedApplied(null);
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Test Selection Modal */}
      <Modal
        visible={showTestModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTestModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                აირჩიეთ {selectedType === "laboratory" ? "კვლევები" : "გამოკვლევები"}
              </Text>
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
                    selectedCategory === cat.id && (selectedType === "instrumental" ? styles.categoryChipActiveInstrumental : styles.categoryChipActive),
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
                placeholder={selectedType === "laboratory" ? "კვლევის ძებნა..." : "გამოკვლევის ძებნა..."}
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
                არჩეულია: {selectedTests.length} {selectedType === "laboratory" ? "კვლევა" : "გამოკვლევა"}
              </Text>
              <TouchableOpacity
                style={[styles.modalDoneButton, selectedType === "instrumental" && { backgroundColor: "#8B5CF6" }]}
                onPress={() => setShowTestModal(false)}
              >
                <Text style={styles.modalDoneButtonText}>მზადაა</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  typeTabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  typeTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeTabActiveInstrumental: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeTabText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  typeTabTextActive: {
    color: "#F59E0B",
    fontFamily: "Poppins-SemiBold",
  },
  typeTabTextActiveInstrumental: {
    color: "#8B5CF6",
    fontFamily: "Poppins-SemiBold",
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
    backgroundColor: "#F59E0B", // Will be overridden dynamically for instrumental
  },
  categoryChipActiveInstrumental: {
    backgroundColor: "#8B5CF6",
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

