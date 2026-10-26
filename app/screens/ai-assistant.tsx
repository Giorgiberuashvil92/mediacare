import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ensureCameraAccess,
  ensureMediaLibraryAccess,
} from "../utils/mediaLibraryPermission";
import { WebView } from "react-native-webview";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import Toast from "react-native-toast-message";
import {
  AIMessage,
  AIMessageFeedbackProblem,
  AISession,
  apiService,
} from "../_services/api";
import AIAssistantBannerGraphic from "../components/ui/AIAssistantBannerGraphic";
import AIConsentModal from "../components/ui/AIConsentModal";
import AIMessageSources from "../components/ui/AIMessageSources";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getAIConsent, saveAIConsent } from "../utils/aiConsentStorage";
import { getDoctorDisplayName } from "../utils/doctorNameLabel";
import {
  buildAttachmentPreviewUri,
  buildHeraAttachmentFromUri,
  isImageFilename,
  isImageMimeType,
  isSupportedAttachmentMime,
  resolveMessageImageUri,
} from "../utils/heraAttachment";

type AIConsentStatus = "loading" | "pending" | "accepted" | "declined";
type AIPlan = "free" | "standard" | "premium";
const AI_SCREEN_BG = "#F2F2F7";
const STREAMING_ASSISTANT_ID = "__streaming_assistant__";
const AI_PLAN_LIMITS: Record<AIPlan, number> = {
  free: 10,
  standard: 20,
  premium: 50,
};
const AI_PLAN_PRICES: Record<Exclude<AIPlan, "free">, number> = {
  standard: 20,
  premium: 50,
};

function getMessagePreviewText(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { text?: string; content?: string };
      if (typeof parsed.text === "string" && parsed.text.trim()) {
        return parsed.text.trim();
      }
      if (typeof parsed.content === "string" && parsed.content.trim()) {
        return parsed.content.trim();
      }
    } catch {
      // plain text
    }
  }

  return trimmed;
}

async function fetchSessionPreview(sessionId: string): Promise<string> {
  try {
    // ისტორიის სათაური = GET /sessions/{id}/messages → პირველი user შეტყობინების content
    const response = await apiService.getAIMessages(sessionId, {
      skip: 0,
      limit: 20,
    });
    if (!response.success || !response.data.length) return "";

    const firstUserWithContent = response.data.find(
      (message) =>
        message.role === "user" && getMessagePreviewText(message.content),
    );
    if (firstUserWithContent) {
      return getMessagePreviewText(firstUserWithContent.content);
    }

    const firstUser = response.data.find((message) => message.role === "user");
    if (firstUser?.attachments?.length) {
      const file = firstUser.attachments[0];
      return file.filename?.trim() || "";
    }

    return "";
  } catch {
    return "";
  }
}

function streamStatusLabel(
  status: { state: string; query?: string },
  t: (key: string) => string,
): string {
  if (status.state === "searching_pubmed") {
    return t("aiAssistant.stream.searchingPubMed");
  }
  return t("aiAssistant.stream.thinking");
}

function AIQuotaRing({ label }: { label: string }) {
  return (
    <View style={styles.quotaRingWrap}>
      <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
        <Circle cx={24} cy={24} r={20.4} stroke="#BEC3C9" strokeWidth={7.2} />
        <Path
          d="M24 3.6C24 1.61178 25.6207 -0.0276345 27.5866 0.269493C30.6833 0.73753 33.6703 1.80904 36.3737 3.43568C40.1096 5.68361 43.1626 8.9068 45.2047 12.7591C47.2469 16.6113 48.201 20.9471 47.9647 25.3008C47.7284 29.6545 46.3106 33.8615 43.8634 37.4701C41.4163 41.0787 38.0324 43.9525 34.0751 45.7828C30.1178 47.6132 25.7367 48.3309 21.4022 47.859C17.0678 47.3871 12.9437 45.7433 9.4731 43.1042C6.96167 41.1945 4.86102 38.8158 3.28047 36.112C2.27707 34.3956 3.20051 32.2833 5.04765 31.5477C6.89478 30.8121 8.95937 31.7442 10.071 33.3927C11.0938 34.9095 12.3621 36.2558 13.8312 37.3729C16.2606 39.2203 19.1474 40.3709 22.1816 40.7013C25.2157 41.0317 28.2825 40.5292 31.0526 39.248C33.8227 37.9667 36.1914 35.9551 37.9044 33.4291C39.6174 30.9031 40.6099 27.9581 40.7753 24.9106C40.9407 21.863 40.2728 18.8279 38.8433 16.1313C37.4138 13.4348 35.2767 11.1785 32.6616 9.60498C31.0802 8.65345 29.3602 7.9733 27.5726 7.58425C25.6298 7.16144 24 5.58822 24 3.6Z"
          fill="url(#quota_ring_gradient)"
        />
        <Defs>
          <SvgLinearGradient
            id="quota_ring_gradient"
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
        fill="url(#ai_sparkle_gradient)"
      />
      <Defs>
        <SvgLinearGradient
          id="ai_sparkle_gradient"
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
        fill="url(#ai_plan_diamond_gradient)"
      />
      <Defs>
        <SvgLinearGradient
          id="ai_plan_diamond_gradient"
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
        fill="url(#ai_premium_crown_gradient)"
      />
      <Defs>
        <SvgLinearGradient
          id="ai_premium_crown_gradient"
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

function MessageLikeIcon({
  size = 20,
  color = "#575759",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M6.2334 15.2917L8.81673 17.2917C9.15006 17.625 9.90006 17.7917 10.4001 17.7917H13.5667C14.5667 17.7917 15.6501 17.0417 15.9001 16.0417L17.9001 9.95835C18.3167 8.79168 17.5667 7.79168 16.3167 7.79168H12.9834C12.4834 7.79168 12.0667 7.37501 12.1501 6.79168L12.5667 4.12501C12.7334 3.37501 12.2334 2.54168 11.4834 2.29168C10.8167 2.04168 9.9834 2.37501 9.65006 2.87501L6.2334 7.95835"
        stroke={color}
        strokeWidth={1.5}
        strokeMiterlimit={10}
      />
      <Path
        d="M1.9834 15.2917V7.12499C1.9834 5.95832 2.4834 5.54166 3.65007 5.54166H4.4834C5.65006 5.54166 6.15007 5.95832 6.15007 7.12499V15.2917C6.15007 16.4583 5.65006 16.875 4.4834 16.875H3.65007C2.4834 16.875 1.9834 16.4583 1.9834 15.2917Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessageCopyIcon({
  size = 20,
  color = "#575759",
  clipId,
}: {
  size?: number;
  color?: string;
  clipId: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Defs>
        <ClipPath id={clipId}>
          <Rect width="20" height="20" fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path
          d="M16.6665 6.66666H8.33317C7.4127 6.66666 6.6665 7.41285 6.6665 8.33332V16.6667C6.6665 17.5871 7.4127 18.3333 8.33317 18.3333H16.6665C17.587 18.3333 18.3332 17.5871 18.3332 16.6667V8.33332C18.3332 7.41285 17.587 6.66666 16.6665 6.66666Z"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M3.33317 13.3333C2.4165 13.3333 1.6665 12.5833 1.6665 11.6667V3.33332C1.6665 2.41666 2.4165 1.66666 3.33317 1.66666H11.6665C12.5832 1.66666 13.3332 2.41666 13.3332 3.33332"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

function MessageDislikeIcon({
  size = 20,
  color = "#575759",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M13.7668 4.70831L11.1834 2.70831C10.8501 2.37498 10.1001 2.20831 9.6001 2.20831H6.43344C5.43344 2.20831 4.3501 2.95831 4.1001 3.95831L2.1001 10.0416C1.68344 11.2083 2.43344 12.2083 3.68344 12.2083H7.01677C7.51677 12.2083 7.93344 12.625 7.8501 13.2083L7.43344 15.875C7.26677 16.625 7.76677 17.4583 8.51677 17.7083C9.18344 17.9583 10.0168 17.625 10.3501 17.125L13.7668 12.0416"
        stroke={color}
        strokeWidth={1.5}
        strokeMiterlimit={10}
      />
      <Path
        d="M18.0168 4.70833V12.875C18.0168 14.0417 17.5168 14.4583 16.3501 14.4583H15.5168C14.3501 14.4583 13.8501 14.0417 13.8501 12.875V4.70833C13.8501 3.54167 14.3501 3.125 15.5168 3.125H16.3501C17.5168 3.125 18.0168 3.54167 18.0168 4.70833Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessageTypingDots() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 3), 420);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.typingDotsRow}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.typingDot, { opacity: phase === i ? 1 : 0.3 }]}
        />
      ))}
    </View>
  );
}

function AIHeaderNewChatIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V13"
        stroke="#000000"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16.04 3.02L8.16004 10.9C7.86004 11.2 7.56004 11.79 7.50004 12.22L7.07004 15.23C6.91004 16.32 7.68004 17.08 8.77004 16.93L11.78 16.5C12.2 16.44 12.79 16.14 13.1 15.84L20.98 7.96C22.34 6.6 22.98 5.02 20.98 3.02C18.98 1.02 17.4 1.66 16.04 3.02Z"
        stroke="#000000"
        strokeWidth={1.5}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.91 4.15C15.58 6.54 17.45 8.41 19.85 9.09"
        stroke="#000000"
        strokeWidth={1.5}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AIHeaderHistoryIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.82934 2.81902C6.62434 -0.970979 12.7943 -0.930979 16.6123 2.88802C20.4323 6.70802 20.4723 12.881 16.6763 16.676C12.8803 20.471 6.70834 20.432 2.88834 16.612C1.81371 15.542 1.00177 14.2375 0.516293 12.8008C0.0308133 11.3642 -0.114988 9.83453 0.0903395 8.33202C0.117259 8.13483 0.221409 7.95641 0.379877 7.83602C0.538345 7.71562 0.738151 7.6631 0.93534 7.69002C1.13253 7.71694 1.31095 7.82109 1.43134 7.97956C1.55174 8.13803 1.60426 8.33783 1.57734 8.53502C1.40302 9.80834 1.52642 11.1047 1.93782 12.3223C2.34923 13.5399 3.03744 14.6454 3.94834 15.552C7.19334 18.796 12.4163 18.815 15.6163 15.616C18.8153 12.416 18.7963 7.19302 15.5523 3.94802C12.3093 0.706021 7.08934 0.685022 3.88934 3.88002L4.63734 3.88302C4.73583 3.88348 4.83327 3.90334 4.92409 3.94145C5.0149 3.97957 5.09733 4.0352 5.16664 4.10517C5.23596 4.17514 5.29082 4.25807 5.32809 4.34924C5.36536 4.44041 5.3843 4.53803 5.38384 4.63652C5.38338 4.73501 5.36353 4.83245 5.32541 4.92327C5.28729 5.01409 5.23166 5.09651 5.16169 5.16583C5.09173 5.23515 5.00879 5.29 4.91762 5.32727C4.82645 5.36454 4.72883 5.38348 4.63034 5.38302L2.08434 5.37102C1.88664 5.36997 1.69735 5.2909 1.55765 5.15101C1.41795 5.01112 1.33913 4.82172 1.33834 4.62402L1.32534 2.08002C1.32481 1.98153 1.34369 1.8839 1.3809 1.7927C1.4181 1.70151 1.47291 1.61854 1.54218 1.54852C1.61145 1.4785 1.69384 1.42282 1.78463 1.38464C1.87542 1.34647 1.97285 1.32655 2.07134 1.32602C2.16983 1.3255 2.26746 1.34438 2.35866 1.38158C2.44985 1.41879 2.53283 1.47359 2.60284 1.54286C2.67286 1.61214 2.72854 1.69452 2.76672 1.78531C2.80489 1.87611 2.82481 1.97353 2.82534 2.07202L2.82934 2.81902ZM9.74934 4.99902C9.94825 4.99902 10.139 5.07804 10.2797 5.21869C10.4203 5.35934 10.4993 5.55011 10.4993 5.74902V9.43902L12.7803 11.719C12.852 11.7882 12.9092 11.8709 12.9485 11.9624C12.9879 12.0539 13.0086 12.1523 13.0095 12.2519C13.0104 12.3514 12.9915 12.4502 12.9538 12.5424C12.9162 12.6346 12.8605 12.7184 12.7901 12.7888C12.7198 12.8593 12.636 12.915 12.5439 12.9527C12.4517 12.9905 12.353 13.0095 12.2534 13.0087C12.1538 13.0079 12.0554 12.9872 11.9639 12.948C11.8723 12.9087 11.7896 12.8516 11.7203 12.78L9.00034 10.06V5.75002C9.00034 5.55111 9.07936 5.36034 9.22001 5.21969C9.36066 5.07904 9.55143 5.00002 9.75034 5.00002"
        fill="#000000"
      />
    </Svg>
  );
}

function AISendIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect width={32} height={32} rx={16} fill="#25262D" />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.40919 8.50749C8.29373 8.45895 8.16635 8.44622 8.04356 8.47096C7.92078 8.49569 7.80826 8.55675 7.72059 8.64621C7.63293 8.73567 7.57417 8.84941 7.55192 8.97267C7.52968 9.09593 7.54499 9.22303 7.59586 9.33749L10.1734 15.125H16.5C16.6658 15.125 16.8248 15.1908 16.942 15.308C17.0592 15.4253 17.125 15.5842 17.125 15.75C17.125 15.9157 17.0592 16.0747 16.942 16.1919C16.8248 16.3091 16.6658 16.375 16.5 16.375H10.1734L7.59586 22.1625C7.54499 22.2769 7.52968 22.404 7.55192 22.5273C7.57417 22.6506 7.63293 22.7643 7.72059 22.8538C7.80826 22.9432 7.92078 23.0043 8.04356 23.029C8.16635 23.0537 8.29373 23.041 8.40919 22.9925L24.2425 16.3258C24.3558 16.278 24.4524 16.1979 24.5204 16.0955C24.5883 15.9931 24.6245 15.8729 24.6245 15.75C24.6245 15.6271 24.5883 15.5069 24.5204 15.4045C24.4524 15.3021 24.3558 15.2219 24.2425 15.1742L8.40919 8.50749Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

type NegFeedbackReason =
  | "incorrect"
  | "incomplete"
  | "slow"
  | "tone"
  | "safety"
  | "other"
  | "none";

const NEG_FEEDBACK_PRIMARY_OPTIONS: {
  value: Exclude<NegFeedbackReason, "none">;
  label: string;
}[] = [
  { value: "incorrect", label: "არასწორი ინფორმაცია" },
  { value: "incomplete", label: "არასრული ინფორმაცია" },
  {
    value: "slow",
    label: "ნელი და შეცდომებიანი პასუხი",
  },
  { value: "tone", label: "სტილი ან/და ტონი" },
  {
    value: "safety",
    label: "უსაფრთხოების ან/და იურიდიული საკითხი",
  },
  { value: "other", label: "სხვა" },
];

const NEG_FEEDBACK_NONE_OPTION = {
  value: "none" as const,
  label: "არცერთი",
};

function negFeedbackLabelFor(value: NegFeedbackReason): string {
  if (value === "none") return NEG_FEEDBACK_NONE_OPTION.label;
  const row = NEG_FEEDBACK_PRIMARY_OPTIONS.find((o) => o.value === value);
  return row?.label ?? NEG_FEEDBACK_NONE_OPTION.label;
}

function mapUiProblemToApi(
  ui: NegFeedbackReason,
): AIMessageFeedbackProblem | undefined {
  if (ui === "none") return undefined;
  const m: Record<
    Exclude<NegFeedbackReason, "none">,
    AIMessageFeedbackProblem
  > = {
    incorrect: "incorrect",
    incomplete: "incomplete",
    slow: "hard_to_understand",
    tone: "other",
    safety: "unsafe",
    other: "other",
  };
  return m[ui];
}

function apiProblemToUi(
  p: AIMessageFeedbackProblem | null | undefined,
): NegFeedbackReason {
  if (!p) return "none";
  const rev: Record<AIMessageFeedbackProblem, NegFeedbackReason> = {
    incorrect: "incorrect",
    incomplete: "incomplete",
    hard_to_understand: "slow",
    unsafe: "safety",
    other: "other",
  };
  return rev[p] ?? "none";
}

const SUGGESTED_PROMPT_KEYS = [
  {
    id: "medcompass",
    key: "aiAssistant.prompt.medcompass",
    doctorKey: "aiAssistant.doctor.prompt.procedure",
  },
  {
    id: "healthCheck",
    key: "aiAssistant.prompt.healthCheck",
    doctorKey: "aiAssistant.doctor.prompt.drug",
  },
  {
    id: "disease",
    key: "aiAssistant.prompt.disease",
    doctorKey: "aiAssistant.doctor.prompt.disease",
  },
] as const;

interface SelectedImageType {
  uri: string;
  type?: string;
  name?: string;
  fileSize?: number;
}

export default function AIAssistantScreen() {
  const { user, userRole } = useAuth();
  const isDoctor = userRole === "doctor" || user?.role === "doctor";
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const suggestedPrompts = useMemo(
    () =>
      SUGGESTED_PROMPT_KEYS.map((prompt) => ({
        id: prompt.id,
        text: t(isDoctor ? prompt.doctorKey : prompt.key),
      })),
    [t, isDoctor],
  );
  const historyTitleLabel = useMemo(() => {
    const label = t("aiAssistant.history.title");
    if (label !== "aiAssistant.history.title") return label;
    return language === "en"
      ? "History"
      : language === "ru"
        ? "История"
        : "ისტორია";
  }, [t, language]);
  const historyEmptyLabel = useMemo(() => {
    const label = t("aiAssistant.history.empty");
    if (label !== "aiAssistant.history.empty") return label;
    return language === "en"
      ? "No chat history yet"
      : language === "ru"
        ? "История пуста"
        : "ისტორია ცარიელია";
  }, [t, language]);
  const [inputText, setInputText] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImageType | null>(
    null,
  );
  const [currentSession, setCurrentSession] = useState<AISession | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [sessionPreviews, setSessionPreviews] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamStatus, setStreamStatus] = useState<{
    state: string;
    query?: string;
  } | null>(null);
  const [pendingSend, setPendingSend] = useState<{
    content: string;
    imageUri?: string;
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [userMessageLikes, setUserMessageLikes] = useState<
    Record<string, boolean>
  >({});
  const [negFeedbackMessageId, setNegFeedbackMessageId] = useState<
    string | null
  >(null);
  const [negFeedbackProblem, setNegFeedbackProblem] =
    useState<NegFeedbackReason>("none");
  const [negFeedbackDetails, setNegFeedbackDetails] = useState("");
  const [negFeedbackPickerOpen, setNegFeedbackPickerOpen] = useState(false);
  const [isSubmittingNegFeedback, setIsSubmittingNegFeedback] = useState(false);
  const negFeedbackSubmittingRef = useRef(false);
  const [likeBusyById, setLikeBusyById] = useState<Record<string, boolean>>({});
  const likeBusyIdsRef = useRef<Set<string>>(new Set());
  const pendingLocalImageUriRef = useRef<string | null>(null);
  const pendingAttachmentsRef = useRef<
    | {
        filename: string;
        content_type: string;
        data: string;
      }[]
    | undefined
  >(undefined);
  const messageImagePreviewsRef = useRef<Record<string, string>>({});
  const paymentResultHandledRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [consentStatus, setConsentStatus] =
    useState<AIConsentStatus>("loading");
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [aiPlan, setAiPlan] = useState<AIPlan>("free");
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [selectedUpgradePlan, setSelectedUpgradePlan] =
    useState<Exclude<AIPlan, "free">>("standard");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [showCancelPlanModal, setShowCancelPlanModal] = useState(false);
  const [showInlineUpgradeCard, setShowInlineUpgradeCard] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<
    "success" | "failure" | "cancelSuccess" | null
  >(null);
  const modalTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const isChatEnabled = consentStatus === "accepted";
  const aiUsageLimit = AI_PLAN_LIMITS[aiPlan];
  const aiUsageRemaining = Math.max(aiUsageLimit - aiUsageCount, 0);
  const isAILimitReached = aiUsageRemaining <= 0;
  const activePlanLabel =
    aiPlan === "premium"
      ? language === "en"
        ? "Premium"
        : language === "ru"
          ? "Премиум"
          : "პრემიუმი"
      : aiPlan === "standard"
        ? language === "en"
          ? "Standard"
          : language === "ru"
            ? "Стандарт"
            : "სტანდარტი"
        : language === "en"
          ? "Free version"
          : language === "ru"
            ? "Бесплатная версия"
            : "უფასო ვერსია";
  const aiQuotaCopy =
    language === "en"
      ? {
          freeStrip: `You are using the free version — ${aiUsageRemaining} of ${aiUsageLimit} questions remaining.`,
          limitStrip: `Question limit reached — upgrade to continue.`,
          upgrade: "Upgrade",
          inlineHeading: "Laboratory analysis results review",
          inlineTitle: "AI Assistant",
          inlineFree: "Free version",
          inlineLimitTitle: "Free version limit reached",
          inlineLimitText: `You used all ${aiUsageLimit} questions. Upgrade for more questions.`,
          inlineBenefitsTitle: "AI assistant with more capabilities",
          inlineBenefits: [
            "Deeper analysis",
            "More capabilities",
            "Faster AI version",
          ],
        }
      : language === "ru"
        ? {
            freeStrip: `Вы используете бесплатную версию — осталось ${aiUsageRemaining} из ${aiUsageLimit} вопросов.`,
            limitStrip: `Лимит вопросов исчерпан — обновите версию, чтобы продолжить.`,
            upgrade: "Обновить",
            inlineHeading: "Обзор результатов лабораторного анализа",
            inlineTitle: "AI Ассистент",
            inlineFree: "Бесплатная версия",
            inlineLimitTitle: "Лимит бесплатной версии исчерпан",
            inlineLimitText: `Вы использовали все ${aiUsageLimit} вопросов. Обновите версию для большего количества вопросов.`,
            inlineBenefitsTitle: "AI ассистент с большими возможностями",
            inlineBenefits: [
              "Более глубокий анализ",
              "Больше возможностей",
              "Более быстрая AI версия",
            ],
          }
        : {
            freeStrip: `თქვენ იყენებთ უფასო ვერსიას — დარჩენილია ${aiUsageRemaining} კითხვა ${aiUsageLimit}-დან.`,
            limitStrip: `კითხვების ლიმიტი ამოწურულია — გასაგრძელებლად განაახლე ვერსია.`,
            upgrade: "განახლება",
            inlineHeading: "ლაბორატორიული ანალიზის შედეგების ჩვენება",
            inlineTitle: "AI ასისტენტი",
            inlineFree: "უფასო ვერსია",
            inlineLimitTitle: "უფასო ვერსიის ლიმიტი ამოწურულია",
            inlineLimitText: `თქვენ ამოწურეთ ${aiUsageLimit} კითხვა. მეტი კითხვებისთვის განაახლე ვერსია.`,
            inlineBenefitsTitle: "AI ასისტენტი მეტი შესაძლებლობებით",
            inlineBenefits: [
              "უფრო ღრმა ანალიზი",
              "მეტი შესაძლებლობა",
              "უფრო სწრაფი AI ვერსია",
            ],
          };
  const upgradeCopy =
    language === "en"
      ? {
          standard: "Standard",
          premium: "Premium",
          title: `Get AI Assistant ${selectedUpgradePlan === "premium" ? "Premium" : "Standard"}`,
          subtitle: "Ask health questions about any topic",
          featureHeader: "Feature",
          upgradeButton: `Upgrade for ${AI_PLAN_PRICES[selectedUpgradePlan]} GEL / month`,
          footnote:
            "Renews automatically every month. You can cancel anytime.",
          features: [
            "General health questions",
            "Information about symptoms",
            "Doctor prescriptions explained simply",
            "Simple summary of lab results",
            "Health history consideration",
            "Previous lab result comparison",
            "Question understanding monitoring",
            "Medical document summary",
          ],
          successTitle: "Package activated successfully",
          successText:
            "Your AI Assistant limit has been updated. You can continue sending questions.",
          failureTitle: "Package activation failed",
          failureText: "Try again or use another payment method.",
          cancelSuccessTitle: "Package cancellation requested",
          cancelSuccessText:
            "Your cancellation request has been received. The package will stay active until the end of the billing period.",
          resultButton: "Got it",
          cancelEyebrow: "Attention",
          activeStatus: "Package is active",
          paymentTitle: "Last payment",
          paymentAmount: `${AI_PLAN_PRICES[selectedUpgradePlan]} GEL`,
          paymentDate: "September 5, 2026",
          paymentHistory: "View payment history",
          cancelButton: "Cancel subscription",
          cancelTitle: "Cancel package",
          cancelText: "Are you sure you want to cancel this subscription?",
          cancelNo: "No",
          cancelYes: "Cancel",
        }
      : language === "ru"
        ? {
            standard: "Стандарт",
            premium: "Премиум",
            title: `Получите AI Ассистент ${selectedUpgradePlan === "premium" ? "Премиум" : "Стандарт"}`,
            subtitle: "Задавайте вопросы о здоровье на любую тему",
            featureHeader: "Функция",
            upgradeButton: `Обновить за ${AI_PLAN_PRICES[selectedUpgradePlan]} лари / месяц`,
            footnote:
              "Автоматически продлевается каждый месяц. Отменить можно в любое время.",
            features: [
              "Общие вопросы о здоровье",
              "Информация о симптомах",
              "Объяснение назначений врача простым языком",
              "Простое резюме лабораторных результатов",
              "Учет истории здоровья",
              "Сравнение предыдущих анализов",
              "Мониторинг понимания вопросов",
              "Резюме медицинских документов",
            ],
            successTitle: "Пакет успешно активирован",
            successText:
              "Лимит вашего AI Ассистента обновлен. Вы можете продолжить отправлять вопросы.",
            failureTitle: "Не удалось активировать пакет",
            failureText:
              "Попробуйте снова или используйте другой способ оплаты.",
            cancelSuccessTitle: "Запрос на отмену пакета принят",
            cancelSuccessText:
              "Ваш запрос на отмену получен. Пакет останется активным до конца платежного периода.",
            resultButton: "Понятно",
            cancelEyebrow: "Внимание",
            activeStatus: "Пакет активен",
            paymentTitle: "Последний платеж",
            paymentAmount: `${AI_PLAN_PRICES[selectedUpgradePlan]} лари`,
            paymentDate: "5 сентября, 2026",
            paymentHistory: "Посмотреть историю платежей",
            cancelButton: "Отменить подписку",
            cancelTitle: "Отмена пакета",
            cancelText: "Вы уверены, что хотите отменить эту подписку?",
            cancelNo: "Нет",
            cancelYes: "Отменить",
          }
        : {
            standard: "სტანდარტი",
            premium: "პრემიუმი",
            title: `მიიღე AI ასისტენტი ${selectedUpgradePlan === "premium" ? "პრემიუმი" : "სტანდარტი"}`,
            subtitle: "კითხვები ჯანმრთელობის შესახებ ნებისმიერ საკითხზე",
            featureHeader: "ფუნქცია",
            upgradeButton: `განახლება ${AI_PLAN_PRICES[selectedUpgradePlan]} ლარი / თვე`,
            footnote:
              "ავტომატურად განახლდება ყოველთვიურად. გაუქმება შეგიძლიათ ნებისმიერ დროს.",
            features: [
              "ზოგადი ჯანმრთელობის კითხვები",
              "სიმპტომების შესახებ ინფორმაცია",
              "ექიმის დანიშნულების ახსნა მარტივი ენით",
              "ანალიზის პასუხების მარტივი შეჯამება",
              "ჯანმრთელობის ისტორიის გათვალისწინება",
              "წინა ანალიზების შედარება",
              "შეკითხვების გაგების მონიტორინგი",
              "სამედიცინო დოკუმენტაციის შეჯამება",
            ],
            successTitle: "პაკეტი წარმატებით გააქტიურდა",
            successText:
              "თქვენი AI ასისტენტის ლიმიტი განახლდა. შეგიძლიათ გააგრძელოთ კითხვების გაგზავნა.",
            failureTitle: "პაკეტის გააქტიურება ვერ მოხერხდა",
            failureText: "სცადეთ თავიდან ან გამოიყენეთ სხვა გადახდის მეთოდი.",
            cancelSuccessTitle: "პაკეტის გაუქმება ჩაინიშნა",
            cancelSuccessText:
              "თქვენი გაუქმების მოთხოვნა მიღებულია. პაკეტი აქტიური დარჩება გადახდის პერიოდის დასრულებამდე.",
            resultButton: "გასაგებია",
            cancelEyebrow: "ყურადღება",
            activeStatus: "გამოწერა აქტიურია",
            paymentTitle: "შემდეგი გადახდა",
            paymentAmount: `${AI_PLAN_PRICES[selectedUpgradePlan]} ლარი`,
            paymentDate: "5 სექტემბერი, 2026",
            paymentHistory: "გადახდების ისტორიის ნახვა",
            cancelButton: "გამოწერის გაუქმება",
            cancelTitle: "პაკეტის გაუქმება",
            cancelText: "ნამდვილად გსურთ გამოწერის გაუქმება?",
            cancelNo: "არა",
            cancelYes: "გაუქმება",
          };
  const selectedUpgradePlanLabel =
    selectedUpgradePlan === "premium"
      ? upgradeCopy.premium
      : upgradeCopy.standard;

  const showEmptyState =
    !isLoading &&
    messages.length === 0 &&
    !isSending &&
    consentStatus !== "declined";
  const showUsageStrip =
    messages.length > 0 ||
    isSending ||
    Boolean(pendingSend) ||
    showInlineUpgradeCard ||
    isAILimitReached;

  const loadConsentStatus = useCallback(async () => {
    const record = await getAIConsent();
    if (!record) {
      setConsentStatus("pending");
      setShowConsentModal(true);
      return;
    }

    if (record.accepted) {
      setConsentStatus("accepted");
      setShowConsentModal(false);
      return;
    }

    setConsentStatus("declined");
    setShowConsentModal(false);
  }, []);

  useEffect(() => {
    void loadConsentStatus();
  }, [loadConsentStatus]);

  const syncAISubscription = useCallback(async () => {
    try {
      const subscription = await apiService.getAISubscription();
      setAiPlan(subscription.plan);
      setAiUsageCount(subscription.usageCount);
    } catch (error) {
      console.warn("⚠️ [AI subscription] Could not load subscription:", error);
    }
  }, []);

  useEffect(() => {
    if (user?.id) void syncAISubscription();
  }, [user?.id, syncAISubscription]);

  useEffect(() => {
    if (showUpgradeModal && aiPlan !== "free") {
      setSelectedUpgradePlan(aiPlan);
    }
  }, [aiPlan, showUpgradeModal]);

  const clearModalTransitionTimeout = useCallback(() => {
    if (modalTransitionTimeoutRef.current) {
      clearTimeout(modalTransitionTimeoutRef.current);
      modalTransitionTimeoutRef.current = null;
    }
  }, []);

  const openAfterUpgradeModalClose = useCallback(
    (action: () => void, delayMs = 450) => {
      clearModalTransitionTimeout();
      setShowUpgradeModal(false);
      modalTransitionTimeoutRef.current = setTimeout(() => {
        modalTransitionTimeoutRef.current = null;
        action();
      }, delayMs);
    },
    [clearModalTransitionTimeout],
  );

  useEffect(() => {
    return () => {
      clearModalTransitionTimeout();
    };
  }, [clearModalTransitionTimeout]);

  const handleUpgradePlan = useCallback(async () => {
    if (isCheckoutLoading) return;

    try {
      setIsCheckoutLoading(true);
      const checkout = await apiService.createAISubscriptionCheckout(
        selectedUpgradePlan,
      );

      if (!checkout?.paymentUrl) {
        throw new Error("Payment URL missing from checkout response");
      }

      paymentResultHandledRef.current = false;
      setShowInlineUpgradeCard(false);
      setPaymentUrl(checkout.paymentUrl);
      // iOS: closing one Modal and opening another in the same tick often hangs.
      openAfterUpgradeModalClose(() => {
        setShowPaymentWebView(true);
      });
    } catch (error: any) {
      console.error("❌ [AI subscription] Checkout failed:", error);
      openAfterUpgradeModalClose(() => {
        setPurchaseResult("failure");
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [isCheckoutLoading, openAfterUpgradeModalClose, selectedUpgradePlan]);

  const handleCancelPlan = useCallback(async () => {
    try {
      await apiService.cancelAISubscription();
      await syncAISubscription();
      setSelectedUpgradePlan("standard");
      setShowCancelPlanModal(false);
      setShowUpgradeModal(false);
      setTimeout(() => {
        setPurchaseResult("cancelSuccess");
      }, 350);
    } catch (error: any) {
      console.error("❌ [AI subscription] Cancellation failed:", error);
      setShowCancelPlanModal(false);
      setShowUpgradeModal(false);
      setTimeout(() => {
        setPurchaseResult("failure");
      }, 350);
    }
  }, [syncAISubscription]);

  const handlePaymentSuccess = useCallback(() => {
    if (paymentResultHandledRef.current) return;
    paymentResultHandledRef.current = true;
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    setTimeout(async () => {
      await syncAISubscription();
      setPurchaseResult("success");
    }, 1200);
  }, [syncAISubscription]);

  const handlePaymentFailure = useCallback(() => {
    if (paymentResultHandledRef.current) return;
    paymentResultHandledRef.current = true;
    setShowPaymentWebView(false);
    setPaymentUrl(null);
    setTimeout(() => {
      setPurchaseResult("failure");
    }, 350);
  }, []);

  const handleOpenPaymentHistory = useCallback(() => {
    openAfterUpgradeModalClose(() => {
      router.push("/screens/ai-payment-history");
    });
  }, [openAfterUpgradeModalClose]);

  const handleOpenCancelPlanModal = useCallback(() => {
    openAfterUpgradeModalClose(() => {
      setShowCancelPlanModal(true);
    }, 350);
  }, [openAfterUpgradeModalClose]);

  const closePurchaseResult = useCallback(() => {
    const role = user?.role || userRole;
    setPurchaseResult(null);
    if (role === "doctor") {
      router.replace("/(doctor-tabs)");
    } else {
      router.replace("/(tabs)");
    }
  }, [user?.role, userRole]);

  const handleAcceptConsent = useCallback(async () => {
    await saveAIConsent(true);
    setConsentStatus("accepted");
    setShowConsentModal(false);
  }, []);

  const handleDeclineConsent = useCallback(async () => {
    await saveAIConsent(false);
    setConsentStatus("declined");
    setShowConsentModal(false);
  }, []);

  const handleCopyMessage = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Toast.show({
        type: "info",
        text1: "დაკოპირდა",
        visibilityTime: 1800,
      });
    } catch {
      Alert.alert("შეცდომა", "ტექსტის კოპირება ვერ მოხერხდა");
    }
  }, []);

  const handleUserLikePress = useCallback((messageId: string) => {
    setUserMessageLikes((prev) => {
      const next = { ...prev };
      if (next[messageId]) {
        delete next[messageId];
      } else {
        next[messageId] = true;
      }
      return next;
    });
  }, []);

  const handleAssistantLikePress = useCallback(
    async (message: AIMessage) => {
      if (!currentSession?.id || message.role !== "assistant") return;
      if (likeBusyIdsRef.current.has(message.id)) return;
      likeBusyIdsRef.current.add(message.id);
      setLikeBusyById((b) => ({ ...b, [message.id]: true }));
      const sessionId = currentSession.id;
      const prevMessage = message;
      const isCurrentlyLike = message.feedback?.rating === "like";

      setMessages((prevList) =>
        prevList.map((m) =>
          m.id !== message.id
            ? m
            : isCurrentlyLike
              ? { ...m, feedback: null }
              : {
                  ...m,
                  feedback: {
                    rating: "like" as const,
                    problem: null,
                    details: null,
                    created_at:
                      m.feedback?.created_at ?? new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                },
        ),
      );

      try {
        if (isCurrentlyLike) {
          const { data } = await apiService.deleteAIMessageFeedback(
            sessionId,
            message.id,
          );
          setMessages((prevList) =>
            prevList.map((m) => (m.id === message.id ? data : m)),
          );
          Toast.show({
            type: "info",
            text1: "შეფასება მოხსნილია",
            visibilityTime: 1800,
          });
        } else {
          const { data } = await apiService.putAIMessageFeedback(
            sessionId,
            message.id,
            { rating: "like" },
          );
          setMessages((prevList) =>
            prevList.map((m) => (m.id === message.id ? data : m)),
          );
          Toast.show({
            type: "info",
            text1: "მადლობა უკუკავშილისთვის",
            visibilityTime: 1800,
          });
        }
      } catch (err: any) {
        setMessages((prevList) =>
          prevList.map((m) => (m.id === message.id ? prevMessage : m)),
        );
        Alert.alert(
          "შეცდომა",
          err?.message || "შეფასების შენახვა ვერ მოხერხდა",
        );
      } finally {
        likeBusyIdsRef.current.delete(message.id);
        setLikeBusyById((b) => {
          const next = { ...b };
          delete next[message.id];
          return next;
        });
      }
    },
    [currentSession?.id],
  );

  const handleLikePress = useCallback(
    (message: AIMessage) => {
      if (message.role === "assistant") {
        void handleAssistantLikePress(message);
      } else {
        handleUserLikePress(message.id);
      }
    },
    [handleAssistantLikePress, handleUserLikePress],
  );

  const closeNegFeedbackModal = useCallback(() => {
    Keyboard.dismiss();
    negFeedbackSubmittingRef.current = false;
    setIsSubmittingNegFeedback(false);
    setNegFeedbackMessageId(null);
    setNegFeedbackProblem("none");
    setNegFeedbackDetails("");
    setNegFeedbackPickerOpen(false);
  }, []);

  const openNegFeedbackModal = useCallback(
    (messageId: string) => {
      Keyboard.dismiss();
      const msg = messages.find((m) => m.id === messageId);
      if (msg?.feedback?.rating === "dislike") {
        setNegFeedbackProblem(apiProblemToUi(msg.feedback.problem));
        setNegFeedbackDetails(msg.feedback.details ?? "");
      } else {
        setNegFeedbackProblem("none");
        setNegFeedbackDetails("");
      }
      setNegFeedbackPickerOpen(false);
      setNegFeedbackMessageId(messageId);
    },
    [messages],
  );

  const submitNegFeedbackModal = useCallback(async () => {
    if (!negFeedbackMessageId || !currentSession?.id) return;
    if (negFeedbackSubmittingRef.current) return;
    negFeedbackSubmittingRef.current = true;
    setIsSubmittingNegFeedback(true);

    const messageId = negFeedbackMessageId;
    const sessionId = currentSession.id;
    const prevMessage = messages.find((m) => m.id === messageId);
    const apiProblem = mapUiProblemToApi(negFeedbackProblem);
    const detailsTrim = negFeedbackDetails.trim();

    const optimisticFeedback = {
      rating: "dislike" as const,
      problem: apiProblem ?? null,
      details: detailsTrim || null,
      created_at: prevMessage?.feedback?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (prevMessage) {
      setMessages((prevList) =>
        prevList.map((m) =>
          m.id === messageId ? { ...m, feedback: optimisticFeedback } : m,
        ),
      );
    }

    try {
      const { data } = await apiService.putAIMessageFeedback(
        sessionId,
        messageId,
        {
          rating: "dislike",
          ...(apiProblem ? { problem: apiProblem } : {}),
          ...(detailsTrim ? { details: detailsTrim } : {}),
        },
      );
      setMessages((prevList) =>
        prevList.map((m) => (m.id === messageId ? data : m)),
      );
      Toast.show({
        type: "info",
        text1: "მადლობა უკუკავშილისთვის",
        visibilityTime: 2200,
      });
      closeNegFeedbackModal();
    } catch (err: any) {
      if (prevMessage) {
        setMessages((prevList) =>
          prevList.map((m) => (m.id === messageId ? prevMessage : m)),
        );
      }
      Alert.alert("შეცდომა", err?.message || "შეფასების შენახვა ვერ მოხერხდა");
    } finally {
      negFeedbackSubmittingRef.current = false;
      setIsSubmittingNegFeedback(false);
    }
  }, [
    negFeedbackMessageId,
    currentSession?.id,
    messages,
    negFeedbackProblem,
    negFeedbackDetails,
    closeNegFeedbackModal,
  ]);

  useEffect(() => {
    if (!isSending) return;
    const t = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(t);
  }, [isSending]);

  const requestCameraPermission = () => ensureCameraAccess();

  const requestMediaLibraryPermission = () =>
    ensureMediaLibraryAccess({
      message: "სურათის არჩევისთვის საჭიროა გალერეის წვდომა.",
    });

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
    }
  };

  const handleOpenDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const mimeType =
        asset.mimeType ||
        (asset.name?.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "image/jpeg");

      if (!isSupportedAttachmentMime(mimeType, asset.name)) {
        Alert.alert(t("common.info"), t("aiAssistant.media.unsupportedFile"));
        return;
      }

      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert(
          t("identomat.error.title"),
          t("aiAssistant.media.fileTooLarge"),
        );
        return;
      }

      setSelectedImage({
        uri: asset.uri,
        type: mimeType,
        name: asset.name || `file_${Date.now()}`,
        fileSize: asset.size,
      });
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert(
        t("identomat.error.title"),
        t("aiAssistant.media.filePickFailed"),
      );
    }
  };

  const canSend = Boolean(inputText.trim() || selectedImage);

  // Reset only when leaving the screen — not on focus (camera/gallery would wipe attachments).
  useFocusEffect(
    useCallback(() => {
      void syncAISubscription();
      return () => {
        setMessages([]);
        setCurrentSession(null);
        setInputText("");
        setSelectedImage(null);
        pendingLocalImageUriRef.current = null;
        pendingAttachmentsRef.current = undefined;
        messageImagePreviewsRef.current = {};
      };
    }, [syncAISubscription]),
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
        console.log(
          "✅ [loadMessages] Messages loaded successfully:",
          messagesResponse.data.length,
        );
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
        const list = sessionsResponse.data;
        setSessions(list);
        console.log(
          "✅ [loadSessions] Sessions loaded successfully:",
          list.length,
        );

        const previewEntries = await Promise.all(
          list.map(async (session) => {
            const preview = await fetchSessionPreview(session.id);
            return [session.id, preview] as const;
          }),
        );
        setSessionPreviews(Object.fromEntries(previewEntries));
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

  // Handle send message with image (textOverride = when sent from suggested prompt)
  const handleSendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? inputText.trim()) || "";
    const imageToSend = selectedImage;
    if ((!content && !imageToSend) || isSending) return;
    if (!user?.id) return;
    if (!isChatEnabled) {
      setShowConsentModal(true);
      return;
    }
    if (isAILimitReached) {
      setShowInlineUpgradeCard(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return;
    }

    try {
      const quota = await apiService.consumeAIUsage();
      setAiPlan(quota.subscription.plan);
      setAiUsageCount(quota.subscription.usageCount);
      if (!quota.allowed) {
        setShowInlineUpgradeCard(true);
        return;
      }
    } catch (error) {
      console.error("❌ [AI subscription] Usage check failed:", error);
      Alert.alert("შეცდომა", "AI გამოწერის სტატუსის შემოწმება ვერ მოხერხდა");
      return;
    }

    let attachments:
      | {
          filename: string;
          content_type: string;
          data: string;
        }[]
      | undefined;
    let localImagePreviewUri: string | null = null;

    if (imageToSend) {
      try {
        const attachment = await buildHeraAttachmentFromUri({
          uri: imageToSend.uri,
          filename: imageToSend.name || "attachment",
          contentType: imageToSend.type || "image/jpeg",
          fileSize: imageToSend.fileSize,
        });
        attachments = [attachment];
        pendingAttachmentsRef.current = attachments;
        localImagePreviewUri =
          buildAttachmentPreviewUri(attachment) ??
          (isImageMimeType(imageToSend.type) ||
          isImageFilename(imageToSend.name)
            ? imageToSend.uri
            : null);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "FILE_TOO_LARGE") {
          Alert.alert(
            t("identomat.error.title"),
            t("aiAssistant.media.fileTooLarge"),
          );
        } else {
          Alert.alert(
            t("identomat.error.title"),
            t("aiAssistant.media.filePickFailed"),
          );
        }
        return;
      }
    }

    const messageContent =
      content ||
      (attachments?.length
        ? t("aiAssistant.media.analyzeAttachmentDefault")
        : "");

    const displayImageUri =
      imageToSend &&
      (isImageMimeType(imageToSend.type) || isImageFilename(imageToSend.name))
        ? imageToSend.uri
        : localImagePreviewUri;

    pendingLocalImageUriRef.current = displayImageUri;

    try {
      setIsSending(true);
      setStreamStatus(null);
      setPendingSend({
        content: messageContent,
        imageUri: displayImageUri ?? undefined,
      });

      // Create session if it doesn't exist (first message)
      let sessionToUse = currentSession;
      if (!sessionToUse) {
        console.log(
          "📝 [handleSendMessage] Creating new session for first message",
        );
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

      const sentAttachments = attachments ?? pendingAttachmentsRef.current;

      await apiService.sendAIMessageStream(
        sessionToUse.id,
        {
          content: messageContent,
          attachments: sentAttachments,
          image: imageToSend
            ? {
                uri: imageToSend.uri,
                type: imageToSend.type || "image/jpeg",
                name: imageToSend.name || `photo_${Date.now()}.jpg`,
              }
            : undefined,
        },
        {
          onUserMessage: (userMessage) => {
            setPendingSend(null);
            setInputText("");
            setSelectedImage(null);
            const localImageUri = pendingLocalImageUriRef.current;
            const mergedAttachments =
              userMessage.attachments ?? sentAttachments;
            const enrichedUserMessage: AIMessage = {
              ...userMessage,
              attachments: mergedAttachments,
              image_url:
                localImageUri ??
                resolveMessageImageUri({
                  ...userMessage,
                  attachments: mergedAttachments,
                }) ??
                userMessage.image_url,
            };
            if (enrichedUserMessage.image_url) {
              messageImagePreviewsRef.current[enrichedUserMessage.id] =
                enrichedUserMessage.image_url;
            }
            setMessages((prev) => [...prev, enrichedUserMessage]);
            const preview = getMessagePreviewText(enrichedUserMessage.content);
            if (preview) {
              setSessionPreviews((prev) => ({
                ...prev,
                [sessionToUse!.id]: prev[sessionToUse!.id] || preview,
              }));
            }
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 50);
          },
          onStatus: (status) => {
            setStreamStatus(status);
          },
          onAssistantDelta: (fullContent) => {
            setStreamStatus(null);
            setMessages((prev) => {
              const withoutStream = prev.filter(
                (m) => m.id !== STREAMING_ASSISTANT_ID,
              );
              const streamingMsg: AIMessage = {
                id: STREAMING_ASSISTANT_ID,
                session_id: sessionToUse!.id,
                role: "assistant",
                content: fullContent,
                created_at: new Date().toISOString(),
              };
              return [...withoutStream, streamingMsg];
            });
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 50);
          },
          onComplete: (data) => {
            setStreamStatus(null);
            const localImageUri = pendingLocalImageUriRef.current;
            const mergedAttachments =
              data.user_message.attachments ?? sentAttachments;
            const userMessage: AIMessage = {
              ...data.user_message,
              attachments: mergedAttachments,
              image_url:
                localImageUri ??
                messageImagePreviewsRef.current[data.user_message.id] ??
                resolveMessageImageUri({
                  ...data.user_message,
                  attachments: mergedAttachments,
                }) ??
                data.user_message.image_url,
            };
            if (userMessage.image_url) {
              messageImagePreviewsRef.current[userMessage.id] =
                userMessage.image_url;
            }
            pendingLocalImageUriRef.current = null;
            pendingAttachmentsRef.current = undefined;
            setMessages((prev) => {
              const withoutStream = prev.filter(
                (m) => m.id !== STREAMING_ASSISTANT_ID,
              );
              const withoutDupUser = withoutStream.filter(
                (m) => m.id !== userMessage.id,
              );
              return [...withoutDupUser, userMessage, data.assistant_message];
            });
            setInputText("");
            setSelectedImage(null);
            setPendingSend(null);
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          },
        },
      );
    } catch (error: any) {
      console.error("Send message error:", error);
      Alert.alert(
        "შეცდომა",
        error.message || "შეტყობინების გაგზავნა ვერ მოხერხდა",
      );
    } finally {
      setIsSending(false);
      setStreamStatus(null);
      setPendingSend(null);
    }
  };

  const handlePromptSelect = (
    promptText: string,
    action: "text" | "photo" = "text",
  ) => {
    if (!isChatEnabled) {
      setShowConsentModal(true);
      return;
    }
    if (action === "photo") {
      setShowMediaModal(true);
      return;
    }
    setInputText(promptText);
  };

  const handleSessionSelect = async (session: AISession) => {
    console.log("📋 [handleSessionSelect] Session selected:", session.id);
    setShowHistoryModal(false);
    setCurrentSession(session);

    // Save session ID to AsyncStorage
    await AsyncStorage.setItem("ai_session_id", session.id);

    // Load messages for this session
    await loadMessages(session.id);
  };

  const renderLimitUpgradeCard = (showClose: boolean) => (
    <View style={styles.inlineUpgradeBlock}>
      <Text style={styles.inlineUpgradeHeading}>
        {aiQuotaCopy.inlineHeading}
      </Text>
      <View style={styles.inlineUpgradeCard}>
        <View style={styles.inlineUpgradeHeader}>
          <View>
            <View style={styles.inlineUpgradeTitleRow}>
              <Text style={styles.inlineUpgradeTitle}>
                {aiQuotaCopy.inlineTitle}
              </Text>
              <View style={styles.inlineUpgradeBadge}>
                <Ionicons name="lock-closed" size={12} color="#EF4444" />
                <Text style={styles.inlineUpgradeBadgeText}>
                  {aiQuotaCopy.inlineFree}
                </Text>
              </View>
            </View>
          </View>
          {showClose ? (
            <TouchableOpacity
              onPress={() => setShowInlineUpgradeCard(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.inlineUpgradeWarning}>
          <View style={styles.inlineWarningIcon}>
            <Ionicons name="alert" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.inlineWarningCopy}>
            <Text style={styles.inlineWarningTitle}>
              {aiQuotaCopy.inlineLimitTitle}
            </Text>
            <Text style={styles.inlineWarningText}>
              {aiQuotaCopy.inlineLimitText}
            </Text>
          </View>
        </View>

        <View style={styles.inlineUpgradeBenefits}>
          <View style={styles.inlineBenefitsIconBox}>
            <AISparkleBadge />
          </View>
          <View style={styles.inlineBenefitsCopy}>
            <Text style={styles.inlineBenefitsTitle}>
              {aiQuotaCopy.inlineBenefitsTitle}
            </Text>
            {aiQuotaCopy.inlineBenefits.map((item) => (
              <View key={item} style={styles.inlineBenefitRow}>
                <Ionicons name="checkmark" size={14} color="#5B6CFF" />
                <Text style={styles.inlineBenefitText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.inlineUpgradeButton}
          activeOpacity={0.86}
          onPress={() => setShowUpgradeModal(true)}
        >
          <LinearGradient
            colors={["#6366F1", "#A855F7"]}
            start={{ x: 0.1, y: 0.2 }}
            end={{ x: 0.9, y: 0.8 }}
            style={styles.inlineUpgradeButtonGradient}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.inlineUpgradeButtonText}>
              {aiQuotaCopy.upgrade}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        enabled={negFeedbackMessageId === null}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <LinearGradient
              colors={["#6366F1", "#A855F7"]}
              start={{ x: 0.1, y: 0.2 }}
              end={{ x: 0.9, y: 0.8 }}
              style={styles.headerAvatar}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {t(isDoctor ? "aiAssistant.doctor.title" : "aiAssistant.title")}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t("aiAssistant.poweredBy")}
              </Text>
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
                      initiator_type:
                        user.role === "doctor" ? "doctor" : "customer",
                    });
                    if (sessionResponse.success) {
                      setCurrentSession(sessionResponse.data);
                      await AsyncStorage.setItem(
                        "ai_session_id",
                        sessionResponse.data.id,
                      );
                      setMessages([]);
                      setInputText("");
                      setSelectedImage(null);
                      console.log(
                        "✅ [headerNewChatButton] New session created:",
                        sessionResponse.data.id,
                      );
                    }
                  } catch (error) {
                    console.error(
                      "❌ [headerNewChatButton] Error creating session:",
                      error,
                    );
                    Alert.alert("შეცდომა", "ახალი სესიის შექმნა ვერ მოხერხდა");
                  }
                }
              }}
            >
              <AIHeaderNewChatIcon />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {
                if (!isChatEnabled) {
                  setShowConsentModal(true);
                  return;
                }
                setShowHistoryModal((open) => !open);
              }}
            >
              <AIHeaderHistoryIcon />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showUsageStrip ? (
            <View
              style={[
                styles.usageCard,
                isAILimitReached ? styles.usageCardLocked : null,
              ]}
            >
              <AIQuotaRing label={`${aiUsageRemaining}/${aiUsageLimit}`} />
              <View style={styles.usageTextWrap}>
                <Text
                  style={[
                    styles.usageSubtitle,
                    isAILimitReached ? styles.usageSubtitleLocked : null,
                  ]}
                  numberOfLines={3}
                  adjustsFontSizeToFit
                  minimumFontScale={0.9}
                >
                  {isAILimitReached
                    ? aiQuotaCopy.limitStrip
                    : aiQuotaCopy.freeStrip}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upgradePill}
                activeOpacity={0.86}
                onPress={() => setShowUpgradeModal(true)}
              >
                <LinearGradient
                  colors={["#6366F1", "#A855F7"]}
                  start={{ x: 0.1, y: 0.2 }}
                  end={{ x: 0.9, y: 0.8 }}
                  style={styles.upgradePillGradient}
                >
                  <Ionicons name="flash" size={16} color="#FFFFFF" />
                  <Text style={styles.upgradePillText}>
                    {aiQuotaCopy.upgrade}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null}

          {isAILimitReached && messages.length === 0 && !isSending
            ? renderLimitUpgradeCard(false)
            : null}

          {/* Empty state hero */}
          {showEmptyState && !isAILimitReached ? (
            <>
              <TouchableOpacity
                style={styles.emptyPlanBadge}
                activeOpacity={0.82}
                onPress={() => setShowUpgradeModal(true)}
              >
                <AIPlanBadgeIcon premium={aiPlan === "premium"} />
                <Text
                  style={styles.emptyPlanBadgeText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {activePlanLabel}
                </Text>
              </TouchableOpacity>
              <View style={styles.bannerContainer}>
                <AIAssistantBannerGraphic width={200} height={200} />
                <Text style={styles.bannerTitle}>
                  {t(
                    isDoctor ? "aiAssistant.doctor.title" : "aiAssistant.title",
                  )}
                </Text>
                <Text style={styles.bannerDescription}>
                  {t(
                    isDoctor
                      ? "aiAssistant.doctor.bannerDescription"
                      : "aiAssistant.bannerDescription",
                  )}
                </Text>
              </View>
            </>
          ) : null}

          {/* Messages */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>სესიის ინიციალიზაცია...</Text>
            </View>
          ) : messages.length > 0 || isSending ? (
            <View style={styles.messagesContainer}>
              {messages.map((message) => {
                const isUserBubble = message.role === "user";
                const isStreamingAssistant =
                  message.id === STREAMING_ASSISTANT_ID;
                const messageImageUri =
                  resolveMessageImageUri(message) ??
                  messageImagePreviewsRef.current[message.id];
                const messageActionIdle = isUserBubble
                  ? "rgba(255,255,255,0.85)"
                  : "#575759";
                const messageActionActive = isUserBubble
                  ? "#FFFFFF"
                  : "#6366F1";
                const copyClipId = `ma-copy-${message.id}`;

                return (
                  <View key={message.id}>
                    <View
                      style={[
                        styles.messageBubble,
                        message.role === "user"
                          ? styles.userMessage
                          : styles.assistantMessage,
                        messageImageUri ? styles.messageBubbleWithImage : null,
                      ]}
                    >
                      {messageImageUri ? (
                        <Image
                          source={{ uri: messageImageUri }}
                          style={styles.messageImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : null}
                      {Boolean(message.content?.trim()) ? (
                        <Text
                          style={[
                            styles.messageText,
                            message.role === "user"
                              ? styles.userMessageText
                              : styles.assistantMessageText,
                          ]}
                        >
                          {message.content}
                        </Text>
                      ) : null}
                      {Boolean(message.content?.trim()) &&
                        !isStreamingAssistant && (
                          <View style={styles.messageActionsRow}>
                            <TouchableOpacity
                              style={styles.messageActionButton}
                              onPress={() => handleCopyMessage(message.content)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel="კოპირება"
                            >
                              <MessageCopyIcon
                                size={22}
                                color={messageActionIdle}
                                clipId={copyClipId}
                              />
                            </TouchableOpacity>
                            {message.role === "assistant" ? (
                              <TouchableOpacity
                                style={styles.messageActionButton}
                                onPress={() => {
                                  handleLikePress(message);
                                }}
                                disabled={!!likeBusyById[message.id]}
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                                accessibilityLabel="მოწონება"
                              >
                                <MessageLikeIcon
                                  size={22}
                                  color={
                                    message.feedback?.rating === "like"
                                      ? messageActionActive
                                      : messageActionIdle
                                  }
                                />
                              </TouchableOpacity>
                            ) : null}
                            {message.role === "assistant" ? (
                              <TouchableOpacity
                                style={styles.messageActionButton}
                                onPress={() => openNegFeedbackModal(message.id)}
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                                accessibilityLabel="არ მომწონს"
                              >
                                <MessageDislikeIcon
                                  size={22}
                                  color={
                                    message.feedback?.rating === "dislike" ||
                                    negFeedbackMessageId === message.id
                                      ? messageActionActive
                                      : messageActionIdle
                                  }
                                />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        )}
                      <Text style={styles.messageTime}>
                        {new Date(message.created_at).toLocaleTimeString(
                          "ka-GE",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    </View>

                    {/* Doctor Recommendations from AI Response */}
                    {message.role === "assistant" &&
                      message.metadata?.doctors &&
                      message.metadata.doctors.length > 0 && (
                        <View style={styles.doctorRecommendationsContainer}>
                          {message.metadata.doctors.map(
                            (doctor: any, index: number) => (
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
                                    contentFit="cover"
                                  />
                                )}
                                <View style={styles.doctorRecommendationInfo}>
                                  <Text style={styles.doctorRecommendationName}>
                                    {getDoctorDisplayName(
                                      doctor,
                                      language,
                                      "ექიმი",
                                    )}
                                  </Text>
                                  {doctor.specialization && (
                                    <Text
                                      style={
                                        styles.doctorRecommendationSpecialty
                                      }
                                    >
                                      {doctor.specialization}
                                    </Text>
                                  )}
                                  {doctor.rating && (
                                    <View
                                      style={styles.doctorRecommendationRating}
                                    >
                                      <Ionicons
                                        name="star"
                                        size={14}
                                        color="#F59E0B"
                                      />
                                      <Text
                                        style={
                                          styles.doctorRecommendationRatingText
                                        }
                                      >
                                        {doctor.rating}
                                        {doctor.reviewCount &&
                                          ` (${doctor.reviewCount})`}
                                      </Text>
                                    </View>
                                  )}
                                  {doctor.consultationFee && (
                                    <Text
                                      style={styles.doctorRecommendationFee}
                                    >
                                      {doctor.consultationFee}
                                    </Text>
                                  )}
                                </View>
                                <TouchableOpacity
                                  style={styles.doctorRecommendationButton}
                                  onPress={() => {
                                    if (doctor.id) {
                                      router.push({
                                        pathname:
                                          "/screens/doctors/doctor/[id]",
                                        params: { id: doctor.id },
                                      });
                                    }
                                  }}
                                >
                                  <Text
                                    style={
                                      styles.doctorRecommendationButtonText
                                    }
                                  >
                                    ჩაეწერე
                                  </Text>
                                </TouchableOpacity>
                              </TouchableOpacity>
                            ),
                          )}
                        </View>
                      )}

                    {message.role === "assistant" &&
                      message.metadata?.sources &&
                      message.metadata.sources.length > 0 && (
                        <AIMessageSources sources={message.metadata.sources} />
                      )}
                  </View>
                );
              })}

              {pendingSend && (
                <View key="pending-user-out">
                  <View style={[styles.messageBubble, styles.userMessage]}>
                    {pendingSend.imageUri ? (
                      <Image
                        source={{ uri: pendingSend.imageUri }}
                        style={styles.messageImage}
                        contentFit="cover"
                      />
                    ) : null}
                    {pendingSend.content.trim() ? (
                      <Text
                        style={[styles.messageText, styles.userMessageText]}
                      >
                        {pendingSend.content}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

              {isSending &&
              !messages.some((m) => m.id === STREAMING_ASSISTANT_ID) ? (
                <View
                  style={[
                    styles.messageBubble,
                    styles.assistantMessage,
                    styles.assistantTypingBubble,
                  ]}
                >
                  <Text
                    style={[styles.messageText, styles.assistantTypingTitle]}
                  >
                    {streamStatus
                      ? streamStatusLabel(streamStatus, t)
                      : "დამელოდე ⌛"}
                  </Text>
                  <Text
                    style={[styles.messageText, styles.assistantTypingSubtitle]}
                  >
                    {streamStatus?.query
                      ? streamStatus.query
                      : streamStatus
                        ? t("aiAssistant.stream.thinking")
                        : "სრული პასუხისთვის დრო მჭირდება - რამდენიმე წამში გიპასუხებ."}
                  </Text>
                  <MessageTypingDots />
                </View>
              ) : null}

              {showInlineUpgradeCard || isAILimitReached
                ? renderLimitUpgradeCard(true)
                : null}
            </View>
          ) : consentStatus === "declined" ? (
            <View style={styles.consentDeclinedContainer}>
              <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" />
              <Text style={styles.consentDeclinedTitle}>
                {t("aiAssistant.consent.declinedTitle")}
              </Text>
              <TouchableOpacity
                style={styles.consentReviewButton}
                onPress={() => setShowConsentModal(true)}
              >
                <Text style={styles.consentReviewButtonText}>
                  {t("aiAssistant.consent.review")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : showEmptyState ? (
            <View style={styles.promptsSection}>
              <View style={styles.promptsContainer}>
                {suggestedPrompts.map((prompt) => (
                  <TouchableOpacity
                    key={prompt.id}
                    style={styles.promptCard}
                    activeOpacity={0.7}
                    onPress={() => handlePromptSelect(prompt.text)}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={24}
                      color="#1F2937"
                      style={styles.promptIcon}
                    />
                    <Text style={styles.promptText}>{prompt.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {negFeedbackMessageId === null && isChatEnabled ? (
          <View
            style={[
              styles.inputSection,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowMediaModal(true)}
              >
                <Ionicons name="add" size={24} color="#1F2937" />
              </TouchableOpacity>
              <View style={styles.inputPill}>
                {selectedImage ? (
                  <View style={styles.inputImagePreview}>
                    <Image
                      source={{ uri: selectedImage.uri }}
                      style={styles.inputPreviewImage}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.inputRemoveImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TextInput
                  style={[
                    styles.inputPillText,
                    selectedImage && styles.inputWithImage,
                  ]}
                  placeholder={t(
                    isDoctor
                      ? "aiAssistant.doctor.inputPlaceholder"
                      : "aiAssistant.inputPlaceholder",
                  )}
                  placeholderTextColor="rgba(0, 0, 0, 0.3)"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
                <View style={styles.inputPillActions}>
                  {canSend ? (
                    <TouchableOpacity
                      style={styles.sendButton}
                      disabled={isSending}
                      onPress={() => handleSendMessage()}
                    >
                      {isSending ? (
                        <View style={styles.sendButtonLoading}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      ) : (
                        <AISendIcon />
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <AIConsentModal
        visible={showConsentModal}
        onAccept={handleAcceptConsent}
        onDecline={handleDeclineConsent}
      />

      {/* History popover */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.historyPopoverOverlay}
            onPress={() => setShowHistoryModal(false)}
          />
          <View style={styles.historyPopoverAnchor} pointerEvents="box-none">
            <View style={styles.historyPopoverCard}>
              <View style={styles.historyPopoverHeader}>
                <AIHeaderHistoryIcon size={16} />
                <Text style={styles.historyPopoverTitle}>
                  {historyTitleLabel}
                </Text>
              </View>

              <ScrollView
                style={styles.historyPopoverList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {isLoadingHistory ? (
                  <View style={styles.historyPopoverLoading}>
                    <ActivityIndicator size="small" color="#6366F1" />
                  </View>
                ) : sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.historyPopoverPill}
                      activeOpacity={0.75}
                      onPress={() => handleSessionSelect(session)}
                    >
                      <Text
                        style={styles.historyPopoverPillText}
                        numberOfLines={2}
                      >
                        {sessionPreviews[session.id]?.trim() ||
                          t("aiAssistant.history.untitled")}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.historyPopoverPill}>
                    <Text style={styles.historyPopoverPillText}>
                      {historyEmptyLabel}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Media Selection Modal */}
      <Modal
        visible={showMediaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMediaModal(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.mediaModalOverlay}
            onPress={() => setShowMediaModal(false)}
          />
          <View
            style={[
              styles.mediaModalAnchor,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
            pointerEvents="box-none"
          >
            <View
              style={styles.mediaModalCard}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.mediaModalGlassContent}>
                <View style={styles.mediaModalTopSection}>
                  <View style={styles.mediaModalHeaderRow}>
                    <LinearGradient
                      colors={["#6366F1", "#A855F7"]}
                      start={{ x: 0.1, y: 0.2 }}
                      end={{ x: 0.9, y: 0.8 }}
                      style={styles.mediaModalAvatar}
                    >
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    </LinearGradient>
                    <View>
                      <Text style={styles.mediaModalTitle}>
                        {t("aiAssistant.headerTitle")}
                      </Text>
                      <Text style={styles.mediaModalSubtitle}>
                        {t("aiAssistant.poweredBy")}
                      </Text>
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.mediaTilesRow}
                  >
                    <TouchableOpacity
                      style={styles.mediaTile}
                      activeOpacity={0.75}
                      onPress={handleOpenCamera}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={24}
                        color="#000000"
                      />
                      <Text style={styles.mediaTileLabel}>
                        {t("aiAssistant.media.camera")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.mediaTile}
                      activeOpacity={0.75}
                      onPress={handleOpenPhotos}
                    >
                      <Ionicons
                        name="image-outline"
                        size={24}
                        color="#000000"
                      />
                      <Text style={styles.mediaTileLabel}>
                        {t("aiAssistant.media.photos")}
                      </Text>
                    </TouchableOpacity>

                    {selectedImage ? (
                      <View style={styles.mediaSelectedTile}>
                        {isImageMimeType(selectedImage.type) ? (
                          <Image
                            source={{ uri: selectedImage.uri }}
                            style={styles.mediaSelectedImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.mediaSelectedFile}>
                            <Ionicons
                              name="document-text-outline"
                              size={28}
                              color="#1F2937"
                            />
                            <Text
                              style={styles.mediaSelectedFileName}
                              numberOfLines={2}
                            >
                              {selectedImage.name}
                            </Text>
                          </View>
                        )}
                        <View style={styles.mediaSelectedBadge}>
                          <Text style={styles.mediaSelectedBadgeText}>1</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.mediaRemoveSelectedButton}
                          onPress={() => setSelectedImage(null)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close" size={14} color="#1F2937" />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </ScrollView>
                </View>

                <View style={styles.mediaModalDivider} />

                <TouchableOpacity
                  style={styles.mediaFilesRow}
                  activeOpacity={0.75}
                  onPress={handleOpenDocuments}
                >
                  <Ionicons name="attach-outline" size={24} color="#1F2937" />
                  <View style={styles.mediaFilesTextWrap}>
                    <Text style={styles.mediaFilesTitle}>
                      {t("aiAssistant.media.addFiles")}
                    </Text>
                    <Text style={styles.mediaFilesSubtitle}>
                      {t("aiAssistant.media.addFilesHint")}
                    </Text>
                  </View>
                </TouchableOpacity>

                {selectedImage ? (
                  <TouchableOpacity
                    style={styles.mediaConfirmButton}
                    activeOpacity={0.85}
                    onPress={handleAddPhoto}
                  >
                    <Text style={styles.mediaConfirmButtonText}>
                      {t(
                        isImageMimeType(selectedImage?.type)
                          ? "aiAssistant.media.addPhotoOne"
                          : "aiAssistant.media.addFileOne",
                      )}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentWebView}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowPaymentWebView(false);
          setPaymentUrl(null);
          void syncAISubscription();
        }}
      >
        <View
          style={[
            styles.paymentWebViewRoot,
            { paddingTop: Platform.OS === "ios" ? insets.top + 12 : 0 },
          ]}
        >
          <View style={styles.paymentWebViewHeader}>
            <Text style={styles.paymentWebViewTitle}>BOG გადახდა</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPaymentWebView(false);
                setPaymentUrl(null);
                void syncAISubscription();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
          {paymentUrl ? (
            <WebView
              source={{ uri: paymentUrl }}
              style={styles.paymentWebView}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              originWhitelist={["*"]}
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={() => true}
              onNavigationStateChange={(state) => {
                const url = state.url.toLowerCase();
                if (url.includes("/payment/success") || url.includes("success")) {
                  handlePaymentSuccess();
                  return;
                }
                if (url.includes("/payment/fail") || url.includes("fail")) {
                  handlePaymentFailure();
                }
              }}
              onError={() => {
                setShowPaymentWebView(false);
                setPaymentUrl(null);
                setTimeout(() => setPurchaseResult("failure"), 350);
              }}
              renderLoading={() => (
                <View style={styles.paymentWebViewLoading}>
                  <ActivityIndicator size="large" color="#6366F1" />
                  <Text style={styles.paymentWebViewLoadingText}>
                    გადახდის გვერდი იტვირთება...
                  </Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.upgradeModalRoot}>
          <Pressable
            style={styles.upgradeBackdrop}
            onPress={() => setShowUpgradeModal(false)}
          />
          <View
            style={[
              styles.upgradeSheet,
              { paddingBottom: Math.max(insets.bottom + 16, 28) },
            ]}
          >
            <View style={styles.upgradeHeader}>
              <View style={styles.upgradeLogo}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </View>
              <TouchableOpacity
                onPress={() => setShowUpgradeModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {aiPlan === "free" ? (
              <>
                <Text style={styles.upgradeTitle}>{upgradeCopy.title}</Text>
                <Text style={styles.upgradeSubtitle}>
                  {upgradeCopy.subtitle}
                </Text>
              </>
            ) : null}

            <View style={styles.planTabs}>
              {(["standard", "premium"] as const).map((plan) => (
                <TouchableOpacity
                  key={plan}
                  style={[
                    styles.planTab,
                    selectedUpgradePlan === plan ? styles.planTabActive : null,
                  ]}
                  onPress={() => setSelectedUpgradePlan(plan)}
                  activeOpacity={0.82}
                >
                  <Text
                    style={[
                      styles.planTabText,
                      selectedUpgradePlan === plan
                        ? styles.planTabTextActive
                        : null,
                    ]}
                  >
                    {plan === "premium"
                      ? upgradeCopy.premium
                      : upgradeCopy.standard}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {aiPlan !== "free" ? (
              <View style={styles.activePlanStatus}>
                <View style={styles.activePlanDot} />
                <Text style={styles.activePlanStatusText}>
                  {upgradeCopy.activeStatus}
                </Text>
              </View>
            ) : null}

            <View style={styles.featuresCard}>
              <View style={styles.featuresHeader}>
                <Text style={styles.featuresHeaderText}>
                  {upgradeCopy.featureHeader}
                </Text>
                <Text style={styles.featuresHeaderText}>
                  {selectedUpgradePlanLabel}
                </Text>
              </View>
              {upgradeCopy.features.map((feature, index) => {
                const enabled =
                  selectedUpgradePlan === "premium" || index < 3;
                return (
                  <View key={feature} style={styles.featureRow}>
                    <Text style={styles.featureText}>{feature}</Text>
                    <Ionicons
                      name={enabled ? "checkmark" : "close"}
                      size={22}
                      color={enabled ? "#7775FF" : "#A3A3A3"}
                    />
                  </View>
                );
              })}
            </View>

            {aiPlan !== "free" ? (
              <>
                <View style={styles.paymentCard}>
                  <View>
                    <Text style={styles.paymentTitle}>
                      {upgradeCopy.paymentTitle}
                    </Text>
                    <Text style={styles.paymentDate}>
                      {upgradeCopy.paymentDate}
                    </Text>
                  </View>
                  <Text style={styles.paymentPrice}>
                    {upgradeCopy.paymentAmount}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.paymentHistoryRow}
                  activeOpacity={0.75}
                  onPress={handleOpenPaymentHistory}
                >
                  <Ionicons name="time-outline" size={16} color="#6D64F2" />
                  <Text style={styles.paymentHistoryText}>
                    {upgradeCopy.paymentHistory}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelSubscriptionButton}
                  activeOpacity={0.86}
                  onPress={handleOpenCancelPlanModal}
                >
                  <Text style={styles.cancelSubscriptionButtonText}>
                    {upgradeCopy.cancelButton}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  isCheckoutLoading ? { opacity: 0.72 } : null,
                ]}
                activeOpacity={0.88}
                disabled={isCheckoutLoading}
                onPress={handleUpgradePlan}
              >
                <LinearGradient
                  colors={["#6366F1", "#A855F7"]}
                  start={{ x: 0.1, y: 0.2 }}
                  end={{ x: 0.9, y: 0.8 }}
                  style={styles.upgradeButtonGradient}
                  pointerEvents="none"
                >
                  {isCheckoutLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.upgradeButtonText}>
                    {isCheckoutLoading
                      ? language === "en"
                        ? "Opening payment..."
                        : language === "ru"
                          ? "Открываем оплату..."
                          : "გადახდა იხსნება..."
                      : upgradeCopy.upgradeButton}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <Text style={styles.upgradeFootnote}>{upgradeCopy.footnote}</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCancelPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelPlanModal(false)}
      >
        <View style={styles.purchaseResultRoot}>
          <Pressable
            style={styles.upgradeBackdrop}
            onPress={() => setShowCancelPlanModal(false)}
          />
          <View style={styles.cancelPlanCard}>
            <View style={styles.cancelPlanHandle} />
            <TouchableOpacity
              style={styles.purchaseResultClose}
              onPress={() => setShowCancelPlanModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.cancelPlanEyebrow}>
              {upgradeCopy.cancelEyebrow}
            </Text>
            <Text style={styles.cancelPlanTitle}>{upgradeCopy.cancelTitle}</Text>
            <Text style={styles.cancelPlanText}>{upgradeCopy.cancelText}</Text>
            <View style={styles.cancelPlanActions}>
              <TouchableOpacity
                style={styles.cancelPlanPrimaryButton}
                activeOpacity={0.86}
                onPress={() => setShowCancelPlanModal(false)}
              >
                <Text style={styles.cancelPlanPrimaryText}>
                  {upgradeCopy.cancelNo}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelPlanSecondaryButton}
                activeOpacity={0.86}
                onPress={handleCancelPlan}
              >
                <Text style={styles.cancelPlanSecondaryText}>
                  {upgradeCopy.cancelYes}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={purchaseResult !== null}
        transparent
        animationType="fade"
        onRequestClose={closePurchaseResult}
      >
        <View style={styles.purchaseResultRoot}>
          <View style={styles.purchaseResultCard}>
            <TouchableOpacity
              style={styles.purchaseResultClose}
              onPress={closePurchaseResult}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
            <View
              style={[
                styles.purchaseResultIcon,
                purchaseResult === "failure"
                  ? styles.purchaseResultIconFailure
                  : null,
              ]}
            >
              <Ionicons
                name={purchaseResult === "failure" ? "close" : "checkmark"}
                size={34}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.purchaseResultTitle}>
              {purchaseResult === "failure"
                ? upgradeCopy.failureTitle
                : purchaseResult === "cancelSuccess"
                  ? upgradeCopy.cancelSuccessTitle
                  : upgradeCopy.successTitle}
            </Text>
            <Text style={styles.purchaseResultText}>
              {purchaseResult === "failure"
                ? upgradeCopy.failureText
                : purchaseResult === "cancelSuccess"
                  ? upgradeCopy.cancelSuccessText
                  : upgradeCopy.successText}
            </Text>
            <TouchableOpacity
              style={styles.purchaseResultButton}
              onPress={closePurchaseResult}
              activeOpacity={0.86}
            >
              <Text style={styles.purchaseResultButtonText}>
                {upgradeCopy.resultButton}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* უარყოფითი უკუკავშირი (დისლაიქი) */}
      <Modal
        visible={negFeedbackMessageId !== null}
        transparent
        animationType="slide"
        onRequestClose={closeNegFeedbackModal}
      >
        <KeyboardAvoidingView
          style={styles.negFeedbackKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? Math.max(insets.top, 12) : 0
          }
        >
          <View style={styles.negFeedbackModalBody}>
            <Pressable
              style={styles.negFeedbackBackdrop}
              onPress={closeNegFeedbackModal}
            />
            <View
              style={[
                styles.negFeedbackSheet,
                { paddingBottom: insets.bottom + 16 },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.negFeedbackHeader}>
                <Text style={styles.negFeedbackHeaderTitle}>უკუკავშირი</Text>
                <TouchableOpacity
                  onPress={closeNegFeedbackModal}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="დახურვა"
                >
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.negFeedbackScroll}
              >
                <Text style={styles.negFeedbackQuestion}>
                  რა შეიძლება უკეთესი ყოფილიყო?
                </Text>

                <TouchableOpacity
                  style={styles.negFeedbackProblemRow}
                  onPress={() => setNegFeedbackPickerOpen((open) => !open)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.negFeedbackProblemLabel}>პრობლემა</Text>
                  <View style={styles.negFeedbackProblemValueWrap}>
                    <Text
                      style={styles.negFeedbackProblemValue}
                      numberOfLines={1}
                    >
                      {negFeedbackLabelFor(negFeedbackProblem)}
                    </Text>
                    <Ionicons name="swap-vertical" size={18} color="#6B7280" />
                  </View>
                </TouchableOpacity>

                {negFeedbackPickerOpen ? (
                  <View style={styles.negFeedbackOptionsBox}>
                    <ScrollView
                      style={styles.negFeedbackOptionsScroll}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {NEG_FEEDBACK_PRIMARY_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={styles.negFeedbackOptionRow}
                          onPress={() => {
                            setNegFeedbackProblem(opt.value);
                            setNegFeedbackPickerOpen(false);
                          }}
                        >
                          <Text style={styles.negFeedbackOptionLabel}>
                            {opt.label}
                          </Text>
                          {negFeedbackProblem === opt.value ? (
                            <Ionicons
                              name="checkmark"
                              size={22}
                              color="#6366F1"
                            />
                          ) : (
                            <View style={styles.negFeedbackOptionCheckSpacer} />
                          )}
                        </TouchableOpacity>
                      ))}
                      <View style={styles.negFeedbackOptionSeparator} />
                      <TouchableOpacity
                        style={styles.negFeedbackOptionRow}
                        onPress={() => {
                          setNegFeedbackProblem("none");
                          setNegFeedbackPickerOpen(false);
                        }}
                      >
                        <Text style={styles.negFeedbackOptionLabel}>
                          {NEG_FEEDBACK_NONE_OPTION.label}
                        </Text>
                        {negFeedbackProblem === "none" ? (
                          <Ionicons
                            name="checkmark"
                            size={22}
                            color="#6366F1"
                          />
                        ) : (
                          <View style={styles.negFeedbackOptionCheckSpacer} />
                        )}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                ) : null}

                <View style={styles.negFeedbackTextAreaWrap}>
                  <TextInput
                    style={styles.negFeedbackTextArea}
                    placeholder="გაგვიზიარე დეტალები (ნებაყოფლობითი)"
                    placeholderTextColor="#9CA3AF"
                    value={negFeedbackDetails}
                    onChangeText={setNegFeedbackDetails}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                  />
                  <Text style={styles.negFeedbackCharCount}>
                    {negFeedbackDetails.length} / 2000
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.negFeedbackSubmitButton,
                  isSubmittingNegFeedback &&
                    styles.negFeedbackSubmitButtonDisabled,
                ]}
                onPress={() => {
                  void submitNegFeedbackModal();
                }}
                disabled={isSubmittingNegFeedback}
                activeOpacity={0.88}
              >
                {isSubmittingNegFeedback ? (
                  <ActivityIndicator size="small" color="#4338CA" />
                ) : (
                  <Text style={styles.negFeedbackSubmitText}>გაგზავნა</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AI_SCREEN_BG,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AI_SCREEN_BG,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(31, 41, 55, 0.1)",
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 4,
    gap: 6,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    opacity: 0.6,
    lineHeight: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyPlanBadge: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginRight: 16,
    marginBottom: 4,
    height: 26,
    maxWidth: 104,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#6D64F2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  planBadgeIconWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPlanBadgeText: {
    flexShrink: 1,
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#6D64F2",
    lineHeight: 14,
  },
  headerIconButton: {
    padding: 0,
  },
  sendButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonLoading: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#25262D",
    alignItems: "center",
    justifyContent: "center",
  },
  historyButtonContainer: {
    position: "relative",
  },
  historyPopoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  historyPopoverAnchor: {
    position: "absolute",
    top: Platform.OS === "ios" ? 96 : 72,
    right: 16,
    left: 16,
    alignItems: "flex-end",
  },
  historyPopoverCard: {
    width: 296,
    maxHeight: 280,
    padding: 16,
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  historyPopoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyPopoverTitle: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 16,
  },
  historyPopoverList: {
    maxHeight: 220,
  },
  historyPopoverLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  historyPopoverPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(232, 224, 235, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 16,
  },
  historyPopoverPillText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    opacity: 0.8,
    lineHeight: 19,
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
    paddingBottom: 14,
    gap: 12,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    flexShrink: 1,
  },
  aiTagIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  aiTagText: {
    flexShrink: 1,
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    opacity: 0.8,
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  creditsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEDFE0",
    borderRadius: 64,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  creditsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  creditsWalletIcon: {
    opacity: 0.8,
  },
  creditsText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    opacity: 0.8,
  },
  creditsInfoIcon: {
    opacity: 0.6,
  },
  usageCard: {
    marginHorizontal: 10,
    marginBottom: 22,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFD7C0",
    backgroundColor: "rgba(186, 153, 62, 0.1)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  usageCardLocked: {
    backgroundColor: "rgba(244, 63, 94, 0.08)",
    borderColor: "#FDA4AF",
    justifyContent: "space-between",
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
  usageTextWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  usageTitle: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: "#D97706",
    lineHeight: 17,
  },
  usageTitleLocked: {
    color: "#DC2626",
  },
  usageSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#DCB23C",
    lineHeight: 13,
  },
  usageSubtitleLocked: {
    color: "#DC2626",
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    lineHeight: 14,
  },
  upgradePill: {
    width: 117,
    height: 34,
    borderRadius: 64,
    overflow: "hidden",
    flexShrink: 0,
  },
  upgradePillGradient: {
    flex: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  upgradePillText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#FFFFFF",
    lineHeight: 18,
  },
  bannerContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 8,
    gap: 9,
  },
  bannerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 27,
  },
  bannerDescription: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#000000",
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 258,
  },
  promptsSection: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  promptsContainer: {
    gap: 12,
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 56,
  },
  promptIcon: {
    opacity: 0.8,
  },
  promptText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    opacity: 0.8,
    lineHeight: 19,
  },
  inputSection: {
    backgroundColor: AI_SCREEN_BG,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  inputPill: {
    flex: 1,
    minHeight: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 46,
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  inputPillText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    maxHeight: 80,
    paddingVertical: 4,
  },
  inputPillActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiDisclaimer: {
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    lineHeight: 14,
  },
  inputWrapper: {
    flex: 1,
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
  modalRoot: {
    flex: 1,
  },
  mediaModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  mediaModalAnchor: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  mediaModalCard: {
    width: "100%",
    maxWidth: 358,
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: AI_SCREEN_BG,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  mediaModalGlassContent: {
    padding: 16,
    gap: 20,
  },
  mediaModalTopSection: {
    gap: 20,
  },
  mediaModalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mediaModalAvatar: {
    width: 32,
    height: 32,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaModalTitle: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 16,
  },
  mediaModalSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    opacity: 0.6,
    lineHeight: 16,
  },
  mediaTilesRow: {
    gap: 8,
    paddingRight: 4,
  },
  mediaTile: {
    width: 102,
    height: 96,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  mediaTileLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#000000",
    lineHeight: 22,
  },
  mediaSelectedTile: {
    width: 102,
    height: 96,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: "#595CD9",
    overflow: "hidden",
    position: "relative",
  },
  mediaSelectedImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  mediaSelectedFile: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  mediaSelectedFileName: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    textAlign: "center",
  },
  mediaSelectedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaSelectedBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#000000",
    lineHeight: 16,
  },
  mediaRemoveSelectedButton: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaModalDivider: {
    height: 1,
    backgroundColor: "#1F2937",
    opacity: 0.1,
  },
  mediaFilesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaFilesTextWrap: {
    flex: 1,
    gap: 2,
  },
  mediaFilesTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 22,
  },
  mediaFilesSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    opacity: 0.4,
    lineHeight: 16,
  },
  mediaConfirmButton: {
    height: 48,
    borderRadius: 43,
    backgroundColor: "#6D64F2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mediaConfirmButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  upgradeModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  upgradeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  upgradeSheet: {
    backgroundColor: AI_SCREEN_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  upgradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  upgradeLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 28,
  },
  upgradeSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  planTabs: {
    height: 44,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 4,
    marginTop: 18,
    marginBottom: 16,
  },
  planTab: {
    flex: 1,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  planTabActive: {
    backgroundColor: "#6D64F2",
  },
  planTabText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  planTabTextActive: {
    color: "#FFFFFF",
  },
  featuresCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  featuresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  featuresHeaderText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
  },
  featureRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    lineHeight: 17,
  },
  activePlanStatus: {
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  activePlanDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  activePlanStatusText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#10B981",
    lineHeight: 20,
  },
  paymentCard: {
    minHeight: 72,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 20,
  },
  paymentDate: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 16,
  },
  paymentPrice: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    lineHeight: 20,
  },
  paymentHistoryRow: {
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(107, 114, 128, 0.16)",
    backgroundColor: "#FFFFFF",
    marginTop: -1,
    marginBottom: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  paymentHistoryText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#6D64F2",
    lineHeight: 17,
  },
  paymentWebViewRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  paymentWebViewHeader: {
    height: 38,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  paymentWebViewTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
  },
  paymentWebView: {
    flex: 1,
  },
  paymentWebViewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  paymentWebViewLoadingText: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
  upgradeButton: {
    height: 52,
    marginTop: 16,
    borderRadius: 26,
    overflow: "hidden",
  },
  upgradeButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  upgradeFootnote: {
    marginTop: 10,
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 15,
  },
  cancelSubscriptionButton: {
    height: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#6D64F2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  cancelSubscriptionButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 18,
  },
  purchaseResultRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  cancelPlanCard: {
    marginHorizontal: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: AI_SCREEN_BG,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 34,
    alignItems: "center",
  },
  cancelPlanHandle: {
    position: "absolute",
    top: 8,
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(31, 41, 55, 0.16)",
  },
  cancelPlanEyebrow: {
    alignSelf: "flex-start",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#1F2937",
    lineHeight: 20,
  },
  cancelPlanTitle: {
    marginTop: 90,
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 24,
  },
  cancelPlanText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 19,
  },
  cancelPlanActions: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 10,
    marginTop: 90,
  },
  cancelPlanPrimaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#6D64F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelPlanPrimaryText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
    lineHeight: 19,
  },
  cancelPlanSecondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#6D64F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelPlanSecondaryText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#6D64F2",
    lineHeight: 19,
  },
  purchaseResultCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    alignItems: "center",
  },
  purchaseResultClose: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  purchaseResultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  purchaseResultIconFailure: {
    backgroundColor: "#C81E1E",
  },
  purchaseResultTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 24,
  },
  purchaseResultText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 18,
  },
  purchaseResultButton: {
    height: 48,
    alignSelf: "stretch",
    borderRadius: 24,
    backgroundColor: "#6D64F2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  purchaseResultButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  inlineUpgradeBlock: {
    width: "100%",
    maxWidth: 358,
    alignSelf: "center",
    marginTop: 10,
    gap: 8,
  },
  inlineUpgradeHeading: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: "#111827",
    lineHeight: 21,
  },
  inlineUpgradeCard: {
    minHeight: 290,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(125, 157, 255, 0.24)",
    backgroundColor: "#EAF8FF",
    padding: 14,
    overflow: "hidden",
  },
  inlineUpgradeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  inlineUpgradeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineUpgradeTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    lineHeight: 20,
  },
  inlineUpgradeBadge: {
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 142,
  },
  inlineUpgradeBadgeText: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#EF4444",
    lineHeight: 15,
  },
  inlineUpgradeWarning: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FDA4AF",
    backgroundColor: "#FFF7F8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
  },
  inlineWarningIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  inlineWarningCopy: {
    flex: 1,
    minWidth: 0,
  },
  inlineWarningTitle: {
    fontSize: 12,
    fontFamily: "Poppins-Bold",
    color: "#DC2626",
    lineHeight: 17,
    flexShrink: 1,
  },
  inlineWarningText: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    lineHeight: 15,
  },
  inlineUpgradeBenefits: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.86)",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    padding: 12,
    flexDirection: "row",
    gap: 10,
    flex: 1,
  },
  inlineBenefitsIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineBenefitsCopy: {
    flex: 1,
    minWidth: 0,
  },
  inlineBenefitsTitle: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 3,
  },
  inlineBenefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  inlineBenefitText: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
    lineHeight: 16,
  },
  inlineUpgradeButton: {
    height: 44,
    borderRadius: 22,
    marginTop: 10,
    overflow: "hidden",
  },
  inlineUpgradeButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  inlineUpgradeButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
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
  messageBubbleWithImage: {
    width: 240,
    maxWidth: "80%",
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
  assistantTypingBubble: {
    marginBottom: 4,
  },
  assistantTypingTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
  },
  assistantTypingSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#4B5563",
    lineHeight: 20,
  },
  typingDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
  },
  messageActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 20,
  },
  messageActionButton: {
    paddingVertical: 2,
  },
  messageImage: {
    width: "100%",
    minWidth: 200,
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
  consentDeclinedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  consentDeclinedTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    textAlign: "center",
  },
  consentDeclinedBody: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  consentReviewButton: {
    marginTop: 8,
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  consentReviewButtonText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    color: "#FFFFFF",
  },
  inputReminder: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
    lineHeight: 16,
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
  negFeedbackKeyboardView: {
    flex: 1,
  },
  negFeedbackModalBody: {
    flex: 1,
  },
  negFeedbackBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  negFeedbackSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: "20%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  negFeedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  negFeedbackHeaderTitle: {
    fontSize: 14,
    lineHeight: 14,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#1F2937",
  },
  negFeedbackScroll: {
    flex: 1,
    minHeight: 0,
  },
  negFeedbackQuestion: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#1F2937",
  },
  negFeedbackProblemRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  negFeedbackProblemLabel: {
    fontSize: 14,
    lineHeight: 14,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#374151",
    marginRight: 12,
  },
  negFeedbackProblemValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  negFeedbackProblemValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 14,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#1F2937",
    textAlign: "right",
  },
  negFeedbackOptionsBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    maxHeight: 280,
  },
  negFeedbackOptionsScroll: {
    maxHeight: 276,
  },
  negFeedbackOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  negFeedbackOptionLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#1F2937",
    paddingRight: 12,
  },
  negFeedbackOptionSeparator: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  negFeedbackOptionCheckSpacer: {
    width: 22,
    height: 22,
  },
  negFeedbackTextAreaWrap: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 28,
    minHeight: 120,
  },
  negFeedbackTextArea: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#1F2937",
    minHeight: 88,
    maxHeight: 160,
  },
  negFeedbackCharCount: {
    position: "absolute",
    right: 12,
    bottom: 8,
    fontSize: 14,
    lineHeight: 14,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#9CA3AF",
  },
  negFeedbackSubmitButton: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#E0E7FF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  negFeedbackSubmitButtonDisabled: {
    opacity: 0.72,
  },
  negFeedbackSubmitText: {
    fontSize: 14,
    lineHeight: 14,
    fontFamily: "Satoshi-Bold",
    letterSpacing: 0,
    color: "#4338CA",
  },
});
