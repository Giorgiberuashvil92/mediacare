import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiService, Specialization } from "../../services/api";

// Icon mapping for symptoms
const getIconForSymptom = (symptomName: string) => {
  const iconMap: Record<string, any> = {
    "ცხელება": require("../../../assets/images/icons/fever.png"),
    "ხველა": require("../../../assets/images/icons/cemineba.png"),
    "სისხლის წნევა": require("../../../assets/images/icons/blood_pressure.png"),
    "დიაბეტი": require("../../../assets/images/icons/diabetics.png"),
    "თავის ტკივილი": require("../../../assets/images/icons/headache.png"),
    "მუცლის ტკივილი": require("../../../assets/images/icons/stomach.png"),
    "თავბრუსხვევა": require("../../../assets/images/icons/dizziness.png"),
    "თვალების პრობლემები": require("../../../assets/images/icons/eye_problem.png"),
    "გულის ტკივილი": require("../../../assets/images/icons/cardiology.png"),
    "გულისცემა": require("../../../assets/images/icons/cardiology.png"),
    "ნევრალგია": require("../../../assets/images/icons/brain1.png"),
    "მენსტრუალური დარღვევები": require("../../../assets/images/icons/pregnant.png"),
    "ქალთა ჯანმრთელობის პრობლემები": require("../../../assets/images/icons/pregnant.png"),
    "ბავშვთა დაავადებები": require("../../../assets/images/icons/baby.png"),
    "ალერგია": require("../../../assets/images/icons/allergy.png"),
    "ქავილი": require("../../../assets/images/icons/allergy.png"),
    "ალერგიული რეაქციები": require("../../../assets/images/icons/allergy.png"),
    "კბილის ტკივილი": require("../../../assets/images/icons/dendist.png"),
    "პირის ღრუს პრობლემები": require("../../../assets/images/icons/dendist.png"),
    "შარდის პრობლემები": require("../../../assets/images/icons/urology.png"),
    "შარდსასქესო სისტემის დაავადებები": require("../../../assets/images/icons/urology.png"),
    "საჭმლის მომნელებელი პრობლემები": require("../../../assets/images/icons/gastrology.png"),
    "კანის პრობლემები": require("../../../assets/images/icons/cardiology.png"),
    "კანის დაავადებები": require("../../../assets/images/icons/cardiology.png"),
    "სახსრების ტკივილი": require("../../../assets/images/icons/brain1.png"),
    "ძვლების პრობლემები": require("../../../assets/images/icons/brain1.png"),
    "მხედველობის დაქვეითება": require("../../../assets/images/icons/eye_problem.png"),
    "სტრესი": require("../../../assets/images/icons/phycatry.png"),
    "დეპრესია": require("../../../assets/images/icons/phycatry.png"),
    "ფსიქიკური პრობლემები": require("../../../assets/images/icons/phycatry.png"),
  };
  return iconMap[symptomName] || require("../../../assets/images/icons/fever.png");
};

// Background color mapping
const getBgColorForSymptom = (symptomName: string) => {
  const colorMap: Record<string, string> = {
    "ცხელება": "#E3F2FD",
    "ხველა": "#FFEBEE",
    "სისხლის წნევა": "#F3E5F5",
    "დიაბეტი": "#E8F5E8",
    "თავის ტკივილი": "#FFF3E0",
    "მუცლის ტკივილი": "#E0F2F1",
    "თავბრუსხვევა": "#E1F5FE",
    "თვალების პრობლემები": "#FCE4EC",
    "გულის ტკივილი": "#FFEBEE",
    "გულისცემა": "#FFEBEE",
    "ნევრალგია": "#E3F2FD",
    "მენსტრუალური დარღვევები": "#F3E5F5",
    "ქალთა ჯანმრთელობის პრობლემები": "#F3E5F5",
    "ბავშვთა დაავადებები": "#E8F5E8",
    "ალერგია": "#FFF3E0",
    "ქავილი": "#FFF3E0",
    "ალერგიული რეაქციები": "#FFF3E0",
    "კბილის ტკივილი": "#E0F2F1",
    "პირის ღრუს პრობლემები": "#E0F2F1",
    "შარდის პრობლემები": "#E1F5FE",
    "შარდსასქესო სისტემის დაავადებები": "#E1F5FE",
    "საჭმლის მომნელებელი პრობლემები": "#FCE4EC",
    "კანის პრობლემები": "#FFF8E1",
    "კანის დაავადებები": "#FFF8E1",
    "სახსრების ტკივილი": "#E8EAF6",
    "ძვლების პრობლემები": "#E8EAF6",
    "მხედველობის დაქვეითება": "#F1F8E9",
    "სტრესი": "#FCE4EC",
    "დეპრესია": "#FCE4EC",
    "ფსიქიკური პრობლემები": "#FCE4EC",
  };
  return colorMap[symptomName] || "#E3F2FD";
};

const CommonSymptoms = () => {
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSymptoms();
  }, []);

  const loadSymptoms = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSpecializations();
      if (response.success) {
        // Collect all unique symptoms from all specializations
        const symptomsSet = new Set<string>();
        response.data.forEach((spec: Specialization) => {
          if (spec.symptoms && spec.symptoms.length > 0) {
            spec.symptoms.forEach((symptom) => symptomsSet.add(symptom));
          }
        });
        // Convert to array and take first 8 for display
        const uniqueSymptoms = Array.from(symptomsSet).slice(0, 8);
        setAllSymptoms(uniqueSymptoms);
      }
    } catch (error) {
      console.error("Failed to load symptoms:", error);
      setAllSymptoms([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View>
        <Text
          style={{
            padding: 24,
            fontSize: 16,
            fontFamily: "Poppins-SemiBold",
            color: "#333333",
          }}
        >
          გავრცელებული სიმპტომები
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#06B6D4" />
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text
        style={{
          padding: 24,
          fontSize: 16,
          fontFamily: "Poppins-SemiBold",
          color: "#333333",
        }}
      >
        გავრცელებული სიმპტომები
      </Text>
      <View style={styles.grid}>
        {allSymptoms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>სიმპტომები არ მოიძებნა</Text>
          </View>
        ) : (
          allSymptoms.map((symptom, index) => (
            <TouchableOpacity
              key={index}
              style={styles.departmentCard}
              onPress={() => {
                // Navigate to doctors list filtered by symptom
                router.push(`/screens/doctors/doctors-list?symptom=${encodeURIComponent(symptom)}`);
              }}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getBgColorForSymptom(symptom) || "#E3F2FD" },
                ]}
              >
                <Image
                  source={getIconForSymptom(symptom)}
                  style={{ width: 34, height: 34 }}
                />
              </View>
              <Text style={styles.departmentName}>{symptom}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
};

export default CommonSymptoms;

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
  title: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#007AFF",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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
});
