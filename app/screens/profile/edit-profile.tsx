import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
        setAbout("");
        setProfileImage(null);
        setLoadingProfile(false);
        return;
      }

      const response = await apiService.getProfile();

      if (response.success && response.data) {
        const profile = response.data;
        setName(profile.name || "");
        setEmail(profile.email || "");
        setPhone(profile.phone || "");
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
        Alert.alert("წარმატება", "სურათი აიტვირთა (mock)");
      } else {
        const uploadResponse = await apiService.uploadProfileImagePublic({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || "profile.jpg",
          type: result.assets[0].mimeType || "image/jpeg",
        });

        console.log("📸 [EditProfile] uploadResponse:", uploadResponse);

        if (uploadResponse.success && uploadResponse.url) {
          console.log("📸 [EditProfile] Setting profileImage to:", uploadResponse.url);
          setProfileImage(uploadResponse.url);
          Alert.alert("წარმატება", "სურათი წარმატებით აიტვირთა");
        } else {
          Alert.alert("შეცდომა", "სურათის ატვირთვა ვერ მოხერხდა");
        }
      }
    } catch (error) {
      console.error("Profile image pick error:", error);
      Alert.alert("შეცდომა", "სურათის ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleSave = async () => {
    if (savingProfile) return;

    if (!name.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ სახელი");
      return;
    }

    if (!email.trim()) {
      Alert.alert("შეცდომა", "გთხოვთ შეიყვანოთ ელ. ფოსტა");
      return;
    }

    const payload: any = {
      name: name.trim(),
      email: email.trim(),
    };

    if (phone.trim()) {
      payload.phone = phone.trim();
    }

    if (about.trim()) {
      payload.about = about.trim();
    }

    if (profileImage) {
      payload.profileImage = profileImage;
      console.log("📸 [EditProfile] Saving profile with profileImage:", profileImage);
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

    console.log("📸 [EditProfile] Full payload:", JSON.stringify(payload, null, 2));

    try {
      setSavingProfile(true);
      const response = await apiService.updateProfile(payload);
      console.log("📸 [EditProfile] updateProfile response:", response);
      if (!response.success) {
        Alert.alert("შეცდომა", "ინფორმაციის შენახვა ვერ მოხერხდა");
        return;
      }
      Alert.alert("წარმატება", "პროფილი წარმატებით განახლდა", [
        { text: "კარგი", onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error("Failed to save profile", err);
      Alert.alert("შეცდომა", "ინფორმაციის შენახვა ვერ მოხერხდა");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>პროფილი</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>მონაცემების ჩატვირთვა...</Text>
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>პროფილი</Text>
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
                    style={[styles.changePhotoButton, isDoctor && styles.changePhotoButtonDisabled]}
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
                    ? "პროფილის ფოტო შეიძლება შეიცვალოს მხოლოდ ადმინ პანელიდან"
                    : "დააჭირეთ კამერას პროფილის ფოტოს შესაცვლელად"}
                </Text>
              </View>

              {/* Name */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="person-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>სახელი</Text>
                </View>
                <View style={[styles.input, isDoctor && styles.inputDisabled]} pointerEvents={isDoctor ? "none" : "auto"}>
                  <TextInput
                    style={[styles.textInput, isDoctor && styles.textInputDisabled]}
                    placeholder="შეიყვანეთ სახელი"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    editable={!isDoctor}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="mail-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>ელ. ფოსტა</Text>
                </View>
                <View style={[styles.input, isDoctor && styles.inputDisabled]} pointerEvents={isDoctor ? "none" : "auto"}>
                  <TextInput
                    style={[styles.textInput, isDoctor && styles.textInputDisabled]}
                    placeholder="შეიყვანეთ ელ. ფოსტა"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail} 
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isDoctor}
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="call-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>ტელეფონი</Text>
                </View>
                <View style={[styles.input, isDoctor && styles.inputDisabled]} pointerEvents={isDoctor ? "none" : "auto"}>
                  <TextInput
                    style={[styles.textInput, isDoctor && styles.textInputDisabled]}
                    placeholder="შეიყვანეთ ტელეფონი"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!isDoctor}
                  />
                </View>
              </View>

              {/* About */}
              <View style={styles.formItem}>
                <View style={styles.labelContainer}>
                  <Ionicons name="information-circle-outline" size={20} color="#06B6D4" />
                  <Text style={styles.label}>შესახებ</Text>
                </View>
                <View style={[styles.input, styles.textAreaInput, isDoctor && styles.inputDisabled]} pointerEvents={isDoctor ? "none" : "auto"}>
                  <TextInput
                    style={[styles.textInput, styles.textArea, isDoctor && styles.textInputDisabled]}
                    placeholder="დაწერეთ თქვენს შესახებ..."
                    placeholderTextColor="#9CA3AF"
                    value={about}
                    onChangeText={setAbout}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!isDoctor}
                  />
                </View>
              </View>

              {/* Doctor Specific Fields */}
              {isDoctor && (
                <>
                  {/* Consultation Fee */}
                  <View style={styles.formItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="cash-outline" size={20} color="#10B981" />
                      <Text style={styles.label}>კონსულტაციის ფასი (₾)</Text>
                    </View>
                    <View style={[styles.input, styles.inputDisabled]} pointerEvents="none">
                      <TextInput
                        style={[styles.textInput, styles.textInputDisabled]}
                        placeholder="მაგ: 50"
                        placeholderTextColor="#9CA3AF"
                        value={consultationFee}
                        onChangeText={setConsultationFee}
                        keyboardType="numeric"
                        editable={false}
                      />
                    </View>
                  </View>

                  {/* Experience */}
                  <View style={styles.formItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="briefcase-outline" size={20} color="#8B5CF6" />
                      <Text style={styles.label}>გამოცდილება</Text>
                    </View>
                    <View style={[styles.input, styles.inputDisabled]} pointerEvents="none">
                      <TextInput
                        style={[styles.textInput, styles.textInputDisabled]}
                        placeholder="მაგ: 10 წელი"
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
                      <Ionicons name="location-outline" size={20} color="#F59E0B" />
                      <Text style={styles.label}>მისამართი</Text>
                    </View>
                    <View style={[styles.input, styles.inputDisabled]} pointerEvents="none">
                      <TextInput
                        style={[styles.textInput, styles.textInputDisabled]}
                        placeholder="მაგ: თბილისი, ვაკე"
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
                      <Ionicons name="school-outline" size={20} color="#06B6D4" />
                      <Text style={styles.label}>კვალიფიკაცია / ხარისხი</Text>
                    </View>
                    <View style={[styles.input, styles.textAreaInput, styles.inputDisabled]} pointerEvents="none">
                      <TextInput
                        style={[styles.textInput, styles.textArea, styles.textInputDisabled]}
                        placeholder="მაგ: მედიცინის დოქტორი, თსსუ"
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
        <View
          style={[
            styles.footer,
            { paddingBottom: (insets.bottom || 12) + 12 },
          ]}
        >
          {isDoctor ? (
            <View style={[styles.infoBox, { marginTop: 24 }]}>
              <Ionicons name="information-circle" size={20} color="#06B6D4" />
              <Text style={styles.infoText}>
                ექიმის ინფორმაციის რედაქტირება შესაძლებელია მხოლოდ ადმინ პანელიდან
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>შენახვა</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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
});

