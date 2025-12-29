import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_SERVICES = [
  {
    id: "video",
    title: "ვიდეო კონსულტაცია",
    description: "ონლაინ ექიმთან კავშირი",
    icon: "videocam",
    gradient: ["#06B6D4", "#0891B2"],
    onPress: () =>
      router.push({
        pathname: "/(tabs)/doctor",
        params: { appointmentType: "video", lockAppointmentType: "true" },
      }),
  },
  {
    id: "lab",
    title: "ლაბორატორია",
    description: "ანალიზები და კვლევები",
    icon: "flask",
    gradient: ["#8B5CF6", "#7C3AED"],
    onPress: () => router.push("/(tabs)/lab"),
  },
  {
    id: "home-visit",
    title: "ბინაზე გამოძახება",
    description: "ექიმი შენს მისამართზე",
    icon: "home",
    gradient: ["#F59E0B", "#D97706"],
    onPress: () => router.push("/screens/doctors/home-visit-doctors"),
  },
  {
    id: "advisor",
    title: "მრჩეველი",
    description: "შეგირჩევთ სწორ ექიმს",
    icon: "chatbubbles",
    gradient: ["#10B981", "#059669"],
    onPress: () => router.push("/screens/advisor"),
  },
];

const Services = () => {
  const [pharmacyModalVisible, setPharmacyModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const handlePress = (serviceId: string, onPress: () => void) => {
    if (serviceId === "pharmacy") {
      setPharmacyModalVisible(true);
      return;
    }
    onPress();
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>სწრაფი სერვისები</Text>
      </View>
      <View style={styles.grid}>
        {QUICK_SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            onPress={() => handlePress(service.id, service.onPress)}
            activeOpacity={0.85}
            style={styles.serviceCard}
          >
            <LinearGradient
              colors={service.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={service.icon as any}
                  size={26}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.serviceTitle} numberOfLines={1}>
                {service.title}
              </Text>
              <Text style={styles.serviceDescription} numberOfLines={1}>
                {service.description}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pharmacy WIP modal */}
      <Modal
        visible={pharmacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPharmacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>წამლების სერვისი მალე იქნება</Text>
            <Text style={styles.modalText}>
              ამ ეტაპზე მედიკამენტების შეკვეთის სერვისი მუშავდება. ძალიან მალე
              შეძლებ წამლების მოძებნას და შეძენას აპიდანვე.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setPharmacyModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>კარგი</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F2F2F7",
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  serviceCard: {
    width: "47%",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientBackground: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 16,
  },
  modalButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#06B6D4",
  },
  modalButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
});

export default Services;
