import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface ThesisQRCodeProps {
  handle: string;
  universityCode: string;
  size?: number;
}

export const ThesisQRCode = ({ handle, universityCode, size = 150 }: ThesisQRCodeProps & { universityCode?: string }) => {
  console.log(handle, universityCode);
  // Format the handle into a proper URL for the QR code
  const getThesisUrl = (handle: string) => {
    // Return empty string if handle is empty
    if (!handle) return '';
    
    // If it's already a full URL, use it directly
    if (handle.startsWith('http')) {
      return handle;
    }
    
    // Remove any hash characters that might be present
    const cleanHandle = handle.replace(/^#/, '');
    // Check for university-specific URL structures
    if (universityCode === 'AALTO') {
      return `https://aaltodoc.aalto.fi${cleanHandle}`;
    } else if (universityCode === 'HELDA') {
      return `https://helda.helsinki.fi${cleanHandle}`;
    } else if (universityCode ==='TREPO') {
      return `https://trepo.tuni.fi${cleanHandle}`;
    } else if (universityCode === 'OULUREPO') {
      return `https://oulurepo.oulu.fi${cleanHandle}`;
    }  else if (universityCode === 'LUTPUB') {
      return `https://lutpub.lut.fi${cleanHandle}`;
    } else {
      // If it's a handle with /handle/ prefix, use it
      if (cleanHandle.startsWith('/handle/')) {
        return `https://www.theseus.fi${cleanHandle}`;
      }
      
      // If it's just the handle ID, add the proper prefix
      return `https://www.theseus.fi/handle/${cleanHandle}`;
    }
  };
  
  const thesisUrl = getThesisUrl(handle);
  console.log("Generated QR code URL:", thesisUrl);
  
  return (
    <View style={styles.qrContainer}>
      <QRCode value={thesisUrl} size={size} />
      <Text style={styles.urlText}>{thesisUrl}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  qrContainer: {
    alignItems: 'center',
    padding: 15,
    marginVertical: 10,
  },
  urlText: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  }
});
