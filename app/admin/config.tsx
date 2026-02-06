import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ADMIN_API_BASE_URL, setAdminApiBaseUrl } from '@/app/utils/api';

export default function AdminConfig() {
  const [apiUrl, setApiUrl] = useState(ADMIN_API_BASE_URL);

  const handleSave = () => {
    setAdminApiBaseUrl(apiUrl);
    Alert.alert(
      "Configuration Updated",
      "Admin API URL has been updated. The page will reload.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Backend Configuration</Text>
        
        <Text style={styles.label}>Express Server URL:</Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://localhost:3000"
        />
        
        <Text style={styles.hint}>
          Note: The Express server typically runs on port 3000. Make sure it is running.
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Configuration</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
