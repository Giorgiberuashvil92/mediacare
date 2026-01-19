import Ionicons from "@expo/vector-icons/Ionicons";
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
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";

interface DoctorChat {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorImage?: string;
  doctorSpecialization?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export default function PatientChatScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<DoctorChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadChats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // TODO: Replace with real API call when backend is ready
      // const response = await apiService.getPatientChats(user.id);
      
      // Mock data for now
      const mockChats: DoctorChat[] = [
        {
          id: "1",
          doctorId: "d1",
          doctorName: "დოქტორი გიორგი ბერიძე",
          doctorSpecialization: "კარდიოლოგი",
          lastMessage: "გამარჯობა! როგორ ხართ?",
          lastMessageTime: "14:30",
          unreadCount: 2,
        },
        {
          id: "2",
          doctorId: "d2",
          doctorName: "დოქტორი ნინო მაისურაძე",
          doctorSpecialization: "ნევროლოგი",
          lastMessage: "მადლობა კონსულტაციისთვის",
          lastMessageTime: "გუშინ",
          unreadCount: 0,
        },
      ];
      
      setChats(mockChats);
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const filteredChats = chats.filter((chat) =>
    chat.doctorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (chat: DoctorChat) => {
    router.push({
      pathname: "/screens/chat/[doctorId]" as any,
      params: {
        doctorId: chat.doctorId,
      },
    });
  };

  const renderChatItem = ({ item }: { item: DoctorChat }) => {
    const getDoctorImage = () => {
      if (item.doctorImage) {
        const apiBaseUrl = apiService.getBaseURL();
        if (item.doctorImage.startsWith("http")) {
          return { uri: item.doctorImage };
        } else {
          return { uri: `${apiBaseUrl}/${item.doctorImage}` };
        }
      }
      return require("@/assets/images/doctors/doctor1.png");
    };

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={52} color="#06B6D4" />
          <View style={styles.onlineIndicator} />
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderLeft}>
              <Text style={styles.doctorName} numberOfLines={1}>
                {item.doctorName}
              </Text>
              {item.doctorSpecialization && (
                <Text style={styles.specialization} numberOfLines={1}>
                  {item.doctorSpecialization}
                </Text>
              )}
            </View>
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
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>ჩატების ჩატვირთვა...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ჩატი</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="ექიმის ძებნა..."
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
              თქვენს ექიმებთან მიმოწერა აქ გამოჩნდება
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
    backgroundColor: "#F2F2F7",
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 12,
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
  avatarContainer: {
    position: "relative",
    marginRight: 14,
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
    alignItems: "flex-start",
    marginBottom: 4,
  },
  chatHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  doctorName: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 2,
  },
  specialization: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
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
    backgroundColor: "#06B6D4",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
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

