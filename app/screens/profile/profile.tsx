import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { apiService } from "../../services/api";
import { showToast } from "../../utils/toast";

export default function ProfileScreen() {
  const { user, logout, isAuthenticated } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem("hasCompletedOnboarding");
    router.replace("/screens/auth/onboarding");
  };

  const loadProfile = useCallback(async () => {
    try {
      const response = await apiService.getProfile();
      console.log("📸 Profile response:", response);
      if (response.success && response.data) {
        const imageUrl = response.data.profileImage;
        console.log("📸 Profile image URL:", imageUrl);
        // Set profileImage if it exists and is not empty
        if (imageUrl && imageUrl.trim() !== '') {
          setProfileImage(imageUrl);
        } else {
          setProfileImage(null);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, loadProfile]);

  // Reload profile when screen comes into focus (e.g., returning from edit-profile)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadProfile();
      }
    }, [isAuthenticated, loadProfile]),
  );

  const handleGoBack = () => {
    router.back();
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
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <View style={styles.backButtonIcon}>
            <Ionicons name="arrow-back" size={20} color="#06B6D4" />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Profile Information Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
                contentFit="cover"
                onError={(error) => {
                  console.error("Error loading profile image:", error);
                  setProfileImage(null);
                }}
              />
            ) : (
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&size=200&background=06B6D4&color=fff`,
                }}
                style={styles.profileImage}
                contentFit="cover"
              />
            )}
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={() => router.push("/screens/profile/edit-profile")}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.userName}>
              {user ? user.name : "მომხმარებელი"}
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push("/screens/profile/edit-profile")}
            >
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </TouchableOpacity>
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
            onPress={() => router.push("/screens/profile/medical-records")}
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
            <Text style={styles.menuText}>Favourites</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="book" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>Address book</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/screens/profile/payment")}
            style={styles.menuItem}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="wallet" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>Payments</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>Security</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/language")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="language" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>Language</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/screens/profile/helpCenter")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="people" size={20} color="#06B6D4" />
            </View>
            <Text style={styles.menuText}>Invite Friends</Text>
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
              Reset Onboarding
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Testing Tools - Switch to Doctor */}
        <View style={styles.testingSection}>
          <Text style={styles.testingSectionTitle}>🧪 Testing Tools (Dev)</Text>
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
              <Text style={styles.menuText}>Switch to Doctor</Text>
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
  },
  backButton: {
    // marginRight: 15,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    marginRight: 40,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
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
