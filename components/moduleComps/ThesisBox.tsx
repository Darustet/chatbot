import { View, Text, StyleSheet } from "react-native";

interface ThesisBoxProps {
  title: string;
  author: string;
  year: string;
  publisher: string;
}

export function ThesisBox({ title, author, year, publisher }: ThesisBoxProps) {
    // Ensure proper fallback for missing data
    const displayTitle = String(title || "").trim() || "Untitled Thesis";
    const displayAuthor = String(author || "").trim() || "Unknown Author";
    const displayYear = String(year || "").trim() || "Unknown Date";
    const displayPublisher = String(publisher || "").trim() || "Unknown University";
    
    console.log("ThesisBox render values (raw data from API):", {
        title: displayTitle,
        author: displayAuthor,
        year: displayYear,
        publisher: displayPublisher
    });
    
    return (
        <View style={styles.thesis}>    
          <Text style={styles.thesisTitle} numberOfLines={2} ellipsizeMode="tail">
            {displayTitle}
          </Text>
          
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>  
              <Text style={styles.infoLabel}>Author:</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                {displayAuthor}
              </Text>
            </View>
            
            <View style={styles.infoRow}>  
              <Text style={styles.infoLabel}>Published:</Text>
              <Text style={styles.infoValue}>
                {displayYear}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>University:</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                {displayPublisher}
              </Text>
            </View>
          </View>
        </View>
    );
}

const styles = StyleSheet.create({
    thesis: {
        width: 450,
        height: 200,
        borderWidth: 1,
        borderRadius: 15,
        borderColor: "#ddd",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowColor: "#000",
        padding: 15,
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
    },
    thesisTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 15,
        color: "#333",
        height: 50,
    },
    infoContainer: {
        flex: 1,
        justifyContent: "space-around",
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#555",
        width: 90,
    },
    infoValue: {
        fontSize: 15,
        color: "#333",
        flex: 1,
    },
});
