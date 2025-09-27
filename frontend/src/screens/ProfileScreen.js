import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    age: user?.profile?.age?.toString() || '',
    height: user?.profile?.height?.toString() || '',
    weight: user?.profile?.weight?.toString() || '',
    fitnessLevel: user?.profile?.fitnessLevel || 'beginner',
    goals: user?.profile?.goals || []
  });

  const [preferences, setPreferences] = useState({
    notifications: {
      workout_reminders: user?.preferences?.notifications?.workout_reminders ?? true,
      progress_updates: user?.preferences?.notifications?.progress_updates ?? true,
      form_corrections: user?.preferences?.notifications?.form_corrections ?? true
    },
    units: user?.preferences?.units || 'metric'
  });

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      
      const updatedProfile = {
        ...profileData,
        age: profileData.age ? parseInt(profileData.age) : undefined,
        height: profileData.height ? parseFloat(profileData.height) : undefined,
        weight: profileData.weight ? parseFloat(profileData.weight) : undefined
      };

      const response = await userAPI.updateProfile(updatedProfile);
      
      if (response.success) {
        updateUser(response.user);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setIsLoading(true);
      
      const response = await userAPI.updatePreferences(preferences);
      
      if (response.success) {
        updateUser({ preferences: response.preferences });
        Alert.alert('Success', 'Preferences updated successfully');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const renderProfileHeader = () => (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.header}
    >
      <Animatable.View animation="fadeInDown" style={styles.headerContent}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.profile?.firstName?.[0] || user?.username?.[0] || '👤'}
          </Text>
        </View>
        <Text style={styles.userName}>
          {user?.profile?.firstName && user?.profile?.lastName 
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user?.username || 'User'
          }
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.stats?.totalWorkouts || 0}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.stats?.streakDays || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.stats?.averageFormAccuracy || 0}%</Text>
            <Text style={styles.statLabel}>Avg Form</Text>
          </View>
        </View>
      </Animatable.View>
    </LinearGradient>
  );

  const renderProfileSection = () => (
    <Animatable.View animation="fadeInUp" delay={200} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>First Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.firstName}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, firstName: text }))}
            editable={isEditing}
            placeholder="Enter first name"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.lastName}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, lastName: text }))}
            editable={isEditing}
            placeholder="Enter last name"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Age</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.age}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, age: text }))}
            editable={isEditing}
            keyboardType="numeric"
            placeholder="Age"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Height (cm)</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.height}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, height: text }))}
            editable={isEditing}
            keyboardType="numeric"
            placeholder="Height"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={profileData.weight}
            onChangeText={(text) => setProfileData(prev => ({ ...prev, weight: text }))}
            editable={isEditing}
            keyboardType="numeric"
            placeholder="Weight"
          />
        </View>
      </View>

      {isEditing && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveProfile}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>
      )}
    </Animatable.View>
  );

  const renderPreferencesSection = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>
      
      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Workout Reminders</Text>
        <Switch
          value={preferences.notifications.workout_reminders}
          onValueChange={(value) => setPreferences(prev => ({
            ...prev,
            notifications: { ...prev.notifications, workout_reminders: value }
          }))}
          trackColor={{ false: '#e9ecef', true: '#667eea' }}
          thumbColor={preferences.notifications.workout_reminders ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Progress Updates</Text>
        <Switch
          value={preferences.notifications.progress_updates}
          onValueChange={(value) => setPreferences(prev => ({
            ...prev,
            notifications: { ...prev.notifications, progress_updates: value }
          }))}
          trackColor={{ false: '#e9ecef', true: '#667eea' }}
          thumbColor={preferences.notifications.progress_updates ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceItem}>
        <Text style={styles.preferenceLabel}>Form Corrections</Text>
        <Switch
          value={preferences.notifications.form_corrections}
          onValueChange={(value) => setPreferences(prev => ({
            ...prev,
            notifications: { ...prev.notifications, form_corrections: value }
          }))}
          trackColor={{ false: '#e9ecef', true: '#667eea' }}
          thumbColor={preferences.notifications.form_corrections ? '#fff' : '#f4f3f4'}
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSavePreferences}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderActionsSection = () => (
    <Animatable.View animation="fadeInUp" delay={600} style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
        <Text style={styles.actionButtonText}>Logout</Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderProfileHeader()}
      {renderProfileSection()}
      {renderPreferencesSection()}
      {renderActionsSection()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#667eea',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputDisabled: {
    backgroundColor: '#f1f2f6',
    color: '#7f8c8d',
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  actionButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
