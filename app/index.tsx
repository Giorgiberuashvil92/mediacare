import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "./contexts/AuthContext";

export default function SplashScreen() {
  console.log('🎬 SplashScreen component loaded');
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, userRole, isLoading: authLoading } = useAuth();
  
  console.log('🔍 SplashScreen state:', {
    isLoading,
    isAuthenticated,
    userRole,
    authLoading
  });

  useEffect(() => {
    checkInitialRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole, authLoading]);

  const checkInitialRoute = async () => {
    try {
      // დაველოდოთ AuthContext-ის ჩატვირთვას
      if (authLoading) {
        return;
      }

      // Simulate loading time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (isAuthenticated && userRole) {
        if (userRole === "doctor") {
          router.replace("/(doctor-tabs)");
          return;
        } else if (userRole === "patient") {
          router.replace("/(tabs)");
          return;
        }
      }

      // თუ არ არის ავტორიზებული, შევამოწმოთ onboarding
      const hasCompletedOnboarding = await AsyncStorage.getItem(
        "hasCompletedOnboarding"
      );

      if (hasCompletedOnboarding !== "true") {
        router.replace("/screens/auth/onboarding");
        return;
      }

      // თუ onboarding დასრულებულია, მაგრამ არ არის ავტორიზებული, გადავიყვანოთ role selection-ზე
      router.replace("/screens/auth/roleSelection");
    } catch (error) {
      console.error("Error:", error);
      router.replace("/screens/auth/onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Image
          source={require("../assets/images/splash-icon.png")}
          style={styles.logo}
        />
        <Text style={styles.appName}>Medicare</Text>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});
