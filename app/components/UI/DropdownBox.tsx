import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React, { useState } from "react";

export function UniversitySelectDropdown({
  dropdownOpen,
  hoveredGroup,
  setHoveredGroup,
  mainOptions,
  uasOptions,
  universityOptions,
  selectedItems,
  selectUni,
}: any) {
  const isSelected = (code: string) =>
    selectedItems.some((item: any) => item.code === code);

  const allRealOptions = [...uasOptions, ...universityOptions];

  const isAllSelected =
    allRealOptions.length > 0 &&
    allRealOptions.every((u: any) =>
      selectedItems.some((item: any) => item.code === u.code)
    );
  const isAllUasSelected = uasOptions.every((u: any) =>
    selectedItems.some((item: any) => item.code === u.code)
  );

  const isAllUniversitiesSelected = universityOptions.every((u: any) =>
    selectedItems.some((item: any) => item.code === u.code)
  );

  const getCheckbox = (option: any) => {
    if (option.code === "all") return isAllSelected ? "☑" : "☐";
    if (option.code === "allUas") return isAllUasSelected ? "☑" : "☐";
    if (option.code === "allUniversities") return isAllUniversitiesSelected ? "☑" : "☐";
    return isSelected(option.code) ? "☑" : "☐";
  };

  if (!dropdownOpen) return null;

  return (
    <>
      <View style={styles.customDropdown}>
        {mainOptions.map((option: any) => (
          <TouchableOpacity
            key={option.code}
            style={styles.dropdownMainItem}
            onMouseEnter={() => {
              if (option.code === "allUas" || option.code === "allUniversities") {
                setHoveredGroup(option.code);
              } else {
                setHoveredGroup(null);
              }
            }}
            onPress={() => selectUni(option)}
          >
            <View style={styles.dropdownOptionRow}>
              <Text style={styles.checkbox}>{getCheckbox(option)}</Text>
              <Text style={styles.uniSelectorText}>{option.uni}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {hoveredGroup === "allUas" && (
        <View style={styles.subDropdown}
        onMouseLeave={() => setHoveredGroup(null)}
        >
          {uasOptions.map((option: any) => (
            <TouchableOpacity
              key={option.code}
              style={styles.dropdownSubItem}
              onPress={() => selectUni(option)}
            >
              <View style={styles.dropdownOptionRow}>
                <Text style={styles.checkbox}>{getCheckbox(option)}</Text>
                <Text style={styles.uniSelectorText}>{option.uni}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {hoveredGroup === "allUniversities" && (
        <View style={styles.subDropdown}
         onMouseLeave={() => setHoveredGroup(null)}
        >
          {universityOptions.map((option: any) => (
            <TouchableOpacity
              key={option.code}
              style={styles.dropdownSubItem}
              onPress={() => selectUni(option)}
            >
              <View style={styles.dropdownOptionRow}>
                <Text style={styles.checkbox}>{getCheckbox(option)}</Text>
                <Text style={styles.uniSelectorText}>{option.uni}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

export function YearRangeDropdown({
  startYear,
  endYear,
  setStartYear,
  setEndYear,
}: any) {
  const currentYear = new Date().getFullYear();
  const yearMin = 2023;

  const years = Array.from(
    { length: currentYear - yearMin + 1 },
    (_, i) => yearMin + i
  );

  const [dropdownOpen, setDropdownOpen] = useState<"start" | "end" | null>(null);

  const renderDropdown = (type: "start" | "end") => (
    <View style={styles.customDropdown}>

      <TouchableOpacity
        style={styles.dropdownMainItem}
        onPress={() => {
          if (type === "start") {
            setStartYear("");
          } else {
            setEndYear("");
          }
          setDropdownOpen(null);
        }}
      >
        <Text style={[styles.uniSelectorText, { color: "#999" },]}>Clear</Text>
      </TouchableOpacity>

      {years.map((year) => (
        <TouchableOpacity
          key={year}
          style={styles.dropdownMainItem}
          onPress={() => {
            if (type === "start") {
              setStartYear(String(year));
              if (endYear && year > Number(endYear)) {
                setEndYear("");
              }
            } else {
              setEndYear(String(year));
              if (startYear && year < Number(startYear)) {
                setStartYear("");
              }
            }
            setDropdownOpen(null);
          }}
        >
          <Text style={styles.uniSelectorText}>{year}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.yearRangeWrapper}>
      <View style={styles.yearDropdownBox}>
        <TouchableOpacity
          style={styles.yearInputField}
          onPress={() =>
            setDropdownOpen(dropdownOpen === "start" ? null : "start")
          }
        >
          <Text style={[
              styles.uniSelectorText,
              {color: startYear ? "#000" : "#999",},
            ]}
          >
            {startYear ? `Start Year: ${startYear}` : "Start Year"}
          </Text>
        </TouchableOpacity>

        {dropdownOpen === "start" && renderDropdown("start")}
      </View>

      <View style={styles.yearDropdownBox}>
        <TouchableOpacity
          style={styles.yearInputField}
          onPress={() =>
            setDropdownOpen(dropdownOpen === "end" ? null : "end")
          }
        >
          <Text style={[
              styles.uniSelectorText,
              {color: startYear ? "#000" : "#999",},
            ]}
          >
            {endYear ? `End Year: ${endYear}` : "End Year"}
          </Text>
        </TouchableOpacity>

        {dropdownOpen === "end" && renderDropdown("end")}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customDropdown: {
    position: "absolute",
    top: 38,
    left: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    zIndex: 9999,
    elevation: 9999,
  },
  dropdownMainItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  subDropdown: {
    position: "absolute",
    left: 200,
    top: 100,
    width: 600,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    zIndex: 999999,
    elevation: 999999,
  },
  dropdownSubItem: {
    width: "33.33%",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownOptionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  uniSelectorText: {
    fontSize: 16,
  },
  yearRangeWrapper: {
    flexDirection: "row",
    gap: 2,
    flex: 1,
  },
  yearDropdownBox: {
    flex: 1,
    position: "relative",
  },
  yearInputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
});
