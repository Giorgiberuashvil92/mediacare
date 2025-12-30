import { useAuth } from "@/app/contexts/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService, AppointmentType } from "../../services/api";

const PatientDetails = () => {
  const { user } = useAuth();
  const {
    doctorId,
    selectedDate: appointmentDate,
    selectedTime,
    paymentMethod,
    amount,
    consultationFee,
  } = useLocalSearchParams();
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    personalId: "",
    address: "",
    problem: "",
  });
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
  }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { appointmentType: appointmentTypeParam, visitAddress, bookingFor } =
    useLocalSearchParams();
  const appointmentType: AppointmentType =
    (appointmentTypeParam as AppointmentType) || "video";
  const isBookingForOther = bookingFor === "other";

  // Auto-fill disabled - user always enters data manually
  useEffect(() => {
    const loadProfile = async () => {
      return;
      
    };
    
    loadProfile();
     
  }, [user?.id]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenderSelect = (gender: string) => {
    setFormData((prev) => ({
      ...prev,
      gender,
    }));
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "dismissed") {
        return;
      }
    }

    const currentDate = selectedDate || new Date();
    setSelectedDate(currentDate);

    // Format the date in Georgian format
    const day = currentDate.getDate();
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
    const month = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;

    setFormData((prev) => ({
      ...prev,
      dateOfBirth: formattedDate,
    }));
  };

  const handleDatePickerClose = () => {
    setShowDatePicker(false);
  };

  const handleDatePickerConfirm = () => {
    const currentDate = selectedDate;
    const day = currentDate.getDate();
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
    const month = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;

    setFormData((prev) => ({
      ...prev,
      dateOfBirth: formattedDate,
    }));
    setShowDatePicker(false);
  };

  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;
      
      if (!result.assets || result.assets.length === 0) return;

      // Check file sizes (max 10MB per file)
      const invalidFiles = result.assets.filter(
        (file: DocumentPicker.DocumentPickerAsset) => file.size && file.size > 10 * 1024 * 1024
      );

      if (invalidFiles.length > 0) {
        Alert.alert("შეცდომა", "ზოგიერთი ფაილი 10MB-ზე მეტია. გთხოვთ აირჩიოთ უფრო პატარა ფაილები.");
        return;
      }

      // Add selected files to uploaded documents
      const newDocuments = result.assets.map((file: DocumentPicker.DocumentPickerAsset) => ({
        uri: file.uri,
        name: file.name || "document",
        type: file.mimeType || "application/pdf",
        size: file.size,
      }));

      setUploadedDocuments((prev) => [...prev, ...newDocuments]);
    } catch (err: any) {
      console.error("Document picker error:", err);
      Alert.alert("შეცდომა", "დოკუმენტის არჩევა ვერ მოხერხდა");
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
  };


  // Convert Georgian date format to ISO format (YYYY-MM-DD)
  const convertDateToISO = (georgianDate: string): string => {
    console.log('🔄 Converting date:', georgianDate);
    
    // If already in ISO format, return as is
    if (georgianDate.includes("-") && georgianDate.length === 10) {
      console.log('✅ Already ISO format:', georgianDate);
      return georgianDate;
    }

    // Try to parse Georgian format (e.g., "15 იანვარი 1990")
    // Updated regex to handle Georgian characters properly
    const dateMatch = georgianDate.match(/(\d+)\s+([\u10A0-\u10FF]+)\s+(\d+)/);
    if (dateMatch) {
      console.log('📅 Parsing Georgian format:', dateMatch);
      
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
      
      const day = parseInt(dateMatch[1]);
      const monthName = dateMatch[2].trim();
      const year = parseInt(dateMatch[3]);
      const monthIndex = months.indexOf(monthName);
      
      console.log('📊 Date parts:', { 
        day, 
        monthName: `"${monthName}"`, 
        monthNameLength: monthName.length,
        year, 
        monthIndex,
        availableMonths: months
      });
      
      if (monthIndex !== -1) {
        const date = new Date(year, monthIndex, day);
        const isoDate = date.toISOString().split("T")[0];
        console.log('✅ Converted to ISO:', isoDate);
        return isoDate;
      } else {
        console.log('❌ Month not found:', monthName);
        console.log('❌ Available months:', months);
        console.log('❌ Checking each month:');
        months.forEach((month, index) => {
          console.log(`  ${index}: "${month}" === "${monthName}" ? ${month === monthName}`);
        });
      }
    }

    // Fallback: try to parse as Date
    const parsedDate = new Date(georgianDate);
    if (!isNaN(parsedDate.getTime())) {
      const isoDate = parsedDate.toISOString().split("T")[0];
      console.log('✅ Fallback conversion:', isoDate);
      return isoDate;
    }

    console.log('❌ Could not convert date:', georgianDate);
    // If all else fails, return empty string
    return "";
  };

  const handleNext = async () => {
    // Validate form
    if (!formData.name.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ პაციენტის სახელი");
      return;
    }
    if (!formData.lastName.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ პაციენტის გვარი");
      return;
    }
    if (!formData.dateOfBirth.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ დაბადების თარიღი");
      return;
    }
    if (!formData.gender) {
      Alert.alert("შეცდომა", "გთხოვთ აირჩიოთ სქესი");
      return;
    }
    if (!formData.personalId.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ პირადი ნომერი");
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ მისამართი");
      return;
    }
    if (!formData.problem.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ აღწეროთ პრობლემა");
      return;
    }

    // Validate: booking must be at least 2 hours in advance for video, 12 hours for home-visit
    if (appointmentDate && selectedTime) {
      const candidate = new Date(`${appointmentDate}T${selectedTime}:00`);
      const now = new Date();
      const requiredHours = appointmentType === "home-visit" ? 12 : 2;
      const requiredMs = requiredHours * 60 * 60 * 1000;
      if (candidate.getTime() - now.getTime() < requiredMs) {
        Alert.alert(
          "დრო არ არის ხელმისაწვდომი",
          `ჯავშნის გაკეთება შესაძლებელია მინიმუმ ${requiredHours} საათით ადრე. გთხოვთ აირჩიოთ სხვა დრო.`
        );
        return;
      }
    }

    try {
      setLoading(true);

      const fee = consultationFee
        ? parseFloat(consultationFee as string)
        : amount
          ? parseFloat(amount as string) / 1.05
          : 0;
      const total = amount ? parseFloat(amount as string) : fee * 1.05;

      // Convert dateOfBirth to ISO format for API
      const dateOfBirthISO = convertDateToISO(formData.dateOfBirth);
      console.log('🎯 Final dateOfBirth conversion result:', {
        original: formData.dateOfBirth,
        converted: dateOfBirthISO
      });

      if (!dateOfBirthISO) {
        Alert.alert(
          "შეცდომა", 
          `დაბადების თარიღის ფორმატი არასწორია.\n\nმიღებული: "${formData.dateOfBirth}"\n\nგთხოვთ გამოიყენოთ ფორმატი: "15 იანვარი 1990" ან აირჩიოთ თარიღი კალენდრიდან.`
        );
        setLoading(false);
        return;
      }

      // Create appointment via API
      const appointmentPayload = {
        doctorId: doctorId as string,
        appointmentDate: appointmentDate as string,
        appointmentTime: selectedTime as string,
        type: appointmentType,
        consultationFee: fee,
        totalAmount: total,
        paymentMethod: "pending", // Payment will be handled later
        paymentStatus: "pending", // Payment status is pending until payment is made
        patientDetails: {
          name: formData.name,
          lastName: formData.lastName,
          dateOfBirth: dateOfBirthISO, // Use ISO format for API
          gender: formData.gender,
          personalId: formData.personalId,
          address: formData.address,
          problem: formData.problem,
        },
        documents: [], // Documents will be uploaded after appointment creation
        notes: formData.problem,
        visitAddress:
          appointmentType === "home-visit" && visitAddress
            ? (visitAddress as string)
            : undefined,
      };

      console.log('📅 [PatientDetails] ჯავშნის შექმნა - მონაცემები რომლებიც იგზავნება:');
      console.log('📅 [PatientDetails] Full payload:', JSON.stringify(appointmentPayload, null, 2));
      console.log('📅 [PatientDetails] Doctor ID:', appointmentPayload.doctorId);
      console.log('📅 [PatientDetails] Appointment Date:', appointmentPayload.appointmentDate);
      console.log('📅 [PatientDetails] Appointment Time:', appointmentPayload.appointmentTime);
      console.log('📅 [PatientDetails] Type:', appointmentPayload.type);
      console.log('📅 [PatientDetails] Consultation Fee:', appointmentPayload.consultationFee);
      console.log('📅 [PatientDetails] Total Amount:', appointmentPayload.totalAmount);
      console.log('📅 [PatientDetails] Patient Details:', JSON.stringify(appointmentPayload.patientDetails, null, 2));
      console.log('📅 [PatientDetails] Visit Address:', appointmentPayload.visitAddress);
      console.log('📅 [PatientDetails] Notes:', appointmentPayload.notes);

      const response = await apiService.createAppointment(appointmentPayload);

      if (!response.success) {
        Alert.alert("შეცდომა", response.message || "ჯავშნის შექმნა ვერ მოხერხდა");
        setLoading(false);
        setUploading(false);
        return;
      }

      const appointmentId = response.data?._id || response.data?.id || "";
      
      if (!appointmentId) {
        Alert.alert("შეცდომა", "ჯავშნის ID ვერ მოიძებნა");
        setLoading(false);
        setUploading(false);
        return;
      }
      
      // Upload documents if any were selected - if this fails, appointment should be cancelled
      if (uploadedDocuments.length > 0) {
        try {
          setUploading(true);
          
          // Small delay to ensure appointment is fully saved in database
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('📄 Starting document uploads:', {
            appointmentId,
            documentCount: uploadedDocuments.length,
          });
          
          const uploadPromises = uploadedDocuments.map(async (doc, index) => {
            try {
              console.log(`📄 Uploading document ${index + 1}/${uploadedDocuments.length}:`, doc.name);
              const result = await apiService.uploadAppointmentDocument(appointmentId, {
                uri: doc.uri,
                name: doc.name,
                type: doc.type,
              });
              console.log(`✅ Document ${index + 1} uploaded successfully:`, doc.name);
              return result;
            } catch (err: any) {
              console.error(`❌ Failed to upload document ${index + 1}:`, doc.name, err);
              throw err;
            }
          });
          
          await Promise.all(uploadPromises);
          console.log('✅ All documents uploaded successfully');
        } catch (uploadErr: any) {
          console.error("❌ Error uploading documents:", uploadErr);
          
          // If document upload fails, cancel the appointment
          try {
            await apiService.updateDoctorAppointment(appointmentId, {
              status: 'cancelled',
            });
            console.log('❌ Appointment cancelled due to document upload failure');
          } catch (cancelErr) {
            console.error('❌ Failed to cancel appointment:', cancelErr);
          }
          
          Alert.alert(
            "შეცდომა",
            uploadErr?.message || "დოკუმენტების ატვირთვა ვერ მოხერხდა. ჯავშანი გაუქმებულია. გთხოვთ სცადოთ თავიდან."
          );
          setLoading(false);
          setUploading(false);
          return;
        } finally {
          setUploading(false);
        }
      }
      
      // Navigate to success page only if everything succeeded
      router.push({
        pathname: "/screens/appointment/appointment-success",
        params: {
          doctorId: doctorId as string,
          appointmentId: appointmentId,
          selectedDate: appointmentDate as string,
          selectedTime: selectedTime as string,
          paymentMethod: paymentMethod as string,
          patientName: formData.name,
          problem: formData.problem,
          appointmentNumber: response.data?.appointmentNumber || "",
        },
      });
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      Alert.alert(
        "შეცდომა",
        error.message || "ჯავშნის შექმნა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან."
      );
    } finally {
      setLoading(false);
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
        <Text style={styles.headerTitle}>
          {isBookingForOther ? "სხვა პირის მონაცემები" : "თქვენი მონაცემები"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking For Hint */}
        {isBookingForOther && (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle" size={20} color="#0EA5E9" />
            <Text style={styles.hintText}>
              შეიყვანეთ იმ პირის მონაცემები, ვისთვისაც ჯავშნავთ ვიზიტს
            </Text>
          </View>
        )}

        {/* Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>სახელი</Text>
          <TextInput
            style={styles.textInput}
            value={formData.name}
            onChangeText={(value) => handleInputChange("name", value)}
            placeholder="შეიყვანეთ თქვენი სახელი"
            placeholderTextColor="#999999"
          />
        </View>

        {/* Last Name Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>გვარი</Text>
          <TextInput
            style={styles.textInput}
            value={formData.lastName}
            onChangeText={(value) => handleInputChange("lastName", value)}
            placeholder="შეიყვანეთ თქვენი გვარი"
            placeholderTextColor="#999999"
          />
        </View>

        {/* Date of Birth Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>დაბადების თარიღი</Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={[styles.textInput, styles.dateInput]}
              value={formData.dateOfBirth}
              onChangeText={(value) => handleInputChange("dateOfBirth", value)}
              placeholder="მაგ: 15 იანვარი 1990"
              placeholderTextColor="#999999"
            />
            <TouchableOpacity
              style={styles.calendarIcon}
              onPress={openDatePicker}
            >
              <Ionicons name="calendar-outline" size={20} color="#20BEB8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gender Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>სქესი</Text>
          <View style={styles.genderContainer}>
            {[
              { value: "male", label: "კაცი" },
              { value: "female", label: "ქალი" },
              { value: "other", label: "სხვა" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.genderOption}
                onPress={() => handleGenderSelect(option.value)}
              >
                <View style={styles.radioButton}>
                  {formData.gender === option.value && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Text style={styles.genderLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Personal ID Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>პირადი ნომერი</Text>
          <TextInput
            style={styles.textInput}
            value={formData.personalId}
            onChangeText={(value) => handleInputChange("personalId", value)}
            placeholder="შეიყვანეთ პირადი ნომერი"
            placeholderTextColor="#999999"
            keyboardType="numeric"
          />
        </View>

        {/* Address Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>მისამართი</Text>
          <TextInput
            style={[styles.textInput, styles.addressInput]}
            value={formData.address}
            onChangeText={(value) => handleInputChange("address", value)}
            placeholder="შეიყვანეთ მისამართი"
            placeholderTextColor="#999999"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* Problem Description */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>პრობლემის აღწერა</Text>
          <TextInput
            style={[styles.textInput, styles.problemInput]}
            value={formData.problem}
            onChangeText={(value) => handleInputChange("problem", value)}
            placeholder="აღწერეთ თქვენი პრობლემა აქ..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Document Upload */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>დოკუმენტების ატვირთვა (თუ არის)</Text>
          <TouchableOpacity
            style={styles.uploadContainer}
            onPress={handleDocumentUpload}
          >
            <Ionicons name="cloud-upload-outline" size={48} color="#20BEB8" />
            <Text style={styles.uploadText}>აირჩიეთ ფაილები</Text>
            <Text style={styles.uploadSubtext}>(მაქსიმალური ზომა 10MB)</Text>
          </TouchableOpacity>

          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <View style={styles.uploadedDocumentsContainer}>
              <Text style={styles.uploadedDocumentsTitle}>
                არჩეული დოკუმენტები ({uploadedDocuments.length}):
              </Text>
              {uploadedDocuments.map((doc, index) => (
                <View key={index} style={styles.uploadedDocumentItem}>
                  <Ionicons name="document-text" size={20} color="#20BEB8" />
                  <View style={styles.uploadedDocumentInfo}>
                    <Text style={styles.uploadedDocumentName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    {doc.size && (
                      <Text style={styles.uploadedDocumentSize}>
                        {(doc.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeDocument(index)}
                    style={styles.removeDocumentButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {uploading && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator size="small" color="#20BEB8" />
              <Text style={styles.uploadingText}>დოკუმენტების დამუშავება...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? "შექმნა..." : "შემდეგი"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Native Date Picker */}
      {Platform.OS === "ios" ? (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleDatePickerClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={handleDatePickerClose}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>გაუქმება</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>დაბადების თარიღი</Text>
                <TouchableOpacity
                  onPress={handleDatePickerConfirm}
                  style={styles.modalButton}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonConfirm]}>
                    დადასტურება
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                locale="ka_GE"
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#0369A1",
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    backgroundColor: "#FFFFFF",
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    flex: 1,
    marginRight: 12,
  },
  calendarIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F0FDFF",
    justifyContent: "center",
    alignItems: "center",
  },
  genderContainer: {
    flexDirection: "row",
    gap: 24,
  },
  genderOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E5E5EA",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#20BEB8",
  },
  genderLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#333333",
  },
  problemInput: {
    height: 100,
    textAlignVertical: "top",
  },
  addressInput: {
    height: 60,
    textAlignVertical: "top",
  },
  uploadContainer: {
    borderWidth: 2,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  uploadText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
    marginTop: 12,
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#999999",
  },
  uploadedDocumentsContainer: {
    marginTop: 16,
  },
  uploadedDocumentsTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  uploadedDocumentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  uploadedDocumentInfo: {
    flex: 1,
    marginLeft: 8,
  },
  uploadedDocumentName: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#333333",
    marginBottom: 2,
  },
  uploadedDocumentSize: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  removeDocumentButton: {
    marginLeft: 8,
  },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#ECFEFF",
    borderRadius: 8,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#06B6D4",
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  nextButton: {
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 50,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
    flex: 1,
    textAlign: "center",
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  modalButtonConfirm: {
    color: "#20BEB8",
    fontFamily: "Poppins-SemiBold",
  },
});

export default PatientDetails;
