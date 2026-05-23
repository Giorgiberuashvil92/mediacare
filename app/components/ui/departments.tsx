import Ionicons from "@expo/vector-icons/Ionicons";
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
import { useLanguage } from "../../contexts/LanguageContext";
import { getSpecializationDisplayName } from "../../utils/specializationLabel";

const getIconForSpecialization = (
  name: string,
): keyof typeof Ionicons.glyphMap => {
  const normalized = name.toLowerCase();
  if (normalized.includes("ნევრო")) return "pulse";
  if (normalized.includes("კარდიო")) return "heart";
  if (normalized.includes("გინეკო")) return "female";
  if (normalized.includes("პედიატ")) return "happy";
  if (normalized.includes("ალერგ")) return "flower";
  if (normalized.includes("სტომატ")) return "medical";
  if (normalized.includes("უროლოგ")) return "water";
  if (normalized.includes("გასტრო")) return "nutrition";
  if (normalized.includes("დერმატ")) return "body";
  if (normalized.includes("ორთოპ")) return "walk";
  if (normalized.includes("ოფთალ")) return "eye";
  if (normalized.includes("ფსიქ")) return "chatbubbles";
  return "medkit";
};

// Background color mapping
const getBgColorForSpecialization = (name: string) => {
  const colorMap: Record<string, string> = {
    ნევროლოგი: "#E3F2FD",
    კარდიოლოგი: "#FFEBEE",
    გინეკოლოგი: "#F3E5F5",
    პედიატრი: "#E8F5E8",
    ალერგოლოგი: "#FFF3E0",
    სტომატოლოგი: "#E0F2F1",
    უროლოგი: "#E1F5FE",
    გასტროენტეროლოგი: "#FCE4EC",
    დერმატოლოგი: "#FFF8E1",
    ორთოპედი: "#E8EAF6",
    ოფთალმოლოგი: "#F1F8E9",
    ფსიქოლოგი: "#FCE4EC",
  };
  return colorMap[name] || "#E3F2FD";
};

const Departments = () => {
  const { t, language } = useLanguage();
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
          <SeeAll
            title={t("doctors.specialty.title")}
            route="/screens/doctors/departments"
          />
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
        <SeeAll
          title={t("doctors.specialty.title")}
          route="/screens/doctors/departments"
        />
      </View>

      <View style={styles.grid}>
        {specializations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t("doctors.specialty.empty")}</Text>
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
                  <Ionicons
                    name={getIconForSpecialization(spec.name)}
                    size={34}
                    color="#0F172A"
                  />
              </View>
              <Text style={styles.departmentName}>
                {getSpecializationDisplayName(spec, language)}
              </Text>
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
