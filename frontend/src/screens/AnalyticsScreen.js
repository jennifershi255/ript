import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as Animatable from 'react-native-animatable';

import { useWorkout } from '../context/WorkoutContext';

const { width } = Dimensions.get('window');

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#667eea',
  },
};

export default function AnalyticsScreen() {
  const { analytics, workoutHistory, loadAnalytics, loadWorkoutHistory } = useWorkout();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    loadAnalytics(selectedPeriod);
    loadWorkoutHistory();
  }, [selectedPeriod]);

  useEffect(() => {
    if (workoutHistory && workoutHistory.length > 0) {
      generateChartData();
    }
  }, [workoutHistory]);

  const generateChartData = () => {
    // Generate data for the last 7 days
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    // Group workouts by date
    const workoutsByDate = {};
    workoutHistory.forEach(workout => {
      const date = new Date(workout.startTime).toISOString().split('T')[0];
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = [];
      }
      workoutsByDate[date].push(workout);
    });

    // Generate chart data
    const formAccuracyData = last7Days.map(date => {
      const dayWorkouts = workoutsByDate[date] || [];
      if (dayWorkouts.length === 0) return 0;
      
      const avgAccuracy = dayWorkouts.reduce((sum, w) => sum + (w.formAccuracy || 0), 0) / dayWorkouts.length;
      return Math.round(avgAccuracy);
    });

    const workoutCountData = last7Days.map(date => {
      return workoutsByDate[date] ? workoutsByDate[date].length : 0;
    });

    const labels = last7Days.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('en', { weekday: 'short' });
    });

    setChartData({
      formAccuracy: {
        labels,
        datasets: [{
          data: formAccuracyData,
          color: (opacity = 1) => `rgba(46, 213, 115, ${opacity})`,
          strokeWidth: 2
        }]
      },
      workoutCount: {
        labels,
        datasets: [{
          data: workoutCountData
        }]
      }
    });
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['7d', '30d', '90d'].map(period => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <Animatable.View animation="fadeInLeft" style={styles.statCard}>
        <Text style={styles.statValue}>{analytics?.totalSessions || 0}</Text>
        <Text style={styles.statLabel}>Total Workouts</Text>
      </Animatable.View>
      
      <Animatable.View animation="fadeInUp" delay={100} style={styles.statCard}>
        <Text style={styles.statValue}>{analytics?.totalReps || 0}</Text>
        <Text style={styles.statLabel}>Total Reps</Text>
      </Animatable.View>
      
      <Animatable.View animation="fadeInRight" delay={200} style={styles.statCard}>
        <Text style={styles.statValue}>{analytics?.averageFormAccuracy || 0}%</Text>
        <Text style={styles.statLabel}>Avg Form</Text>
      </Animatable.View>
    </View>
  );

  const renderFormAccuracyChart = () => {
    if (!chartData?.formAccuracy) return null;

    return (
      <Animatable.View animation="fadeInUp" delay={300} style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Form Accuracy Trend</Text>
        <LineChart
          data={chartData.formAccuracy}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </Animatable.View>
    );
  };

  const renderWorkoutFrequencyChart = () => {
    if (!chartData?.workoutCount) return null;

    return (
      <Animatable.View animation="fadeInUp" delay={400} style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Workout Frequency</Text>
        <BarChart
          data={chartData.workoutCount}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </Animatable.View>
    );
  };

  const renderExerciseBreakdown = () => {
    if (!analytics?.exerciseBreakdown || analytics.exerciseBreakdown.length === 0) {
      return null;
    }

    // Count exercises
    const exerciseCounts = {};
    analytics.exerciseBreakdown.forEach(item => {
      exerciseCounts[item.exercise] = (exerciseCounts[item.exercise] || 0) + 1;
    });

    const pieData = Object.entries(exerciseCounts).map(([exercise, count], index) => ({
      name: exercise.charAt(0).toUpperCase() + exercise.slice(1),
      population: count,
      color: ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#ffa726'][index % 5],
      legendFontColor: '#2c3e50',
      legendFontSize: 12,
    }));

    return (
      <Animatable.View animation="fadeInUp" delay={500} style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Exercise Distribution</Text>
        <PieChart
          data={pieData}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </Animatable.View>
    );
  };

  const renderRecentWorkouts = () => {
    const recentWorkouts = workoutHistory.slice(0, 5);

    if (recentWorkouts.length === 0) {
      return (
        <Animatable.View animation="fadeInUp" delay={600} style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Recent Workouts</Text>
          <Text style={styles.noDataText}>No workouts yet. Start your first workout!</Text>
        </Animatable.View>
      );
    }

    return (
      <Animatable.View animation="fadeInUp" delay={600} style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Recent Workouts</Text>
        {recentWorkouts.map((workout, index) => (
          <View key={workout._id} style={styles.workoutItem}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutExercise}>
                {workout.exercise.charAt(0).toUpperCase() + workout.exercise.slice(1)}
              </Text>
              <Text style={styles.workoutDate}>
                {new Date(workout.startTime).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.workoutStats}>
              <Text style={styles.workoutReps}>{workout.totalReps} reps</Text>
              <Text style={[
                styles.workoutAccuracy,
                { color: workout.formAccuracy >= 70 ? '#2ed573' : '#ff4757' }
              ]}>
                {workout.formAccuracy}%
              </Text>
            </View>
          </View>
        ))}
      </Animatable.View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <Text style={styles.title}>Progress Analytics</Text>
        <Text style={styles.subtitle}>Track your fitness journey</Text>
      </Animatable.View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Charts */}
      {renderFormAccuracyChart()}
      {renderWorkoutFrequencyChart()}
      {renderExerciseBreakdown()}
      {renderRecentWorkouts()}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  periodButtonActive: {
    backgroundColor: '#667eea',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 16,
    padding: 40,
  },
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  workoutDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  workoutStats: {
    alignItems: 'flex-end',
  },
  workoutReps: {
    fontSize: 14,
    color: '#2c3e50',
  },
  workoutAccuracy: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});
