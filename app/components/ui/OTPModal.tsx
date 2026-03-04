import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiService } from "../../_services/api";
import { showToast } from "../../utils/toast";

interface OTPModalProps {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onVerified: (code: string, authResponse?: any) => void; // Added optional authResponse for login OTP
  onSkip?: () => void; // Optional skip handler for bypassing OTP
  title?: string;
  subtitle?: string;
  showSkipButton?: boolean; // Show skip button (temporary for development)
  isLoginOTP?: boolean; // If true, use verifyLoginOTP instead of verifyPhoneCode
  loginEmail?: string; // Email for login OTP verification
}

export default function OTPModal({
  visible,
  phone,
  onClose,
  onVerified,
  onSkip,
  title = "ტელეფონის ვერიფიკაცია",
  subtitle = "გთხოვთ შეიყვანოთ 6-ნიშნა კოდი, რომელიც გამოგიგზავნეთ SMS-ით",
  showSkipButton = false, // Default to false, set to true for development
  isLoginOTP = false, // Default to false for phone verification
  loginEmail, // Email for login OTP verification
}: OTPModalProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [hasVerified, setHasVerified] = useState(false); // Track if verification was successful
  const codeInputRef = useRef<TextInput>(null);

  const handleSendCode = useCallback(async () => {
    if (!phone.trim()) {
      showToast.error("გთხოვთ შეიყვანოთ ტელეფონის ნომერი", "შეცდომა");
      return;
    }

    try {
      setSendingCode(true);
      setVerificationError(null);
      console.log("📤 [OTPModal] Requesting OTP code for phone:", phone.trim());
      const response = await apiService.sendPhoneVerificationCode(phone.trim());
      if (response.success) {
        console.log("✅ [OTPModal] OTP code sent successfully to phone:", phone.trim());
        setCodeSent(true);
        setCountdown(60); // 60 seconds countdown
        showToast.success("ვერიფიკაციის კოდი გაიგზავნა", "წარმატება");
      } else {
        throw new Error(response.message || "ვერ მოხერხდა კოდის გაგზავნა");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "ვერ მოხერხდა კოდის გაგზავნა";
      console.error("❌ [OTPModal] Failed to send OTP code:", errorMessage);
      setVerificationError(errorMessage);
      showToast.error(errorMessage, "შეცდომა");
    } finally {
      setSendingCode(false);
    }
  }, [phone]);

  useEffect(() => {
    if (visible && phone.trim() && !codeSent && !sendingCode) {
      // Auto-send code when modal opens (only once)
      handleSendCode();
    } else if (visible && !phone.trim()) {
      // If phone is not provided, close modal
      onClose();
    }
  }, [visible, phone, handleSendCode, onClose, codeSent, sendingCode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  const handleClose = useCallback(() => {
    setVerificationCode("");
    setVerificationError(null);
    setCodeSent(false);
    setCountdown(0);
    setSendingCode(false);
    setVerifyingCode(false);
    setHasVerified(false); // Reset verification status
    onClose();
  }, [onClose]);

  const handleVerifyCode = useCallback(async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      showToast.error("გთხოვთ შეიყვანოთ 6-ნიშნა კოდი", "შეცდომა");
      return;
    }

    // Prevent multiple simultaneous verifications or if already verified
    if (verifyingCode || hasVerified) {
      console.log("⚠️ [OTPModal] Skipping verification - already verifying or verified:", {
        verifyingCode,
        hasVerified,
      });
      return;
    }

    try {
      setVerifyingCode(true);
      setVerificationError(null);
      
      console.log("🔐 [OTPModal] User entered code for verification:", {
        isLoginOTP,
        loginEmail: isLoginOTP ? loginEmail : undefined,
        phone: !isLoginOTP ? phone : undefined,
        userEnteredCode: verificationCode.trim(),
        codeLength: verificationCode.length,
      });

      if (isLoginOTP && loginEmail) {
        // For login OTP, use verifyLoginOTP
        console.log("📞 [OTPModal] Verifying login OTP:", {
          email: loginEmail.trim(),
          userEnteredCode: verificationCode.trim(),
        });
        const response = await apiService.verifyLoginOTP(
          loginEmail.trim(),
          verificationCode.trim()
        );
        console.log("✅ [OTPModal] verifyLoginOTP response:", {
          success: response.success,
          hasData: !!response.data,
          userEnteredCode: verificationCode.trim(),
        });
        if (response.success) {
          console.log("🎉 [OTPModal] Login OTP verification SUCCESSFUL - codes matched!");
          setHasVerified(true); // Mark as verified to prevent duplicate calls
          showToast.success("ტელეფონი წარმატებით დადასტდა", "წარმატება");
          // Pass both code and authResponse to avoid duplicate verification in login.tsx
          onVerified(verificationCode.trim(), response);
          handleClose();
        } else {
          console.log("❌ [OTPModal] Login OTP verification FAILED - codes did not match");
          throw new Error(response.message || "არასწორი ვერიფიკაციის კოდი");
        }
      } else {
        // For phone verification, use verifyPhoneCode
        console.log("📞 [OTPModal] Verifying phone OTP:", {
          phone: phone.trim(),
          userEnteredCode: verificationCode.trim(),
        });
        const response = await apiService.verifyPhoneCode(
          phone.trim(),
          verificationCode.trim()
        );
        console.log("✅ [OTPModal] verifyPhoneCode response:", {
          success: response.success,
          verified: response.verified,
          userEnteredCode: verificationCode.trim(),
        });
        if (response.success && response.verified) {
          console.log("🎉 [OTPModal] Phone OTP verification SUCCESSFUL - codes matched!");
          setHasVerified(true); // Mark as verified to prevent duplicate calls
          showToast.success("ტელეფონი წარმატებით დადასტდა", "წარმატება");
          // Pass both code and verification response for registration flow
          onVerified(verificationCode.trim(), response);
          handleClose();
        } else {
          console.log("❌ [OTPModal] Phone OTP verification FAILED - codes did not match");
          throw new Error(response.message || "არასწორი ვერიფიკაციის კოდი");
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "ვერიფიკაცია ვერ მოხერხდა";
      setVerificationError(errorMessage);
      showToast.error(errorMessage, "შეცდომა");
    } finally {
      setVerifyingCode(false);
    }
  }, [verificationCode, verifyingCode, hasVerified, phone, onVerified, handleClose, isLoginOTP, loginEmail]);

  // Auto-verify when code reaches 6 digits
  useEffect(() => {
    if (verificationCode.length === 6 && !verifyingCode && !hasVerified && codeSent) {
      console.log("🔄 [OTPModal] Auto-verifying code (6 digits entered)");
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        handleVerifyCode();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [verificationCode, verifyingCode, hasVerified, codeSent, handleVerifyCode]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Phone Number Display */}
            <View style={styles.phoneContainer}>
              <Ionicons name="call-outline" size={20} color="#06B6D4" />
              <Text style={styles.phoneText}>{phone}</Text>
            </View>

            {/* Subtitle */}
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* OTP Input */}
            <View style={styles.inputContainer}>
              <TextInput
                ref={codeInputRef}
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor="#9CA3AF"
                value={verificationCode}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "").slice(0, 6);
                  setVerificationCode(numericText);
                  setVerificationError(null);
                }}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={6}
                autoCorrect={false}
                autoFocus
              />
            </View>

            {/* Error Message */}
            {verificationError && (
              <Text style={styles.errorText}>{verificationError}</Text>
            )}

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (verifyingCode || verificationCode.length !== 6) &&
                  styles.verifyButtonDisabled,
              ]}
              onPress={handleVerifyCode}
              disabled={verifyingCode || verificationCode.length !== 6}
            >
              {verifyingCode ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>დადასტურება</Text>
              )}
            </TouchableOpacity>

            {/* Resend Code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>კოდი არ მოგივიდათ?</Text>
              <TouchableOpacity
                onPress={handleSendCode}
                disabled={sendingCode || countdown > 0}
                style={styles.resendButton}
              >
                {sendingCode ? (
                  <ActivityIndicator size="small" color="#06B6D4" />
                ) : (
                  <Text
                    style={[
                      styles.resendButtonText,
                      (countdown > 0 || sendingCode) &&
                        styles.resendButtonTextDisabled,
                    ]}
                  >
                    {countdown > 0
                      ? `ხელახლა გაგზავნა (${countdown}წმ)`
                      : "კოდის ხელახლა გაგზავნა"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Skip OTP Button (Temporary for development) */}
            {showSkipButton && onSkip && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  if (onSkip) {
                    onSkip();
                  }
                }}
              >
                <Text style={styles.skipButtonText}>
                  გამოტოვება (დროებით)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 32,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  phoneText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#0369A1",
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  otpInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    letterSpacing: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  resendContainer: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#06B6D4",
  },
  resendButtonTextDisabled: {
    color: "#9CA3AF",
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
});
