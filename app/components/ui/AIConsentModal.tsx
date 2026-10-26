import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function AIConsentModal({
  visible,
  onAccept,
  onDecline,
}: AIConsentModalProps) {
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#6366F1" />
          </View>

          <Text style={styles.title}>{t("aiAssistant.consent.title")}</Text>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptButtonText}>
              {t("aiAssistant.consent.agree")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            activeOpacity={0.85}
          >
            <Text style={styles.declineButtonText}>
              {t("aiAssistant.consent.decline")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 23,
  },
  acceptButton: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  declineButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  declineButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
});
