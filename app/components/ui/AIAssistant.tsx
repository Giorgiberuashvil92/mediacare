import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import { useLanguage } from "../../contexts/LanguageContext";
import { apiService } from "../../_services/api";

type AIPlan = "free" | "standard" | "premium";
const AI_PLAN_LIMITS: Record<AIPlan, number> = {
  free: 10,
  standard: 20,
  premium: 50,
};

function AIQuotaRing({ label }: { label: string }) {
  return (
    <View style={styles.quotaRingWrap}>
      <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
        <Circle cx={24} cy={24} r={20.4} stroke="#BEC3C9" strokeWidth={7.2} />
        <Path
          d="M24 3.6C24 1.61178 25.6207 -0.0276345 27.5866 0.269493C30.6833 0.73753 33.6703 1.80904 36.3737 3.43568C40.1096 5.68361 43.1626 8.9068 45.2047 12.7591C47.2469 16.6113 48.201 20.9471 47.9647 25.3008C47.7284 29.6545 46.3106 33.8615 43.8634 37.4701C41.4163 41.0787 38.0324 43.9525 34.0751 45.7828C30.1178 47.6132 25.7367 48.3309 21.4022 47.859C17.0678 47.3871 12.9437 45.7433 9.4731 43.1042C6.96167 41.1945 4.86102 38.8158 3.28047 36.112C2.27707 34.3956 3.20051 32.2833 5.04765 31.5477C6.89478 30.8121 8.95937 31.7442 10.071 33.3927C11.0938 34.9095 12.3621 36.2558 13.8312 37.3729C16.2606 39.2203 19.1474 40.3709 22.1816 40.7013C25.2157 41.0317 28.2825 40.5292 31.0526 39.248C33.8227 37.9667 36.1914 35.9551 37.9044 33.4291C39.6174 30.9031 40.6099 27.9581 40.7753 24.9106C40.9407 21.863 40.2728 18.8279 38.8433 16.1313C37.4138 13.4348 35.2767 11.1785 32.6616 9.60498C31.0802 8.65345 29.3602 7.9733 27.5726 7.58425C25.6298 7.16144 24 5.58822 24 3.6Z"
          fill="url(#quota_ring_gradient_home)"
        />
        <Defs>
          <SvgLinearGradient
            id="quota_ring_gradient_home"
            x1={41.5}
            y1={36.5}
            x2={1.5}
            y2={27}
            gradientUnits="userSpaceOnUse"
          >
            <Stop stopColor="#3A61DD" />
            <Stop offset={1} stopColor="#3A61DD" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
      </Svg>
      <Text style={styles.quotaRingText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function AISparkleBadge({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Rect width={48} height={48} rx={24} fill="#D4E0FC" fillOpacity={0.2} />
      <Path
        d="M21.6199 21.1598L22.6536 17.5443C23.0409 16.1909 24.9589 16.1909 25.3463 17.5443L26.3788 21.1598C26.4442 21.3885 26.5667 21.5968 26.7349 21.765C26.9031 21.9332 27.1114 22.0557 27.3401 22.1211L30.9556 23.1536C32.3089 23.5409 32.3089 25.4589 30.9556 25.8463L27.3401 26.8788C27.1114 26.9441 26.9031 27.0667 26.7349 27.2349C26.5667 27.4031 26.4442 27.6114 26.3788 27.8401L25.3463 31.4556C24.9589 32.8089 23.0409 32.8089 22.6536 31.4556L21.6211 27.8401C21.5557 27.6114 21.4332 27.4031 21.265 27.2349C21.0968 27.0667 20.8885 26.9441 20.6598 26.8788L17.0443 25.8463C15.6909 25.4589 15.6909 23.5409 17.0443 23.1536L20.6598 22.1211C20.8885 22.0557 21.0968 21.9332 21.265 21.765C21.4332 21.5968 21.5557 21.3885 21.6211 21.1598M31.1213 29.7581C31.4584 28.7746 32.8759 28.7734 33.2119 29.7581L33.2423 29.8596L33.5876 31.2456L34.9736 31.5921C36.0936 31.8721 36.0936 33.4611 34.9736 33.7411L33.5876 34.0876L33.2423 35.4736C32.9623 36.5924 31.3721 36.5924 31.0921 35.4736L30.7456 34.0876L29.3596 33.7411C28.2396 33.4611 28.2396 31.8709 29.3596 31.5921L30.7456 31.2456L31.0921 29.8596L31.1213 29.7581ZM32.1666 32.4298C32.0995 32.5197 32.0197 32.5995 31.9298 32.6666C32.0197 32.7337 32.0995 32.8135 32.1666 32.9034C32.2338 32.8135 32.3135 32.7337 32.4034 32.6666C32.3134 32.5991 32.2337 32.5189 32.1666 32.4286M14.7879 13.4236C15.1356 12.4074 16.6371 12.4413 16.9089 13.5251L17.2543 14.9111L18.6403 15.2576C19.7603 15.5376 19.7603 17.1266 18.6403 17.4066L17.2543 17.7531L16.9089 19.1391C16.6289 20.2579 15.0388 20.2579 14.7588 19.1391L14.4123 17.7531L13.0263 17.4066C11.9063 17.1266 11.9063 15.5364 13.0263 15.2576L14.4123 14.9111L14.7588 13.5251L14.7879 13.4236ZM15.8333 16.0964C15.7661 16.1859 15.6863 16.2653 15.5964 16.3321C15.6865 16.3996 15.7662 16.4798 15.8333 16.5701C15.9003 16.4798 15.9801 16.3996 16.0701 16.3321C15.9802 16.265 15.9004 16.1864 15.8333 16.0964Z"
        fill="url(#ai_sparkle_gradient_home)"
      />
      <Defs>
        <SvgLinearGradient
          id="ai_sparkle_gradient_home"
          x1={21.7808}
          y1={15.9675}
          x2={32.6991}
          y2={20.1751}
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#6366F1" />
          <Stop offset={1} stopColor="#A855F7" />
        </SvgLinearGradient>
      </Defs>
    </Svg>
  );
}

function AIPlanDiamondIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path
        d="M12.0727 7.03061L12.2068 6.73414C12.4428 6.20968 12.8748 5.78918 13.4177 5.55561L13.8317 5.37805C13.882 5.35586 13.9245 5.32031 13.9543 5.27561C13.9841 5.23091 14 5.17893 14 5.12584C14 5.07275 13.9841 5.02078 13.9543 4.97608C13.9245 4.93138 13.882 4.89583 13.8317 4.87364L13.4406 4.70655C12.8841 4.46633 12.4446 4.03027 12.2128 3.48821L12.0748 3.16818C12.0546 3.1186 12.0192 3.07604 11.9734 3.04604C11.9276 3.01605 11.8734 3 11.8179 3C11.7625 3 11.7083 3.01605 11.6625 3.04604C11.6167 3.07604 11.5813 3.1186 11.561 3.16818L11.423 3.48769C11.1915 4.02985 10.7523 4.4661 10.1958 4.70655L9.80416 4.87416C9.75409 4.89641 9.71169 4.93196 9.68198 4.9766C9.65227 5.02125 9.63648 5.07312 9.63648 5.12611C9.63648 5.17909 9.65227 5.23097 9.68198 5.27561C9.71169 5.32025 9.75409 5.3558 9.80416 5.37805L10.2187 5.55509C10.7615 5.78889 11.1934 6.20958 11.429 6.73414L11.5632 7.03061C11.6614 7.24745 11.9739 7.24745 12.0727 7.03061ZM8.75636 5.79708C8.90581 6.02406 9.11017 6.19184 9.36944 6.30044L9.67762 6.42982C9.98852 6.56007 10.2109 6.76923 10.3447 7.05732L10.5291 7.4554C10.9256 8.31284 12.1059 8.44746 12.7501 7.86081L12.7997 7.92419C12.8755 8.02129 12.9139 8.14065 12.9082 8.26188C12.9025 8.38312 12.8532 8.4987 12.7687 8.58888L7.85965 13.8268C7.8085 13.8813 7.746 13.9249 7.67618 13.9547C7.60637 13.9846 7.5308 14 7.45438 14C7.37797 14 7.3024 13.9846 7.23259 13.9547C7.16277 13.9249 7.10026 13.8813 7.04912 13.8268L2.14011 8.58888C2.05555 8.4987 2.00622 8.38312 2.00055 8.26188C1.99488 8.14065 2.03322 8.02129 2.10902 7.92419L3.74536 5.82903C3.79617 5.76398 3.86205 5.71118 3.93778 5.67481C4.01352 5.63845 4.09704 5.61952 4.18171 5.61952H8.65764C8.68564 5.68027 8.71836 5.73946 8.75582 5.79708"
        fill="url(#ai_plan_diamond_gradient_home)"
      />
      <Defs>
        <SvgLinearGradient
          id="ai_plan_diamond_gradient_home"
          x1={6.87293}
          y1={4.52778}
          x2={12.2852}
          y2={6.80305}
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#6366F1" />
          <Stop offset={1} stopColor="#A855F7" />
        </SvgLinearGradient>
      </Defs>
    </Svg>
  );
}

function AIPremiumCrownIcon() {
  return (
    <Svg width={12} height={11} viewBox="0 0 12 11" fill="none">
      <Path
        d="M2.218 10.6667C2.12378 10.6667 2.04467 10.6347 1.98067 10.5707C1.91667 10.5067 1.88467 10.4273 1.88467 10.3327C1.88467 10.238 1.91667 10.1589 1.98067 10.0953C2.04467 10.0318 2.12378 10 2.218 10H9.782C9.87667 10 9.95578 10.032 10.0193 10.096C10.0829 10.16 10.1149 10.2393 10.1153 10.334C10.1158 10.4287 10.0838 10.5078 10.0193 10.5713C9.95489 10.6349 9.87578 10.6667 9.782 10.6667H2.218ZM2.736 8.744C2.47378 8.744 2.24533 8.66178 2.05067 8.49733C1.856 8.33289 1.73111 8.124 1.676 7.87067L0.88 3.65C0.857778 3.65889 0.832889 3.66378 0.805333 3.66467C0.777333 3.666 0.752222 3.66667 0.73 3.66667C0.520667 3.66667 0.346667 3.59556 0.208 3.45333C0.0693334 3.31111 0 3.13867 0 2.936C0 2.72578 0.0695555 2.54711 0.208667 2.4C0.347333 2.25333 0.521556 2.18 0.731333 2.18C0.941111 2.18 1.11956 2.25333 1.26667 2.4C1.41333 2.54711 1.48667 2.72578 1.48667 2.936C1.48667 2.98222 1.48489 3.02511 1.48133 3.06467C1.47778 3.10422 1.46467 3.14333 1.442 3.182L3.282 3.92267C3.36733 3.95689 3.45289 3.96133 3.53867 3.936C3.624 3.91022 3.69644 3.85889 3.756 3.782L5.55733 1.342C5.46089 1.27889 5.38444 1.19533 5.328 1.09133C5.27156 0.987778 5.24333 0.876 5.24333 0.756C5.24333 0.546222 5.31689 0.367778 5.464 0.220667C5.61067 0.0735556 5.78911 0 5.99933 0C6.20911 0 6.38778 0.0733333 6.53533 0.22C6.68289 0.366667 6.75667 0.544445 6.75667 0.753333C6.75667 0.879556 6.72845 0.993334 6.672 1.09467C6.61556 1.19689 6.53911 1.27933 6.44267 1.342L8.244 3.782C8.30356 3.85889 8.376 3.91 8.46133 3.93533C8.54711 3.96156 8.63267 3.95756 8.718 3.92333L10.558 3.182C10.546 3.14644 10.5356 3.10756 10.5267 3.06533C10.5178 3.02267 10.5133 2.97956 10.5133 2.936C10.5133 2.72578 10.5827 2.54711 10.7213 2.4C10.86 2.25333 11.0342 2.18 11.244 2.18C11.4538 2.18 11.6322 2.25333 11.7793 2.4C11.9264 2.54711 12 2.72578 12 2.936C12 3.13778 11.9262 3.31 11.7787 3.45267C11.6311 3.59533 11.452 3.66667 11.2413 3.66667C11.2244 3.66667 11.2053 3.664 11.184 3.65867C11.1627 3.65333 11.1391 3.65044 11.1133 3.65L10.324 7.87C10.2684 8.12422 10.1436 8.33333 9.94933 8.49733C9.75511 8.66133 9.52667 8.74356 9.264 8.744H2.736Z"
        fill="url(#ai_premium_crown_gradient_home)"
      />
      <Defs>
        <SvgLinearGradient
          id="ai_premium_crown_gradient_home"
          x1={4.87293}
          y1={1.48148}
          x2={10.2341}
          y2={3.8057}
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#6366F1" />
          <Stop offset={1} stopColor="#A855F7" />
        </SvgLinearGradient>
      </Defs>
    </Svg>
  );
}

function AIPlanBadgeIcon({ premium }: { premium: boolean }) {
  return (
    <View style={styles.planBadgeIconWrap}>
      {premium ? <AIPremiumCrownIcon /> : <AIPlanDiamondIcon />}
    </View>
  );
}

export default function AIAssistant() {
  const { language } = useLanguage();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [aiPlan, setAiPlan] = useState<AIPlan>("free");
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const aiUsageLimit = AI_PLAN_LIMITS[aiPlan];
  const aiUsageRemaining = Math.max(aiUsageLimit - aiUsageCount, 0);
  const isLimitReached = aiUsageRemaining <= 0;
  const planLabel =
    aiPlan === "premium"
      ? language === "en"
        ? "Premium"
        : language === "ru"
          ? "Премиум"
          : "პრემიუმ"
      : aiPlan === "standard"
        ? language === "en"
          ? "Standard"
          : language === "ru"
            ? "Стандарт"
            : "სტანდარტ"
        : language === "en"
          ? "Free version"
          : language === "ru"
            ? "Бесплатная версия"
            : "უფასო ვერსია";
  const usageRingLabel =
    aiUsageLimit >= 50
      ? `${aiUsageRemaining}/${aiUsageLimit}`
      : `${aiUsageRemaining}/${aiUsageLimit}`;
  const copy =
    language === "en"
      ? {
          title: "AI Assistant",
          description: "Ask about any health topic",
          start: "Start",
          remaining: "Remaining questions",
          limitReached: "Question limit reached",
          limitDescription: `You used all ${aiUsageLimit} questions. Upgrade for more questions.`,
          freeDescription:
            "The free version allows 10 questions within 24 hours. Upgrade for more questions.",
        }
      : language === "ru"
        ? {
            title: "AI Ассистент",
            description: "Спросите о любой теме здоровья",
            start: "Начать",
            remaining: "Осталось вопросов",
            limitReached: "Лимит вопросов исчерпан",
            limitDescription: `Вы использовали все ${aiUsageLimit} вопросов. Обновите версию для большего количества вопросов.`,
            freeDescription:
              "Бесплатная версия позволяет задать 10 вопросов в течение 24 часов. Обновите версию для большего количества вопросов.",
          }
        : {
            title: "AI ასისტენტი",
            description: "ჰკითხე ჯანმრთელობის ნებისმიერ საკითხზე",
            start: "დაწყება",
            remaining: "დარჩენილი კითხვები",
            limitReached: "კითხვების ლიმიტი ამოწურულია",
            limitDescription: `თქვენ ამოწურეთ ${aiUsageLimit} კითხვა. მეტი კითხვებისთვის განაახლე ვერსია.`,
            freeDescription:
              "უფასო ვერსიით მხოლოდ 10 კითხვის დასმაა შესაძლებელი 24 საათის განმავლობაში. მეტი კითხვისთვის განაახლე ვერსია.",
          };

  const loadAIUsage = useCallback(async () => {
    try {
      const subscription = await apiService.getAISubscription();
      setAiPlan(subscription.plan);
      setAiUsageCount(subscription.usageCount);
    } catch (error) {
      console.warn("⚠️ [AI assistant card] Could not load subscription:", error);
    }
  }, []);

  useEffect(() => {
    void loadAIUsage();
  }, [loadAIUsage]);

  useFocusEffect(
    useCallback(() => {
      void loadAIUsage();
    }, [loadAIUsage]),
  );

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
      <TouchableOpacity
        style={styles.container}
        onPress={() => router.push("/screens/ai-assistant")}
        activeOpacity={0.9}
      >
        <View style={[styles.card, isLimitReached ? styles.cardLocked : null]}>
          <View style={styles.cardContent}>
            <View style={styles.textContainer}>
              <View style={styles.titleBlock}>
                <View style={styles.titleBadgeAnchor}>
                  <Text style={styles.title} numberOfLines={1}>
                    {copy.title}
                  </Text>
                  <View style={styles.planBadge}>
                    <AIPlanBadgeIcon premium={aiPlan === "premium"} />
                    <Text
                      style={styles.planBadgeText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                    >
                      {planLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.description}>{copy.description}</Text>
              </View>
              <View style={styles.buttonsRow}>
                <View style={styles.startButton}>
                  <Text style={styles.buttonText}>{copy.start}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <View style={styles.iconContainer}>
              <AISparkleBadge size={64} />
            </View>
          </View>
          <View
            style={[
              styles.usageStrip,
              isLimitReached ? styles.usageStripLocked : null,
            ]}
          >
            <AIQuotaRing label={usageRingLabel} />
            <View style={styles.usageCopy}>
              <Text
                style={[
                  styles.usageTitle,
                  isLimitReached ? styles.usageTitleLocked : null,
                ]}
              >
                {isLimitReached
                  ? copy.limitReached
                  : copy.remaining}
              </Text>
              <Text style={styles.usageDescription}>
                {isLimitReached
                  ? copy.limitDescription
                  : copy.freeDescription}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

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
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ჩატის ისტორია</Text>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.historyList}
              showsVerticalScrollIndicator={false}
            >
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
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color="#D1D5DB"
                  />
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
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
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
              <Text style={styles.inputLabel}>
                ჩატის სახელი (არასავალდებულო)
              </Text>
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
    marginBottom: 8,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 358,
    height: 212,
    backgroundColor: "rgba(229, 242, 250, 0.2)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  cardLocked: {
    backgroundColor: "#F2F2F7",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    height: 93,
    gap: 12,
  },
  textContainer: {
    width: 234,
    height: 93,
    justifyContent: "flex-start",
    gap: 10,
  },
  titleBlock: {
    width: 234,
    gap: 4,
  },
  titleBadgeAnchor: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    minHeight: 24,
  },
  title: {
    width: 100,
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    lineHeight: 19,
  },
  planBadge: {
    position: "absolute",
    left: 106,
    top: -5,
    width: 120,
    height: 24,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  planBadgeIconWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  planBadgeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#457DF1",
    lineHeight: 16,
    opacity: 0.8,
  },
  description: {
    width: 234,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 16,
    opacity: 0.8,
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
    width: 92,
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#45C59E",
    borderRadius: 43,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 4,
  },
  buttonText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
    lineHeight: 16,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: "rgba(212, 224, 252, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  usageStrip: {
    marginTop: 12,
    height: 75,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  usageStripLocked: {
    backgroundColor: "#F1E4E7",
    borderColor: "rgba(244, 63, 94, 0.16)",
  },
  quotaRingWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  quotaRingText: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 16,
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#4B54FA",
    lineHeight: 16,
    opacity: 0.8,
    textAlign: "center",
  },
  usageCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  usageTitle: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 16,
  },
  usageTitleLocked: {
    color: "#DC2626",
  },
  usageDescription: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    lineHeight: 12,
    opacity: 0.8,
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
