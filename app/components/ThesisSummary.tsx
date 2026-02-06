import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface ThesisSummaryProps {
  summary: string;
  title: string;
  model?: string;
}

export const ThesisSummary = ({ summary, title, model }: ThesisSummaryProps) => {
  // Add more debugging to trace the issue
  console.log("ThesisSummary component received:", { 
    summary: summary?.substring(0, 50) + "...", 
    type: typeof summary,
    length: summary?.length 
  });
  
  // Safety check for empty summary
  if (!summary || summary.trim() === "") {
    console.warn("Empty summary received for:", title);
    return (
      <View style={[styles.summaryContainer, styles.errorContainer]}>
        <Text style={styles.errorText}>No summary content available.</Text>
      </View>
    );
  }
  
  // Ensure summary is a string
  const summaryText = typeof summary === 'string' 
    ? summary 
    : JSON.stringify(summary);
  
  // Create bullet points if they don't already exist
  let points: string[] = [];
  
  if (summaryText.includes('•')) {
    // Summary already has bullet points, just split them
    points = summaryText
      .split('•')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  } else {
    // Create bullet points from sentences
    const sentences = summaryText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    points = sentences.slice(0, 3).map(s => s.trim());
  }
  
  // Ensure we have at least one point
  if (points.length === 0) {
    console.warn("No valid points found in summary, using entire text");
    points = [summaryText];
  }

  // Debug the points extraction
  console.log(`Extracted ${points.length} points from summary`);

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Key Points</Text>
      
      {points.map((point, index) => (
        <View key={index} style={styles.bulletPoint}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.pointText}>{point}</Text>
        </View>
      ))}
      
      <Text style={styles.modelInfo}>Generated using {model || 'AI'} model</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    maxHeight: 400,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletSymbol: {
    marginRight: 8,
    fontSize: 16,
    color: '#007BFF',
  },
  pointText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#444',
  },
  plainSummary: {
    fontSize: 16,
    lineHeight: 22,
    color: '#444',
  },
  modelInfo: {
    marginTop: 15,
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'right',
  },
  errorContainer: {
    backgroundColor: '#fff8f8',
    borderColor: '#ffcccc',
  },
  errorText: {
    color: '#d63031',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
