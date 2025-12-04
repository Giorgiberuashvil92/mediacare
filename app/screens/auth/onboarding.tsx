import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";

const { width } = Dimensions.get("window");

export default function OnboardingScreen() {
  const { t } = useLanguage();

  // Simple animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Simple slide in animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleNext = () => {
    // Simple button press
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // ერთი გვერდიანი ონბორდინგი – ღილაკზე დაჭერა მაშინვე აგრძელებს
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("hasCompletedOnboarding", "true");
    router.replace("/screens/auth/login");
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <Image
                source={require("../../../assets/images/logo/logo.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
          </View>

          {/* Illustration */}


          {/* Text content */}
          <View style={styles.textBlock}>
            <Text style={styles.title}>{t("onboarding.title")}</Text>
            <Text style={styles.description}>
              {t("onboarding.description")}
            </Text>
          </View>

          {/* Primary CTA */}
          <Animated.View
            style={[
              styles.buttonWrapper,
              {
                transform: [{ scale: buttonScale }],
              },
            ]}
          >
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {t("common.actions.continue")}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
                style={styles.nextButtonIcon}
              />
            </TouchableOpacity>
          </Animated.View>
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
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  illustrationCard: {
    width: "100%",
    height: width * 0.9,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#ECFEFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  illustrationImage: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  textBlock: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#06B6D4",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
  buttonWrapper: {
    width: "100%",
  },
});
