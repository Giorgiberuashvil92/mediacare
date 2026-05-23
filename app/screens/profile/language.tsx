import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SupportedLanguage,
  useLanguage,
} from "../../contexts/LanguageContext";

const LANGUAGES: { code: SupportedLanguage; labelKey: string }[] = [
  { code: "ka", labelKey: "common.language.georgian" },
  { code: "en", labelKey: "common.language.english" },
  { code: "ru", labelKey: "common.language.russian" },
];

const LanguageScreen = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageSelect = async (code: SupportedLanguage) => {
    await setLanguage(code);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.language.title")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.languagesContainer}>
          {LANGUAGES.map((item) => (
            <TouchableOpacity
              key={item.code}
              style={styles.languageItem}
              onPress={() => handleLanguageSelect(item.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageNativeName}>{t(item.labelKey)}</Text>
              </View>
              <View style={styles.radioButton}>
                {language === item.code && (
                  <View style={styles.radioButtonSelected} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  languagesContainer: {
    gap: 0,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1F2937",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#20BEB8",
  },
});

export default LanguageScreen;
