import { Platform, StyleSheet, Text, View } from "react-native";

type TabBarLabelProps = {
  label: string;
  color: string;
};

export function TabBarLabel({ label, color }: TabBarLabelProps) {
  const trimmed = label.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return (
      <Text style={[styles.singleLine, { color }]} numberOfLines={1}>
        {trimmed}
      </Text>
    );
  }

  const firstLine = trimmed.slice(0, spaceIndex);
  const secondLine = trimmed.slice(spaceIndex + 1).trim();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.line, { color }]} numberOfLines={1}>
        {firstLine}
      </Text>
      <Text style={[styles.line, styles.secondLine, { color }]} numberOfLines={1}>
        {secondLine}
      </Text>
    </View>
  );
}

export const tabBarScreenOptions = {
  tabBarStyle: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    height: Platform.OS === "ios" ? 84 : 72,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    paddingTop: 6,
  },
  tabBarItemStyle: {
    paddingTop: 2,
    marginTop: -2,
  },
  tabBarIconStyle: {
    marginBottom: 0,
  },
};

export const tabBarLabel =
  (label: string) => {
    const TabLabel = ({ color }: { color: string; focused: boolean }) => (
      <TabBarLabel label={label} color={color} />
    );
    TabLabel.displayName = "TabBarLabelItem";
    return TabLabel;
  };

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 92,
    marginTop: -2,
  },
  singleLine: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
  },
  line: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    lineHeight: 12,
  },
  secondLine: {
    marginTop: 1,
  },
});
