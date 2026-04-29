import { apiService } from "@/app/_services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../utils/toast";

export default function DoctorProfile() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    appointments: true,
    messages: true,
    updates: false,
  });
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // Check if doctor profile is complete (active) or incomplete (passive)
  const getProfileStatus = () => {
    if (!doctorProfile) return { isActive: false, missingFields: [] };

    const missingFields: string[] = [];

    if (!doctorProfile.about || doctorProfile.about.trim() === "") {
      missingFields.push("შესახებ");
    }
    if (!doctorProfile.specialization) {
      missingFields.push("სპეციალიზაცია");
    }
    if (!doctorProfile.experience) {
      missingFields.push("გამოცდილება");
    }
    if (!doctorProfile.videoConsultationFee) {
      missingFields.push("ვიდეო კონსულტაციის ფასი");
    }
    if (!doctorProfile.profileImage) {
      missingFields.push("პროფილის ფოტო");
    }

    return {
      isActive: missingFields.length === 0,
      missingFields,
    };
  };

  const profileStatus = getProfileStatus();

  useEffect(() => {
    loadProfileData();
  }, [user?.id]);

  // Reload profile when screen comes into focus (e.g., returning from edit-profile)
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, []),
  );

  const loadProfileData = async () => {
    try {
      if (apiService.isMockMode()) {
        return;
      }

      // Load profile and stats in parallel
      const [profileResponse, statsResponse] = await Promise.all([
        apiService.getProfile(),
        apiService.getDoctorDashboardStats(),
      ]);

      if (profileResponse.success && profileResponse.data) {
        setDoctorProfile(profileResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.log(error);
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
        showToast.error("სურათის ზომა არ უნდა აღემატებოდეს 5MB-ს", "შეცდომა");
        return;
      }

      setUploadingProfileImage(true);

      // Upload image
      const uploadResponse = await apiService.uploadProfileImagePublic({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "image/jpeg",
      });

      if (uploadResponse.url) {
        // Update profile with new image
        const updateResponse = await apiService.updateProfile({
          profileImage: uploadResponse.url,
        });

        if (updateResponse.success) {
          setDoctorProfile((prev: any) => ({
            ...prev,
            profileImage: uploadResponse.url,
          }));
          showToast.success("ფოტო წარმატებით განახლდა", "წარმატება");
        }
      }
    } catch (error) {
      console.error("Profile image pick error:", error);
      showToast.error(
        error instanceof Error ? error.message : "ფოტოს ატვირთვა ვერ მოხერხდა",
        "შეცდომა",
      );
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("გასვლა", "დარწმუნებული ხართ რომ გსურთ გასვლა?", [
      {
        text: "გაუქმება",
        style: "cancel",
      },
      {
        text: "გასვლა",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/screens/auth/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>პარამეტრები</Text>
          <Text style={styles.subtitle}>ექიმის პროფილი და პარამეტრები</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleProfileImagePick}
            disabled={uploadingProfileImage}
          >
            {uploadingProfileImage ? (
              <View style={styles.avatar}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : doctorProfile?.profileImage ? (
              <Image
                source={{ uri: doctorProfile.profileImage }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.onlineBadge} />
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            {/* Rating above name */}
            {doctorProfile?.rating !== undefined && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FACC15" />
                <Text style={styles.ratingText}>
                  {doctorProfile.rating?.toFixed(1) || "0.0"}
                </Text>
              </View>
            )}
            <View style={styles.nameWithStatusRow}>
              <Text style={styles.profileName}>
                {user?.name || "Dr. Stefin Cook"}
              </Text>
              {/* Active/Passive Status Badge */}
              <TouchableOpacity
                onPress={() => setStatusModalVisible(true)}
                style={[
                  styles.statusBadge,
                  profileStatus.isActive
                    ? styles.statusBadgeActive
                    : styles.statusBadgePassive,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    profileStatus.isActive
                      ? styles.statusDotActive
                      : styles.statusDotPassive,
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    profileStatus.isActive
                      ? styles.statusTextActive
                      : styles.statusTextPassive,
                  ]}
                >
                  {profileStatus.isActive ? "აქტიური" : "პასიური"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.profileEmail}>
              {user?.email || "doctor@medicare.ge"}
            </Text>
            {doctorProfile?.specialization && (
              <View style={styles.profileBadge}>
                <MaterialCommunityIcons
                  name="stethoscope"
                  size={14}
                  color="#06B6D4"
                />
                <Text style={styles.profileBadgeText}>
                  {doctorProfile.specialization}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/screens/profile/edit-profile")}
          >
            <Ionicons name="create-outline" size={20} color="#06B6D4" />
          </TouchableOpacity>
        </View>

        {/* Statistics */}

        {/* Quick Stats Row */}

        {/* Detailed Statistics Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.detailedStatsButton}
            onPress={() => router.push("/doctor/revenue-details" as any)}
          >
            <View style={styles.detailedStatsLeft}>
              <View style={styles.detailedStatsIcon}>
                <Ionicons name="stats-chart" size={24} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.detailedStatsTitle}>
                  დეტალური სტატისტიკა
                </Text>
                <Text style={styles.detailedStatsSubtitle}>
                  ფინანსური და თვეების მიხედვით
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Language — იგივე ეკრანი, რაც პაციენტის პარამეტრებში */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ენა და რეგიონი</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/screens/profile/language")}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="language" size={22} color="#06B6D4" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>ენა</Text>
                  <Text style={styles.menuItemSubtitle}>
                    აპლიკაციის ენის შეცვლა
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance */}

        {/* Notifications */}

        {/* Help & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>დახმარება და მხარდაჭერა</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push({
                  pathname: "/screens/profile/help-center",
                  params: { tab: "faq" },
                } as any)
              }
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="help-circle" size={22} color="#06B6D4" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>
                    ხშირად დასმული კითხვები
                  </Text>
                  <Text style={styles.menuItemSubtitle}>
                    ხშირად დასმული კითხვები და პასუხები
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/screens/profile/security" as any)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="lock-closed" size={22} color="#06B6D4" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>პაროლის შეცვლა</Text>
                  <Text style={styles.menuItemSubtitle}>
                    მიმდინარე პაროლის შეცვლა ახალი პაროლით
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push({
                  pathname: "/screens/profile/help-center",
                  params: { tab: "contact" },
                } as any)
              }
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="call-outline" size={22} color="#10B981" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>კონტაქტები</Text>
                  <Text style={styles.menuItemSubtitle}>
                    საკონტაქტო ინფორმაცია
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Collaboration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>თანამშრომლობა</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push("/screens/profile/terms/contract" as any)
              }
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="document-attach" size={22} color="#8B5CF6" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>ხელშეკრულება</Text>
                  <Text style={styles.menuItemSubtitle}>
                    თანამშრომლობის პირობები
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/screens/profile/terms/usage" as any)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="reader" size={22} color="#10B981" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>მოხმარების წესები</Text>
                  <Text style={styles.menuItemSubtitle}>
                    აპლიკაციის მოხმარების წესები
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push("/screens/profile/terms/doctor-cancellation" as any)
              }
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name="close-circle-outline"
                    size={22}
                    color="#EF4444"
                  />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>
                    ჯავშნების გაუქმების პირობები
                  </Text>
                  <Text style={styles.menuItemSubtitle}>
                    გაუქმების წესები და პირობები
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                router.push("/screens/profile/terms/doctor-service" as any)
              }
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name="document-text-outline"
                    size={22}
                    color="#0EA5E9"
                  />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>სერვისის პირობები</Text>
                  <Text style={styles.menuItemSubtitle}>
                    სერვისის გამოყენების პირობები
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name="information-circle"
                    size={22}
                    color="#8B5CF6"
                  />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>აპლიკაციის შესახებ</Text>
                  <Text style={styles.menuItemSubtitle}>ვერსია 1.0.0</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />
          </View>
        </View>

        {/* Testing Tools - დატოვებული სატესტოდ */}

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>გასვლა</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Medicare © 2024</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 (Build 100)</Text>
        </View>
      </ScrollView>

      {/* Status Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>პროფილის სტატუსი</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setStatusModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {profileStatus.isActive ? (
              <View style={styles.statusModalActive}>
                <View style={styles.statusModalIconActive}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                </View>
                <Text style={styles.statusModalTitle}>
                  თქვენი პროფილი აქტიურია!
                </Text>
                <Text style={styles.statusModalSubtitle}>
                  ბოლოს განახლდა:{" "}
                  {doctorProfile?.updatedAt
                    ? new Date(doctorProfile.updatedAt).toLocaleDateString(
                        "ka-GE",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )
                    : "უცნობია"}
                </Text>
                <View style={styles.recommendationBox}>
                  <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
                  <Text style={styles.recommendationText}>
                    ექიმის შესახებ ინფორმაციის განახლებისათვის მიწერეთ
                    პლატფორმის ადმინისტრაციას
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.statusModalPassive}>
                <View style={styles.statusModalIconPassive}>
                  <Ionicons name="alert-circle" size={48} color="#EF4444" />
                </View>
                <Text style={styles.statusModalTitle}>
                  თქვენი პროფილი არასრულია
                </Text>
                <Text style={styles.statusModalSubtitle}>
                  გთხოვთ შეავსოთ შემდეგი ველები:
                </Text>
                <View style={styles.missingFieldsList}>
                  {profileStatus.missingFields.map((field, index) => (
                    <View key={index} style={styles.missingFieldItem}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                      <Text style={styles.missingFieldText}>{field}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => {
                    setStatusModalVisible(false);
                    router.push("/screens/profile/edit-profile");
                  }}
                >
                  <Text style={styles.editProfileButtonText}>
                    პროფილის რედაქტირება
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#06B6D4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#06B6D4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#666666",
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 6,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFEFF",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  profileBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  statsSection: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#9CA3AF",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 72,
  },
  logoutSection: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#EF4444",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#D1D5DB",
  },
  // Status Badge styles
  nameWithStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgePassive: {
    backgroundColor: "#FEE2E2",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: "#10B981",
  },
  statusDotPassive: {
    backgroundColor: "#EF4444",
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
  },
  statusTextActive: {
    color: "#10B981",
  },
  statusTextPassive: {
    color: "#EF4444",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#111827",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  statusModalActive: {
    alignItems: "center",
    paddingVertical: 16,
  },
  statusModalPassive: {
    alignItems: "center",
    paddingVertical: 16,
  },
  statusModalIconActive: {
    marginBottom: 12,
  },
  statusModalIconPassive: {
    marginBottom: 12,
  },
  statusModalTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  statusModalSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  recommendationBox: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#92400E",
  },
  missingFieldsList: {
    width: "100%",
    gap: 8,
    marginBottom: 20,
  },
  missingFieldItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  missingFieldText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#DC2626",
  },
  editProfileButton: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editProfileButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  // Additional stat styles
  statSubLabel: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 2,
  },
  // Quick stats row
  quickStatsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  quickStatItem: {
    alignItems: "center",
    flex: 1,
  },
  quickStatValue: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },
  // Detailed stats button
  detailedStatsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  detailedStatsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailedStatsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailedStatsTitle: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  detailedStatsSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
});
