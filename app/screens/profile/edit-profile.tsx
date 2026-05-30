import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [identificationDocument, setIdentificationDocument] = useState<{
    filePath: string;
    name: string;
  } | null>(null);
  const [uploadingIdentificationDocument, setUploadingIdentificationDocument] =
    useState(false);
  const [about, setAbout] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Doctor specific fields
  const [consultationFee, setConsultationFee] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [degrees, setDegrees] = useState("");
  const [contractDocument, setContractDocument] = useState("");

  const isDoctor = (user as any)?.role === "doctor";
  /** ყველა ველი მხოლოდ ნახვის რეჟიმში — რედაქტირება გამორთულია */
  const viewOnly = true;

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);

      if (apiService.isMockMode()) {
        setName(user?.name || "");
        setEmail(user?.email || "");
        setPhone((user as any)?.phone || "");
        setIdNumber((user as any)?.idNumber || "");
        setGender(
          (user as any)?.gender === "male" || (user as any)?.gender === "female"
            ? (user as any).gender
            : "male",
        );
        setAddress((user as any)?.address || "");
        setDateOfBirth((user as any)?.dateOfBirth || "");
        setIdentificationDocument(null);
        setAbout("");
        setProfileImage(null);
        setLoadingProfile(false);
        return;
      }

      const response = await apiService.getProfile();

      if (response.success && response.data) {
        const profile = response.data;
        // Support both direct and nested data (identificationDocument like admin/users)
        const idDoc =
          (profile as any).identificationDocument ??
          (profile as any).data?.identificationDocument;
        console.log("📄 [EditProfile] identificationDocument from API:", {
          hasIdDoc: !!idDoc,
          idDocValue: idDoc ? `${String(idDoc).slice(0, 60)}...` : null,
        });
        setName(profile.name || "");
        setEmail(profile.email || "");
        setPhone(profile.phone || "");
        setIdNumber(profile.idNumber || "");
        setGender(
          profile.gender === "male" || profile.gender === "female"
            ? profile.gender
            : "male",
        );
        setAddress(profile.address || "");
        setDateOfBirth(profile.dateOfBirth || "");
        if (idDoc && String(idDoc).trim()) {
          setIdentificationDocument({
            filePath: String(idDoc).trim(),
            name: t("editProfile.idDocumentName"),
          });
        } else {
          setIdentificationDocument(null);
        }
        setAbout(profile.about || "");
        setProfileImage(profile.profileImage || null);

        // Doctor specific fields
        if (profile.consultationFee) {
          setConsultationFee(String(profile.consultationFee));
        }
        setExperience(profile.experience || "");
        setLocation(profile.location || "");
        setDegrees(profile.degrees || "");
      }
    } catch (err: any) {
      console.error("Error loading profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleProfileImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.assets || result.assets.length === 0) return;

      setUploadingProfileImage(true);

      if (apiService.isMockMode()) {
        setProfileImage(result.assets[0].uri);
        Alert.alert(
          t("settings.security.success.title"),
          t("editProfile.imageUploadedMock"),
        );
      } else {
        const uploadResponse = await apiService.uploadProfileImagePublic({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || "profile.jpg",
          type: result.assets[0].mimeType || "image/jpeg",
        });

        console.log("📸 [EditProfile] uploadResponse:", uploadResponse);

        if (uploadResponse.success && uploadResponse.url) {
          console.log(
            "📸 [EditProfile] Setting profileImage to:",
            uploadResponse.url,
          );
          setProfileImage(uploadResponse.url);
          Alert.alert(
            t("settings.security.success.title"),
            t("editProfile.imageUploaded"),
          );
        } else {
          Alert.alert(
            t("settings.security.error.title"),
            t("doctor.profile.photoUploadFailed"),
          );
        }
      }
    } catch (error) {
      console.error("Profile image pick error:", error);
      Alert.alert(
        t("settings.security.error.title"),
        t("doctor.profile.photoUploadFailed"),
      );
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleIdentificationDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert(
          t("settings.security.error.title"),
          t("editProfile.fileTooLarge"),
        );
        return;
      }
      setUploadingIdentificationDocument(true);
      if (apiService.isMockMode()) {
        setIdentificationDocument({
          filePath: "/uploads/identification/mock.pdf",
          name: file.name,
        });
        setUploadingIdentificationDocument(false);
        return;
      }
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/pdf",
      } as any);
      const token = await AsyncStorage.getItem("accessToken");
      const response = await fetch(
        `${apiService.getBaseURL()}/upload/identification`,
        {
          method: "POST",
          body: formData,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        const filePath = data.data?.url || data.data?.filePath;
        setIdentificationDocument({ filePath, name: file.name });
      } else {
        Alert.alert(
          t("settings.security.error.title"),
          data.message || t("editProfile.fileUploadFailed"),
        );
      }
    } catch (err: any) {
      Alert.alert(
        t("settings.security.error.title"),
        err?.message || t("editProfile.fileUploadFailed"),
      );
    } finally {
      setUploadingIdentificationDocument(false);
    }
  };

  const handleSave = async () => {
    if (savingProfile) return;

    if (!name.trim()) {
      Alert.alert(
        t("settings.security.error.title"),
        t("editProfile.error.nameRequired"),
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        t("settings.security.error.title"),
        t("editProfile.error.emailRequired"),
      );
      return;
    }

    const payload: any = {
      name: name.trim(),
      email: email.trim(),
    };

    if (phone.trim()) {
      payload.phone = phone.trim();
    }
    if (idNumber.trim()) {
      payload.idNumber = idNumber.trim();
    }
    if (gender) {
      payload.gender = gender;
    }
    if (address.trim()) {
      payload.address = address.trim();
    }
    if (dateOfBirth.trim()) {
      payload.dateOfBirth = dateOfBirth.trim();
    }
    // პირადობა/პასპორტი მხოლოდ ნახვის რეჟიმში — არ იგზავნება განახლებაზე

    if (about.trim()) {
      payload.about = about.trim();
    }

    if (profileImage) {
      payload.profileImage = profileImage;
      console.log(
        "📸 [EditProfile] Saving profile with profileImage:",
        profileImage,
      );
    } else {
      console.log("📸 [EditProfile] No profileImage to save");
    }

    // Doctor specific fields
    if (isDoctor) {
      if (consultationFee.trim()) {
        payload.consultationFee = parseFloat(consultationFee.trim());
      }
      if (experience.trim()) {
        payload.experience = experience.trim();
      }
      if (location.trim()) {
        payload.location = location.trim();
      }
      if (degrees.trim()) {
        payload.degrees = degrees.trim();
      }
    }

    console.log(
      "📸 [EditProfile] Full payload:",
      JSON.stringify(payload, null, 2),
    );

    try {
      setSavingProfile(true);
      const response = await apiService.updateProfile(payload);
      console.log("📸 [EditProfile] updateProfile response:", response);
      if (!response.success) {
        Alert.alert(
          t("settings.security.error.title"),
          t("editProfile.saveFailed"),
        );
        return;
      }
      Alert.alert(t("settings.security.success.title"), t("editProfile.saveSuccess"), [
        { text: t("common.actions.ok"), onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error("Failed to save profile", err);
      Alert.alert(
        t("settings.security.error.title"),
        t("editProfile.saveFailed"),
      );
    } finally {
      setSavingProfile(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("editProfile.title")}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>{t("editProfile.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.flex}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={20} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("editProfile.title")}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: (insets.bottom || 0) + 140 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              {/* Profile Image */}
              <View style={styles.profileImageSection}>
                <View style={styles.profileImageContainer}>
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={styles.profileImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={48} color="#9CA3AF" />
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.changePhotoButton,
                      isDoctor && styles.changePhotoButtonDisabled,
                    ]}
                    onPress={handleProfileImagePick}
                    disabled={uploadingProfileImage || isDoctor}
                  >
                    {uploadingProfileImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.profileImageHint}>
                  {isDoctor
                    ? t("editProfile.photoAdminOnly")
                    : t("editProfile.photoChangeHint")}
                </Text>
              </View>

              {/* Name */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="person-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>{t("settings.profile.fullName")}</Text>
                </View>
                <View
                  style={[styles.input, styles.inputDisabled]}
                  pointerEvents="none"
                >
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    placeholder={t("editProfile.placeholder.fullName")}
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    editable={false}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="mail-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>{t("settings.profile.email")}</Text>
                </View>
                <View
                  style={[styles.input, styles.inputDisabled]}
                  pointerEvents="none"
                >
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    placeholder={t("editProfile.placeholder.email")}
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={false}
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="call-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>{t("settings.profile.phone")}</Text>
                </View>
                <View
                  style={[styles.input, styles.inputDisabled]}
                  pointerEvents="none"
                >
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    placeholder={t("editProfile.placeholder.phone")}
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={false}
                  />
                </View>
              </View>

              {/* პირადი ნომერი */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="card-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>{t("settings.profile.idNumber")}</Text>
                </View>
                <View
                  style={[styles.input, styles.inputDisabled]}
                  pointerEvents="none"
                >
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    placeholder={t("editProfile.placeholder.idNumber")}
                    placeholderTextColor="#9CA3AF"
                    value={idNumber}
                    onChangeText={setIdNumber}
                    keyboardType="number-pad"
                    editable={false}
                  />
                </View>
              </View>

              {/* სქესი */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="person-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>{t("editProfile.gender")}</Text>
                </View>
                <View style={styles.genderRow}>
                  {(["male", "female"] as const).map((g) => (
                    <View
                      key={g}
                      style={[
                        styles.genderOption,
                        gender === g && styles.genderOptionSelected,
                        viewOnly && styles.inputDisabled,
                      ]}
                    >
                      <Ionicons
                        name={g === "male" ? "male" : "female"}
                        size={20}
                        color={gender === g ? "#06B6D4" : "#6B7280"}
                      />
                      <Text
                        style={[
                          styles.genderOptionText,
                          gender === g && styles.genderOptionTextSelected,
                        ]}
                      >
                        {g === "male"
                          ? t("settings.profile.gender.male")
                          : t("settings.profile.gender.female")}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* მისამართი (პაციენტი) */}
              {!isDoctor && (
                <View style={styles.formItem}>
                  <View style={styles.labelContainer}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#06B6D4"
                    />
                    <Text style={styles.label}>{t("editProfile.address")}</Text>
                  </View>
                  <View
                    style={[styles.input, styles.inputDisabled]}
                    pointerEvents="none"
                  >
                    <TextInput
                      style={[styles.textInput, styles.textInputDisabled]}
                      placeholder={t("editProfile.placeholder.address")}
                      placeholderTextColor="#9CA3AF"
                      value={address}
                      onChangeText={setAddress}
                      editable={false}
                    />
                  </View>
                </View>
              )}

              {/* დაბადების თარიღი */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="calendar-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>{t("editProfile.dateOfBirth")}</Text>
                </View>
                <View
                  style={[styles.input, styles.inputDisabled]}
                  pointerEvents="none"
                >
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    placeholder={t("editProfile.placeholder.dateOfBirth")}
                    placeholderTextColor="#9CA3AF"
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    editable={false}
                  />
                </View>
              </View>

              {/* პირადობა / პასპორტი (მხოლოდ ნახვა) */}
              {/* <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons
                    name="document-attach-outline"
                    size={20}
                    color="#06B6D4"
                  />
                  <Text style={styles.label}>პირადობა / პასპორტი</Text>
                </View>
                {identificationDocument ? (
                  <View style={styles.documentRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                    />
                    <Text style={styles.documentName} numberOfLines={1}>
                      {identificationDocument.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const path = identificationDocument.filePath;
                        const url = path.startsWith("http")
                          ? path
                          : `${apiService.getBaseURL().replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
                        Linking.openURL(url);
                      }}
                      style={styles.openDocButton}
                    >
                      <Ionicons name="open-outline" size={18} color="#06B6D4" />
                      <Text style={styles.openDocText}>გახსნა</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.documentPlaceholder}>
                    დოკუმენტი არ არის ატვირთული
                  </Text>
                )}
              </View> */}

              {/* Doctor Specific Fields */}
              {isDoctor && (
                <>
                  {/* Consultation Fee */}

                  <View style={styles.formItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons
                        name="briefcase-outline"
                        size={20}
                        color="#8B5CF6"
                      />
                      <Text style={styles.label}>
                        {t("editProfile.workExperience")}
                      </Text>
                    </View>
                    <View
                      style={[styles.input, styles.inputDisabled]}
                      pointerEvents="none"
                    >
                      <TextInput
                        style={[styles.textInput, styles.textInputDisabled]}
                        placeholder={t("editProfile.placeholder.experience")}
                        placeholderTextColor="#9CA3AF"
                        value={experience}
                        onChangeText={setExperience}
                        editable={false}
                      />
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.formItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color="#F59E0B"
                      />
                      <Text style={styles.label}>{t("editProfile.address")}</Text>
                    </View>
                    <View
                      style={[styles.input, styles.inputDisabled]}
                      pointerEvents="none"
                    >
                      <TextInput
                        style={[styles.textInput, styles.textInputDisabled]}
                        placeholder={t("editProfile.placeholder.address")}
                        placeholderTextColor="#9CA3AF"
                        value={location}
                        onChangeText={setLocation}
                        editable={false}
                      />
                    </View>
                  </View>

                  {/* Degrees */}
                  <View style={styles.formItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons
                        name="school-outline"
                        size={20}
                        color="#06B6D4"
                      />
                      <Text style={styles.label}>
                        {t("editProfile.qualification")}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.input,
                        styles.textAreaInput,
                        styles.inputDisabled,
                      ]}
                      pointerEvents="none"
                    >
                      <TextInput
                        style={[
                          styles.textInput,
                          styles.textArea,
                          styles.textInputDisabled,
                        ]}
                        placeholder={t("editProfile.placeholder.qualification")}
                        placeholderTextColor="#9CA3AF"
                        value={degrees}
                        onChangeText={setDegrees}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        editable={false}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Sticky Footer Save Button above keyboard */}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  formSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileImageSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  changePhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileImageHint: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  formItem: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textAreaInput: {
    minHeight: 100,
  },
  textInput: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  textArea: {
    minHeight: 80,
  },
  saveButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    opacity: 0.7,
  },
  textInputDisabled: {
    color: "#6B7280",
  },
  changePhotoButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E0F2FE",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#06B6D4",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#0369A1",
    lineHeight: 20,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  genderOptionSelected: {
    borderColor: "#06B6D4",
    backgroundColor: "#E0F2FE",
  },
  genderOptionText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  genderOptionTextSelected: {
    color: "#06B6D4",
    fontFamily: "Poppins-SemiBold",
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#166534",
  },
  openDocButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  openDocText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  removeDocButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeDocText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#DC2626",
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  filePickerButtonActive: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  filePickerText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  documentPlaceholder: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
