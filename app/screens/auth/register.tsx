import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { apiService, Specialization } from "../../services/api";
import { showToast } from "../../utils/toast";

export default function RegisterScreen() {
  const { userRole, register, setUserRole } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedRole] = useState<"doctor" | "patient">(
    userRole || "patient",
  );

  // Common fields 
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Doctor specific fields
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [licenseDocument, setLicenseDocument] = useState<{
    uri: string;
    name: string;
    type: string;
    filePath?: string;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [specializationModalVisible, setSpecializationModalVisible] =
    useState(false);
  
  // Additional doctor fields (matching admin panel)
  const [phone, setPhone] = useState("");
  const [degrees, setDegrees] = useState("");
  const [experience, setExperience] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    setUserRole(selectedRole);
  }, [selectedRole, setUserRole]);

  useEffect(() => {
    const loadSpecializations = async () => {
      if (selectedRole !== "doctor") {
        setSpecializations([]);
        setSelectedSpecializations([]);
        setLicenseDocument(null);
        // Reset doctor-specific fields (keep phone for all users)
        setDegrees("");
        setExperience("");
        setAbout("");
        setLocation("");
        setDateOfBirth("");
        setGender("male");
        return;
      }

      try {
        setLoadingSpecializations(true);
        const response = await apiService.getSpecializations();
        if (response.success) {
          setSpecializations(response.data.filter((spec) => spec.isActive));
          setSelectedSpecializations((prev) =>
            response.data
              .filter((spec) => spec.isActive && prev.includes(spec.name))
              .map((spec) => spec.name),
          );
        }
      } catch (error) {
        console.error("Failed to load specializations", error);
        setSpecializations([]);
      } finally {
        setLoadingSpecializations(false);
      }
    };

    loadSpecializations();
  }, [selectedRole]);

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        const currentDate = selectedDate;
        setSelectedDate(currentDate);

        // Format the date as YYYY-MM-DD for backend
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        setDateOfBirth(formattedDate);
      }
      setShowDatePicker(false);
    } else {
      // iOS - update date as user scrolls
      if (selectedDate) {
        setSelectedDate(selectedDate);
        const currentDate = selectedDate;

        // Format the date as YYYY-MM-DD for backend
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        setDateOfBirth(formattedDate);
      }
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      // Check file size (max 5MB)
      if (file.size && file.size > 5 * 1024 * 1024) {
        showToast.error("ფაილის ზომა არ უნდა აღემატებოდეს 5MB-ს", "შეცდომა");
        return;
      }

      // Upload (mock or real)
      setUploadingFile(true);
      if (apiService.isMockMode()) {
        setLicenseDocument({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/pdf",
          filePath: "/uploads/licenses/mock-license.pdf",
        });
        showToast.success("ფაილი წარმატებით აიტვირთა (mock)", "წარმატება");
      } else {
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/pdf",
        } as any);

        const response = await fetch(
          `${apiService.getBaseURL()}/upload/license`,
          {
            method: "POST",
            body: formData,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setLicenseDocument({
            uri: file.uri,
            name: file.name,
            type: file.mimeType || "application/pdf",
            filePath: data.data.filePath,
          });
          showToast.success("ფაილი წარმატებით აიტვირთა", "წარმატება");
        } else {
          throw new Error(data.message || "ფაილის ატვირთვა ვერ მოხერხდა");
        }
      }
    } catch (error) {
      console.error("File pick error:", error);
      showToast.error(
        error instanceof Error ? error.message : "ფაილის ატვირთვა ვერ მოხერხდა",
        "შეცდომა"
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSignup = async () => {
    // Basic validation
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast.error("გთხოვთ შეავსოთ ყველა სავალდებულო ველი", "შეცდომა");
      return;
    }

    if (selectedRole === "doctor" && selectedSpecializations.length === 0) {
      showToast.error(
        "გთხოვთ აირჩიოთ ექიმის სპეციალიზაცია",
        "შეცდომა"
      );
      return;
    }

    if (password.length < 6) {
      showToast.error("პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო", "შეცდომა");
      return;
    }

    try {
      setIsLoading(true);

      const registerData: any = {
        name: name.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
      };

      // Add phone for all users
      if (phone.trim()) registerData.phone = phone.trim();

      // Add doctor specific fields
      if (selectedRole === "doctor") {
        registerData.specialization = selectedSpecializations.join(", ");
        registerData.licenseDocument = licenseDocument?.filePath;
        // Add additional fields matching admin panel
        if (degrees.trim()) registerData.degrees = degrees.trim();
        if (experience.trim()) registerData.experience = experience.trim();
        if (about.trim()) registerData.about = about.trim();
        if (location.trim()) registerData.location = location.trim();
        if (dateOfBirth.trim()) registerData.dateOfBirth = dateOfBirth.trim();
        registerData.gender = gender;
      }

      await register(registerData);

      // Show success toast
      showToast.auth.registerSuccess(name.trim());

      // Navigate based on role
      if (selectedRole === "doctor") {
        router.replace("/(doctor-tabs)");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "შეცდომა რეგისტრაციისას";
      showToast.auth.registerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignin = () => {
    router.push("/screens/auth/login");
  };

  const isDoctor = selectedRole === "doctor";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Image
                  source={require("../../../assets/images/logo/logo.png")}
                  style={styles.logoImage}
                  contentFit="contain"
                />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {isDoctor ? "დარეგისტრირდი როგორც ექიმი" : "დაამზადე ანგარიში"}
            </Text>
            <Text style={styles.subtitle}>
              {isDoctor
                ? " შემოგვიერთდი როგორც სამედიცინო მომსახურების მიმწოდებელი"
                : "დაიწყე გამოყენება უფასოდ"}
            </Text>

            {/* Role Switcher */}
            

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>სრული სახელი *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="შეიყვანე სრული სახელი"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>ელ. ფოსტა *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="შეიყვანე ელ. ფოსტა"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>ტელეფონი</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="+995 555 123 456"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Doctor specific fields */}
              {isDoctor && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>სპეციალიზაცია *</Text>
                    {loadingSpecializations ? (
                      <View style={styles.specializationsLoading}>
                        <ActivityIndicator size="small" color="#06B6D4" />
                        <Text style={styles.specializationsLoadingText}>
                          სპეციალიზაციები იტვირთება...
                        </Text>
                      </View>
                    ) : specializations.length > 0 ? (
                      <>
                        <TouchableOpacity
                          style={styles.multiSelectButton}
                          onPress={() => setSpecializationModalVisible(true)}
                        >
                          <Ionicons
                            name="medical-outline"
                            size={20}
                            color="#06B6D4"
                            style={styles.multiSelectIcon}
                          />
                          <View style={styles.multiSelectTextContainer}>
                            <Text style={styles.multiSelectLabel}>
                              აირჩიე სპეციალიზაციები
                            </Text>
                            <Text
                              style={[
                                styles.multiSelectValue,
                                selectedSpecializations.length === 0 &&
                                  styles.multiSelectPlaceholder,
                              ]}
                              numberOfLines={1}
                            >
                              {selectedSpecializations.length > 0
                                ? selectedSpecializations.join(", ")
                                : "მინიმუმ ერთი სპეციალიზაცია აირჩიე"}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-down"
                            size={18}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                        <Text style={styles.multiSelectHelper}>
                          შეგიძლია მონიშნო რამდენიმე სპეციალიზაცია
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.specializationsEmpty}>
                        ჯერ სპეციალიზაციები არ არის დამატებული.
                      </Text>
                    )}
                  </View>

                  {/* Degrees Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>ხარისხი</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="school-outline"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="MD, PhD"
                        placeholderTextColor="#9CA3AF"
                        value={degrees}
                        onChangeText={setDegrees}
                      />
                    </View>
                  </View>

                  {/* Experience Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>გამოცდილება</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="briefcase-outline"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="10 წელი"
                        placeholderTextColor="#9CA3AF"
                        value={experience}
                        onChangeText={setExperience}
                      />
                    </View>
                  </View>

                  {/* Location Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>მდებარეობა</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="თბილისი, საქართველო"
                        placeholderTextColor="#9CA3AF"
                        value={location}
                        onChangeText={setLocation}
                      />
                    </View>
                  </View>

                  {/* Date of Birth */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>დაბადების თარიღი</Text>
                    <TouchableOpacity
                      style={styles.inputWrapper}
                      onPress={openDatePicker}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#9CA3AF"
                        style={styles.inputIcon}
                      />
                      <Text
                        style={[
                          styles.input,
                          !dateOfBirth && styles.inputPlaceholder,
                        ]}
                      >
                        {dateOfBirth || "აირჩიე დაბადების თარიღი"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Gender Selection */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>სქესი</Text>
                    <View style={styles.genderContainer}>
                      <TouchableOpacity
                        style={[
                          styles.genderOption,
                          gender === "male" && styles.genderOptionSelected,
                        ]}
                        onPress={() => setGender("male")}
                      >
                        <Ionicons
                          name="male"
                          size={20}
                          color={gender === "male" ? "#06B6D4" : "#6B7280"}
                        />
                        <Text
                          style={[
                            styles.genderText,
                            gender === "male" && styles.genderTextSelected,
                          ]}
                        >
                          კაცი
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderOption,
                          gender === "female" && styles.genderOptionSelected,
                        ]}
                        onPress={() => setGender("female")}
                      >
                        <Ionicons
                          name="female"
                          size={20}
                          color={gender === "female" ? "#06B6D4" : "#6B7280"}
                        />
                        <Text
                          style={[
                            styles.genderText,
                            gender === "female" && styles.genderTextSelected,
                          ]}
                        >
                          ქალი
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderOption,
                          gender === "other" && styles.genderOptionSelected,
                        ]}
                        onPress={() => setGender("other")}
                      >
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={gender === "other" ? "#06B6D4" : "#6B7280"}
                        />
                        <Text
                          style={[
                            styles.genderText,
                            gender === "other" && styles.genderTextSelected,
                          ]}
                        >
                          სხვა
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* About TextArea */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>შესახებ</Text>
                    <View style={styles.textAreaWrapper}>
                      <TextInput
                        style={styles.textArea}
                        placeholder="დაწერე ექიმის შესახებ..."
                        placeholderTextColor="#9CA3AF"
                        value={about}
                        onChangeText={setAbout}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>

                  {/* License Document */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      ლიცენზიის ფაილი (PDF) (არჩევითი)
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.filePickerButton,
                        licenseDocument && styles.filePickerButtonActive,
                      ]}
                      onPress={handleFilePick}
                      disabled={uploadingFile}
                    >
                      <Ionicons
                        name={
                          licenseDocument
                            ? "checkmark-circle"
                            : "cloud-upload-outline"
                        }
                        size={20}
                        color={licenseDocument ? "#10B981" : "#9CA3AF"}
                        style={styles.inputIcon}
                      />
                      {uploadingFile ? (
                        <View style={styles.uploadingContainer}>
                          <ActivityIndicator size="small" color="#06B6D4" />
                          <Text style={styles.uploadingText}>ატვირთვა...</Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.filePickerText,
                            licenseDocument && styles.filePickerTextActive,
                          ]}
                        >
                          {licenseDocument
                            ? licenseDocument.name
                            : "ატვირთეთ სამედიცინო ლიცენზია"}
                        </Text>
                      )}
                      <Ionicons
                        name="document-attach-outline"
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                    {licenseDocument && (
                      <Text style={styles.fileHelper}>
                        ✓ ფაილი წარმატებით აიტვირთა
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  isLoading && styles.signupButtonDisabled,
                ]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <Text style={styles.signupButtonText}>
                  {isLoading ? "რეგისტრაცია..." : "დარეგისტრირდი"}
                </Text>
              </TouchableOpacity>

              {/* Signin Link */}
              <View style={styles.signinContainer}>
                <Text style={styles.signinText}>ანგარიში უკვე გაქვს? </Text>
                <TouchableOpacity onPress={handleSignin}>
                  <Text style={styles.signinLink}>შესვლა</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={specializationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSpecializationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>აირჩიე სპეციალიზაციები</Text>
              <TouchableOpacity
                onPress={() => setSpecializationModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {specializations.map((spec) => {
                const isSelected = selectedSpecializations.includes(spec.name);
                return (
                  <TouchableOpacity
                    key={spec._id}
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedSpecializations((prev) =>
                        prev.includes(spec.name)
                          ? prev.filter((name) => name !== spec.name)
                          : [...prev, spec.name],
                      );
                    }}
                  >
                    <View style={styles.modalItemInfo}>
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {spec.name}
                      </Text>
                      {spec.description ? (
                        <Text style={styles.modalItemDescription}>
                          {spec.description}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalPrimaryButton,
                selectedSpecializations.length === 0 &&
                  styles.modalPrimaryButtonDisabled,
              ]}
              onPress={() => setSpecializationModalVisible(false)}
              disabled={selectedSpecializations.length === 0}
            >
              <Text style={styles.modalPrimaryButtonText}>არჩევა დასრულებულია</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModalContainer}>
              <View style={styles.datePickerModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerCancelButton}
                >
                  <Text style={styles.datePickerCancelText}>გაუქმება</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerModalTitle}>
                  აირჩიე დაბადების თარიღი
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerDoneButton}
                >
                  <Text style={styles.datePickerDoneText}>დასრულება</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  roleSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: "#06B6D4",
  },
  roleButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  multiSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multiSelectIcon: {
    marginRight: 12,
  },
  multiSelectTextContainer: {
    flex: 1,
  },
  multiSelectLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    marginBottom: 2,
  },
  multiSelectValue: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  multiSelectPlaceholder: {
    color: "#9CA3AF",
    fontFamily: "Poppins-Regular",
  },
  multiSelectHelper: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  eyeIcon: {
    padding: 4,
  },
  signupButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  signupButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginHorizontal: 16,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  facebookIcon: {
    backgroundColor: "#1877F2",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  signinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  signinText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  signinLink: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderStyle: "dashed",
  },
  filePickerButtonActive: {
    borderColor: "#10B981",
    borderStyle: "solid",
    backgroundColor: "#F0FDF4",
  },
  filePickerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  filePickerTextActive: {
    color: "#10B981",
    fontFamily: "Poppins-Medium",
  },
  uploadingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uploadingText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#06B6D4",
    marginLeft: 8,
  },
  fileHelper: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#10B981",
    marginTop: 4,
    marginLeft: 4,
  },
  specializationsLoading: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  specializationsLoadingText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  specializationsEmpty: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: {
    marginBottom: 20,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalItemSelected: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  modalItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  modalItemTextSelected: {
    color: "#0EA5E9",
  },
  modalItemDescription: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CBD5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  modalPrimaryButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  genderContainer: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
  },
  genderOptionSelected: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0F9FF",
  },
  genderText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  genderTextSelected: {
    color: "#06B6D4",
  },
  textAreaWrapper: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
  },
  textArea: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  inputPlaceholder: {
    color: "#9CA3AF",
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  datePickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  datePickerCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  datePickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  datePicker: {
    width: "100%",
    height: 200,
  },
});
