import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

// This would be stored more securely in a real application
const ADMIN_PASSWORD = 'nokia123';

interface AdminAuthProps {
  children: React.ReactNode;
}

export default function AdminAuth({ children }: AdminAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = () => {
      try {
        // Use localStorage for web - in a real app, you'd use more secure methods
        if (typeof window !== 'undefined' && window.localStorage) {
          const authStatus = localStorage.getItem('admin_authenticated') === 'true';
          setIsAuthenticated(authStatus);
        }
      } catch (e) {
        console.error("Error checking authentication:", e);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError(null);
      
      // Store auth status - in a real app, use more secure methods
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('admin_authenticated', 'true');
        }
      } catch (e) {
        console.error("Error storing authentication:", e);
      }
    } else {
      setError('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    
    // Clear auth status
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('admin_authenticated');
      }
    } catch (e) {
      console.error("Error clearing authentication:", e);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.authCard}>
          <Text style={styles.title}>Admin Login</Text>
          <Text style={styles.subtitle}>Please enter the admin password to continue</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  authCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  logoutButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  logoutText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
});
