import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService, LoginSelectableUser } from "../../_services/api";
import OTPModal from "../../components/ui/OTPModal";
import { useLanguage } from "../../contexts/LanguageContext";
import { isStrongPassword } from "../../utils/passwordValidation";
import { showToast } from "../../utils/toast";

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const newPasswordIsStrong = isStrongPassword(newPassword);
  const [resetUsers, setResetUsers] = useState<LoginSelectableUser[]>([]);
  const [selectedResetUserId, setSelectedResetUserId] = useState("");
  const [showAccountSelectionModal, setShowAccountSelectionModal] =
    useState(false);

  const getRoleLabel = (role: LoginSelectableUser["role"]) =>
    role === "doctor"
      ? t("auth.login.userSelection.role.doctor")
      : t("auth.login.userSelection.role.patient");

  const getMaskedIdNumber = (idNumber?: string) => {
    if (!idNumber?.trim()) {
      return t("auth.login.userSelection.idNumber.missing");
    }

    const trimmedId = idNumber.trim();
    const idNumberLabel = t("auth.login.userSelection.idNumber.label");
    return trimmedId.length > 4
      ? `${idNumberLabel}: ****${trimmedId.slice(-4)}`
      : `${idNumberLabel}: ${trimmedId}`;
  };

  const resetAccountSelection = () => {
    setResetUsers([]);
    setSelectedResetUserId("");
    setShowAccountSelectionModal(false);
  };

  const handleSendCode = async () => {
    if (!phone.trim()) {
      showToast.error(
        t("auth.forgotPassword.validation.phoneRequired"),
        t("auth.forgotPassword.error.default"),
      );
      return;
    }

    // Validate phone number format (should be 9 digits starting with 5 for Georgian numbers)
    const cleanPhone = phone
      .trim()
      .replace(/\s+/g, "")
      .replace(/^\+995/, "")
      .replace(/^0/, "");
    if (cleanPhone.length !== 9 || !cleanPhone.startsWith("5")) {
      showToast.error(
        t("auth.forgotPassword.validation.phoneInvalid"),
        t("auth.forgotPassword.error.default"),
      );
      return;
    }

    try {
      setIsLoading(true);
      setSelectedResetUserId("");
      const response = await apiService.forgotPassword(phone.trim());

      if (response.requiresUserSelection) {
        const users = response.data?.users ?? [];
        if (!users.length) {
          throw new Error(t("auth.login.error.userSelectionMissing"));
        }

        setResetUsers(users);
        setShowAccountSelectionModal(true);
        return;
      }

      if (response.success) {
        setCodeSent(true);
        setShowOTPModal(true);
        showToast.success(
          t("auth.forgotPassword.success.codeSent"),
          t("auth.forgotPassword.success.title"),
        );
      } else {
        throw new Error(
          response.message || t("auth.forgotPassword.error.sendCode"),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("auth.forgotPassword.error.sendCode");
      showToast.error(errorMessage, t("auth.forgotPassword.error.default"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResetUser = async (selectedUser: LoginSelectableUser) => {
    try {
      setIsLoading(true);
      setSelectedResetUserId(selectedUser.id);
      const response = await apiService.forgotPassword(
        phone.trim(),
        selectedUser.id,
      );

      if (response.success) {
        setShowAccountSelectionModal(false);
        setCodeSent(true);
        setShowOTPModal(true);
        showToast.success(
          t("auth.forgotPassword.success.codeSent"),
          t("auth.forgotPassword.success.title"),
        );
      } else {
        throw new Error(
          response.message || t("auth.forgotPassword.error.sendCode"),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("auth.forgotPassword.error.sendCode");
      showToast.error(errorMessage, t("auth.forgotPassword.error.default"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerified = async (code: string) => {
    // OTP verified, now show password reset form
    setShowOTPModal(false);
    setCodeSent(true);
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      showToast.error(
        t("auth.forgotPassword.validation.passwordRequired"),
        t("auth.forgotPassword.error.default"),
      );
      return;
    }

    if (!isStrongPassword(newPassword)) {
      showToast.error(
        t("auth.forgotPassword.validation.passwordLength"),
        t("auth.forgotPassword.error.default"),
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast.error(
        t("auth.forgotPassword.validation.passwordMismatch"),
        t("auth.forgotPassword.error.default"),
      );
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.resetPassword({
        phone: phone.trim(),
        newPassword: newPassword.trim(),
        userId: selectedResetUserId || undefined,
      });

      if (response.success) {
        resetAccountSelection();
        showToast.success(
          t("auth.forgotPassword.success.passwordChanged"),
          t("auth.forgotPassword.success.title"),
        );
        router.replace("/screens/auth/login");
      } else {
        throw new Error(
          response.message || t("auth.forgotPassword.error.reset"),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("auth.forgotPassword.error.reset");
      showToast.error(errorMessage, t("auth.forgotPassword.error.default"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>

              {/* Logo */}
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Image
                    source={require("../../../assets/images/WhatsApp Image 2026-05-22 at 14.04.27.jpeg")}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
              </View>

              {/* Title */}
              {/* <Text style={styles.title}>
                {codeSent
                  ? t("auth.forgotPassword.titleReset")
                  : t("auth.forgotPassword.title")}
              </Text> */}
              <Text style={styles.subtitle}>
                {codeSent
                  ? t("auth.forgotPassword.subtitleReset")
                  : t("auth.forgotPassword.subtitle")}
              </Text>

              {/* Form */}
              <View style={styles.form}>
                {!codeSent ? (
                  <>
                    {/* Phone Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("auth.forgotPassword.phone.label")}
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="call-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder={t(
                            "auth.forgotPassword.phone.placeholder",
                          )}
                          placeholderTextColor="#9CA3AF"
                          value={phone}
                          onChangeText={setPhone}
                          keyboardType="phone-pad"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="send"
                          onSubmitEditing={handleSendCode}
                        />
                      </View>
                    </View>

                    {/* Send Code Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        isLoading && styles.submitButtonDisabled,
                      ]}
                      onPress={handleSendCode}
                      disabled={isLoading}
                    >
                      <Text style={styles.submitButtonText}>
                        {isLoading
                          ? t("auth.forgotPassword.sending")
                          : t("auth.forgotPassword.sendCode")}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* New Password Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("auth.forgotPassword.newPassword.label")}
                      </Text>
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
                          placeholder="••••••••"
                          placeholderTextColor="#9CA3AF"
                          value={newPassword}
                          onChangeText={setNewPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeIcon}
                        >
                          <Ionicons
                            name={
                              showPassword ? "eye-off-outline" : "eye-outline"
                            }
                            size={20}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.passwordHint}>
                        {t("settings.security.newPasswordHint")}
                      </Text>
                      {newPassword.length > 0 && newPasswordIsStrong && (
                        <Text style={styles.passwordStrengthLabel}>
                          {t("settings.security.strengthStrong")}
                        </Text>
                      )}
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>
                        {t("auth.forgotPassword.confirmPassword.label")}
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          secureTextEntry={!showConfirmPassword}
                          placeholder="••••••••"
                          placeholderTextColor="#9CA3AF"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          style={styles.eyeIcon}
                        >
                          <Ionicons
                            name={
                              showConfirmPassword
                                ? "eye-off-outline"
                                : "eye-outline"
                            }
                            size={20}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Reset Password Button */}
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        isLoading && styles.submitButtonDisabled,
                      ]}
                      onPress={handleResetPassword}
                      disabled={isLoading}
                    >
                      <Text style={styles.submitButtonText}>
                        {isLoading
                          ? t("auth.forgotPassword.resetting")
                          : t("auth.forgotPassword.resetButton")}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Back to Login */}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Account selection modal */}
      <Modal
        visible={showAccountSelectionModal}
        transparent
        animationType="slide"
        onRequestClose={resetAccountSelection}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {t("auth.forgotPassword.userSelection.title")}
            </Text>
            <Text style={styles.userSelectionSubtitle}>
              {t("auth.forgotPassword.userSelection.subtitle")}
            </Text>

            {resetUsers.map((userOption) => (
              <TouchableOpacity
                key={userOption.id}
                style={styles.userOptionCard}
                onPress={() => handleSelectResetUser(userOption)}
                disabled={isLoading}
              >
                <View style={styles.userOptionIcon}>
                  <Ionicons
                    name={
                      userOption.role === "doctor"
                        ? "medkit-outline"
                        : "person-outline"
                    }
                    size={22}
                    color="#06B6D4"
                  />
                </View>
                <View style={styles.userOptionContent}>
                  <Text style={styles.userOptionName}>
                    {userOption.name ||
                      t("auth.login.userSelection.defaultName")}
                  </Text>
                  <Text style={styles.userOptionMeta}>
                    {getRoleLabel(userOption.role)} •{" "}
                    {getMaskedIdNumber(userOption.idNumber)}
                  </Text>
                  {!!userOption.phone && (
                    <Text style={styles.userOptionMeta}>
                      {t("auth.login.userSelection.phone")}: {userOption.phone}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={resetAccountSelection}
              disabled={isLoading}
            >
              <Text style={styles.modalCloseButtonText}>
                {t("auth.login.userSelection.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <OTPModal
        visible={showOTPModal}
        phone={phone}
        autoSendOnOpen={false}
        sendCodeRequest={(rawPhone) =>
          apiService.forgotPassword(rawPhone, selectedResetUserId || undefined)
        }
        onClose={() => {
          setShowOTPModal(false);
          if (!codeSent) {
            setCodeSent(false);
          }
        }}
        onVerified={handleOTPVerified}
      />
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
  logoImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    marginBottom: 8,
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
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  passwordHint: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 18,
  },
  passwordStrengthLabel: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#10B981",
  },
  resendButton: {
    alignItems: "center",
    marginBottom: 16,
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  backToLoginButton: {
    alignItems: "center",
    marginTop: 16,
  },
  backToLoginText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  userSelectionSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  userOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  userOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFEFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userOptionContent: {
    flex: 1,
  },
  userOptionName: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
    marginBottom: 2,
  },
  userOptionMeta: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#64748B",
  },
  modalCloseButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#64748B",
  },
});
