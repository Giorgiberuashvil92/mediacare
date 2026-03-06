import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
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
import { apiService } from "../../_services/api";
import OTPModal from "../../components/ui/OTPModal";
import { useLanguage } from "../../contexts/LanguageContext";
import { showToast } from "../../utils/toast";

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { t } = useLanguage();

  const handleSendCode = async () => {
    if (!phone.trim()) {
      showToast.error("გთხოვთ შეიყვანოთ ტელეფონის ნომერი", "შეცდომა");
      return;
    }

    // Validate phone number format (should be 9 digits starting with 5 for Georgian numbers)
    const cleanPhone = phone.trim().replace(/\s+/g, '').replace(/^\+995/, '').replace(/^0/, '');
    if (cleanPhone.length !== 9 || !cleanPhone.startsWith('5')) {
      showToast.error("გთხოვთ შეიყვანოთ სწორი ტელეფონის ნომერი (9 ციფრი, 5-ით დაწყებული)", "შეცდომა");
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.forgotPassword(phone.trim());
      
      if (response.success) {
        setCodeSent(true);
        setShowOTPModal(true);
        showToast.success("ვერიფიკაციის კოდი გაიგზავნა SMS-ით", "წარმატება");
      } else {
        throw new Error(response.message || "ვერ მოხერხდა კოდის გაგზავნა");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "ვერ მოხერხდა კოდის გაგზავნა";
      showToast.error(errorMessage, "შეცდომა");
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
      showToast.error("გთხოვთ შეიყვანოთ ახალი პაროლი", "შეცდომა");
      return;
    }

    if (newPassword.length < 6) {
      showToast.error("პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო", "შეცდომა");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast.error("პაროლები არ ემთხვევა", "შეცდომა");
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.resetPassword({
        phone: phone.trim(),
        newPassword: newPassword.trim(),
      });

      if (response.success) {
        showToast.success("პაროლი წარმატებით შეიცვალა", "წარმატება");
        router.replace("/screens/auth/login");
      } else {
        throw new Error(response.message || "ვერ მოხერხდა პაროლის შეცვლა");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "ვერ მოხერხდა პაროლის შეცვლა";
      showToast.error(errorMessage, "შეცდომა");
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
                    source={require("../../../assets/images/logo/logo.png")}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.title}>
                {codeSent ? "პაროლის აღდგენა" : "პაროლის დაგავიწყება?"}
              </Text>
              <Text style={styles.subtitle}>
                {codeSent
                  ? "შეიყვანეთ ახალი პაროლი"
                  : "შეიყვანეთ თქვენი ტელეფონის ნომერი და ჩვენ გამოგიგზავნით ვერიფიკაციის კოდს SMS-ით"}
              </Text>

              {/* Form */}
              <View style={styles.form}>
                {!codeSent ? (
                  <>
                    {/* Phone Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>ტელეფონის ნომერი</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="call-outline"
                          size={20}
                          color="#9CA3AF"
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="555123456"
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
                        {isLoading ? "იგზავნება..." : "კოდის გაგზავნა"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* New Password Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>ახალი პაროლი</Text>
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
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>დაადასტურეთ პაროლი</Text>
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
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={styles.eyeIcon}
                        >
                          <Ionicons
                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
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
                        {isLoading ? "იცვლება..." : "პაროლის შეცვლა"}
                      </Text>
                    </TouchableOpacity>

                  </>
                )}

                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backToLoginButton}
                  onPress={() => router.replace("/screens/auth/login")}
                >
                  <Text style={styles.backToLoginText}>
                    უკან ლოგინზე
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* OTP Verification Modal */}
      <OTPModal
        visible={showOTPModal}
        phone={phone}
        onClose={() => {
          setShowOTPModal(false);
          if (!codeSent) {
            setCodeSent(false);
          }
        }}
        onVerified={handleOTPVerified}
        title="ტელეფონის ვერიფიკაცია"
        subtitle="გთხოვთ შეიყვანოთ 6-ნიშნა კოდი, რომელიც გამოგიგზავნეთ SMS-ით"
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
    paddingHorizontal: 24,
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
});
