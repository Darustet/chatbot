import { Text, View, StyleSheet, ScrollView } from "react-native";
import { useState } from "react";
import Chatbot, { ChatbotButton } from "./components/Chatbot";
import ThesisList from "./modules/ThesisList";
import { config } from "./config";

export default function Index() {
  const [chatbotVisible, setChatbotVisible] = useState(false);

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Thesis List</Text>
      <Text style={styles.subtitle}>
        Discover and summarize academic theses with ease.
      </Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <ThesisList />
      </ScrollView>

      <ChatbotButton onPress={() => setChatbotVisible(true)} />

      <Chatbot
        visible={chatbotVisible}
        onClose={() => setChatbotVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    paddingTop: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 18,
    color: "#555",
    marginBottom: 20,
    textAlign: "center",
  },

  scroll: {
    width: "100%",
    flex: 1,
  },

  scrollContent: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 40,
  },
});