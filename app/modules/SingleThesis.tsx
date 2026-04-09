import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { ThesisSummary } from "../components/ThesisSummary";
import { ThesisQRCode } from "../components/ThesisQRCode";
import { getThesisSummary, API_BASE_URL, setApiBaseUrl, getTestSummaryDirect } from "../utils/api";

export default function SingleThesis() {
  const params = useLocalSearchParams();
  const { handle, thesisId, title, author, year, publisher, universityCode  } = params;
  console.log(universityCode, thesisId);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [newApiUrl, setNewApiUrl] = useState(API_BASE_URL);
  const [retryCount, setRetryCount] = useState(0);

  // Format handle for better consistency
  const formattedHandle = useMemo(() => {
    if (!handle) return "";
    const handleStr = String(handle);
    if (handleStr.startsWith('/handle/')) {
      return handleStr;
    } else if (handleStr.startsWith('http')) {
      const matches = handleStr.match(/\/handle\/(.+)$/);
      return matches ? `/handle/${matches[1]}` : handleStr;
    } else {
      return `/handle/${handleStr.replace(/^#/, '')}`;
    }
  }, [handle]);

  // Extract the actual handle key without the "/handle/" prefix for API calls
  const handleKey = useMemo(() => {
    if (!handle) return "";
    const handleStr = String(handle);
    if (handleStr.startsWith('/handle/')) {
      return handleStr.replace(/^\/handle\//, '');
    } else if (handleStr.startsWith('http')) {
      const matches = handleStr.match(/\/handle\/(.+)$/);
      return matches ? matches[1] : handleStr;
    } else {
      return handleStr.replace(/^#/, '');
    }
  }, [handle]);


  // Improve the fetchThesisSummary function to handle various server configurations
  const fetchThesisSummary = async (forceRetry = false) => {
    if (!handle) {
      setSummaryError("No thesis handle provided");
      setSummary(null);
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      console.log(`Fetching summary for university: ${universityCode}, handle: ${formattedHandle}, thesisId: ${thesisId} (Attempt: ${retryCount + 1})`);

      // Try to verify backend availability first
      let pingFailed = false;
      try {
        console.log("Checking backend availability...");
        // Implement timeout with AbortController for ping request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const pingResponse = await fetch(`${API_BASE_URL}/ping`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!pingResponse.ok) {
          throw new Error("Backend server not responding properly");
        }
        console.log("Backend is available");
      } catch (pingError) {
        pingFailed = true;
        console.error("Backend ping failed:", pingError);
        // Log but do not block summary fetch
      }
      // Use getThesisSummary from api.ts instead of direct fetch
      const data = await getThesisSummary(handleKey, universityCode as string, thesisId as string | undefined);

      if (data && data.summary) {
        // Ensure summary is a string and log more details
        const summaryText = typeof data.summary === 'string'
          ? data.summary
          : JSON.stringify(data.summary);

        console.log("Success! Received summary:", summaryText.substring(0, 50) + "...");
        setSummary(summaryText);

        if (pingFailed) {
          setSummaryError("Warning: Could not connect to backend ping endpoint. Summary fetched successfully.");
        } else {
          setSummaryError(null);
        }
      } else {
        console.error("No summary in response:", data);
        setSummary(null);
        setSummaryError("No summary found in server response");
      }
    } catch (error) {
      console.error("Error fetching thesis summary:", error);
      setSummary(null);
      if (error instanceof Error) {
        setSummaryError(error.message);
      } else {
        setSummaryError("Error generating summary");
      }
      setRetryCount(prev => prev + 1);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (handle) {
      // Reset retry count
      setRetryCount(0);
      fetchThesisSummary();
    }
  }, [handle]);

  // Add a button to manually try the test summary endpoint
  const tryTestSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/test-summary`);
      const data = await response.json();
      if (data && data.summary) {
        setSummary(data.summary);
        setSummaryError(null);
      } else {
        throw new Error("No summary in test response");
      }
    } catch (error) {
      if (error instanceof Error) {
        setSummaryError(`Test summary failed: ${error.message}`);
      } else {
        setSummaryError("Test summary failed");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  // Add a new function to test with hardcoded data
  const tryDirectTest = async () => {
    setSummaryLoading(true);
    try {
      // This completely bypasses the backend
      const data = await getTestSummaryDirect();
      console.log("Using hardcoded test data:", data);
      if (data && data.summary) {
        setSummary(data.summary);
        setSummaryError(null);
      }
    } catch (error) {
      setSummaryError("Error with direct test");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Thesis Details" }} />

      <View style={styles.thesisHeader}>
        <Text style={styles.thesisTitle}>{title}</Text>
        <Text style={styles.thesisAuthor}>{author}</Text>
        <Text style={styles.thesisDetails}>
          {publisher} • {year}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>

        {summaryLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Loading summary...</Text>
          </View>
        ) : summaryError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {summaryError}
              {summaryError.includes("Could not connect to the backend server") && (
                <Text style={styles.errorHint}>
                  {"\n\nIf the server is running, you may need to update the server URL to match your computer's IP address."}
                </Text>
              )}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.configButton}
                onPress={() => setShowApiConfig(true)}
              >
                <Text style={styles.configButtonText}>Configure Backend URL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.configButton, {marginLeft: 10, backgroundColor: '#28a745'}]}
                onPress={() => tryTestSummary()}
              >
                <Text style={styles.configButtonText}>Try Test Summary</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.configButton, {marginLeft: 10, backgroundColor: '#ff9800'}]}
                onPress={() => tryDirectTest()}
              >
                <Text style={styles.configButtonText}>Direct Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : summary ? (
          <View>
            <ThesisSummary summary={summary} title={String(title)} />
            {retryCount > 0 && (
              <Text style={styles.retryNote}>Note: Retrieved after {retryCount} retries</Text>
            )}
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => {
                Alert.alert(
                  "Raw Summary Data",
                  typeof summary === 'string' ? summary : JSON.stringify(summary),
                  [{ text: "OK" }]
                );
              }}
            >
              <Text style={styles.debugButtonText}>View Summary Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noSummaryContainer}>
            <Text style={styles.noSummaryText}>No summary available for this thesis.</Text>
            <TouchableOpacity
              style={[styles.configButton, {marginTop: 10}]}
              onPress={() => fetchThesisSummary(true)}
            >
              <Text style={styles.configButtonText}>Force Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {showApiConfig && (
        <View style={styles.configContainer}>
          <Text style={styles.configTitle}>Backend Server Configuration</Text>
          <Text style={styles.configDescription}>
            If you're running the backend on a different device, enter the server IP address:
          </Text>
          <TextInput
            style={styles.configInput}
            placeholder="http://your-ip-address:5001"
            value={newApiUrl}
            onChangeText={setNewApiUrl}
          />
          <View style={styles.configButtonsRow}>
            <TouchableOpacity 
              style={styles.configButton}
              onPress={() => {
                setApiBaseUrl(newApiUrl);
                Alert.alert(
                  "URL Updated",
                  `Backend URL changed to: ${newApiUrl}\nThe page will reload to apply changes.`
                );
              }}
            >
              <Text style={styles.configButtonText}>Save & Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.configButton, styles.cancelButton]}
              onPress={() => setShowApiConfig(false)}
            >
              <Text style={styles.configButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.configHint}>
            Tip: Use your computer's IP address instead of 127.0.0.1 or localhost when accessing from another device
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      {/* QR Code Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Access this thesis</Text>
        <ThesisQRCode handle={String(handle)} universityCode={String(universityCode)} size={200} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  thesisHeader: {
    marginBottom: 20,
  },
  thesisTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  thesisAuthor: {
    fontSize: 18,
    color: '#555',
  },
  thesisDetails: {
    fontSize: 16,
    color: '#777',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#cc0000',
    marginBottom: 10,
  },
  errorHint: {
    fontStyle: 'italic',
    color: '#888',
    fontSize: 14,
  },
  configContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginVertical: 10,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  configDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  configButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  configButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    marginHorizontal: 5,
  },
  configButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  configHint: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  retryNote: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#999',
    marginTop: 5,
  },
  noSummaryContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noSummaryText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  debugButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  debugButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  debugSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 12,
    color: '#333',
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#666',
  },
  modelInfo: {
    marginTop: 10,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'right',
  },
});