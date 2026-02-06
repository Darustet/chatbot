import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { ADMIN_API_BASE_URL } from '@/app/utils/api';
import { Link } from 'expo-router';

type CardData = {
  [key: string]: number;
};

type DashboardData = {
  education: CardData;
  research_development: CardData;
  common_events: CardData;
  collaborative_works?: CardData; // Optional to handle dynamic cards
};

type StaticField = {
  cardKey: string;
  subcardKey: string;
};

const STATIC_FIELDS: StaticField[] = [
  { cardKey: 'education', subcardKey: 'innovation_projects' },
  { cardKey: 'education', subcardKey: 'students' },
  { cardKey: 'education', subcardKey: 'trainees_metropolia' },
  { cardKey: 'education', subcardKey: 'trainees_nokia' },
  { cardKey: 'education', subcardKey: 'credits' },
  { cardKey: 'education', subcardKey: 'lectures' },
  { cardKey: 'research_development', subcardKey: 'completed_projects' },
  { cardKey: 'research_development', subcardKey: 'planned_projects' },
  { cardKey: 'common_events', subcardKey: 'hackathons' },
  { cardKey: 'common_events', subcardKey: 'recruitment_events' },
];

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<DashboardData | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${ADMIN_API_BASE_URL}/api/admin/dashboard`);
      setDashboardData(response.data);
      setOriginalData(JSON.parse(JSON.stringify(response.data))); // Deep copy for reset
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to fetch dashboard data. Please check if the Express server is running on port 3000.');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!dashboardData) return;

    const staticData: DashboardData = JSON.parse(JSON.stringify(dashboardData));
    Object.entries(staticData).forEach(([cardKey, cardValues]) => {
      Object.keys(cardValues).forEach(subcardKey => {
        if (!isStaticField(cardKey, subcardKey)) {
          delete staticData[cardKey][subcardKey];
        }
      });
    });

    try {
      // Use PUT to /api/admin/dashboard as per backend
      await axios.put(`${ADMIN_API_BASE_URL}/api/admin/dashboard`, staticData);
      setSuccessMessage('Data saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      // Optionally refresh data from backend for consistency
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to update dashboard data:', err);
      setSuccessMessage(null);
      Alert.alert('Error', 'Failed to save data');
    }
  };

  const handleReset = () => {
    setDashboardData(JSON.parse(JSON.stringify(originalData)));
    Alert.alert('Reset', 'Values reset to original');
  };

  const isStaticField = (cardKey: string, subcardKey: string) =>
    STATIC_FIELDS.some(f => f.cardKey === cardKey && f.subcardKey === subcardKey);

  const updateValue = (cardKey: string, subcardKey: string, value: string) => {
    if (!dashboardData) return;
    if (!isStaticField(cardKey, subcardKey)) return;

    const numValue = parseInt(value, 10) || 0;

    setDashboardData({
      ...dashboardData,
      [cardKey]: {
        ...dashboardData[cardKey],
        [subcardKey]: numValue
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={fetchDashboardData}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No dashboard data available</Text>
      </View>
    );
  }

  const getSubcardLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
      // Education
      innovation_projects: "Innovation Projects",
      students: "Students",
      trainees_metropolia: "Trainees at Metropolia",
      trainees_nokia: "Trainees at Nokia",
      credits: "Total Credits",
      lectures: "Lectures / Presentations",

      // Research & Development
      test_network_cells: "5G Test Network Cells",
      test_network_users: "5G Test Network Users",
      completed_projects: "Completed Research Projects",
      planned_projects: "Planned Research Projects",
      common_secle: "Common SECLE",
      sw_competence: "6G SW Competence",

      // Common Events
      visits_to_nokia: "Site Visits to Nokia",
      visits_to_metropolia: "Site Visits to Metropolia",
      hackathons: "Hackathons",
      recruitment_events: "Recruitment Events",
      nokia_staff: "Nokia Staff",
      metropolia_staff: "Metropolia Staff",

      // Collaborative Works
      nokia: "Nokia Collaborations",
      other_partners: "Other Partner Collaborations"
    };
    return labels[key] || key;
  };

  const getCategoryTitle = (key: string): string => {
    const titles: { [key: string]: string } = {
      education: "Education",
      research_development: "R&D and Business",
      common_events: "Common Events",
      collaborative_works: "Collaborative Works"
    };
    return titles[key] || key;
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Success message overlay for always visible feedback */}
      {successMessage && (
        <View style={styles.successOverlay}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Edit dashboard values below</Text>
          <Link href="/admin/config" asChild>
            <TouchableOpacity style={styles.configLink}>
              <Text style={styles.configLinkText}>Configure Backend</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {Object.entries(dashboardData).map(([cardKey, cardValues]) => (
          <View key={cardKey} style={styles.card}>
            <Text style={styles.cardTitle}>{getCategoryTitle(cardKey)}</Text>
            {Object.entries(cardValues).map(([subcardKey, value]) => (
              <View key={`${cardKey}-${subcardKey}`} style={styles.inputRow}>
                <Text style={styles.inputLabel}>{getSubcardLabel(subcardKey)}:</Text>
                {isStaticField(cardKey, subcardKey) ? (
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(value)}
                    onChangeText={(newValue) => updateValue(cardKey, subcardKey, newValue)}
                  />
                ) : (
                  <Text style={styles.input}>{String(value)}</Text>
                )}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={handleReset}>
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  configLink: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  configLinkText: {
    color: '#6c757d',
    fontSize: 14,
  },
  successMessage: {
    backgroundColor: '#d4edda',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  successOverlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  successText: {
    color: '#155724',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textTransform: 'capitalize',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    flex: 3,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 40,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#007BFF',
  },
  resetButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 100,
    marginBottom: 20,
  },
});