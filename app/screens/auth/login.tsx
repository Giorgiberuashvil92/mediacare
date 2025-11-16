import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { showToast } from "../../utils/toast";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast.error("გთხოვთ შეავსოთ ყველა ველი", "შეცდომა");
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
      let errorMessage = "შეცდომა შესვლისას";
      
      if (error instanceof Error) {
        if (error.message.includes("Invalid credentials")) {
          errorMessage = "არასწორი ელ-ფოსტა ან პაროლი";
        } else if (error.message.includes("User not found")) {
          errorMessage = "მომხმარებელი არ მოიძებნა";
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "არასწორი ელ-ფოსტის ფორმატი";
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
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
          <Text style={styles.title}>კეთილი იყოს შენი დაბრუნება!</Text>
          <Text style={styles.subtitle}>მოგვენატრე, შევიდეთ?</Text>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>ელ. ფოსტა</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="შეიყვანე ელ. ფოსტა"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>პაროლი</Text>
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
                  placeholder="••••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
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
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? "შესვლა..." : "შესვლა"}
              </Text>
            </TouchableOpacity>

            <View style={styles.signupContainerInline}>
              <Text style={styles.signupText}>ანგარიში არ გაქვს? </Text>
              <TouchableOpacity onPress={handleSignup}>
                <Text style={styles.signupLink}>დარეგისტრირდი</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            {/* <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ან შესვლა სხვა გზით</Text>
              <View style={styles.dividerLine} />
            </View> */}

            {/* Social Login Buttons */}
         
          </View>
        </View>
      </SafeAreaView>
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
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
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
});
