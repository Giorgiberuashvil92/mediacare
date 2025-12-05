import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_SERVICES = [
  {
    id: "video",
    title: "ვიდეო კონსულტაცია",
    description: "ონლაინ ექიმი 15 წთ-ში",
    image:
      "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=600&h=600&fit=crop&crop=center",
    onPress: () =>
      router.push({
        pathname: "/(tabs)/doctor",
        params: { appointmentType: "video", lockAppointmentType: "true" },
      }),
  },
  {
    id: "lab",
    title: "ლაბორატორია",
    description: "ანალიზები და ტესტები",
    image:
      "https://images.unsplash.com/photo-1581092580491-e0d23cbdf1dc?w=600&h=600&fit=crop&crop=center",
    onPress: () => router.push("/(tabs)/medicine"),
  },
  {
    id: "pharmacy",
    title: "წამლები",
    description: "მედიკამენტების მაღაზია",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=600&fit=crop&crop=center",
    // Route not yet in main tabs; keep navigation typed loosely
    onPress: () => router.push("/(tabs)/medicine" as any),
  },
  {
    id: "home-visit",
    title: "ბინაზე გამოძახება",
    description: "ექიმი შენს მისამართზე",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=600&fit=crop&crop=center&sat=-20",
    onPress: () => router.push("/screens/doctors/home-visit-doctors"),
  },
  {
    id: "advisor",
    title: "მრჩეველი",
    description: "შეგირჩევთ სწორ ექიმს",
    image:
      "https://images.unsplash.com/photo-1535916707207-35f97e715e1b?w=600&h=600&fit=crop&crop=center",
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
      <Text style={styles.title}>სწრაფი სერვისები</Text>
      <View style={styles.grid}>
        {QUICK_SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            onPress={() => handlePress(service.id, service.onPress)}
            activeOpacity={0.9}
            style={styles.serviceCard}
          >
            <View style={styles.iconWrapper}>
              <Image
                style={styles.serviceImage}
                source={{ uri: service.image }}
                contentFit="cover"
              />
            </View>
            <Text style={styles.serviceTitle} numberOfLines={2}>
              {service.title}
            </Text>
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {service.description}
            </Text>
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
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 16,
    },
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceCard: {
    width: "30%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 4,
  },
  serviceImage: {
    width: "100%",
    height: "100%",
  },
  serviceTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#0F172A",
    textAlign: "center",
  },
  serviceDescription: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#64748B",
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
