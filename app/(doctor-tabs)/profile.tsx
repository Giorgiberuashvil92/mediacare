import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

export default function DoctorProfile() {
  const { user, logout } = useAuth();
  const [language, setLanguage] = useState<"ka" | "en">("ka");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    appointments: true,
    messages: true,
    updates: false,
  });
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadProfileData();
     
  }, [user?.id]);

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
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.onlineBadge} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name || "Dr. Stefin Cook"}
            </Text>
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
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#06B6D4" />
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="calendar" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.statValue}>
              {stats?.appointments?.total || 0}
            </Text>
            <Text style={styles.statLabel}>კონსულტაციები</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="people" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>
              {stats?.patients?.total || 0}
            </Text>
            <Text style={styles.statLabel}>პაციენტები</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>
              {doctorProfile?.rating?.toFixed(1) || "0.0"}
            </Text>
            <Text style={styles.statLabel}>რეიტინგი</Text>
          </View>
        </View>

        {/* Language Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ენა და რეგიონი</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setLanguage(language === "ka" ? "en" : "ka")}
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
              <View style={styles.languageSelector}>
                <Text style={styles.languageText}>
                  {language === "ka" ? "🇬🇪 ქართული" : "🇬🇧 English"}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>გარეგნობა</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name={isDarkMode ? "moon" : "sunny"}
                    size={22}
                    color={isDarkMode ? "#8B5CF6" : "#F59E0B"}
                  />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>ბნელი რეჟიმი</Text>
                  <Text style={styles.menuItemSubtitle}>
                    {isDarkMode ? "ბნელი თემა ჩართულია" : "ღია თემა ჩართულია"}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: "#D1D5DB", true: "#06B6D4" }}
                thumbColor={isDarkMode ? "#FFFFFF" : "#F3F4F6"}
              />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>შეტყობინებები</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="notifications" size={22} color="#10B981" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>დანიშვნები</Text>
                  <Text style={styles.menuItemSubtitle}>
                    ახალი დანიშვნების შეტყობინებები
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications.appointments}
                onValueChange={(value) =>
                  setNotifications({ ...notifications, appointments: value })
                }
                trackColor={{ false: "#D1D5DB", true: "#06B6D4" }}
                thumbColor={notifications.appointments ? "#FFFFFF" : "#F3F4F6"}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="chatbubbles" size={22} color="#06B6D4" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>შეტყობინებები</Text>
                  <Text style={styles.menuItemSubtitle}>
                    პაციენტების შეტყობინებები
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications.messages}
                onValueChange={(value) =>
                  setNotifications({ ...notifications, messages: value })
                }
                trackColor={{ false: "#D1D5DB", true: "#06B6D4" }}
                thumbColor={notifications.messages ? "#FFFFFF" : "#F3F4F6"}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="megaphone" size={22} color="#F59E0B" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>განახლებები</Text>
                  <Text style={styles.menuItemSubtitle}>
                    სისტემის განახლებები და სიახლეები
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications.updates}
                onValueChange={(value) =>
                  setNotifications({ ...notifications, updates: value })
                }
                trackColor={{ false: "#D1D5DB", true: "#06B6D4" }}
                thumbColor={notifications.updates ? "#FFFFFF" : "#F3F4F6"}
              />
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ანგარიში</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="person-circle" size={22} color="#06B6D4" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>პროფილის რედაქტირება</Text>
                  <Text style={styles.menuItemSubtitle}>
                    პირადი ინფორმაციის შეცვლა
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="lock-closed" size={22} color="#8B5CF6" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>უსაფრთხოება</Text>
                  <Text style={styles.menuItemSubtitle}>
                    პაროლი და ორფაქტორიანი ავთენტიფიკაცია
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="shield-checkmark" size={22} color="#10B981" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>კონფიდენციალურობა</Text>
                  <Text style={styles.menuItemSubtitle}>
                    მონაცემების დაცვა და პირადი ინფორმაცია
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Help & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>დახმარება და მხარდაჭერა</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="help-circle" size={22} color="#06B6D4" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>დახმარების ცენტრი</Text>
                  <Text style={styles.menuItemSubtitle}>
                    ხშირად დასმული კითხვები
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="mail" size={22} color="#10B981" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>დაგვიკავშირდით</Text>
                  <Text style={styles.menuItemSubtitle}>
                    support@medicare.ge
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
          </View>
        </View>

        {/* Testing Tools - დატოვებული სატესტოდ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Testing Tools (Dev)</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                await AsyncStorage.setItem("@medicare_user_role", "patient");
                router.replace("/(tabs)");
              }}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="swap-horizontal" size={22} color="#06B6D4" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Switch to Patient</Text>
                  <Text style={styles.menuItemSubtitle}>
                    პაციენტის როუთების ტესტირება
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                Alert.alert(
                  "Reset App",
                  "ნამდვილად გსურთ აპლიკაციის გადატვირთვა?",
                  [
                    {
                      text: "გაუქმება",
                      style: "cancel",
                    },
                    {
                      text: "Reset",
                      style: "destructive",
                      onPress: async () => {
                        await AsyncStorage.clear();
                        router.replace("/screens/auth/onboarding");
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name="refresh" size={22} color="#F59E0B" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>Reset App</Text>
                  <Text style={styles.menuItemSubtitle}>
                    Clear all data და restart
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

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
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  languageText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
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
});
