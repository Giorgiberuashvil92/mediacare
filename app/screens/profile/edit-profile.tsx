import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

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
      }
    } catch (err: any) {
      console.error("Error loading profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleProfileImagePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert("შეცდომა", "სურათის ზომა არ უნდა აღემატებოდეს 5MB-ს");
        return;
      }

      setUploadingProfileImage(true);

      if (apiService.isMockMode()) {
        setProfileImage(file.uri);
        Alert.alert("წარმატება", "სურათი აიტვირთა (mock)");
      } else {
        const uploadResponse = await apiService.uploadProfileImagePublic({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "image/jpeg",
        });

        if (uploadResponse.success && uploadResponse.url) {
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
    }

    try {
      setSavingProfile(true);
      const response = await apiService.updateProfile(payload);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>პროფილი</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                style={styles.changePhotoButton}
                onPress={handleProfileImagePick}
                disabled={uploadingProfileImage}
              >
                {uploadingProfileImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.profileImageHint}>
              დააჭირეთ კამერას პროფილის ფოტოს შესაცვლელად
            </Text>
          </View>

          {/* Name */}
          <View style={styles.formItem}>
            <View style={styles.labelContainer}>
              <Ionicons name="person-outline" size={20} color="#06B6D4" />
              <Text style={styles.label}>სახელი</Text>
            </View>
            <View style={styles.input}>
              <TextInput
                style={styles.textInput}
                placeholder="შეიყვანეთ სახელი"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.formItem}>
            <View style={styles.labelContainer}>
              <Ionicons name="mail-outline" size={20} color="#06B6D4" />
              <Text style={styles.label}>ელ. ფოსტა</Text>
            </View>
            <View style={styles.input}>
              <TextInput
                style={styles.textInput}
                placeholder="შეიყვანეთ ელ. ფოსტა"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.formItem}>
            <View style={styles.labelContainer}>
              <Ionicons name="call-outline" size={20} color="#06B6D4" />
              <Text style={styles.label}>ტელეფონი</Text>
            </View>
            <View style={styles.input}>
              <TextInput
                style={styles.textInput}
                placeholder="შეიყვანეთ ტელეფონი"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* About */}
          <View style={styles.formItem}>
            <View style={styles.labelContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#06B6D4" />
              <Text style={styles.label}>შესახებ</Text>
            </View>
            <View style={[styles.input, styles.textAreaInput]}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="დაწერეთ თქვენს შესახებ..."
                placeholderTextColor="#9CA3AF"
                value={about}
                onChangeText={setAbout}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Save Button */}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
});

