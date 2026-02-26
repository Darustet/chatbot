import { Text, View, StyleSheet, Image, ScrollView } from "react-native";
import { Link } from "expo-router";
import { useState, useEffect } from "react";
import Chatbot, { ChatbotButton } from "./components/Chatbot";
import { config } from "./config";


export default function Index() {
  const [thesisCount, setThesisCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [chatbotVisible, setChatbotVisible] = useState<boolean>(false);

  useEffect(() => {
    const fetchThesisCount = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/uni/10024%2F6?query=nokia&rpp=100`);
        if (!response.ok) {
          throw new Error(`Failed to fetch theses: ${response.status}`);
        }
        const data = await response.json();
        setThesisCount(data.length);
      } catch (error) {
        console.error("Error fetching thesis count:", error);
        setThesisCount(0);
      } finally {
        setLoading(false);
      }
    };

    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/api/admin/dashboard`);
        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.status}`);
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setDashboardData(null);
      }
    };

    fetchThesisCount();
    fetchDashboardData();
  }, []);

  // Helper to safely get a value or fallback
  const getVal = (cat: string, key: string) =>
    dashboardData && dashboardData[cat] && dashboardData[cat][key] !== undefined
      ? dashboardData[cat][key]
      : "N/A";

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Metropolia</Text>

        {/* Education Card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardTitle}>Education</Text>
          <View style={styles.subCardsContainer}>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>
                {getVal("education", "innovation_projects")} Innovation Projects
              </Text>
              <Text style={styles.subCardText}>
                {getVal("education", "students")} Students
              </Text>
            </View>
            <Link 
              href="/modules/ThesisList" 
              style={[styles.subCard, styles.linkWrapper]}
            >
              <View style={styles.subCardContent}>
                <Text style={styles.subCardText}>
                  {loading ? "Loading..." : `${thesisCount} Metropolia/Nokia Collaborative Theses`}
                </Text>
              </View>
            </Link>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>
                {getVal("education", "trainees_metropolia")} Trainees at Metropolia
              </Text>
              <Text style={styles.subCardText}>
                {getVal("education", "trainees_nokia")} Trainees at Nokia
              </Text>
            </View>
          </View>
          <Text style={styles.mainCardFooter}>
            {getVal("education", "credits")} Credits, {getVal("education", "lectures")} Lectures / Presentations
          </Text>
        </View>

        {/* R&D and Business Card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardTitle}>R&D and Business</Text>
          <View style={styles.subCardsContainer}>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>5G Test Network</Text>
              <Text style={styles.subCardText}>
                - {getVal("research_development", "test_network_cells")} Cell, {getVal("research_development", "test_network_users")} Users
              </Text>
            </View>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>
                -- {getVal("research_development", "completed_projects")} Done Research Project
              </Text>
              <Text style={styles.subCardText}>
                -- {getVal("research_development", "planned_projects")} Planned Research Project
              </Text>
            </View>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>
                {getVal("research_development", "common_secle")} Common SECLE
              </Text>
              <Text style={styles.subCardText}>
                {getVal("research_development", "sw_competence")} 6G SW Competence(Rust)
              </Text>
            </View>
          </View>
        </View>

        {/* Common Events Card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardTitle}>Common Events</Text>
          <View style={styles.subCardsContainer}>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>
                {getVal("common_events", "visits_to_nokia")} Site Visits to Nokia
              </Text>
              <Text style={styles.subCardText}>
                {getVal("common_events", "visits_to_metropolia")} Site Visits to Metropolia
              </Text>
            </View>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>
                {getVal("common_events", "hackathons")} Hackathons
              </Text>
              <Text style={styles.subCardText}>
                {getVal("common_events", "recruitment_events")} Recruitment Events
              </Text>
            </View>
            <View style={styles.subCard}>
              <Text style={styles.subCardText}>Visibility on Campus</Text>
            </View>
          </View>
          <Text style={styles.mainCardFooter}>
            #People {getVal("common_events", "metropolia_staff")} Metropolia / {getVal("common_events", "nokia_staff")} Nokia
          </Text>
        </View>

        {/* Metropolia logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/metropolia-logo.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>University of Applied Sciences</Text>
        </View>

        {/* Add some bottom padding to prevent overlap with chatbot button */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Chatbot Button */}
      <ChatbotButton onPress={() => setChatbotVisible(true)} />

      {/* Chatbot Modal */}
      <Chatbot
        visible={chatbotVisible}
        onClose={() => setChatbotVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24, // Reduced font size for mobile
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#003366",
  },
  mainCard: {
    backgroundColor: "#ff8c42", // Orange background for main cards
    borderRadius: 8,
    padding: 10, // Adjusted padding for smaller screens
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  mainCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 8,
    marginBottom: 8,
  },
  subCardsContainer: {
    flexDirection: "column", // Stack sub-cards vertically for mobile
  },
  subCard: {
    flex: 1,
    backgroundColor: "#ffffff", // White background for sub-cards
    padding: 15,
    marginBottom: 10, // Add spacing between sub-cards
    borderRadius: 6,
    alignItems: "center", // Center-align horizontally
    justifyContent: "center", // Center-align vertically
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subCardContent: {
    flex: 1,
    justifyContent: "center", // Center-align content vertically
    alignItems: "center", // Center-align content horizontally
  },
  subCardText: {
    textAlign: "center",
    fontSize: 15,
    marginBottom: 5,
  },
  mainCardFooter: {
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
    color: "#333",
  },
  logoContainer: {
    position: "relative", // Adjusted for better placement on mobile
    alignItems: "center",
    marginTop: 20,
  },
  logo: {
    width: 100, // Reduced size for mobile
    height: 40,
  },
  logoText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  linkWrapper: {
    display: "flex", // Ensure the Link behaves like a flex container
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
  },
  bottomPadding: {
    height: 100, // Add space at the bottom to prevent overlap with chatbot button
  },
});