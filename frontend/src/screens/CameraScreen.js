import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar
} from 'react-native';
import { Camera } from 'expo-camera';
// TensorFlow imports removed for now - will be added back when implementing real pose detection
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { useWorkout } from '../context/WorkoutContext';
import { analysisAPI } from '../services/api';
import PoseDetector from '../services/PoseDetector';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ route, navigation }) {
  const { exercise, sessionId } = route.params;
  const {
    currentSession,
    isRecording,
    repCount,
    addPoseData,
    addFeedback,
    incrementRepCount,
    startRecording,
    stopRecording,
    endWorkoutSession
  } = useWorkout();

  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPose, setCurrentPose] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [formScore, setFormScore] = useState(100);
  const [repPhase, setRepPhase] = useState('starting');
  
  const cameraRef = useRef(null);
  const poseDetector = useRef(null);
  const analysisInterval = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    // Initialize pose detector
    initializePoseDetector();

    return () => {
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && hasPermission) {
      startPoseAnalysis();
    } else {
      stopPoseAnalysis();
    }
  }, [isRecording, hasPermission]);

  const initializePoseDetector = async () => {
    try {
      poseDetector.current = new PoseDetector();
      await poseDetector.current.initialize();
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      Alert.alert('Error', 'Failed to initialize pose detection');
    }
  };

  const startPoseAnalysis = () => {
    if (analysisInterval.current) return;

    analysisInterval.current = setInterval(async () => {
      if (cameraRef.current && !isAnalyzing) {
        await analyzePose();
      }
    }, 200); // Analyze every 200ms (5 FPS)
  };

  const stopPoseAnalysis = () => {
    if (analysisInterval.current) {
      clearInterval(analysisInterval.current);
      analysisInterval.current = null;
    }
  };

  const analyzePose = async () => {
    try {
      setIsAnalyzing(true);

      // Capture frame from camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: true,
        skipProcessing: true
      });

      // Detect pose using MediaPipe
      const poseData = await poseDetector.current.detectPose(photo.uri);
      
      if (poseData && poseData.keypoints) {
        setCurrentPose(poseData);

        // Analyze form using backend
        const analysis = await analysisAPI.analyzePose(poseData, exercise, repCount);
        
        if (analysis.success) {
          const { angles, feedback: feedbackMessages, formScore: score, phase } = analysis.analysis;
          
          // Update UI
          setFeedback(feedbackMessages || []);
          setFormScore(score || 100);
          setRepPhase(phase || 'starting');

          // Add data to workout context
          await addPoseData({
            keypoints: poseData.keypoints,
            angles,
            repNumber: repCount,
            phase
          });

          // Add feedback if there are corrections
          if (feedbackMessages && feedbackMessages.length > 0) {
            await addFeedback({
              repNumber: repCount,
              messages: feedbackMessages,
              formScore: score,
              timestamp: new Date().toISOString()
            });
          }

          // Check for rep completion (simplified logic)
          if (phase === 'completed' && repPhase !== 'completed') {
            incrementRepCount();
          }
        }
      }
    } catch (error) {
      console.error('Pose analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartStop = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleEndWorkout = async () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            stopRecording();
            const result = await endWorkoutSession();
            if (result.success) {
              navigation.navigate('Home');
            }
          }
        }
      ]
    );
  };

  const renderPoseOverlay = () => {
    if (!currentPose || !currentPose.keypoints) return null;

    const keypoints = currentPose.keypoints;
    const scaleX = width / 640; // Assuming camera resolution
    const scaleY = height / 480;

    return (
      <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
        {/* Draw pose skeleton */}
        {Object.entries(keypoints).map(([name, point], index) => {
          if (point.visibility > 0.5) {
            return (
              <Circle
                key={index}
                cx={point.x * scaleX}
                cy={point.y * scaleY}
                r="4"
                fill={formScore > 70 ? '#00ff00' : '#ff0000'}
                opacity={point.visibility}
              />
            );
          }
          return null;
        })}

        {/* Draw connections between keypoints */}
        {renderPoseConnections(keypoints, scaleX, scaleY)}
      </Svg>
    );
  };

  const renderPoseConnections = (keypoints, scaleX, scaleY) => {
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];

    return connections.map(([start, end], index) => {
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];
      
      if (startPoint && endPoint && startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
        return (
          <Line
            key={index}
            x1={startPoint.x * scaleX}
            y1={startPoint.y * scaleY}
            x2={endPoint.x * scaleX}
            y2={endPoint.y * scaleY}
            stroke={formScore > 70 ? '#00ff00' : '#ff0000'}
            strokeWidth="2"
            opacity="0.7"
          />
        );
      }
      return null;
    });
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        ratio="16:9"
      >
        {/* Pose Overlay */}
        {renderPoseOverlay()}

        {/* Top UI */}
        <View style={styles.topUI}>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseTitle}>{exercise.toUpperCase()}</Text>
            <Text style={styles.repCount}>Rep: {repCount}</Text>
          </View>
          
          <View style={styles.formScore}>
            <Text style={styles.formScoreText}>{formScore}%</Text>
            <Text style={styles.formScoreLabel}>Form</Text>
          </View>
        </View>

        {/* Feedback Area */}
        <View style={styles.feedbackArea}>
          {feedback.length > 0 && (
            <View style={styles.feedbackContainer}>
              {feedback.slice(0, 2).map((message, index) => (
                <Text key={index} style={styles.feedbackText}>
                  {message}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setCameraType(
              cameraType === Camera.Constants.Type.back
                ? Camera.Constants.Type.front
                : Camera.Constants.Type.back
            )}
          >
            <Text style={styles.controlButtonText}>Flip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recordButton,
              { backgroundColor: isRecording ? '#ff4757' : '#2ed573' }
            ]}
            onPress={handleStartStop}
          >
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleEndWorkout}
          >
            <Text style={styles.controlButtonText}>End</Text>
          </TouchableOpacity>
        </View>

        {/* Rep Phase Indicator */}
        <View style={styles.phaseIndicator}>
          <Text style={styles.phaseText}>{repPhase}</Text>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topUI: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  exerciseInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 10,
  },
  exerciseTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  repCount: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
  },
  formScore: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  formScoreText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  formScoreLabel: {
    color: '#fff',
    fontSize: 12,
  },
  feedbackArea: {
    position: 'absolute',
    top: height * 0.3,
    left: 20,
    right: 20,
  },
  feedbackContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  phaseIndicator: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  phaseText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
