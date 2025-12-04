import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService, Specialization } from "../../services/api";

// Icon mapping for specializations
const getIconForSpecialization = (name: string) => {
  const iconMap: Record<string, any> = {
    "ნევროლოგია": require("../../../assets/images/icons/brain1.png"),
    "კარდიოლოგია": require("../../../assets/images/icons/cardiology.png"),
    "გინეკოლოგია": require("../../../assets/images/icons/pregnant.png"),
    "პედიატრია": require("../../../assets/images/icons/baby.png"),
    "ალერგოლოგია": require("../../../assets/images/icons/allergy.png"),
    "სტომატოლოგია": require("../../../assets/images/icons/dendist.png"),
    "უროლოგია": require("../../../assets/images/icons/urology.png"),
    "გასტროენტეროლოგია": require("../../../assets/images/icons/gastrology.png"),
    "დერმატოლოგია": require("../../../assets/images/icons/cardiology.png"),
    "ორთოპედია": require("../../../assets/images/icons/brain1.png"),
    "ოფთალმოლოგია": require("../../../assets/images/icons/allergy.png"),
    "ფსიქოლოგია": require("../../../assets/images/icons/phycatry.png"),
  };
  return iconMap[name] || require("../../../assets/images/icons/brain1.png");
};

// Background color mapping
const getBgColorForSpecialization = (name: string) => {
  const colorMap: Record<string, string> = {
    "ნევროლოგია": "#E3F2FD",
    "კარდიოლოგია": "#FFEBEE",
    "გინეკოლოგია": "#F3E5F5",
    "პედიატრია": "#E8F5E8",
    "ალერგოლოგია": "#FFF3E0",
    "სტომატოლოგია": "#E0F2F1",
    "უროლოგია": "#E1F5FE",
    "გასტროენტეროლოგია": "#FCE4EC",
    "დერმატოლოგია": "#FFF8E1",
    "ორთოპედია": "#E8EAF6",
    "ოფთალმოლოგია": "#F1F8E9",
    "ფსიქოლოგია": "#FCE4EC",
  };
  return colorMap[name] || "#E3F2FD";
};

const DepartmentsScreen = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpecializations();
  }, []);

  const loadSpecializations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSpecializations();
      if (response.success) {
        setSpecializations(response.data);
      }
    } catch (error) {
      console.error("Failed to load specializations:", error);
      setSpecializations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecializationPress = (spec: Specialization) => {
    // Go directly to doctors list by specialization
    router.push(
      `/screens/doctors/doctors-list?specialty=${spec.name.toLowerCase()}`,
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>სპეციალიზაციები</Text>
        <View style={styles.placeholder} />
      </View>
      <Text
        style={{
          padding: 24,
          fontSize: 16,
          fontFamily: "Poppins-SemiBold",
          color: "#333333",
        }}
      >
        სპეციალიზაციები
      </Text>
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text style={styles.loadingText}>იტვირთება...</Text>
          </View>
        ) : specializations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>სპეციალიზაციები არ მოიძებნა</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {specializations.map((spec) => (
              <TouchableOpacity
                key={spec._id}
                style={styles.departmentCard}
                onPress={() => handleSpecializationPress(spec)}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: getBgColorForSpecialization(spec.name) },
                  ]}
                >
                  <Image
                    source={getIconForSpecialization(spec.name)}
                    style={{ width: 48, height: 48 }}
                  />
                </View>
                <Text style={styles.departmentName}>{spec.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
       
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F2F2F7",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 6,
    backgroundColor: "#F2F2F7",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  departmentCard: {
    width: "30%",
    alignItems: "center",
    marginBottom: 16,
    padding: 4,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  departmentName: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#333333",
    textAlign: "center",
  },
  departmentDescription: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
});

export default DepartmentsScreen;
