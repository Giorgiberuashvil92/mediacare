import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface DoctorFilterOption {
  id: string;
  name: string;
  fallback?: boolean;
}

interface DoctorFiltersProps {
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
  filters?: DoctorFilterOption[];
}

const DoctorFilters: React.FC<DoctorFiltersProps> = ({
  selectedFilter,
  onFilterChange,
  filters = [{ id: "all", name: "All Doctors" }],
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedFilter === filter.id && styles.activeFilterButton,
            ]}
            onPress={() => onFilterChange(filter.id)}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.id && styles.activeFilterText,
              ]}
            >
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default DoctorFilters;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: "#F2F2F7",
  },
  scrollContent: {
    gap: 16,
    alignItems: "center",
  },
  filterButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D4D4D4",
    minWidth: 100,
    alignItems: "center",
  },
  activeFilterButton: {
    borderColor: "#20BEB8",
  },
  filterText: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#525252",
    textAlign: "center",
  },
  activeFilterText: {
    color: "#20BEB8",
    fontFamily: "Poppins-SemiBold",
  },
});
