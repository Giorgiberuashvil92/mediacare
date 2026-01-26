import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiService, Specialization } from "../../_services/api";
import SeeAll from "../shared/seeAll";

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
    "დერმატოლოგია": require("../../../assets/images/icons/cardiology.png"), // Fallback
    "ორთოპედია": require("../../../assets/images/icons/brain1.png"), // Fallback
    "ოფთალმოლოგია": require("../../../assets/images/icons/allergy.png"), // Fallback
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

const Departments = () => {
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
        // Take only first 12 for home screen
        setSpecializations(response.data.slice(0, 12));
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SeeAll title="სპეციალიზაციები" route="/screens/doctors/departments" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#06B6D4" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SeeAll title="სპეციალიზაციები" route="/screens/doctors/departments" />
      </View>

      <View style={styles.grid}>
        {specializations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>სპეციალიზაციები არ მოიძებნა</Text>
          </View>
        ) : (
          specializations.map((spec) => (
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
                  style={{ width: 34, height: 34 }}
                />
              </View>
              <Text style={styles.departmentName}>{spec.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  departmentCard: {
    width: "23%",
    alignItems: "center",
    marginBottom: 16,
    padding: 8,
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
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  symptomsCount: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#06B6D4",
    marginTop: 4,
    textAlign: "center",
  },
});

export default Departments;
