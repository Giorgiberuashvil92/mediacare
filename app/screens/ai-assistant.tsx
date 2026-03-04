import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Rect, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
import { AIMessage, AISession, apiService } from "../_services/api";
import { useAuth } from "../contexts/AuthContext";

const SUGGESTED_PROMPTS = [
  {
    id: 1,
    text: "ლაბორატორიული ანალიზის შედეგებს აგიხსნი მარტივად",
  },
  {
    id: 2,
    text: "აღწერე რაც გაწუხებს და გეტყვი რას შეიძლება უკავშირდებოდეს",
  },
  {
    id: 3,
    text: "მკითხე კონკრეტულ დაავადებაზე და აგიხსნი გასაგებად",
  },
  {
    id: 4,
    text: "ატვირთე ფოტო (დოკუმენტი, გამონაყარი, დაზიანება) და შევაფასებ",
  },
];

interface SelectedImageType {
  uri: string;
  type?: string;
  name?: string;
  fileSize?: number;
}

export default function AIAssistantScreen() {
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImageType | null>(null);
  const [currentSession, setCurrentSession] = useState<AISession | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Request camera permissions
  const requestCameraPermission = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "წვდომა",
          "კამერის გამოსაყენებლად საჭიროა კამერის წვდომა"
        );
        return false;
      }
    }
    return true;
  };

  // Request media library permissions
  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "წვდომა",
          "სურათის არჩევისთვის საჭიროა გალერეის წვდომა"
        );
        return false;
      }
    }
    return true;
  };

  // Open camera
  const handleOpenCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          fileSize: asset.fileSize,
        });
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("შეცდომა", "კამერის გახსნა ვერ მოხერხდა");
    }
  };

  // Open photo gallery
  const handleOpenPhotos = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate file size (max 10MB)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert("შეცდომა", "ფაილის ზომა არ უნდა აღემატებოდეს 10MB-ს");
          return;
        }

        setSelectedImage({
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          fileSize: asset.fileSize,
        });
      }
    } catch (error) {
      console.error("Photo picker error:", error);
      Alert.alert("შეცდომა", "სურათის არჩევა ვერ მოხერხდა");
    }
  };

  // Handle add photo to message
  const handleAddPhoto = () => {
    if (selectedImage) {
      setShowMediaModal(false);
      // Image is ready to be sent to API
      // You can access selectedImage.uri, selectedImage.type, selectedImage.name
      console.log("Image ready for API:", selectedImage);
    }
  };


  // Reset state when screen loses focus (user navigates away)
  useFocusEffect(
    useCallback(() => {
      // When screen comes into focus, reset everything for fresh start
      console.log("🔄 [useFocusEffect] Screen focused - resetting for fresh start");
      setMessages([]);
      setCurrentSession(null);
      setInputText("");
      setSelectedImage(null);
      setIsLoading(false);
      
      // Don't load existing session - always start fresh
      console.log("📝 [useFocusEffect] Starting fresh - session will be created when user sends first message.");
      
      return () => {
        // Cleanup when screen loses focus (user navigates away)
        console.log("🧹 [useFocusEffect] Screen unfocused - cleaning up");
        setMessages([]);
        setCurrentSession(null);
        setInputText("");
        setSelectedImage(null);
      };
    }, [])
  );

  // Load messages for current session
  const loadMessages = async (sessionId: string) => {
    try {
      console.log("📨 [loadMessages] Loading messages for session:", sessionId);
      
      const messagesResponse = await apiService.getAIMessages(sessionId, {
        limit: 100,
      });

      console.log("📨 [loadMessages] Messages response:", {
        success: messagesResponse.success,
        count: messagesResponse.data?.length || 0,
      });

      if (messagesResponse.success) {
        setMessages(messagesResponse.data);
        console.log("✅ [loadMessages] Messages loaded successfully:", messagesResponse.data.length);
        // Scroll to bottom after messages load
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error("❌ [loadMessages] Error loading messages:", error);
    }
  };

  // Load sessions for history
  const loadSessions = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingHistory(true);
      console.log("📋 [loadSessions] Loading sessions for user:", user.id);
      
      const sessionsResponse = await apiService.getAISessions({
        initiator_id: user.id,
        limit: 100, // Increased limit to get more sessions
      });

      console.log("📋 [loadSessions] Sessions response:", {
        success: sessionsResponse.success,
        count: sessionsResponse.data?.length || 0,
      });

      if (sessionsResponse.success) {
        setSessions(sessionsResponse.data);
        console.log("✅ [loadSessions] Sessions loaded successfully:", sessionsResponse.data.length);
      }
    } catch (error) {
      console.error("❌ [loadSessions] Error loading sessions:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load sessions when history modal opens
  useEffect(() => {
    if (showHistoryModal) {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistoryModal]);

  // Handle send message with image
  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || isSending) return;
    if (!user?.id) return;

    try {
      setIsSending(true);

      // Create session if it doesn't exist (first message)
      let sessionToUse = currentSession;
      if (!sessionToUse) {
        console.log("📝 [handleSendMessage] Creating new session for first message");
        const sessionResponse = await apiService.createAISession({
          initiator_id: user.id,
          initiator_type: user.role === "doctor" ? "doctor" : "customer",
        });

        if (!sessionResponse.success) {
          throw new Error("Failed to create session");
        }

        sessionToUse = sessionResponse.data;
        setCurrentSession(sessionToUse);
        await AsyncStorage.setItem("ai_session_id", sessionToUse.id);
        console.log("✅ [handleSendMessage] Session created:", sessionToUse.id);
      }

      const response = await apiService.sendAIMessage(sessionToUse.id, {
        content: inputText.trim() || "",
        image: selectedImage ? {
          uri: selectedImage.uri,
          type: selectedImage.type || "image/jpeg",
          name: selectedImage.name || `photo_${Date.now()}.jpg`,
        } : undefined,
      });

      if (response.success) {
        // Add both user and assistant messages to the list
        setMessages((prev) => [...prev, response.data.user_message, response.data.assistant_message]);
        
        // Clear input
        setInputText("");
        setSelectedImage(null);

        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error: any) {
      console.error("Send message error:", error);
      Alert.alert("შეცდომა", error.message || "შეტყობინების გაგზავნა ვერ მოხერხდა");
    } finally {
      setIsSending(false);
    }
  };

  // Handle prompt selection
  const handlePromptSelect = (promptText: string) => {
    setInputText(promptText);
  };

  // Handle session selection from history
  const handleSessionSelect = async (session: AISession) => {
    console.log("📋 [handleSessionSelect] Session selected:", session.id);
    setShowHistoryModal(false);
    setCurrentSession(session);
    
    // Save session ID to AsyncStorage
    await AsyncStorage.setItem("ai_session_id", session.id);
    
    // Load messages for this session
    await loadMessages(session.id);
  };

  // Format date for history
  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `დღეს, ${date.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays === 1) {
      return `გუშინ, ${date.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (diffDays < 7) {
      return `${diffDays} დღის წინ`;
    } else {
      return date.toLocaleDateString("ka-GE");
    }
  };

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
        
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconContainer}>
            <Svg width={32} height={32} viewBox="0 0 56 56" fill="none">
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
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI ასისტენტი</Text>
            <Text style={styles.headerSubtitle}>Powered By Hapttic</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={async () => {
              // Create new session and start fresh
              if (user?.id) {
                console.log("✍️ [headerNewChatButton] Creating new session");
                try {
                  const sessionResponse = await apiService.createAISession({
                    initiator_id: user.id,
                    initiator_type: user.role === "doctor" ? "doctor" : "customer",
                  });
                  if (sessionResponse.success) {
                    setCurrentSession(sessionResponse.data);
                    await AsyncStorage.setItem("ai_session_id", sessionResponse.data.id);
                    setMessages([]);
                    setInputText("");
                    setSelectedImage(null);
                    console.log("✅ [headerNewChatButton] New session created:", sessionResponse.data.id);
                  }
                } catch (error) {
                  console.error("❌ [headerNewChatButton] Error creating session:", error);
                  Alert.alert("შეცდომა", "ახალი სესიის შექმნა ვერ მოხერხდა");
                }
              }
            }}
          >
            <Ionicons name="create-outline" size={22} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowHistoryModal(true)}
          >
            <Ionicons name="time-outline" size={22} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="ellipsis-vertical" size={22} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Generated Tag */}
        <View style={styles.aiTagContainer}>
          <View style={styles.aiTag}>
            <Svg width={12} height={12} viewBox="0 0 56 56" fill="none">
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
            <Text style={styles.aiTagText}>Generated by Al. Review Recommended.</Text>
          </View>
          <View style={styles.creditsContainer}>
            <Text style={styles.creditsText}>100</Text>
            <TouchableOpacity>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Assistant Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerCard}>
            <Svg width={120} height={120} viewBox="0 0 56 56" fill="none">
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
          <Text style={styles.bannerTitle}>AI ასისტენტი</Text>
          <Text style={styles.bannerDescription}>
            ჰკითხე ჯანმრთელობის შესახებ ნებისმიერ საკითხზე
          </Text>
        </View>

        {/* Messages */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>სესიის ინიციალიზაცია...</Text>
          </View>
        ) : messages.length > 0 ? (
          <View style={styles.messagesContainer}>
            {messages.map((message) => (
              <View key={message.id}>
                <View
                  style={[
                    styles.messageBubble,
                    message.role === "user" ? styles.userMessage : styles.assistantMessage,
                  ]}
                >
                  {message.image_url && (
                    <Image source={{ uri: message.image_url }} style={styles.messageImage} />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.role === "user" ? styles.userMessageText : styles.assistantMessageText,
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text style={styles.messageTime}>
                    {new Date(message.created_at).toLocaleTimeString("ka-GE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                
                {/* Doctor Recommendations from AI Response */}
                {message.role === "assistant" && message.metadata?.doctors && message.metadata.doctors.length > 0 && (
                  <View style={styles.doctorRecommendationsContainer}>
                    {message.metadata.doctors.map((doctor: any, index: number) => (
                      <TouchableOpacity
                        key={doctor.id || index}
                        style={styles.doctorRecommendationCard}
                        onPress={() => {
                          if (doctor.id) {
                            router.push({
                              pathname: "/screens/doctors/doctor/[id]",
                              params: { id: doctor.id },
                            });
                          }
                        }}
                      >
                        {doctor.image && (
                          <Image 
                            source={{ uri: doctor.image }} 
                            style={styles.doctorRecommendationImage}
                          />
                        )}
                        <View style={styles.doctorRecommendationInfo}>
                          <Text style={styles.doctorRecommendationName}>
                            {doctor.name || "ექიმი"}
                          </Text>
                          {doctor.specialization && (
                            <Text style={styles.doctorRecommendationSpecialty}>
                              {doctor.specialization}
                            </Text>
                          )}
                          {doctor.rating && (
                            <View style={styles.doctorRecommendationRating}>
                              <Ionicons name="star" size={14} color="#F59E0B" />
                              <Text style={styles.doctorRecommendationRatingText}>
                                {doctor.rating}
                                {doctor.reviewCount && ` (${doctor.reviewCount})`}
                              </Text>
                            </View>
                          )}
                          {doctor.consultationFee && (
                            <Text style={styles.doctorRecommendationFee}>
                              {doctor.consultationFee}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.doctorRecommendationButton}
                          onPress={() => {
                            if (doctor.id) {
                              router.push({
                                pathname: "/screens/doctors/doctor/[id]",
                                params: { id: doctor.id },
                              });
                            }
                          }}
                        >
                          <Text style={styles.doctorRecommendationButtonText}>ჩაეწერე</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Suggested Prompts */}
            <View style={styles.promptsSection}>
              <Text style={styles.promptsTitle}>შემოთავაზებული კითხვები</Text>
              <View style={styles.promptsContainer}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt.id}
                    style={styles.promptCard}
                    activeOpacity={0.7}
                    onPress={() => handlePromptSelect(prompt.text)}
                  >
                    <Ionicons name="list-outline" size={20} color="#6B7280" />
                    <Text style={styles.promptText}>{prompt.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Input Field */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.inputIconButton}
          onPress={() => setShowMediaModal(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          {selectedImage && (
            <View style={styles.inputImagePreview}>
              <Image source={{ uri: selectedImage.uri }} style={styles.inputPreviewImage} />
              <TouchableOpacity
                style={styles.inputRemoveImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={[styles.input, selectedImage && styles.inputWithImage]}
            placeholder="ჰკითხე ჯანმრთელობაზე"
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
        </View>
        <TouchableOpacity style={styles.inputIconButton}>
          <Ionicons name="mic-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sendButton}
          disabled={(!inputText.trim() && !selectedImage) || isSending}
          onPress={handleSendMessage}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() || selectedImage ? "#6366F1" : "#9CA3AF"}
            />
          )}
        </TouchableOpacity>
      </View>


      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <TouchableOpacity
          style={styles.historyModalOverlay}
          activeOpacity={1}
          onPress={() => setShowHistoryModal(false)}
        >
          <View style={styles.historyModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.historyModalHeader}>
              <View style={styles.historyModalHeaderLeft}>
                <TouchableOpacity
                  style={styles.historyNewChatButton}
                  onPress={async () => {
                    // Create new session and start fresh
                    if (user?.id) {
                      console.log("✍️ [newChatButton] Creating new session");
                      try {
                        const sessionResponse = await apiService.createAISession({
                          initiator_id: user.id,
                          initiator_type: user.role === "doctor" ? "doctor" : "customer",
                        });
                        if (sessionResponse.success) {
                          setCurrentSession(sessionResponse.data);
                          await AsyncStorage.setItem("ai_session_id", sessionResponse.data.id);
                          setMessages([]);
                          setShowHistoryModal(false);
                          console.log("✅ [newChatButton] New session created:", sessionResponse.data.id);
                        }
                      } catch (error) {
                        console.error("❌ [newChatButton] Error creating session:", error);
                        Alert.alert("შეცდომა", "ახალი სესიის შექმნა ვერ მოხერხდა");
                      }
                    }
                  }}
                >
                  <Ionicons name="create-outline" size={24} color="#6366F1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.historyRefreshButton}
                  onPress={() => loadSessions()}
                >
                  <Ionicons name="refresh" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.historyModalTitle}>ისტორია</Text>
              </View>
              <TouchableOpacity
                style={styles.historyCloseButton}
                onPress={() => setShowHistoryModal(false)}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView
              style={styles.historyModalList}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingHistory ? (
                <View style={styles.historyLoadingState}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={styles.historyLoadingText}>იტვირთება...</Text>
                </View>
              ) : sessions.length > 0 ? (
                sessions.map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.historyModalItem}
                    onPress={() => handleSessionSelect(session)}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyItemTitle}>
                        {session.status === "active" ? "აქტიური სესია" : "დასრულებული სესია"}
                      </Text>
                      <Text style={styles.historyItemDate}>{formatSessionDate(session.created_at)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.historyEmptyState}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.historyEmptyText}>ისტორია ცარიელია</Text>
                  <Text style={styles.historyEmptySubtext}>თქვენი ჩატის ისტორია აქ გამოჩნდება</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Media Selection Modal */}
      <Modal
        visible={showMediaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMediaModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMediaModal(false)}
        >
          <View style={styles.mediaModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.mediaModalHeader}>
              <View style={styles.modalHeaderTitleContainer}>
                <View style={styles.modalHeaderIconContainer}>
                  <Svg width={32} height={32} viewBox="0 0 56 56" fill="none">
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
                <View>
                  <Text style={styles.modalHeaderTitle}>AI ასისტენტი</Text>
                  <Text style={styles.modalHeaderSubtitle}>Powered By Hapttic</Text>
                </View>
              </View>
            </View>
            <View style={styles.mediaOptionsContainer}>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={handleOpenCamera}
              >
                <View style={styles.mediaOptionIcon}>
                  <Ionicons name="camera-outline" size={32} color="#6366F1" />
                </View>
                <Text style={styles.mediaOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mediaOption}
                onPress={handleOpenPhotos}
              >
                <View style={styles.mediaOptionIcon}>
                  <Ionicons name="images-outline" size={32} color="#6366F1" />
                </View>
                <Text style={styles.mediaOptionText}>Photos</Text>
              </TouchableOpacity>
              {selectedImage && (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                  <View style={styles.selectedImageBadge}>
                    <Text style={styles.selectedImageBadgeText}>1</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {selectedImage && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handleAddPhoto}
              >
                <LinearGradient
                  colors={["#6366F1", "#A855F7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addPhotoButtonGradient}
                >
                  <Text style={styles.addPhotoButtonText}>1 ფოტოს დამატება</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
  },
  headerIconContainer: {
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    padding: 8,
  },
  historyButtonContainer: {
    position: "relative",
  },
  historyDropdown: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 280,
    maxHeight: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    overflow: "hidden",
  },
  historyDropdownList: {
    maxHeight: 400,
  },
  historyDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  historyEmptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#9CA3AF",
    marginTop: 12,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  aiTagContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  aiTagText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  creditsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  creditsText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  bannerContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  bannerCard: {
    width: 120,
    height: 120,
    backgroundColor: "#F3E8FF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  bannerDescription: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  promptsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  promptsTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  promptsContainer: {
    gap: 12,
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  promptText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#374151",
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    maxHeight: 100,
  },
  inputWithImage: {
    marginTop: 8,
  },
  inputImagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
  },
  inputPreviewImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  inputRemoveImageButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  inputIconButton: {
    padding: 8,
    flexShrink: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalHeaderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalHeaderIconContainer: {
    marginRight: 12,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  mediaModalContent: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  mediaModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  mediaOptionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  mediaOption: {
    alignItems: "center",
    gap: 8,
  },
  mediaOptionIcon: {
    width: 80,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaOptionText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#374151",
  },
  selectedImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  selectedImageBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#6366F1",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedImageBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  addPhotoButton: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  addPhotoButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  messagesContainer: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#6366F1",
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  assistantMessageText: {
    color: "#1F2937",
  },
  messageImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#E5E7EB",
  },
  messageTime: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  historyLoadingState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorRecommendationsContainer: {
    marginTop: 8,
    marginBottom: 12,
    gap: 12,
  },
  doctorRecommendationCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginLeft: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
    gap: 12,
  },
  doctorRecommendationImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E5E7EB",
  },
  doctorRecommendationInfo: {
    flex: 1,
    gap: 4,
  },
  doctorRecommendationName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  doctorRecommendationSpecialty: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  doctorRecommendationRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  doctorRecommendationRatingText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  doctorRecommendationFee: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#6366F1",
    marginTop: 2,
  },
  doctorRecommendationButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doctorRecommendationButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  historyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  historyModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    width: "100%",
    height: "70%",
    marginTop: 0,
  },
  historyModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyNewChatButton: {
    padding: 8,
  },
  historyRefreshButton: {
    padding: 8,
  },
  historyModalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
  },
  historyCloseButton: {
    padding: 8,
  },
  historyModalList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  historyModalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  historyLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  historyEmptySubtext: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
});
