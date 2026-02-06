//import ThesisList from "@/modules/ThesisList";
import ThesisList from "@/app/modules/ThesisList";
import { Link } from "expo-router";
import { Alert, Button, Pressable, StyleSheet, Text, View } from "react-native";

export default function Menu() {
  return (
    <View style={styles.screen}>

        <Text style={styles.header}>Module Selection</Text>
      <View style={styles.navButtonBox}>
    
        <Pressable
          onPress={() => window.location.href = "/modules/ThesisList"}
          style={styles.navButton}
        >
            <Text style={styles.navButtonText}>Thesis Search</Text>
        </Pressable>
        <Pressable
          onPress={() => window.location.href = "/modules/ThesisList"}
          style={styles.navButton}
        >
            <Text style={styles.navButtonText}>Innovation Projects</Text>
        </Pressable>
        <Pressable
          onPress={() => window.location.href = "/modules/ThesisList"}
          style={styles.navButton}
        >
            <Text style={styles.navButtonText}>Upcoming Events</Text>
        </Pressable>
        <Pressable
          onPress={() => window.location.href = "/admin"}
          style={[styles.navButton, styles.adminButton]}
        >
            <Text style={styles.navButtonText}>Admin Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "#ffffff",
        width: "80%",
        marginBottom: 20,
    },
    header: {
        fontSize: 42,
        marginBottom: 20,
    },
    navButtonBox: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-around",
    },
    navButton: {
        width: "20%",
        borderWidth: 5,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        borderRadius: 10,
        marginBottom: 100,
    },
    navButtonText: {
        textAlign: "center",
        fontSize: 24,
    },
    adminButton: {
        borderColor: '#6c757d',
        backgroundColor: '#f8f9fa',
    },
});
