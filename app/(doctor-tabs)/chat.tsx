import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PatientChat {
  id: string;
  patientId: string;
  patientName: string;
  patientImage?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isActive: boolean; // 10 სამუშაო დღის წესი
  lastAppointmentDate?: string;
}

export default function DoctorChatScreen() {
  const [chats, setChats] = useState<PatientChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadChats = useCallback(async () => {
    try {
      // TODO: Replace with real API call
      // const response = await apiService.getDoctorChats();
      
      // Mock data for now
      const mockChats: PatientChat[] = [
        {
          id: "1",
          patientId: "p1",
          patientName: "გიორგი მაისურაძე",
          lastMessage: "გამარჯობა, ექიმო! როგორ ხართ?",
          lastMessageTime: "14:30",
          unreadCount: 2,
          isActive: true,
          lastAppointmentDate: new Date().toISOString(),
        },
        {
          id: "2",
          patientId: "p2",
          patientName: "ნინო ბერიძე",
          lastMessage: "მადლობა კონსულტაციისთვის",
          lastMessageTime: "გუშინ",
          unreadCount: 0,
          isActive: true,
          lastAppointmentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          patientId: "p3",
          patientName: "დავით კვარაცხელია",
          lastMessage: "როდის შემიძლია ვიზიტი?",
          lastMessageTime: "2 დღის წინ",
          unreadCount: 0,
          isActive: false, // 10+ სამუშაო დღე გასული
          lastAppointmentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      
      setChats(mockChats);
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const filteredChats = chats.filter((chat) =>
    chat.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (chat: PatientChat) => {
    router.push({
      pathname: "/(doctor-tabs)/chat-conversation" as any,
      params: {
        chatId: chat.id,
        patientId: chat.patientId,
        patientName: chat.patientName,
        isActive: chat.isActive ? "true" : "false",
      },
    });
  };

  const renderChatItem = ({ item }: { item: PatientChat }) => (
    <TouchableOpacity
      style={[styles.chatItem, !item.isActive && styles.chatItemInactive]}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.patientImage ? (
          <Image
            source={{ uri: item.patientImage }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, !item.isActive && styles.avatarPlaceholderInactive]}>
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>
        )}
        {item.isActive && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.patientName} numberOfLines={1}>
            {item.patientName}
          </Text>
          <Text style={styles.timeText}>{item.lastMessageTime}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text
            style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessage || "შეტყობინება არ არის"}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        {!item.isActive && (
          <View style={styles.inactiveBadge}>
            <Ionicons name="time-outline" size={12} color="#EF4444" />
            <Text style={styles.inactiveText}>10+ სამუშაო დღე</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>ჩატების ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ჩატი პაციენტებთან</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="პაციენტის ძებნა..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#8B5CF6" />
        <Text style={styles.infoBannerText}>
          ჩატი აქტიურია 10 სამუშაო დღის განმავლობაში ბოლო ვიზიტის შემდეგ
        </Text>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>ჩატები არ მოიძებნა</Text>
            <Text style={styles.emptySubtitle}>
              თქვენს პაციენტებთან მიმოწერა აქ გამოჩნდება
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#7C3AED",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  chatItemInactive: {
    backgroundColor: "#FEF2F2",
    opacity: 0.85,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderInactive: {
    backgroundColor: "#9CA3AF",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  patientName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginRight: 8,
  },
  lastMessageUnread: {
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  inactiveText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#EF4444",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#4B5563",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

