import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../../services/api";

const PatientDetails = () => {
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
    dateOfBirth: "",
    gender: "",
    problem: "",
  });
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

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

  const handleDocumentUpload = () => {
    // Here you would typically implement actual file upload
    // For now, we'll simulate adding a document
    Alert.alert(
      "დოკუმენტის ატვირთვა",
      "დოკუმენტის ატვირთვის ფუნქციონალი აქ იქნება განხორციელებული. ახლა ეს არის placeholder.",
      [
        {
          text: "გაუქმება",
          style: "cancel",
        },
        {
          text: "ატვირთვის სიმულაცია",
          onPress: () => {
            const newDoc = `Document_${uploadedDocuments.length + 1}.pdf`;
            setUploadedDocuments((prev) => [...prev, newDoc]);
          },
        },
      ]
    );
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
    if (!formData.dateOfBirth.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ დაბადების თარიღი");
      return;
    }
    if (!formData.gender) {
      Alert.alert("შეცდომა", "გთხოვთ აირჩიოთ სქესი");
      return;
    }
    if (!formData.problem.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ აღწეროთ პრობლემა");
      return;
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
      const response = await apiService.createAppointment({
        doctorId: doctorId as string,
        appointmentDate: appointmentDate as string,
        appointmentTime: selectedTime as string,
        consultationFee: fee,
        totalAmount: total,
        paymentMethod: "pending", // Payment will be handled later
        paymentStatus: "pending", // Payment status is pending until payment is made
        patientDetails: {
          name: formData.name,
          dateOfBirth: dateOfBirthISO, // Use ISO format for API
          gender: formData.gender,
          problem: formData.problem,
        },
        documents: uploadedDocuments,
        notes: formData.problem,
      });

      if (response.success) {
        // Navigate to success page
        router.push({
          pathname: "/screens/appointment/appointment-success",
          params: {
            doctorId: doctorId as string,
            appointmentId: response.data?._id || response.data?.id || "",
            selectedDate: appointmentDate as string,
            selectedTime: selectedTime as string,
            paymentMethod: paymentMethod as string,
            patientName: formData.name,
            problem: formData.problem,
            appointmentNumber: response.data?.appointmentNumber || "",
          },
        });
      } else {
        Alert.alert("შეცდომა", response.message || "ჯავშნის შექმნა ვერ მოხერხდა");
      }
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
        <Text style={styles.headerTitle}>პაციენტის დეტალები</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                ატვირთული დოკუმენტები:
              </Text>
              {uploadedDocuments.map((doc, index) => (
                <View key={index} style={styles.uploadedDocumentItem}>
                  <Ionicons name="document-text" size={20} color="#20BEB8" />
                  <Text style={styles.uploadedDocumentName}>{doc}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setUploadedDocuments((prev) =>
                        prev.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
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
  uploadedDocumentName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#333333",
    marginLeft: 8,
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
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#666666",
  },
  modalButtonConfirm: {
    color: "#20BEB8",
    fontFamily: "Poppins-SemiBold",
  },
});

export default PatientDetails;
