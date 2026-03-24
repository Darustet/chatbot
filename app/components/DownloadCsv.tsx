import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';

export const DownloadCsv = ({ elements }) => {
  // Define column headers for CSV
  const fileHeaders = [
    'title',
    'university',
    'author',
    'date',
    'nokiaScore',
    'link'
  ];

  function escapeCSV(value: any, delimiter = ';') {
    if (value == null) return '';

    const stringValue = String(value);

    // If value contains delimiter, quotes, or newline → wrap in quotes
    if (
      stringValue.includes(delimiter) ||
      stringValue.includes('"') ||
      stringValue.includes('\n')
    ) {
      // Escape quotes by doubling them
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return stringValue;
  }

  function convertJSONToCSV(jsonData: any, columnHeaders: any) {
    if (jsonData.length === 0) {
      return '';
    }

    // Create headers string
    const headers = columnHeaders.join(';') + '\n';

    // Map JSON data to CSV rows
    const rows = jsonData
      .map((row: any) => {
        // Map each row to CSV format
        return columnHeaders.map((field: any) => escapeCSV(row[field] || ''))
        .join(';');
      })
      .join('\n');

    // Combine headers and rows
    return headers + rows;
  }

  // Function to initiate CSV download
  function downloadCSV(jsonData: any, headers: any) {
    const csvData = convertJSONToCSV(jsonData, headers);

    // Check if CSV data is empty
    if (csvData === '') {
      alert('No data to export');
    } else {
      // Create CSV file and initiate download
      const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'product_data.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Render the button for CSV export
  return (
    <TouchableOpacity
      style={styles.searchButton}
      onPress={() => {downloadCSV(elements, fileHeaders)}}
    >
      <Text style={styles.searchButtonText}>Export CSV</Text>
    </TouchableOpacity>
  );
};

export default () => <DownloadCsv elements />;

const styles = StyleSheet.create({
  searchButton: {
    alignSelf: "center",
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
