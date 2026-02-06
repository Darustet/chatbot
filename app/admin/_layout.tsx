import React from 'react';
import { Slot } from 'expo-router';
import AdminAuth from '../components/AdminAuth';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminLayout() {
  return (
    <AdminAuth>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </AdminAuth>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});
