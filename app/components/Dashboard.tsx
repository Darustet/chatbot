import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { ADMIN_API_BASE_URL } from '@/app/utils/api';

type DashboardData = {
  education: {
    innovation_projects: number;
    students: number;
    trainees_metropolia: number;
    trainees_nokia: number;
    credits: number;
    lectures: number;
  };
  research_development: {
    test_network_cells: number;
    test_network_users: number;
    completed_projects: number;
    planned_projects: number;
    common_secle: number;
    sw_competence: number;
  };
  common_events: {
    visits_to_nokia: number;
    visits_to_metropolia: number;
    hackathons: number;
    recruitment_events: number;
    nokia_staff: number;
    metropolia_staff: number;
  };
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${ADMIN_API_BASE_URL}/api/admin/dashboard`);
      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'No data available'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.dashboardTitle}>Dashboard Overview</Text>

      {/* Education Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Education</Text>
        <View style={styles.cardContent}>
          <Text style={styles.statsItem}>Innovation Projects: {data.education.innovation_projects}</Text>
          <Text style={styles.statsItem}>Students: {data.education.students}</Text>
          <Text style={styles.statsItem}>Trainees at Metropolia: {data.education.trainees_metropolia}</Text>
          <Text style={styles.statsItem}>Trainees at Nokia: {data.education.trainees_nokia}</Text>
          <Text style={styles.statsItem}>Total Credits: {data.education.credits}</Text>
          <Text style={styles.statsItem}>Lectures / Presentations: {data.education.lectures}</Text>
        </View>
      </View>

      {/* R&D and Business Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>R&D and Business</Text>
        <View style={styles.cardContent}>
          <Text style={styles.statsItem}>5G Test Network Cells: {data.research_development.test_network_cells}</Text>
          <Text style={styles.statsItem}>5G Test Network Users: {data.research_development.test_network_users}</Text>
          <Text style={styles.statsItem}>Completed Research Projects: {data.research_development.completed_projects}</Text>
          <Text style={styles.statsItem}>Planned Research Projects: {data.research_development.planned_projects}</Text>
          <Text style={styles.statsItem}>Common SECLE: {data.research_development.common_secle}</Text>
          <Text style={styles.statsItem}>6G SW Competence: {data.research_development.sw_competence}</Text>
        </View>
      </View>

      {/* Common Events Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Common Events</Text>
        <View style={styles.cardContent}>
          <Text style={styles.statsItem}>Site Visits to Nokia: {data.common_events.visits_to_nokia}</Text>
          <Text style={styles.statsItem}>Site Visits to Metropolia: {data.common_events.visits_to_metropolia}</Text>
          <Text style={styles.statsItem}>Hackathons: {data.common_events.hackathons}</Text>
          <Text style={styles.statsItem}>Recruitment Events: {data.common_events.recruitment_events}</Text>
          <Text style={styles.statsItem}>Nokia Staff: {data.common_events.nokia_staff}</Text>
          <Text style={styles.statsItem}>Metropolia Staff: {data.common_events.metropolia_staff}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  dashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
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
    textAlign: 'center',
    color: '#007BFF',
  },
  cardContent: {
    paddingHorizontal: 5,
  },
  statsItem: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});
