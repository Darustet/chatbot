import { Text, TouchableOpacity, StyleSheet } from "react-native";

export function SelectBox({
  selectedItems,
  setSelectedItems,
  dropdownOpen,
  setDropdownOpen,
}: any) {

  const hasSelected = selectedItems.length > 0;

  const handlePress = () => {
    if (hasSelected) {
      setSelectedItems([]);
      setDropdownOpen(false);
    } else {
      setDropdownOpen(!dropdownOpen);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.uniSelected,
        hasSelected && styles.uniSelectedActive
      ]}
      onPress={handlePress}
    >
      <Text
        style={[
          styles.uniSelectorText,
          !hasSelected &&  styles.activeText,
          hasSelected && styles.activeText
        ]}
      >
        {hasSelected
          ? "Remove All Selected"
          : "Select University"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  uniSelected: {
    height: 38,
    borderWidth: 1,
    borderColor: "#4b8ebd",
    borderRadius: 8,
    backgroundColor: "#4b8ebd",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  uniSelectedActive: {
    backgroundColor: "#ff4d4f",
    borderColor: "#ff4d4f",
  },

  uniSelectorText: {
    fontSize: 16,
    fontWeight: "500",
  },

  activeText: {
    color: "#fff",
    alignSelf: "center",
  },
});