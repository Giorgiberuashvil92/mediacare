import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService } from "../_services/api";
import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../utils/toast";

export default function SettingsScreen() {
  const { user, logout, isAuthenticated } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Fetch profile image when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadProfileImage = async () => {
        try {
          const response = await apiService.getProfile();
          if (response.success && response.data?.profileImage) {
            setProfileImage(response.data.profileImage);
          }
        } catch (error) {
          console.log("Failed to load profile image:", error);
        }
      };
      
      if (isAuthenticated) {
        loadProfileImage();
      }
    }, [isAuthenticated])
  );

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem("hasCompletedOnboarding");
    router.replace("/screens/auth/onboarding");
  };

  const handleLogout = async () => {
    Alert.alert("გასვლა", "დარწმუნებული ხართ რომ გსურთ გასვლა?", [
      {
        text: "გაუქმება",
        style: "cancel",
      },
      {
        text: "გასვლა",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            showToast.auth.logoutSuccess();
            router.replace("/screens/auth/login");
          } catch {
            showToast.auth.logoutError();
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>პარამეტრები</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Profile Information Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri: profileImage || user?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&size=200&background=06B6D4&color=fff`,
              }}
              style={styles.profileImage}
              contentFit="cover"
            />
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={() => router.push("/screens/profile/edit-profile")}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.userName}>
              {user ? user.name : "მომხმარებელი"}
            </Text>
            
          </View>

          <Text style={styles.userEmail}>
            {user ? user.email : "email@example.com"}
          </Text>

          {user && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleText}>
                {user.role === "doctor" ? "ექიმი" : "პაციენტი"}
              </Text>
            </View>
          )}

          <View style={styles.separator} />
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/edit-profile")}
          >
            <View
              style={[styles.menuIconContainer, { backgroundColor: "#EFF6FF" }]}
            >
              <Ionicons name="person-outline" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>პროფილი</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/medical-cabinet")}
          >
            <View
              style={[styles.menuIconContainer, { backgroundColor: "#EFF6FF" }]}
            >
              <Ionicons name="document-text" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>პირადი კაბინეტი</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/favourites")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="heart" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>ფავორიტები</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
{/* 
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="book" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>მისამართების წიგნი</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity> */}
{/* 
          <TouchableOpacity
            onPress={() => router.push("/screens/profile/payment")}
            style={styles.menuItem}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="wallet" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>გადახდები</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity> */}

         

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/security")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>უსაფრთხოება</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          
          {/* <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="people" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>მეგობრების მოწვევა</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity> */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/terms/cancellation")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="close-circle-outline" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>ჯავშნების გაუქმების პირობები</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/terms/service")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="document-text-outline" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>სერვისის პირობები</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/terms/privacy")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>კონფიდენციალურობა</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/language")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="language" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>ენა</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              console.log("Navigating to help-center FAQ");
              router.push({
                pathname: "/screens/profile/help-center",
                params: { tab: "faq" },
              } as any);
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>ხშირად დასმული კითხვები</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              console.log("Navigating to help-center Contact");
              router.push({
                pathname: "/screens/profile/help-center",
                params: { tab: "contact" },
              } as any);
            }}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="call-outline" size={20} color="#10B981" />
            </View>
            <Text style={styles.menuText}>კონტაქტები</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="log-out" size={20} color="#FF3B30" />
              </View>
              <Text style={[styles.menuText, { color: "#FF3B30" }]}>
                გასვლა
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleResetOnboarding}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="refresh" size={20} color="#FF3B30" />
            </View>
            <Text style={[styles.menuText, { color: "#FF3B30" }]}>
              ონბორდინგის განულება
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Testing Tools - Switch to Doctor */}
        <View style={styles.testingSection}>
          <Text style={styles.testingSectionTitle}>
            🧪 ტესტირების ხელსაწყოები (Dev)
          </Text>
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                await AsyncStorage.setItem("@medicare_user_role", "doctor");
                router.replace("/(doctor-tabs)");
              }}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="swap-horizontal" size={20} color="#06B6D4" />
              </View>
                <Text style={styles.menuText}>ექიმის რეჟიმზე გადასვლა</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
  },
  addPhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  userName: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginRight: 8,
    textAlign: "center",
  },
  editButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },
  userEmail: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 8,
    textAlign: "center",
  },
  roleContainer: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
    textAlign: "center",
  },
  separator: {
    width: "100%",
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  menuSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    flex: 1,
  },
  testingSection: {
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  testingSectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
    marginBottom: 12,
  },
});

