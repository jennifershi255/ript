import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

export default function NetworkTest() {
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const testEndpoints = [
    { name: 'Local IP', url: 'http://10.36.139.76:3000/health' },
    { name: 'Localhost', url: 'http://localhost:3000/health' },
    { name: 'Backend Root', url: 'http://10.36.139.76:3000' },
  ];

  const testConnection = async (endpoint) => {
    try {
      const response = await axios.get(endpoint.url, { timeout: 5000 });
      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  };

  const runTests = async () => {
    setIsLoading(true);
    const results = {};
    
    for (const endpoint of testEndpoints) {
      console.log(`Testing ${endpoint.name}: ${endpoint.url}`);
      results[endpoint.name] = await testConnection(endpoint);
    }
    
    setTestResults(results);
    setIsLoading(false);
    
    // Show results in alert
    const successCount = Object.values(results).filter(r => r.success).length;
    Alert.alert(
      'Network Test Results',
      `${successCount}/${testEndpoints.length} endpoints accessible`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Connectivity Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={runTests}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Backend Connection'}
        </Text>
      </TouchableOpacity>

      {Object.keys(testResults).length > 0 && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Results:</Text>
          {Object.entries(testResults).map(([name, result]) => (
            <View key={name} style={styles.resultItem}>
              <Text style={styles.resultName}>{name}:</Text>
              <Text style={[
                styles.resultStatus, 
                { color: result.success ? '#2ed573' : '#ff4757' }
              ]}>
                {result.success ? '✅ Connected' : `❌ ${result.error}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#bbb',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  results: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  resultName: {
    fontSize: 12,
    color: '#2c3e50',
    flex: 1,
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
});
