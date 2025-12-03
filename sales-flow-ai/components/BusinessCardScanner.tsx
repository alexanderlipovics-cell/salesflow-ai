import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface BusinessCardScannerProps {
  onScan: (data: any) => void;
}

export default function BusinessCardScanner({ onScan }: BusinessCardScannerProps) {
  const [scanning, setScanning] = useState(false);

  const takePhoto = async () => {
    // Request camera permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      alert('Permission to access camera is required!');
      return;
    }

    setScanning(true);

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      // Send image to OCR service
      await processBusinessCard(result.assets[0].uri);
    }

    setScanning(false);
  };

  const processBusinessCard = async (imageUri: string) => {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'business_card.jpg',
      } as any);

      // Send to backend for OCR processing
      const response = await fetch('http://localhost:8000/api/leads/scan-business-card', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      // Extracted data: name, email, phone, company, job_title
      onScan(data);
    } catch (error) {
      console.error('Failed to process business card:', error);
      alert('Failed to scan business card');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={takePhoto} disabled={scanning}>
      <Ionicons name="camera" size={24} color="#007AFF" />
      <Text style={styles.buttonText}>
        {scanning ? 'Processing...' : 'Scan Business Card'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  buttonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '600',
  },
});

