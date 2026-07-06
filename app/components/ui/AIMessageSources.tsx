import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { AIMessageSource } from "../../_services/api";
import { useLanguage } from "../../contexts/LanguageContext";

interface AIMessageSourcesProps {
  sources: AIMessageSource[];
}

export default function AIMessageSources({ sources }: AIMessageSourcesProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(true);

  if (!sources.length) return null;

  const handleOpenSource = async (url: string) => {
    if (!url) return;
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("aiAssistant.sources.title")}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="library-outline" size={16} color="#6366F1" />
          <Text style={styles.headerTitle}>{t("aiAssistant.sources.title")}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{sources.length}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#6366F1"
        />
      </TouchableOpacity>

      {expanded &&
        sources.map((source, index) => {
          const metaParts = [source.journal, source.year].filter(Boolean);
          const metaLine = metaParts.join(" · ");

          return (
            <TouchableOpacity
              key={source.pmid || source.url || `${index}`}
              style={styles.sourceRow}
              onPress={() => handleOpenSource(source.url)}
              activeOpacity={0.7}
              accessibilityRole="link"
            >
              <View style={styles.sourceIcon}>
                <Ionicons name="document-text-outline" size={16} color="#6366F1" />
              </View>
              <View style={styles.sourceContent}>
                <Text style={styles.sourceTitle} numberOfLines={3}>
                  {source.title}
                </Text>
                {metaLine ? (
                  <Text style={styles.sourceMeta}>{metaLine}</Text>
                ) : null}
              </View>
              <Ionicons name="open-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
    marginHorizontal: 4,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#EEF2FF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: "#4338CA",
  },
  countBadge: {
    backgroundColor: "#6366F1",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: "#FFFFFF",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E7FF",
  },
  sourceIcon: {
    marginTop: 2,
  },
  sourceContent: {
    flex: 1,
    gap: 2,
  },
  sourceTitle: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    color: "#312E81",
    lineHeight: 18,
  },
  sourceMeta: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "#6B7280",
  },
});
