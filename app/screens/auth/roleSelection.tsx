import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

type UserRole = "doctor" | "patient";

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { setUserRole, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const handleContinue = async () => {
    if (!selectedRole) {
      alert(t("roleSelection.alert.selectRole"));
      return;
    }

    await setUserRole(selectedRole);

    // If user is already authenticated, navigate directly to the appropriate interface
    if (isAuthenticated) {
      if (selectedRole === "doctor") {
        router.replace("/(doctor-tabs)");
      } else {
        router.replace("/(tabs)");
      }
    } else {
      // If not authenticated, go directly to register
      router.push({
        pathname: "/screens/auth/register",
        params: { role: selectedRole },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t("roleSelection.title")}</Text>
          <Text style={styles.subtitle}>
            {isAuthenticated
              ? t("roleSelection.subtitle.authenticated")
              : t("roleSelection.subtitle.guest")}
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.roleCardsContainer}>
          {/* Doctor Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === "doctor" && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole("doctor")}
          >
            <View style={styles.roleCardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  selectedRole === "doctor" && styles.iconContainerSelected,
                ]}
              >
                <Ionicons
                  name="medical"
                  size={40}
                  color={selectedRole === "doctor" ? "#20BEB8" : "#6B7280"}
                />
              </View>
              {selectedRole === "doctor" && (
                <Ionicons name="checkmark-circle" size={28} color="#20BEB8" />
              )}
            </View>
            <Text style={styles.roleTitle}>
              {t("roleSelection.doctor.title")}
            </Text>
            <Text style={styles.roleDescription}>
              {t("roleSelection.doctor.description")}
            </Text>
          </TouchableOpacity>

          {/* Patient Card */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === "patient" && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole("patient")}
          >
            <View style={styles.roleCardHeader}>
              <View
                style={[
                  styles.iconContainer,
                  selectedRole === "patient" && styles.iconContainerSelected,
                ]}
              >
                <Ionicons
                  name="person"
                  size={40}
                  color={selectedRole === "patient" ? "#20BEB8" : "#6B7280"}
                />
              </View>
              {selectedRole === "patient" && (
                <Ionicons name="checkmark-circle" size={28} color="#20BEB8" />
              )}
            </View>
            <Text style={styles.roleTitle}>
              {t("roleSelection.patient.title")}
            </Text>
            <Text style={styles.roleDescription}>
              {t("roleSelection.patient.description")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole}
        >
          <Text style={styles.continueButtonText}>
            {t("roleSelection.continue")}
          </Text>
        </TouchableOpacity>

        {/* Login Link - only show if not authenticated */}
        {!isAuthenticated && (
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              {t("roleSelection.login.question")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/screens/auth/login")}
            >
              <Text style={styles.loginLink}>
                {t("roleSelection.login.action")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  roleCardsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  roleCardSelected: {
    borderColor: "#20BEB8",
    backgroundColor: "#F0FDFA",
  },
  roleCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerSelected: {
    backgroundColor: "#E0F7F5",
  },
  roleTitle: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  continueButton: {
    backgroundColor: "#20BEB8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  continueButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  loginLink: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#20BEB8",
  },
});
