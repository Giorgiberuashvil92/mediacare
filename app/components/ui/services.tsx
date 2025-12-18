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
    onPress: () => router.push("/(tabs)/medicine"),
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
        {QUICK_SERVICES.map((service, index) => (
          <TouchableOpacity
            key={service.id}
            onPress={() => handlePress(service.id, service.onPress)}
            activeOpacity={0.85}
            style={[
              styles.serviceCard,
              index % 2 === 0 ? styles.cardLeft : styles.cardRight,
            ]}
          >
            <LinearGradient
              colors={service.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={service.icon as any}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceDescription}>
                    {service.description}
                  </Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                </View>
              </View>
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
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceCard: {
    width: "48%",
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardLeft: {
    marginRight: "2%",
  },
  cardRight: {
    marginLeft: "2%",
  },
  gradientBackground: {
    borderRadius: 20,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 90,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  serviceTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.85)",
  },
  arrowContainer: {
    marginLeft: 4,
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
