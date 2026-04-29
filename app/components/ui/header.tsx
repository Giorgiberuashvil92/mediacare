import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiService } from "../../_services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";

const Header = () => {
  const { getTotalItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isNotificationModalVisible, setIsNotificationModalVisible] =
    useState(false);

  // Fetch latest profile image when screen is focused
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
    }, [isAuthenticated]),
  );

  const handleProfilePress = () => {
    if (isAuthenticated) {
      router.push("/(tabs)/settings");
    } else {
      router.push("/screens/auth/login");
    }
  };

  const handleCartPress = () => {
    router.push("/screens/medicine/cart");
  };

  const handleNotificationPress = () => {
    setIsNotificationModalVisible(true);
  };

  // Get profile image - prioritize fetched image, then user context, then fallback
  const getProfileImage = () => {
    const image = profileImage || user?.profileImage;
    if (image) {
      return image;
    }
    // Fallback to ui-avatars
    const name = user?.name || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06B6D4&color=fff&size=200`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={handleProfilePress}>
        <Image
          style={{ width: 44, height: 44, borderRadius: 22 }}
          source={{ uri: getProfileImage() }}
        />
        <View>
          <Text style={{ color: "#171717", fontFamily: "Poppins-Medium" }}>
            {isAuthenticated ? "გამარჯობა!" : "მოგესალმებით!"}
          </Text>
          <Text style={{ fontFamily: "Poppins-SemiBold" }}>
            {isAuthenticated && user ? user.name : "მომხმარებელი"}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.rightIcons}>
        <TouchableOpacity onPress={handleCartPress} style={styles.cartIcon}>
          <Ionicons name="cart-outline" size={24} color="black" />
          {getTotalItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNotificationPress}>
          <Ionicons name="notifications-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isNotificationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotificationModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsNotificationModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ნოტიფიკაციები</Text>
              <TouchableOpacity
                onPress={() => setIsNotificationModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#171717" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBodyText}>
              ახალი ნოტიფიკაციები ჯერ არ არის.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    margin: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cartIcon: {
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins-Bold",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    color: "#171717",
    fontFamily: "Poppins-SemiBold",
  },
  modalBodyText: {
    color: "#4B5563",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
});
