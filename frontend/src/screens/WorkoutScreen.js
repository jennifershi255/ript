import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

import { useWorkout } from '../context/WorkoutContext';
import { analysisAPI } from '../services/api';

const { width } = Dimensions.get('window');

const EXERCISE_INFO = {
  squat: {
    name: 'Squat',
    description: 'Lower body strength exercise targeting quads, glutes, and hamstrings',
    icon: '🏋️‍♀️',
    keyPoints: [
      'Feet shoulder-width apart',
      'Knees track over toes',
      'Descend until thighs parallel to ground',
      'Keep chest up and back straight',
      'Drive through heels to stand'
    ],
    commonMistakes: [
      'Not going deep enough',
      'Knees caving inward',
      'Leaning too far forward',
      'Rising on toes'
    ]
  },
  pushup: {
    name: 'Push-up',
    description: 'Upper body exercise targeting chest, shoulders, and triceps',
    icon: '💪',
    keyPoints: [
      'Hands slightly wider than shoulders',
      'Body in straight line from head to heels',
      'Lower until chest nearly touches ground',
      'Push up explosively',
      'Keep core engaged throughout'
    ],
    commonMistakes: [
      'Sagging hips',
      'Not going low enough',
      'Flaring elbows too wide',
      'Looking up instead of down'
    ]
  },
  deadlift: {
    name: 'Deadlift',
    description: 'Full body compound exercise targeting posterior chain',
    icon: '🏋️',
    keyPoints: [
      'Feet hip-width apart',
      'Bar close to shins',
      'Neutral spine throughout',
      'Hinge at hips first',
      'Drive through heels'
    ],
    commonMistakes: [
      'Rounding the back',
      'Bar drifting away from body',
      'Not engaging lats',
      'Hyperextending at top'
    ]
  }
};

export default function WorkoutScreen({ route, navigation }) {
  const { exercise, sessionId } = route.params;
  const { currentSession, getCurrentFormAccuracy, getCurrentSessionErrors } = useWorkout();
  const [guidelines, setGuidelines] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const exerciseInfo = EXERCISE_INFO[exercise] || EXERCISE_INFO.squat;

  useEffect(() => {
    loadGuidelines();
  }, [exercise]);

  const loadGuidelines = async () => {
    try {
      const response = await analysisAPI.getGuidelines(exercise);
      if (response.success) {
        setGuidelines(response.guidelines);
      }
    } catch (error) {
      console.error('Failed to load guidelines:', error);
    }
  };

  const handleStartCamera = () => {
    if (!currentSession) {
      Alert.alert('Error', 'No active workout session');
      return;
    }

    navigation.navigate('Camera', { 
      exercise,
      sessionId: currentSession._id 
    });
  };

  const handleEndWorkout = () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: () => navigation.navigate('Home')
        }
      ]
    );
  };

  const renderKeyPoints = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Key Form Points</Text>
      {exerciseInfo.keyPoints.map((point, index) => (
        <Animatable.View
          key={index}
          animation="fadeInLeft"
          delay={index * 100}
          style={styles.listItem}
        >
          <Text style={styles.listBullet}>✓</Text>
          <Text style={styles.listText}>{point}</Text>
        </Animatable.View>
      ))}
    </View>
  );

  const renderCommonMistakes = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Common Mistakes to Avoid</Text>
      {exerciseInfo.commonMistakes.map((mistake, index) => (
        <Animatable.View
          key={index}
          animation="fadeInRight"
          delay={index * 100}
          style={styles.listItem}
        >
          <Text style={styles.listBulletError}>✗</Text>
          <Text style={styles.listText}>{mistake}</Text>
        </Animatable.View>
      ))}
    </View>
  );

  const renderSessionStats = () => {
    if (!currentSession) return null;

    const formAccuracy = getCurrentFormAccuracy();
    const sessionErrors = getCurrentSessionErrors();

    return (
      <Animatable.View animation="fadeInUp" style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Current Session</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formAccuracy}%</Text>
            <Text style={styles.statLabel}>Form Accuracy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessionErrors.length}</Text>
            <Text style={styles.statLabel}>Error Types</Text>
          </View>
        </View>
        
        {sessionErrors.length > 0 && (
          <View style={styles.errorsContainer}>
            <Text style={styles.errorsTitle}>Most Common Errors:</Text>
            {sessionErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                • {error.error.replace('_', ' ')} ({error.count}x)
              </Text>
            ))}
          </View>
        )}
      </Animatable.View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInDown" style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseIcon}>{exerciseInfo.icon}</Text>
            <Text style={styles.exerciseTitle}>{exerciseInfo.name}</Text>
            <Text style={styles.exerciseDescription}>{exerciseInfo.description}</Text>
          </View>
        </Animatable.View>
      </LinearGradient>

      {/* Session Stats */}
      {renderSessionStats()}

      {/* Content */}
      <View style={styles.content}>
        {/* Setup Instructions */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.setupCard}>
          <Text style={styles.setupTitle}>📱 Camera Setup</Text>
          <View style={styles.setupList}>
            <Text style={styles.setupItem}>• Position camera at chest level</Text>
            <Text style={styles.setupItem}>• Stand 6 feet away from camera</Text>
            <Text style={styles.setupItem}>• Ensure good lighting</Text>
            <Text style={styles.setupItem}>• Wear fitted clothing</Text>
          </View>
        </Animatable.View>

        {/* Form Guidelines */}
        {renderKeyPoints()}
        {renderCommonMistakes()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartCamera}
          >
            <LinearGradient
              colors={['#2ed573', '#17c0eb']}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>Start AI Analysis</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleEndWorkout}
          >
            <Text style={styles.secondaryButtonText}>End Workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  exerciseHeader: {
    flex: 1,
  },
  exerciseIcon: {
    fontSize: 40,
    marginBottom: 5,
  },
  exerciseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  exerciseDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  errorsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 15,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginBottom: 5,
  },
  content: {
    padding: 20,
  },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  setupList: {
    paddingLeft: 10,
  },
  setupItem: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  listBullet: {
    color: '#2ed573',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    marginTop: 2,
  },
  listBulletError: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 40,
  },
  primaryButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
  },
  buttonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
});
