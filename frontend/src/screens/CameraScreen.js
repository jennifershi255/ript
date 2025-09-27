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
import { CameraView, useCameraPermissions } from 'expo-camera';
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

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState('front');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPose, setCurrentPose] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [formScore, setFormScore] = useState(100);
  const [repPhase, setRepPhase] = useState('starting');
  const [squatState, setSquatState] = useState('standing'); // 'standing', 'descending', 'bottom', 'ascending'
  const [lastKneeAngle, setLastKneeAngle] = useState(null);
  const [repInProgress, setRepInProgress] = useState(false);
  
  const cameraRef = useRef(null);
  const poseDetector = useRef(null);
  const analysisInterval = useRef(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }

    // Initialize pose detector
    initializePoseDetector();

    return () => {
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && permission?.granted) {
      startPoseAnalysis();
    } else {
      stopPoseAnalysis();
    }
  }, [isRecording, permission?.granted]);

  const initializePoseDetector = async () => {
    try {
      poseDetector.current = new PoseDetector();
      await poseDetector.current.initialize();
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      Alert.alert('Error', 'Failed to initialize pose detection');
    }
  };

  // Calculate angle between three points
  const calculateAngle = (point1, point2, point3) => {
    if (!point1 || !point2 || !point3) return null;
    
    const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) - 
                   Math.atan2(point1.y - point2.y, point1.x - point2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  };

  // Detect squat phases based on knee angle and hip position
  const detectSquatPhase = (keypoints) => {
    if (!keypoints) return null;

    const leftHip = keypoints.left_hip;
    const leftKnee = keypoints.left_knee;
    const leftAnkle = keypoints.left_ankle;
    const rightHip = keypoints.right_hip;
    const rightKnee = keypoints.right_knee;
    const rightAnkle = keypoints.right_ankle;

    // Calculate knee angles
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    if (!leftKneeAngle || !rightKneeAngle) return null;

    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    
    // Squat phase detection logic
    let newPhase = 'standing';
    let newState = squatState;
    let shouldIncrementRep = false;

    if (avgKneeAngle > 160) {
      // Standing position
      if (squatState === 'ascending' && repInProgress) {
        // Completed a full rep
        shouldIncrementRep = true;
        setRepInProgress(false);
        newPhase = 'completed';
      } else {
        newPhase = 'standing';
      }
      newState = 'standing';
    } else if (avgKneeAngle > 120 && avgKneeAngle <= 160) {
      // Descending or ascending
      if (squatState === 'standing') {
        newState = 'descending';
        newPhase = 'descending';
        setRepInProgress(true);
      } else if (squatState === 'bottom') {
        newState = 'ascending';
        newPhase = 'ascending';
      }
    } else if (avgKneeAngle <= 120) {
      // Bottom position
      newState = 'bottom';
      newPhase = 'bottom';
    }

    setSquatState(newState);
    setLastKneeAngle(avgKneeAngle);
    
    return {
      phase: newPhase,
      kneeAngle: avgKneeAngle,
      shouldIncrementRep
    };
  };

  const startPoseAnalysis = () => {
    if (analysisInterval.current) return;

    analysisInterval.current = setInterval(async () => {
      if (cameraRef.current && !isAnalyzing && permission?.granted) {
        await analyzePose();
      }
    }, 500); // Analyze every 500ms (2 FPS) to reduce load
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

      // Check if camera ref is still valid
      if (!cameraRef.current) {
        console.log('Camera ref is null, skipping analysis');
        return;
      }

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

        // Detect squat phase locally
        const squatAnalysis = detectSquatPhase(poseData.keypoints);
        
        if (squatAnalysis) {
          setRepPhase(squatAnalysis.phase);
          
          // Update form score based on knee angle and posture
          let calculatedFormScore = 100;
          if (squatAnalysis.kneeAngle < 90) {
            calculatedFormScore = Math.max(60, 100 - (90 - squatAnalysis.kneeAngle) * 2);
          } else if (squatAnalysis.kneeAngle > 170) {
            calculatedFormScore = Math.max(70, 100 - (squatAnalysis.kneeAngle - 170) * 3);
          }
          
          setFormScore(calculatedFormScore);
          
          // Generate feedback based on form
          const feedbackMessages = [];
          if (squatAnalysis.kneeAngle < 90) {
            feedbackMessages.push("Go deeper! Squat lower.");
          } else if (squatAnalysis.kneeAngle > 170) {
            feedbackMessages.push("Good form! Keep it up.");
          } else if (squatAnalysis.phase === 'bottom') {
            feedbackMessages.push("Perfect depth! Now push up.");
          } else if (squatAnalysis.phase === 'ascending') {
            feedbackMessages.push("Drive through your heels!");
          }
          
          setFeedback(feedbackMessages);

          // Increment rep count only when a proper squat is completed
          if (squatAnalysis.shouldIncrementRep) {
            incrementRepCount();
          }

          // Add data to workout context
          await addPoseData({
            keypoints: poseData.keypoints,
            angles: { kneeAngle: squatAnalysis.kneeAngle },
            repNumber: repCount,
            phase: squatAnalysis.phase
          });

          // Add feedback if there are corrections
          if (feedbackMessages.length > 0) {
            await addFeedback({
              repNumber: repCount,
              messages: feedbackMessages,
              formScore: calculatedFormScore,
              timestamp: new Date().toISOString()
            });
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

  const getJointColor = (jointName, confidence) => {
    // Color joints based on their importance for squats and confidence
    const importantJoints = ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
    const upperBodyJoints = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'];
    
    if (confidence < 0.5) return '#666666'; // Low confidence - gray
    
    if (importantJoints.includes(jointName)) {
      // Important joints for squats - green to red based on form score
      return formScore > 80 ? '#00ff00' : formScore > 60 ? '#ffff00' : '#ff4500';
    } else if (upperBodyJoints.includes(jointName)) {
      // Upper body - blue tones
      return formScore > 70 ? '#00bfff' : '#4169e1';
    } else {
      // Other joints - purple
      return '#9370db';
    }
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
          if (point.visibility > 0.3) {
            const jointColor = getJointColor(name, point.visibility);
            const radius = point.visibility > 0.7 ? 6 : 4;
            
            return (
              <Circle
                key={index}
                cx={point.x * scaleX}
                cy={point.y * scaleY}
                r={radius}
                fill={jointColor}
                stroke="#ffffff"
                strokeWidth="1"
                opacity={Math.max(0.7, point.visibility)}
              />
            );
          }
          return null;
        })}

        {/* Draw connections between keypoints */}
        {renderPoseConnections(keypoints, scaleX, scaleY)}
        
        {/* Add form quality indicator */}
        {formScore && (
          <Circle
            cx={width - 60}
            cy={120}
            r="25"
            fill={formScore > 80 ? '#00ff00' : formScore > 60 ? '#ffff00' : '#ff4500'}
            opacity="0.8"
          />
        )}
        
        {/* Add knee angle indicator */}
        {lastKneeAngle && (
          <SvgText
            x={width - 60}
            y={160}
            fontSize="12"
            fill="#ffffff"
            textAnchor="middle"
            fontWeight="bold"
          >
            {Math.round(lastKneeAngle)}°
          </SvgText>
        )}
      </Svg>
    );
  };

  const getConnectionColor = (start, end) => {
    const legConnections = [
      'left_hip-left_knee', 'left_knee-left_ankle', 
      'right_hip-right_knee', 'right_knee-right_ankle'
    ];
    const torsoConnections = [
      'left_shoulder-right_shoulder', 'left_hip-right_hip',
      'left_shoulder-left_hip', 'right_shoulder-right_hip'
    ];
    
    const connectionKey = `${start}-${end}`;
    
    if (legConnections.includes(connectionKey)) {
      return formScore > 80 ? '#00ff00' : formScore > 60 ? '#ffff00' : '#ff4500';
    } else if (torsoConnections.includes(connectionKey)) {
      return formScore > 70 ? '#00bfff' : '#4169e1';
    } else {
      return '#9370db';
    }
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
      
      if (startPoint && endPoint && startPoint.visibility > 0.4 && endPoint.visibility > 0.4) {
        const connectionColor = getConnectionColor(start, end);
        const strokeWidth = ['left_hip', 'right_hip', 'left_knee', 'right_knee'].includes(start) || 
                           ['left_hip', 'right_hip', 'left_knee', 'right_knee'].includes(end) ? 3 : 2;
        
        return (
          <Line
            key={index}
            x1={startPoint.x * scaleX}
            y1={startPoint.y * scaleY}
            x2={endPoint.x * scaleX}
            y2={endPoint.y * scaleY}
            stroke={connectionColor}
            strokeWidth={strokeWidth}
            opacity="0.8"
          />
        );
      }
      return null;
    });
  };

  if (!permission) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
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
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
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
              cameraType === 'back'
                ? 'front'
                : 'back'
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
      </CameraView>
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
