import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SeeAllProps {
  title: string;
  route?: string;
}

const SeeAll = ({ title, route }: SeeAllProps) => {
  const handleSeeAll = () => {
    if (route) {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity onPress={handleSeeAll}>
        <Text style={styles.seeAll}>ყველას ნახვა</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SeeAll;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
    width: "100%",
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#333333",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#20BEB8",
  },
});
