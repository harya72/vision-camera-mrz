import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MrzResult } from '../native/MrzScanner';

interface MrzResultCardProps {
  result: MrzResult;
  onClose: () => void;
  onRetry: () => void;
}

export const MrzResultCard: React.FC<MrzResultCardProps> = ({ result, onClose, onRetry }) => {
  return (
    <View style={styles.mrzContainer}>
      <Text style={styles.mrzTitle}>Passport Details:</Text>
      <ScrollView style={styles.mrzScroll}>
        {result.surname && <Text style={styles.mrzText}>Surname: <Text style={styles.mrzValue}>{result.surname}</Text></Text>}
        {result.givenNames && <Text style={styles.mrzText}>Given Names: <Text style={styles.mrzValue}>{result.givenNames}</Text></Text>}
        {result.documentNumber && <Text style={styles.mrzText}>Passport No: <Text style={styles.mrzValue}>{result.documentNumber}</Text></Text>}
        {result.dateOfBirth && <Text style={styles.mrzText}>DOB: <Text style={styles.mrzValue}>{result.dateOfBirth}</Text></Text>}
        {result.dateOfExpiry && <Text style={styles.mrzText}>Expiry: <Text style={styles.mrzValue}>{result.dateOfExpiry}</Text></Text>}
        {result.nationality && <Text style={styles.mrzText}>Nationality: <Text style={styles.mrzValue}>{result.nationality}</Text></Text>}
        {result.sex && <Text style={styles.mrzText}>Sex: <Text style={styles.mrzValue}>{result.sex}</Text></Text>}
        {result.rawText && <Text style={styles.rawText}>Raw OCR: {result.rawText}</Text>}
      </ScrollView>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#FF3B30' }]} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#34C759' }]} onPress={onRetry}>
          <Text style={styles.buttonText}>Retry Scan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mrzContainer: {
    position: 'absolute',
    top: '15%',
    left: '5%',
    width: '90%',
    maxHeight: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },
  mrzTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 15,
  },
  mrzScroll: {
    marginBottom: 15,
  },
  mrzText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  mrzValue: {
    color: '#000',
    fontWeight: '800',
  },
  rawText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
