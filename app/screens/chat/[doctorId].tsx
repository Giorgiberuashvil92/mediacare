import { useAuth } from "@/app/contexts/AuthContext";
import { apiService } from "@/app/services/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  isRead: boolean;
}

export default function ChatScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadDoctorInfo();
    loadMessages();
  }, [doctorId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadDoctorInfo = async () => {
    if (!doctorId) return;

    try {
      const response = await apiService.getDoctorById(doctorId);
      if (response.success) {
        setDoctor(response.data);
      }
    } catch (error) {
      console.error("Error loading doctor info:", error);
    }
  };

  const loadMessages = async () => {
    if (!doctorId || !user?.id) return;

    try {
      setLoading(true);
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiService.getChatMessages(user.id, doctorId);
      // For now, show empty state
      setMessages([]);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !doctorId || !user?.id || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistically add message
    const tempMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      senderId: user.id,
      receiverId: doctorId,
      timestamp: new Date(),
      isRead: false,
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      // TODO: Replace with actual API call when backend is ready
      // await apiService.sendChatMessage({
      //   receiverId: doctorId,
      //   text: messageText,
      // });
      
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const getDoctorImage = () => {
    if (doctor?.profileImage) {
      const apiBaseUrl = apiService.getBaseURL();
      if (doctor.profileImage.startsWith("http")) {
        return { uri: doctor.profileImage };
      } else {
        return { uri: `${apiBaseUrl}/${doctor.profileImage}` };
      }
    }
    return require("@/assets/images/doctors/doctor1.png");
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          {doctor && (
            <View style={styles.headerInfo}>
              <View style={styles.doctorImageContainer}>
                <Image
                  source={getDoctorImage()}
                  style={styles.doctorImage}
                  contentFit="cover"
                />
                <View style={styles.onlineIndicator} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSpecialty}>
                  {doctor.specialization || "ექიმი"}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyText}>
                    ჩატი ცარიელია
                  </Text>
                  <Text style={styles.emptySubtext}>
                    დაიწყეთ საუბარი ექიმთან
                  </Text>
                </View>
              ) : (
                messages.map((message) => {
                  const isMyMessage = message.senderId === user?.id;
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageWrapper,
                        isMyMessage && styles.messageWrapperRight,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          isMyMessage ? styles.myMessage : styles.theirMessage,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            isMyMessage && styles.myMessageText,
                          ]}
                        >
                          {message.text}
                        </Text>
                        <Text
                          style={[
                            styles.messageTime,
                            isMyMessage && styles.myMessageTime,
                          ]}
                        >
                          {formatTime(message.timestamp)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="შეიყვანეთ შეტყობინება..."
                  placeholderTextColor="#9CA3AF"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  doctorImageContainer: {
    position: "relative",
  },
  doctorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerText: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  doctorSpecialty: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 8,
  },
  messageWrapper: {
    marginBottom: 12,
    alignItems: "flex-start",
  },
  messageWrapperRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessage: {
    backgroundColor: "#06B6D4",
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  messageTime: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 4,
  },
  myMessageTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
});

