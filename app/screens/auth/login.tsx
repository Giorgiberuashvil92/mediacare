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
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { showToast } from "../../utils/toast";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: "ka" as const, labelKey: "common.language.georgian" },
    { code: "en" as const, labelKey: "common.language.english" },
  ];

  const selectedLanguageLabel =
    languages.find((lang) => lang.code === language)?.labelKey ??
    "common.language.georgian";

  const handleSelectLanguage = async (code: "ka" | "en") => {
    await setLanguage(code);
    setLanguageModalVisible(false);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast.error(
        t("auth.login.validation.fillAll"),
        t("auth.login.error.default"),
      );
      return;
    }

    try {
      setIsLoading(true);
      const authResponse = await login({ email: email.trim(), password });
      
      // Get role from response
      const role = authResponse.data.user.role || authResponse.data.role;
      
      // Show success toast
      showToast.auth.loginSuccess(authResponse.data.user.name || "მომხმარებელო");
      
      // Navigate based on role
      if (role === "doctor") {
        router.replace("/(doctor-tabs)");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      let errorMessage = t("auth.login.error.default");
      
      if (error instanceof Error) {
        if (error.message.includes("Invalid credentials")) {
          errorMessage = t("auth.login.error.invalidCredentials");
        } else if (error.message.includes("User not found")) {
          errorMessage = t("auth.login.error.userNotFound");
        } else if (error.message.includes("Invalid email")) {
          errorMessage = t("auth.login.error.invalidEmail");
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast.auth.loginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = () => {
    router.push("/screens/auth/roleSelection");
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
              <View style={styles.languageSelectorContainer}>
                <TouchableOpacity
                  style={styles.languageButton}
                  onPress={() => setLanguageModalVisible(true)}
                >
                  <Ionicons
                    name="language-outline"
                    size={18}
                    color="#06B6D4"
                    style={styles.languageButtonIcon}
                  />
                  <Text style={styles.languageButtonText}>
                    {t(selectedLanguageLabel)}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color="#06B6D4"
                    style={styles.languageButtonChevron}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Image
                    source={require("../../../assets/images/logo/logo.png")}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title}>{t("auth.login.title")}</Text>

              {/* Form */}
              <View style={styles.form}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.login.email.label")}
                  </Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#9CA3AF"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={t("auth.login.email.placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {t("auth.login.password.label")}
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
                      placeholder={t("auth.login.password.placeholder")}
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Remember Me & Forgot Password */}
                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        rememberMe && styles.checkboxChecked,
                      ]}
                    >
                      {rememberMe && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      {t("auth.login.rememberMe")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={styles.forgotPassword}>
                      {t("auth.login.forgotPassword")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    isLoading && styles.loginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading
                      ? t("auth.login.submitting")
                      : t("auth.login.submit")}
                  </Text>
                </TouchableOpacity>

                <View style={styles.signupContainerInline}>
                  <Text style={styles.signupText}>
                    {t("auth.login.signup.question")}
                  </Text>
                  <TouchableOpacity onPress={handleSignup}>
                    <Text style={styles.signupLink}>
                      {t("auth.login.signup.action")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Language selection modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {t("auth.login.language.title")}
            </Text>
            {languages.map((lang) => {
              const isActive = language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.modalOption,
                    isActive && styles.modalOptionActive,
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      isActive && styles.modalOptionTextActive,
                    ]}
                  >
                    {t(lang.labelKey)}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={18} color="#06B6D4" />
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>
                {t("common.actions.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  languageSelectorContainer: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#ECFEFF",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  languageButtonIcon: {
    marginRight: 4,
  },
  languageButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
  },
  languageButtonChevron: {
    marginLeft: 4,
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
  title: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
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
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  forgotPassword: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  loginButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  loginButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginHorizontal: 16,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  facebookIcon: {
    backgroundColor: "#1877F2",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  signupContainerInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  signupText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  signupLink: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
    paddingHorizontal: 0,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  modalOptionActive: {
    borderColor: "#06B6D4",
    backgroundColor: "#F0FDFA",
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#0F172A",
  },
  modalOptionTextActive: {
    fontFamily: "Poppins-SemiBold",
    color: "#06B6D4",
  },
  modalCloseButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#06B6D4",
    alignItems: "center",
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});
