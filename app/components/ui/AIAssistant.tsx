import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Defs, Path, Rect, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";

export default function AIAssistant() {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState("");

  // Mock history data - აქ მოგვიანებით API-დან მოვა
  const chatHistory = [
    { id: 1, title: "ლაბორატორიული ანალიზის შედეგები", date: "დღეს, 14:30" },
    { id: 2, title: "სიმპტომების ანალიზი", date: "გუშინ, 10:15" },
    { id: 3, title: "ჯანმრთელობის კონსულტაცია", date: "2 დღის წინ" },
  ];

  const handleCreateNewChat = () => {
    if (newChatName.trim()) {
      // აქ მოგვიანებით API call იქნება
      console.log("Creating new chat:", newChatName);
      setNewChatName("");
      setShowNewChatModal(false);
      router.push("/screens/ai-assistant");
    }
  };

  return (
    <>
      {/* AI Assistant Banner */}
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>AI ასისტენტი</Text>
              <Text style={styles.description}>
                იკითხე განმარტოვების ნებისმიერ საკითხზე
              </Text>
              <View style={styles.buttonsRow}>
               
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => router.push("/screens/ai-assistant")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>დაწყება</Text>
                  <View style={{ marginLeft: 8 }}>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.iconContainer}>
              <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
                <Rect width={56} height={56} rx={11} fill="#A47CF6" fillOpacity={0.2} />
                <Path
                  d="M24.6 23.2283L26.0767 18.0633C26.63 16.13 29.37 16.13 29.9233 18.0633L31.3983 23.2283C31.4917 23.555 31.6668 23.8526 31.9071 24.0929C32.1474 24.3332 32.4449 24.5083 32.7717 24.6017L37.9367 26.0767C39.87 26.63 39.87 29.37 37.9367 29.9233L32.7717 31.3983C32.4449 31.4917 32.1474 31.6668 31.9071 31.9071C31.6668 32.1474 31.4917 32.4449 31.3983 32.7717L29.9233 37.9367C29.37 39.87 26.63 39.87 26.0767 37.9367L24.6017 32.7717C24.5083 32.4449 24.3332 32.1474 24.0929 31.9071C23.8526 31.6668 23.555 31.4917 23.2283 31.3983L18.0633 29.9233C16.13 29.37 16.13 26.63 18.0633 26.0767L23.2283 24.6017C23.555 24.5083 23.8526 24.3332 24.0929 24.0929C24.3332 23.8526 24.5083 23.555 24.6017 23.2283M38.1733 35.5117C38.655 34.1067 40.68 34.105 41.16 35.5117L41.2033 35.6567L41.6967 37.6367L43.6767 38.1317C45.2767 38.5317 45.2767 40.8017 43.6767 41.2017L41.6967 41.6967L41.2033 43.6767C40.8033 45.275 38.5317 45.275 38.1317 43.6767L37.6367 41.6967L35.6567 41.2017C34.0567 40.8017 34.0567 38.53 35.6567 38.1317L37.6367 37.6367L38.1317 35.6567L38.1733 35.5117ZM39.6667 39.3283C39.5707 39.4568 39.4568 39.5707 39.3283 39.6667C39.4568 39.7626 39.5707 39.8765 39.6667 40.005C39.7626 39.8765 39.8765 39.7626 40.005 39.6667C39.8764 39.5702 39.7624 39.4557 39.6667 39.3267M14.84 12.1767C15.3367 10.725 17.4817 10.7733 17.87 12.3217L18.3633 14.3017L20.3433 14.7967C21.9433 15.1967 21.9433 17.4667 20.3433 17.8667L18.3633 18.3617L17.87 20.3417C17.47 21.94 15.1983 21.94 14.7983 20.3417L14.3033 18.3617L12.3233 17.8667C10.7233 17.4667 10.7233 15.195 12.3233 14.7967L14.3033 14.3017L14.7983 12.3217L14.84 12.1767ZM16.3333 15.995C16.2373 16.1229 16.1233 16.2362 15.995 16.3317C16.1236 16.4281 16.2375 16.5426 16.3333 16.6717C16.4291 16.5426 16.5431 16.4281 16.6717 16.3317C16.5432 16.2357 16.4292 16.1235 16.3333 15.995Z"
                  fill="url(#paint0_linear_5_1329)"
                />
                <Defs>
                  <SvgLinearGradient
                    id="paint0_linear_5_1329"
                    x1="24.8298"
                    y1="15.8108"
                    x2="40.4274"
                    y2="21.8217"
                    gradientUnits="userSpaceOnUse"
                  >
                    <Stop stopColor="#6366F1" />
                    <Stop offset={1} stopColor="#A855F7" />
                  </SvgLinearGradient>
                </Defs>
              </Svg>
            </View>
          </View>
        </View>
      </View>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHistoryModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ჩატის ისტორია</Text>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {chatHistory.length > 0 ? (
                chatHistory.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.historyItem}
                    onPress={() => {
                      setShowHistoryModal(false);
                      router.push("/screens/ai-assistant");
                    }}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemTitle}>{chat.title}</Text>
                      <Text style={styles.historyItemDate}>{chat.date}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateText}>ისტორია ცარიელია</Text>
                  <Text style={styles.emptyStateSubtext}>
                    აქ გამოჩნდება თქვენი წინა ჩატები
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewChatModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNewChatModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ახალი ჩატი</Text>
              <TouchableOpacity
                onPress={() => setShowNewChatModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.newChatForm}>
              <Text style={styles.inputLabel}>ჩატის სახელი (არასავალდებულო)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="მაგ: ლაბორატორიული ანალიზი"
                placeholderTextColor="#9CA3AF"
                value={newChatName}
                onChangeText={setNewChatName}
                autoFocus
              />
              <TouchableOpacity
                style={[
                  styles.createButton,
                  newChatName.trim() ? styles.createButtonActive : null,
                ]}
                onPress={handleCreateNewChat}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.createButtonText,
                    newChatName.trim() ? styles.createButtonTextActive : null,
                  ]}
                >
                  ჩატის შექმნა
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setNewChatName("");
                  setShowNewChatModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>გაუქმება</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#E0F2FE",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  historyButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  newChatButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  iconContainer: {
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  newChatForm: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  createButtonActive: {
    backgroundColor: "#10B981",
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#9CA3AF",
  },
  createButtonTextActive: {
    color: "#FFFFFF",
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
});
