import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';

const { width } = Dimensions.get('window');

const EXERCISES = [
  {
    id: 'squat',
    name: 'Squat',
    description: 'Lower body strength exercise',
    icon: '🏋️‍♀️',
    difficulty: 'Beginner',
    duration: '5-10 mins',
    color: ['#667eea', '#764ba2']
  },
  {
    id: 'pushup',
    name: 'Push-up',
    description: 'Upper body strength exercise',
    icon: '💪',
    difficulty: 'Beginner',
    duration: '5-10 mins',
    color: ['#f093fb', '#f5576c']
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    description: 'Full body compound exercise',
    icon: '🏋️',
    difficulty: 'Intermediate',
    duration: '10-15 mins',
    color: ['#4facfe', '#00f2fe']
  },
  {
    id: 'lunge',
    name: 'Lunge',
    description: 'Lower body unilateral exercise',
    icon: '🦵',
    difficulty: 'Beginner',
    duration: '5-10 mins',
    color: ['#43e97b', '#38f9d7']
  }
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { analytics, loadAnalytics, startWorkoutSession } = useWorkout();
  const [selectedExercise, setSelectedExercise] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleStartWorkout = async (exercise) => {
    try {
      const result = await startWorkoutSession(exercise.id);
      
      if (result.success) {
        navigation.navigate('Workout', { 
          exercise: exercise.id,
          sessionId: result.session._id 
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to start workout session');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout session');
    }
  };

  const renderExerciseCard = (exercise, index) => (
    <Animatable.View
      key={exercise.id}
      animation="fadeInUp"
      delay={index * 200}
      style={styles.exerciseCard}
    >
      <TouchableOpacity
        onPress={() => handleStartWorkout(exercise)}
        style={styles.exerciseCardTouchable}
      >
        <LinearGradient
          colors={exercise.color}
          style={styles.exerciseCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.exerciseCardContent}>
            <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseDescription}>{exercise.description}</Text>
            
            <View style={styles.exerciseDetails}>
              <View style={styles.exerciseDetailItem}>
                <Text style={styles.exerciseDetailLabel}>Level</Text>
                <Text style={styles.exerciseDetailValue}>{exercise.difficulty}</Text>
              </View>
              <View style={styles.exerciseDetailItem}>
                <Text style={styles.exerciseDetailLabel}>Duration</Text>
                <Text style={styles.exerciseDetailValue}>{exercise.duration}</Text>
              </View>
            </View>
            
            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>Start Workout</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderStatsCard = () => (
    <Animatable.View animation="fadeInDown" style={styles.statsCard}>
      <Text style={styles.statsTitle}>Your Progress</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics?.totalSessions || 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics?.totalReps || 0}</Text>
          <Text style={styles.statLabel}>Total Reps</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{analytics?.averageFormAccuracy || 0}%</Text>
          <Text style={styles.statLabel}>Avg Form</Text>
        </View>
      </View>
    </Animatable.View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {user?.profile?.firstName || user?.username || 'Athlete'}! 👋
        </Text>
        <Text style={styles.subtitle}>Ready for your next workout?</Text>
      </Animatable.View>

      {/* Stats Card */}
      {renderStatsCard()}

      {/* Exercise Selection */}
      <View style={styles.exercisesSection}>
        <Text style={styles.sectionTitle}>Choose Your Exercise</Text>
        <Text style={styles.sectionSubtitle}>
          AI-powered form analysis for perfect technique
        </Text>
        
        <View style={styles.exercisesGrid}>
          {EXERCISES.map((exercise, index) => renderExerciseCard(exercise, index))}
        </View>
      </View>

      {/* Quick Tips */}
      <Animatable.View animation="fadeInUp" delay={800} style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Quick Tips</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>• Ensure good lighting for accurate pose detection</Text>
          <Text style={styles.tipItem}>• Position camera at chest level, 6 feet away</Text>
          <Text style={styles.tipItem}>• Wear fitted clothing for better tracking</Text>
          <Text style={styles.tipItem}>• Follow the on-screen guidance for proper form</Text>
        </View>
      </Animatable.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  statsCard: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  exercisesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  exerciseCard: {
    width: (width - 50) / 2,
    marginBottom: 15,
  },
  exerciseCardTouchable: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  exerciseCardGradient: {
    padding: 20,
    minHeight: 200,
  },
  exerciseCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  exerciseIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  exerciseDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  exerciseDetails: {
    marginBottom: 15,
  },
  exerciseDetailItem: {
    marginBottom: 5,
  },
  exerciseDetailLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  exerciseDetailValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tipsCard: {
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
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  tipsList: {
    paddingLeft: 10,
  },
  tipItem: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 20,
  },
});
