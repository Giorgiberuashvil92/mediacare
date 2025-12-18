import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";

const History = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [followUpEligible, setFollowUpEligible] = useState<boolean | null>(null);
  const [uploadingResult, setUploadingResult] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadPastAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const loadPastAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (apiService.isMockMode()) {
        setVisits([]);
        return;
      }

      const response = await apiService.getPatientAppointments();
      
      if (response.success && Array.isArray(response.data)) {
       
        
        const mapped = response.data
          .map((appointment) => {
            const visit = mapAppointmentToVisit(appointment);
            console.log('📋 History - Mapped visit:', {
              id: visit?.id,
              doctorId: visit?.doctorId,
              doctorIdType: typeof visit?.doctorId,
              doctorIdValue: visit?.doctorId,
              doctorName: visit?.doctorName,
            });
            return visit;
          })
          .filter((visit) => visit && isPastAppointment(visit))
          // Sort by date and time - most recent first (newest at top)
          .sort((a: any, b: any) => {
            const getDateTime = (visit: any) => {
              if (!visit?.appointmentDate) return 0;
              const [year, month, day] = visit.appointmentDate.split('-').map(Number);
              const [hours, minutes] = (visit.appointmentTime || '00:00').split(':').map(Number);
              return new Date(year, month - 1, day, hours || 0, minutes || 0).getTime();
            };
            return getDateTime(b) - getDateTime(a); // Descending - newest first
          });
        
        console.log('📋 History - Filtered visits count:', mapped.length);
        setVisits(mapped);
      } else {
        setVisits([]);
      }
    } catch (err: any) {
      console.error("History load failed", err);
      setError(err.message || "ვიზიტების ჩატვირთვა ვერ მოხერხდა");
      setVisits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPastAppointments();
  };

  const filteredVisits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return visits;
    }
    return visits.filter((visit) => {
      const searchable = `${visit.doctorName} ${visit.doctorSpecialty} ${visit.diagnosis}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [visits, searchQuery]);

  const openDetails = async (visit: any) => {
    console.log('📋 History - openDetails called with visit:', {
      id: visit?.id,
      doctorId: visit?.doctorId,
      doctorIdType: typeof visit?.doctorId,
      doctorIdValue: visit?.doctorId,
      doctorId_id: visit?.doctorId?._id,
      doctorId_idType: typeof visit?.doctorId?._id,
      status: visit?.status,
    });
    
    setSelectedVisit(visit);
    setShowDetailsModal(true);
    
    // Check follow-up eligibility when modal opens
    if (visit.id && visit.status === 'completed') {
      try {
        setCheckingEligibility(true);
        const response = await apiService.checkFollowUpEligibility(visit.id);
        // If response has success and eligible properties, use them
        if (response && typeof response === 'object' && 'success' in response) {
          setFollowUpEligible(response.success && (response as any).eligible);
        } else {
          // If response is the direct result (eligible: true), treat as eligible
          setFollowUpEligible((response as any)?.eligible === true || (response as any)?.success === true);
        }
      } catch (err: any) {
        console.error('Error checking follow-up eligibility:', err);
        // If error contains message about eligibility, show it
        setFollowUpEligible(false);
      } finally {
        setCheckingEligibility(false);
      }
    } else {
      setFollowUpEligible(false);
    }
  };

  const handleFollowUpAppointment = async () => {
    if (!selectedVisit?.id) return;

    try {
      // Check eligibility first
      setCheckingEligibility(true);
      const eligibilityResponse = await apiService.checkFollowUpEligibility(selectedVisit.id);
      
      // Check if response indicates eligibility
      const isEligible = (eligibilityResponse as any)?.success === true && 
                        (eligibilityResponse as any)?.eligible === true;
      
      if (!isEligible) {
        const errorMessage = (eligibilityResponse as any)?.message || 
                            'განმეორებითი ვიზიტისთვის უნდა გავიდეს 10 სამუშაო დღე პირველადი ვიზიტიდან';
        Alert.alert('განმეორებითი ვიზიტი', errorMessage);
        return;
      }

      // Navigate to doctor's schedule page with follow-up flag
      console.log('📋 History - handleFollowUpAppointment - selectedVisit:', {
        id: selectedVisit?.id,
        doctorId: selectedVisit?.doctorId,
        doctorIdType: typeof selectedVisit?.doctorId,
        doctorId_id: selectedVisit?.doctorId?._id,
        doctorId_idType: typeof selectedVisit?.doctorId?._id,
        doctorId_idString: selectedVisit?.doctorId?._id?.toString(),
      });
      
      // Extract doctorId - it can be a string (from mapAppointmentToVisit) or an object
      let doctorId: string | null = null;
      
      if (typeof selectedVisit.doctorId === 'string') {
        doctorId = selectedVisit.doctorId;
      } else if (selectedVisit.doctorId?._id) {
        doctorId = typeof selectedVisit.doctorId._id === 'string' 
          ? selectedVisit.doctorId._id 
          : selectedVisit.doctorId._id.toString();
      } else if (selectedVisit.doctorId?.id) {
        doctorId = typeof selectedVisit.doctorId.id === 'string' 
          ? selectedVisit.doctorId.id 
          : selectedVisit.doctorId.id.toString();
      } else if (selectedVisit.doctorId) {
        doctorId = String(selectedVisit.doctorId);
      }
      
      console.log('📋 History - Extracted doctorId:', {
        doctorId,
        doctorIdType: typeof doctorId,
        doctorIdValue: doctorId,
        selectedVisitDoctorId: selectedVisit.doctorId,
        selectedVisitDoctorIdType: typeof selectedVisit.doctorId,
      });
      
      if (doctorId && doctorId.trim()) {
        const doctorIdString = String(doctorId).trim();
        console.log('📋 History - Navigating with doctorId:', doctorIdString);
        setShowDetailsModal(false);
        router.push({
          pathname: '/screens/doctors/doctor/[id]',
          params: {
            id: doctorIdString,
            followUpAppointmentId: selectedVisit.id,
            followUp: 'true',
          },
        });
      } else {
        console.error('📋 History - Doctor ID not found in visit:', {
          selectedVisit,
          doctorId: selectedVisit.doctorId,
          doctorIdType: typeof selectedVisit.doctorId,
        });
        Alert.alert('შეცდომა', 'ექიმის ID ვერ მოიძებნა');
      }
    } catch (err: any) {
      console.error('Error checking follow-up eligibility:', err);
      // Extract error message from backend response
      let errorMessage = 'განმეორებითი ვიზიტის შემოწმება ვერ მოხერხდა';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      Alert.alert('განმეორებითი ვიზიტი', errorMessage);
    } finally {
      setCheckingEligibility(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#06B6D4"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ისტორია</Text>
          <Text style={styles.subtitle}>
            დასრულებული ან გასული ვიზიტები ავტომატურად გადმოდის აქ
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="ძებნა ექიმის, სპეციალობის ან დიაგნოზით..."
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

        {/* Visits List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            {filteredVisits.length} ვიზიტი
          </Text>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#06B6D4" />
              <Text style={styles.loadingText}>იტვირთება ვიზიტების ისტორია...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={64} color="#F87171" />
              <Text style={styles.emptyStateTitle}>ვერ ჩაიტვირთა</Text>
              <Text style={styles.emptyStateText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadPastAppointments}>
                <Text style={styles.retryButtonText}>თავიდან ცდა</Text>
              </TouchableOpacity>
            </View>
          ) : filteredVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>ვიზიტები ვერ მოიძებნა</Text>
              <Text style={styles.emptyStateText}>
                როგორც კი ვიზიტი დასრულდება, ავტომატურად გადმოვა აქ
              </Text>
            </View>
          ) : (
            filteredVisits.map((visit) => (
              <TouchableOpacity
                key={visit.id}
                style={styles.visitCard}
                onPress={() => openDetails(visit)}
              >
                <View style={styles.visitHeader}>
                  <View style={styles.doctorInfo}>
                    <View style={styles.avatarContainer}>
                      <Ionicons name="medical" size={24} color="#06B6D4" />
                    </View>
                    <View style={styles.doctorDetails}>
                      <Text style={styles.doctorName}>{visit.doctorName}</Text>
                      <Text style={styles.doctorSpecialty}>
                        {visit.doctorSpecialty || "სპეციალისტი"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateText}>{visit.date}</Text>
                    {visit.appointmentTime && (
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={12} color="#06B6D4" />
                        <Text style={styles.timeText}>{visit.appointmentTime}</Text>
                      </View>
                    )}
                    {visit.statusLabel ? (
                      <Text style={styles.statusLabel}>{visit.statusLabel}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.visitBody}>
                  <View style={styles.diagnosisRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10B981"
                    />
                    <Text style={styles.diagnosisText}>
                      {visit.diagnosis || "დიაგნოზი არ არის მითითებული"}
                    </Text>
                  </View>

                  {visit.symptoms && visit.symptoms.length > 0 && (
                    <View style={styles.symptomsContainer}>
                      <Text style={styles.symptomsLabel}>სიმპტომები:</Text>
                      <View style={styles.symptomsList}>
                        {visit.symptoms.map((symptom: string, index: number) => (
                          <View key={index} style={styles.symptomTag}>
                            <Text style={styles.symptomText}>{symptom}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {visit.medications && visit.medications.length > 0 && (
                    <View style={styles.medicationsContainer}>
                      <Text style={styles.medicationsLabel}>
                        დანიშნული მედიკამენტები:
                      </Text>
                      <View style={styles.medicationsList}>
                        {visit.medications.slice(0, 3).map((med: any, index: number) => (
                          <View key={index} style={styles.medicationTag}>
                            <Ionicons
                              name="medkit-outline"
                              size={14}
                              color="#8B5CF6"
                            />
                            <Text style={styles.medicationText}>
                              {med.name}
                            </Text>
                          </View>
                        ))}
                        {visit.medications.length > 3 && (
                          <View style={styles.medicationTag}>
                            <Text style={styles.medicationText}>
                              +{visit.medications.length - 3} მეტი
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Laboratory Tests Indicator */}
                  {visit.laboratoryTests && visit.laboratoryTests.length > 0 && (
                    <View style={styles.labTestsContainer}>
                      <View style={styles.labTestsHeader}>
                        <Ionicons name="flask" size={16} color="#8B5CF6" />
                        <Text style={styles.labTestsLabel}>
                          ლაბორატორიული კვლევები
                        </Text>
                      </View>
                      <View style={styles.labTestsBadges}>
                        <View style={styles.labTestBadge}>
                          <Text style={styles.labTestBadgeText}>
                            {visit.laboratoryTests.length} კვლევა
                          </Text>
                        </View>
                        {(() => {
                          const withResults = visit.laboratoryTests.filter((t: any) => t.resultFile?.url).length;
                          const pending = visit.laboratoryTests.length - withResults;
                          return (
                            <>
                              {withResults > 0 && (
                                <View style={[styles.labTestBadge, styles.labTestBadgeSuccess]}>
                                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                  <Text style={[styles.labTestBadgeText, styles.labTestBadgeTextSuccess]}>
                                    {withResults} პასუხი
                                  </Text>
                                </View>
                              )}
                              {pending > 0 && (
                                <View style={[styles.labTestBadge, styles.labTestBadgePending]}>
                                  <Ionicons name="time-outline" size={12} color="#F59E0B" />
                                  <Text style={[styles.labTestBadgeText, styles.labTestBadgeTextPending]}>
                                    {pending} მოლოდინში
                                  </Text>
                                </View>
                              )}
                            </>
                          );
                        })()}
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.visitFooter}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => openDetails(visit)}
                  >
                    <Text style={styles.viewDetailsText}>
                      დეტალურად ნახვა
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="#06B6D4"
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
              <Text style={styles.modalTitle}>ვიზიტის დეტალები</Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedVisit && (
              <ScrollView style={styles.modalBody}>
                {/* Doctor Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>ექიმი</Text>
                  <Text style={styles.detailValue}>{selectedVisit.doctorName}</Text>
                  <Text style={styles.detailSubValue}>
                    {selectedVisit.doctorSpecialty}
                  </Text>
                </View>

                {/* Date */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>თარიღი</Text>
                  <Text style={styles.detailValue}>{selectedVisit.date}</Text>
                </View>

                {/* Diagnosis */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>დიაგნოზი</Text>
                  <Text style={styles.detailValue}>{selectedVisit.diagnosis}</Text>
                </View>

                {/* Symptoms */}
                {selectedVisit.symptoms && selectedVisit.symptoms.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>სიმპტომები</Text>
                    {selectedVisit.symptoms.map((symptom: string, index: number) => (
                      <View key={index} style={styles.listItem}>
                        <Ionicons
                          name="remove-circle"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.listItemText}>{symptom}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Vital Signs */}
                {selectedVisit.vitalSigns && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ვიტალური ნიშნები</Text>
                    <View style={styles.vitalSignsGrid}>
                      <View style={styles.vitalSignCard}>
                        <Ionicons
                          name="pulse"
                          size={20}
                          color="#EF4444"
                        />
                        <Text style={styles.vitalSignLabel}>
                          არტერიული წნევა
                        </Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.bloodPressure}
                        </Text>
                      </View>
                      <View style={styles.vitalSignCard}>
                        <Ionicons name="heart" size={20} color="#10B981" />
                        <Text style={styles.vitalSignLabel}>
                          პულსი
                        </Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.heartRate}
                        </Text>
                      </View>
                      <View style={styles.vitalSignCard}>
                        <Ionicons
                          name="thermometer"
                          size={20}
                          color="#F59E0B"
                        />
                        <Text style={styles.vitalSignLabel}>ტემპერატურა</Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.temperature}
                        </Text>
                      </View>
                      <View style={styles.vitalSignCard}>
                        <Ionicons
                          name="scale"
                          size={20}
                          color="#8B5CF6"
                        />
                        <Text style={styles.vitalSignLabel}>წონა</Text>
                        <Text style={styles.vitalSignValue}>
                          {selectedVisit.vitalSigns.weight}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Medications */}
                {selectedVisit.medications &&
                  selectedVisit.medications.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        დანიშნული მედიკამენტები
                      </Text>
                      {selectedVisit.medications.map(
                        (med: any, index: number) => (
                          <View key={index} style={styles.medicationCard}>
                            <View style={styles.medicationHeader}>
                              <Ionicons
                                name="medkit-outline"
                                size={20}
                                color="#8B5CF6"
                              />
                              <Text style={styles.medicationName}>
                                {med.name}
                              </Text>
                            </View>
                            <View style={styles.medicationDetails}>
                              <View style={styles.medicationDetailRow}>
                                <Text style={styles.medicationDetailLabel}>
                                  დოზა:
                                </Text>
                                <Text style={styles.medicationDetailValue}>
                                  {med.dosage}
                                </Text>
                              </View>
                              <View style={styles.medicationDetailRow}>
                                <Text style={styles.medicationDetailLabel}>
                                  სიხშირე:
                                </Text>
                                <Text style={styles.medicationDetailValue}>
                                  {med.frequency}
                                </Text>
                              </View>
                              <View style={styles.medicationDetailRow}>
                                <Text style={styles.medicationDetailLabel}>
                                  ხანგრძლივობა:
                                </Text>
                                <Text style={styles.medicationDetailValue}>
                                  {med.duration}
                                </Text>
                              </View>
                              {med.instructions && (
                                <View style={styles.medicationInstructions}>
                                  <Text
                                    style={styles.medicationInstructionsText}
                                  >
                                    {med.instructions}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        )
                      )}
                    </View>
                  )}

                {/* Notes */}
                {selectedVisit.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>შენიშვნები</Text>
                    <Text style={styles.notesText}>{selectedVisit.notes}</Text>
                  </View>
                )}

                {/* Laboratory Tests */}
                {selectedVisit.laboratoryTests &&
                  selectedVisit.laboratoryTests.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        დანიშნული ლაბორატორიული კვლევები
                      </Text>
                      {selectedVisit.laboratoryTests.map(
                        (test: any, index: number) => (
                          <View key={index} style={styles.laboratoryTestCard}>
                            <View style={styles.laboratoryTestHeader}>
                              <Ionicons
                                name="flask-outline"
                                size={20}
                                color="#06B6D4"
                              />
                              <View style={styles.laboratoryTestInfo}>
                                <Text style={styles.laboratoryTestName}>
                                  {test.productName}
                                </Text>
                                {test.clinicName && (
                                  <Text style={styles.laboratoryTestClinic}>
                                    კლინიკა: {test.clinicName}
                                  </Text>
                                )}
                              </View>
                            </View>
                            {!test.booked && (
                              <TouchableOpacity
                                style={styles.bookTestButton}
                                onPress={() => {
                                  // Close modal before navigating
                                  setShowDetailsModal(false);
                                  // Navigate to clinic selection for this test
                                  router.push({
                                    pathname: "/screens/lab/select-clinic",
                                    params: {
                                      productId: test.productId,
                                      productName: test.productName,
                                      productPrice: "0", // Price will be fetched from product
                                      appointmentId: selectedVisit.id,
                                    },
                                  });
                                }}
                              >
                                <Ionicons
                                  name="calendar-outline"
                                  size={16}
                                  color="#FFFFFF"
                                />
                                <Text style={styles.bookTestButtonText}>
                                  დაჯავშნა
                                </Text>
                              </TouchableOpacity>
                            )}
                            {test.booked && (
                              <View style={styles.bookedBadge}>
                                <Ionicons
                                  name="checkmark-circle"
                                  size={16}
                                  color="#10B981"
                                />
                                <Text style={styles.bookedBadgeText}>
                                  დაჯავშნილია
                                </Text>
                              </View>
                            )}
                            {/* Upload button - works with or without booking */}
                            <TouchableOpacity
                              style={[
                                styles.uploadResultButton,
                                !test.booked && styles.uploadResultButtonExternal,
                                uploadingResult === test.productId && styles.uploadResultButtonDisabled,
                              ]}
                              onPress={async () => {
                                if (uploadingResult === test.productId) return;
                                
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

                                  setUploadingResult(test.productId);
                                  
                                  // Use external lab result upload if not booked, otherwise use regular upload
                                  const uploadResp = test.booked 
                                    ? await apiService.uploadLaboratoryTestResult(
                                        selectedVisit.id,
                                        test.productId,
                                        {
                                          uri: file.uri,
                                          name: file.name || "document",
                                          type: file.mimeType || "application/pdf",
                                        }
                                      )
                                    : await apiService.uploadExternalLabResult(
                                        selectedVisit.id,
                                        {
                                          uri: file.uri,
                                          name: file.name || "document",
                                          type: file.mimeType || "application/pdf",
                                        },
                                        test.productName
                                      );

                                  if (uploadResp.success) {
                                    Alert.alert("წარმატება", "ლაბორატორიული კვლევის შედეგი წარმატებით ატვირთა");
                                      // Reload appointments to get updated data
                                      loadPastAppointments();
                                    } else {
                                      Alert.alert("შეცდომა", uploadResp?.message || "ატვირთვა ვერ მოხერხდა");
                                    }
                                  } catch (err: any) {
                                    console.error("Laboratory result upload error:", err);
                                    Alert.alert("შეცდომა", err?.message || "ფაილის ატვირთვა ვერ მოხერხდა");
                                  } finally {
                                    setUploadingResult(null);
                                  }
                                }}
                                disabled={uploadingResult === test.productId}
                              >
                                {uploadingResult === test.productId ? (
                                  <>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text style={styles.uploadResultButtonText}>
                                      ატვირთვა...
                                    </Text>
                                  </>
                                ) : (
                                  <>
                                    <Ionicons
                                      name="cloud-upload-outline"
                                      size={16}
                                      color="#FFFFFF"
                                    />
                                    <Text style={styles.uploadResultButtonText}>
                                      {test.resultFile ? "შედეგის განახლება" : "შედეგის ატვირთვა"}
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            {test.resultFile && (
                              <TouchableOpacity
                                style={styles.viewResultButton}
                                onPress={() => {
                                  if (test.resultFile?.url) {
                                    Linking.openURL(test.resultFile.url).catch(() =>
                                      Alert.alert("შეცდომა", "ფაილის გახსნა ვერ მოხერხდა")
                                    );
                                  }
                                }}
                              >
                                <Ionicons
                                  name="document-text-outline"
                                  size={16}
                                  color="#06B6D4"
                                />
                                <Text style={styles.viewResultButtonText}>
                                  შედეგის ნახვა
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )
                      )}
                    </View>
                  )}

                {/* Follow-up */}
                {selectedVisit.followUp && selectedVisit.followUp.required && (
                  <View style={styles.detailSection}>
                    <View style={styles.followUpCard}>
                      <Ionicons
                        name="calendar"
                        size={24}
                        color="#06B6D4"
                      />
                      <View style={styles.followUpContent}>
                        <Text style={styles.followUpTitle}>
                          განმეორებითი ვიზიტი
                        </Text>
                        {selectedVisit.followUp.date && (
                          <Text style={styles.followUpDate}>
                            {selectedVisit.followUp.date}
                          </Text>
                        )}
                        {selectedVisit.followUp.reason && (
                          <Text style={styles.followUpReason}>
                            {selectedVisit.followUp.reason}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Follow-up Button - Show only for completed appointments without existing follow-up */}
                {selectedVisit.status === 'completed' && 
                 !selectedVisit.followUp?.appointmentId && (
                  <View style={styles.detailSection}>
                    {checkingEligibility ? (
                      <View style={styles.followUpButton}>
                        <ActivityIndicator size="small" color="#06B6D4" />
                        <Text style={styles.followUpButtonText}>
                          შემოწმება...
                        </Text>
                      </View>
                    ) : followUpEligible ? (
                      <TouchableOpacity
                        style={styles.followUpButton}
                        onPress={handleFollowUpAppointment}
                      >
                        <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.followUpButtonText}>
                          განმეორებითი ვიზიტისთვის
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : followUpEligible === false ? (
                      <TouchableOpacity
                        style={styles.followUpButtonDisabled}
                        onPress={handleFollowUpAppointment}
                      >
                        <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                        <Text style={styles.followUpButtonTextDisabled}>
                          განმეორებითი ვიზიტი ჯერ არ არის ხელმისაწვდომი
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {/* Form 100 */}
                {selectedVisit.form100 && (
                  <View style={styles.detailSection}>
                    <View style={styles.form100Card}>
                      <View style={styles.form100Header}>
                        <Ionicons
                          name="document-text"
                          size={24}
                          color="#10B981"
                        />
                        <View style={styles.form100Info}>
                          <Text style={styles.form100Title}>
                            ფორმა 100
                          </Text>
                          <Text style={styles.form100Id}>
                            ID: {selectedVisit.form100.id}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.form100Details}>
                        <View style={styles.form100DetailRow}>
                          <Text style={styles.form100DetailLabel}>
                            გაცემის თარიღი:
                          </Text>
                          <Text style={styles.form100DetailValue}>
                            {selectedVisit.form100.issueDate}
                          </Text>
                        </View>
                        <View style={styles.form100DetailRow}>
                          <Text style={styles.form100DetailLabel}>
                            მოქმედებს:
                          </Text>
                          <Text style={styles.form100DetailValue}>
                            {selectedVisit.form100.validUntil}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.form100DownloadButton}>
                        <Ionicons
                          name="download-outline"
                          size={20}
                          color="#10B981"
                        />
                        <Text style={styles.form100DownloadText}>
                          PDF-ის ჩამოტვირთვა
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
    </SafeAreaView>
  );
};

const STATUS_LABELS: Record<string, string> = {
  completed: "დასრულებული",
  cancelled: "გაუქმებული",
  "in-progress": "მიმდინარე",
  scheduled: "დანიშნული",
  pending: "მოლოდინში",
};

const mapAppointmentToVisit = (appointment: any) => {
  if (!appointment) {
    return null;
  }

  const doctor =
    typeof appointment.doctorId === "object" ? appointment.doctorId : {};
  
  // Extract doctorId - handle both object and string formats
  let doctorId: string | null = null;
  if (appointment.doctorId) {
    if (typeof appointment.doctorId === 'string') {
      doctorId = appointment.doctorId;
    } else if (appointment.doctorId._id) {
      doctorId = typeof appointment.doctorId._id === 'string' 
        ? appointment.doctorId._id 
        : String(appointment.doctorId._id);
    } else if (appointment.doctorId.id) {
      doctorId = typeof appointment.doctorId.id === 'string' 
        ? appointment.doctorId.id 
        : String(appointment.doctorId.id);
    } else {
      doctorId = String(appointment.doctorId);
    }
  }
  
  
  // Format date from ISO to YYYY-MM-DD
  // Use LOCAL methods to get the date as it appears in user's timezone
  // This matches the logic in appointment.tsx for consistency
  const appointmentDate = appointment.appointmentDate
    ? (() => {
        const date = new Date(appointment.appointmentDate);
        // Use LOCAL methods to get the date as it appears in user's timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })()
    : "";

  const rawSymptoms = appointment.symptoms || appointment.patientDetails?.problem;
  let symptoms: string[] = [];
  if (Array.isArray(rawSymptoms)) {
    symptoms = rawSymptoms.filter(Boolean);
  } else if (typeof rawSymptoms === "string" && rawSymptoms.trim().length) {
    symptoms = rawSymptoms.split(",").map((item) => item.trim()).filter(Boolean);
  } else if (rawSymptoms) {
    symptoms = [String(rawSymptoms)];
  }

  const summary = appointment.consultationSummary || {};

  if (summary.symptoms) {
    const summarySymptoms = summary.symptoms
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
    symptoms = Array.from(new Set([...symptoms, ...summarySymptoms]));
  }

  let medications: any[] = Array.isArray(appointment.medications)
    ? appointment.medications
    : [];

  if ((!medications || medications.length === 0) && summary.medications) {
    try {
      // Try to parse as JSON first (new format)
      medications = JSON.parse(summary.medications);
    } catch {
      // Fallback to old format (split by newlines)
      medications = summary.medications
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((name: string) => ({ name }));
    }
  }

  const status = appointment.status || "scheduled";

  const visit = {
    id: appointment._id || appointment.id || Math.random().toString(36).slice(2),
    doctorId: doctorId,
    doctorName: doctor?.name || "უცნობი ექიმი",
    doctorSpecialty: doctor?.specialization || doctor?.speciality || "",
    date: appointmentDate,
    appointmentDate,
    appointmentTime: appointment.appointmentTime || appointment.time || "",
    diagnosis:
      summary.diagnosis ||
      appointment.diagnosis ||
      appointment.patientDetails?.problem ||
      "",
    symptoms,
    medications,
    notes: summary.notes || appointment.notes || "",
    vitalSigns: appointment.vitalSigns || summary.vitals,
    consultationSummary: summary,
    followUp: appointment.followUp,
    form100: appointment.form100,
    laboratoryTests: appointment.laboratoryTests || [],
    status,
    statusLabel: STATUS_LABELS[status],
  };
  
  console.log('📋 History - mapAppointmentToVisit - returning visit:', {
    id: visit.id,
    doctorId: visit.doctorId,
    doctorIdType: typeof visit.doctorId,
  });
  
  // Log laboratory tests for debugging
  if (visit.laboratoryTests && visit.laboratoryTests.length > 0) {
    console.log('🧪 [History] Lab tests for visit:', visit.id);
    console.log('🧪 [History] Lab tests data:', JSON.stringify(visit.laboratoryTests, null, 2));
    visit.laboratoryTests.forEach((test: any, idx: number) => {
      console.log(`🧪 [History] Test ${idx}:`, {
        productId: test.productId,
        productName: test.productName,
        booked: test.booked,
        clinicName: test.clinicName,
        hasResultFile: !!test.resultFile,
        resultFileUrl: test.resultFile?.url || null,
      });
    });
  }
  
  return visit;
};

const isPastAppointment = (visit: any) => {
  if (!visit?.appointmentDate) {
    console.log('❌ [isPastAppointment] No date:', visit?.id);
    return false;
  }

  // Cancelled appointments ALWAYS go to history, regardless of date
  if (visit.status === "cancelled") {
    console.log('✅ [isPastAppointment] Cancelled -> history:', visit.id, visit.appointmentDate);
    return true;
  }

  // Completed appointments ALWAYS go to history, regardless of date
  // (doctor has changed status to completed)
  if (visit.status === "completed") {
    console.log('✅ [isPastAppointment] Completed -> history:', visit.id, visit.appointmentDate);
    return true;
  }

  // Include appointments with laboratory tests assigned by doctor, even if not completed
  // (doctor has interacted with the appointment)
  if (visit.laboratoryTests && Array.isArray(visit.laboratoryTests) && visit.laboratoryTests.length > 0) {
    console.log('✅ [isPastAppointment] Has lab tests -> history:', visit.id, visit.appointmentDate);
    return true;
  }

  // For other statuses (pending, scheduled, in-progress), check if date has passed
  // Use local timezone to avoid timezone issues
  const timePart = visit.appointmentTime || "00:00";
  let appointmentDateTime: Date;

  // Parse date in YYYY-MM-DD format and time in HH:MM format in local timezone
  const dateStr = visit.appointmentDate;
  if (!dateStr) {
    return false;
  }

  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    
    if (timePart && timePart !== "00:00") {
      const [hours, minutes] = timePart.split(':').map(Number);
      appointmentDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
    } else {
      appointmentDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    if (Number.isNaN(appointmentDateTime.getTime())) {
      console.log('❌ [isPastAppointment] Invalid date:', visit.id, dateStr, timePart);
      return false;
    }
  } catch (error) {
    console.error('❌ [isPastAppointment] Error parsing appointment date:', error);
    return false;
  }

  // Include past appointments (date/time has passed)
  // Compare with current time in local timezone
  const now = Date.now();
  const isPast = appointmentDateTime.getTime() < now;
  
  console.log('📅 [isPastAppointment] Check:', {
    visitId: visit.id,
    date: dateStr,
    time: timePart,
    status: visit.status,
    appointmentDateTime: appointmentDateTime.toISOString(),
    now: new Date(now).toISOString(),
    isPast,
    diff: appointmentDateTime.getTime() - now,
    diffHours: (appointmentDateTime.getTime() - now) / (1000 * 60 * 60),
  });
  
  return isPast;
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
  listSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 16,
  },
  visitCard: {
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
  visitHeader: {
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
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  dateBadge: {
    backgroundColor: "#06B6D410",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  visitBody: {
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  diagnosisRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 8,
  },
  diagnosisText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  symptomsContainer: {
    gap: 8,
  },
  symptomsLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  symptomsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  symptomTag: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  symptomText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  medicationsContainer: {
    gap: 8,
  },
  medicationsLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  medicationsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  medicationTag: {
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  medicationText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#8B5CF6",
  },
  // Lab Tests Indicator Styles
  labTestsContainer: {
    marginTop: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  labTestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  labTestsLabel: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#7C3AED",
  },
  labTestsBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  labTestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E9D5FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  labTestBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#7C3AED",
  },
  labTestBadgeSuccess: {
    backgroundColor: "#D1FAE5",
  },
  labTestBadgeTextSuccess: {
    color: "#10B981",
  },
  labTestBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  labTestBadgeTextPending: {
    color: "#F59E0B",
  },
  visitFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
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
  loadingState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#06B6D4",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins-SemiBold",
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
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  detailSubValue: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  listItemText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  vitalSignsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  vitalSignCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  vitalSignLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  vitalSignValue: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  medicationCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  medicationDetails: {
    gap: 4,
  },
  medicationDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  medicationDetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  medicationDetailValue: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  medicationInstructions: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  medicationInstructionsText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    fontStyle: "italic",
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 20,
  },
  followUpCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F0FDFA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#06B6D4",
  },
  followUpContent: {
    flex: 1,
  },
  followUpTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#06B6D4",
    marginBottom: 4,
  },
  followUpDate: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  followUpReason: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  form100Card: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  form100Header: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  form100Info: {
    flex: 1,
  },
  form100Title: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#10B981",
    marginBottom: 2,
  },
  form100Id: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  form100Details: {
    gap: 8,
    marginBottom: 16,
  },
  form100DetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  form100DetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  form100DetailValue: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  form100DownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    borderRadius: 8,
    padding: 12,
  },
  form100DownloadText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
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
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
  },
  followUpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  followUpButtonDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  followUpButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  followUpButtonTextDisabled: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#9CA3AF",
    textAlign: "center",
  },
  laboratoryTestCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  laboratoryTestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  laboratoryTestInfo: {
    flex: 1,
  },
  laboratoryTestName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  laboratoryTestClinic: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  bookTestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#06B6D4",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  bookTestButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  bookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  bookedBadgeText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
  },
  uploadResultButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  uploadResultButtonExternal: {
    backgroundColor: "#7C3AED",
  },
  uploadResultButtonDisabled: {
    opacity: 0.6,
  },
  uploadResultButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  viewResultButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E0F2FE",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  viewResultButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
});

export default History;
