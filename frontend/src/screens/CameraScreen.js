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
import Svg, { Circle, Line, Text as SvgText, Polygon } from 'react-native-svg';

import { useWorkout } from '../context/WorkoutContext';
import { analysisAPI } from '../services/api';
import RealPoseDetector from '../services/RealPoseDetector';

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
  const [detectionStatus, setDetectionStatus] = useState('initializing'); // 'initializing', 'mediapipe', 'tensorflow', 'mock'
  const [poseSource, setPoseSource] = useState('unknown');
  
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
      setDetectionStatus('initializing');
      poseDetector.current = new RealPoseDetector();
      await poseDetector.current.initialize();
      
      // Determine which detection method is being used
      if (poseDetector.current.useWebViewDetection) {
        setDetectionStatus('webview');
      } else {
        setDetectionStatus('mock');
      }
      
      console.log('Pose detector initialized with status:', detectionStatus);
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      setDetectionStatus('mock');
      Alert.alert('Pose Detection', 'Using enhanced simulation mode for pose tracking');
    }
  };

  // Calculate angle between three points (interior angle at point2)
  const calculateAngle = (point1, point2, point3) => {
    if (!point1 || !point2 || !point3) return null;
    
    // Calculate vectors from point2 to point1 and point2 to point3
    const vector1 = {
      x: point1.x - point2.x,
      y: point1.y - point2.y
    };
    const vector2 = {
      x: point3.x - point2.x,
      y: point3.y - point2.y
    };
    
    // Calculate dot product and magnitudes
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    if (magnitude1 === 0 || magnitude2 === 0) return null;
    
    // Calculate angle using dot product formula
    const cosAngle = dotProduct / (magnitude1 * magnitude2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180.0 / Math.PI;
    
    return angle;
  };

  // Detect squat phases using GitHub repo methodology
  const detectSquatPhase = (poseData) => {
    if (!poseData || !poseData.keypoints) return null;

    // Validate pose quality first
    const validation = poseDetector.current?.validatePose(poseData);
    if (!validation?.isValid) {
      console.log('Invalid pose:', validation?.reason);
      return null;
    }

    // Extract angles using the GitHub repo method
    const angles = poseDetector.current?.extractSquatAngles(poseData.keypoints);
    if (!angles || !angles.avg_knee_angle) return null;

    const kneeAngle = angles.avg_knee_angle;
    const hipAngle = angles.avg_hip_angle;
    
    console.log(`Squat Analysis - Knee: ${kneeAngle?.toFixed(1)}°, Hip: ${hipAngle?.toFixed(1)}°, State: ${squatState}`);
    
    // Squat phase detection based on biomechanics from GitHub repo
    let newPhase = 'standing';
    let newState = squatState;
    let shouldIncrementRep = false;

    // Thresholds based on squat biomechanics research
    const STANDING_KNEE_ANGLE = 160;  // Nearly straight legs
    const SQUAT_TRANSITION_ANGLE = 120; // Transition zone
    const DEEP_SQUAT_ANGLE = 90;      // Good squat depth

    if (kneeAngle >= STANDING_KNEE_ANGLE) {
      // Standing position - legs nearly straight
      if (squatState === 'ascending' && repInProgress) {
        // Completed a full rep
        shouldIncrementRep = true;
        setRepInProgress(false);
        newPhase = 'completed';
        console.log('✅ Rep completed! Knee angle:', kneeAngle);
      } else {
        newPhase = 'standing';
      }
      newState = 'standing';
    } else if (kneeAngle > SQUAT_TRANSITION_ANGLE && kneeAngle < STANDING_KNEE_ANGLE) {
      // Transition zone - descending or ascending
      if (squatState === 'standing') {
        newState = 'descending';
        newPhase = 'descending';
        setRepInProgress(true);
        console.log('⬇️ Starting squat descent, knee angle:', kneeAngle);
      } else if (squatState === 'bottom') {
        newState = 'ascending';
        newPhase = 'ascending';
        console.log('⬆️ Ascending from squat, knee angle:', kneeAngle);
      }
    } else if (kneeAngle <= SQUAT_TRANSITION_ANGLE) {
      // Bottom position - good squat depth
      newState = 'bottom';
      newPhase = 'bottom';
      console.log('🔽 At squat bottom, knee angle:', kneeAngle);
    }

    setSquatState(newState);
    setLastKneeAngle(kneeAngle);
    
    // Calculate form score based on angles (from GitHub repo methodology)
    let formScore = 100;
    
    if (kneeAngle < DEEP_SQUAT_ANGLE) {
      // Excellent depth
      formScore = 95;
    } else if (kneeAngle < SQUAT_TRANSITION_ANGLE) {
      // Good depth
      formScore = 85;
    } else if (kneeAngle < 140) {
      // Moderate depth
      formScore = 70;
    } else {
      // Poor depth or standing
      formScore = kneeAngle >= STANDING_KNEE_ANGLE ? 100 : 60;
    }
    
    // Adjust for hip angle if available
    if (hipAngle) {
      if (hipAngle < 90 || hipAngle > 120) {
        formScore -= 10; // Penalize poor hip position
      }
    }
    
    return {
      phase: newPhase,
      kneeAngle: kneeAngle,
      hipAngle: hipAngle,
      formScore: Math.max(50, Math.min(100, formScore)),
      shouldIncrementRep,
      angles: angles
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

      // Detect pose using the real pose detector
      const poseData = await poseDetector.current.detectPose(photo.uri);
      
      if (poseData && poseData.keypoints) {
        setCurrentPose(poseData);
        setPoseSource(poseData.source || 'unknown');

        // Detect squat phase using real pose analysis
        const squatAnalysis = detectSquatPhase(poseData);
        
        if (squatAnalysis) {
          setRepPhase(squatAnalysis.phase);
          
          // Use calculated form score from analysis
          setFormScore(Math.round(squatAnalysis.formScore));
          
          // Generate feedback based on GitHub repo methodology
          const feedbackMessages = [];
          const { kneeAngle, hipAngle, phase } = squatAnalysis;
          
          if (phase === 'descending') {
            if (kneeAngle > 140) {
              feedbackMessages.push("Go deeper! Squat lower for better results.");
            } else {
              feedbackMessages.push("Good descent! Keep going down.");
            }
          } else if (phase === 'bottom') {
            if (kneeAngle < 90) {
              feedbackMessages.push("Excellent depth! Perfect squat form.");
            } else if (kneeAngle < 120) {
              feedbackMessages.push("Good depth! Now push up through your heels.");
            } else {
              feedbackMessages.push("Try to go deeper for better muscle activation.");
            }
          } else if (phase === 'ascending') {
            feedbackMessages.push("Drive up! Push through your heels.");
          } else if (phase === 'completed') {
            feedbackMessages.push("Great rep! Keep the momentum going.");
          } else {
            feedbackMessages.push("Ready to squat! Maintain good posture.");
          }
          
          // Add hip angle feedback if available
          if (hipAngle && (hipAngle < 90 || hipAngle > 120)) {
            feedbackMessages.push("Keep your back straight and chest up.");
          }
          
          setFeedback(feedbackMessages);

          // Increment rep count only when a proper squat is completed
          if (squatAnalysis.shouldIncrementRep) {
            incrementRepCount();
          }

          // Add data to workout context with all angles
          await addPoseData({
            keypoints: poseData.keypoints,
            angles: squatAnalysis.angles,
            repNumber: repCount,
            phase: squatAnalysis.phase
          });

          // Add feedback
          if (feedbackMessages.length > 0) {
            await addFeedback({
              repNumber: repCount,
              messages: feedbackMessages,
              formScore: squatAnalysis.formScore,
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

  const renderHumanSilhouette = (keypoints, scaleX, scaleY) => {
    // Check if we have enough keypoints for a silhouette
    const requiredPoints = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
    const availablePoints = requiredPoints.filter(name => keypoints[name] && keypoints[name].visibility > 0.4);
    
    if (availablePoints.length < 6) return null;

    // Get silhouette color based on form
    const silhouetteColor = formScore > 80 ? '#00ff0040' : formScore > 60 ? '#ffff0040' : '#ff450040';
    
    // Create body parts as filled shapes
    const bodyParts = [];
    
    // Torso (shoulders to hips)
    if (keypoints.left_shoulder && keypoints.right_shoulder && keypoints.left_hip && keypoints.right_hip) {
      const torsoPoints = [
        `${keypoints.left_shoulder.x * scaleX},${keypoints.left_shoulder.y * scaleY}`,
        `${keypoints.right_shoulder.x * scaleX},${keypoints.right_shoulder.y * scaleY}`,
        `${keypoints.right_hip.x * scaleX},${keypoints.right_hip.y * scaleY}`,
        `${keypoints.left_hip.x * scaleX},${keypoints.left_hip.y * scaleY}`
      ].join(' ');
      
      bodyParts.push(
        <Polygon
          key="torso"
          points={torsoPoints}
          fill={silhouetteColor}
          stroke={formScore > 70 ? '#00ff00' : '#ff4500'}
          strokeWidth="2"
          opacity="0.7"
        />
      );
    }
    
    // Left leg (hip to ankle)
    if (keypoints.left_hip && keypoints.left_knee && keypoints.left_ankle) {
      const legWidth = 15;
      const hipX = keypoints.left_hip.x * scaleX;
      const hipY = keypoints.left_hip.y * scaleY;
      const kneeX = keypoints.left_knee.x * scaleX;
      const kneeY = keypoints.left_knee.y * scaleY;
      const ankleX = keypoints.left_ankle.x * scaleX;
      const ankleY = keypoints.left_ankle.y * scaleY;
      
      // Thigh
      const thighPoints = [
        `${hipX - legWidth},${hipY}`,
        `${hipX + legWidth},${hipY}`,
        `${kneeX + legWidth},${kneeY}`,
        `${kneeX - legWidth},${kneeY}`
      ].join(' ');
      
      bodyParts.push(
        <Polygon
          key="left-thigh"
          points={thighPoints}
          fill={silhouetteColor}
          stroke={getJointColor('left_knee', keypoints.left_knee.visibility)}
          strokeWidth="2"
          opacity="0.7"
        />
      );
      
      // Shin
      const shinPoints = [
        `${kneeX - legWidth},${kneeY}`,
        `${kneeX + legWidth},${kneeY}`,
        `${ankleX + legWidth},${ankleY}`,
        `${ankleX - legWidth},${ankleY}`
      ].join(' ');
      
      bodyParts.push(
        <Polygon
          key="left-shin"
          points={shinPoints}
          fill={silhouetteColor}
          stroke={getJointColor('left_ankle', keypoints.left_ankle.visibility)}
          strokeWidth="2"
          opacity="0.7"
        />
      );
    }
    
    // Right leg (hip to ankle)
    if (keypoints.right_hip && keypoints.right_knee && keypoints.right_ankle) {
      const legWidth = 15;
      const hipX = keypoints.right_hip.x * scaleX;
      const hipY = keypoints.right_hip.y * scaleY;
      const kneeX = keypoints.right_knee.x * scaleX;
      const kneeY = keypoints.right_knee.y * scaleY;
      const ankleX = keypoints.right_ankle.x * scaleX;
      const ankleY = keypoints.right_ankle.y * scaleY;
      
      // Thigh
      const thighPoints = [
        `${hipX - legWidth},${hipY}`,
        `${hipX + legWidth},${hipY}`,
        `${kneeX + legWidth},${kneeY}`,
        `${kneeX - legWidth},${kneeY}`
      ].join(' ');
      
      bodyParts.push(
        <Polygon
          key="right-thigh"
          points={thighPoints}
          fill={silhouetteColor}
          stroke={getJointColor('right_knee', keypoints.right_knee.visibility)}
          strokeWidth="2"
          opacity="0.7"
        />
      );
      
      // Shin
      const shinPoints = [
        `${kneeX - legWidth},${kneeY}`,
        `${kneeX + legWidth},${kneeY}`,
        `${ankleX + legWidth},${ankleY}`,
        `${ankleX - legWidth},${ankleY}`
      ].join(' ');
      
      bodyParts.push(
        <Polygon
          key="right-shin"
          points={shinPoints}
          fill={silhouetteColor}
          stroke={getJointColor('right_ankle', keypoints.right_ankle.visibility)}
          strokeWidth="2"
          opacity="0.7"
        />
      );
    }
    
    // Head (if available)
    if (keypoints.nose) {
      bodyParts.push(
        <Circle
          key="head"
          cx={keypoints.nose.x * scaleX}
          cy={keypoints.nose.y * scaleY}
          r="25"
          fill={silhouetteColor}
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.6"
        />
      );
    }
    
    return bodyParts;
  };

  const renderPoseOverlay = () => {
    if (!currentPose || !currentPose.keypoints) return null;

    const keypoints = currentPose.keypoints;
    const scaleX = width / 640; // Assuming camera resolution
    const scaleY = height / 480;

    return (
      <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
        {/* Draw human silhouette */}
        {renderHumanSilhouette(keypoints, scaleX, scaleY)}
        
        {/* Draw arm connections */}
        {renderArmConnections(keypoints, scaleX, scaleY)}
        
        {/* Draw key joints */}
        {Object.entries(keypoints).map(([name, point], index) => {
          if (point.visibility > 0.5 && ['left_knee', 'right_knee', 'left_hip', 'right_hip'].includes(name)) {
            const jointColor = getJointColor(name, point.visibility);
            
            return (
              <Circle
                key={index}
                cx={point.x * scaleX}
                cy={point.y * scaleY}
                r="8"
                fill={jointColor}
                stroke="#ffffff"
                strokeWidth="2"
                opacity="0.9"
              />
            );
          }
          return null;
        })}
        
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
        
        {/* Add angle indicators */}
        {lastKneeAngle && (
          <>
            <SvgText
              x={width - 60}
              y={160}
              fontSize="12"
              fill="#ffffff"
              textAnchor="middle"
              fontWeight="bold"
            >
              Knee: {Math.round(lastKneeAngle)}°
            </SvgText>
            
            {/* Add angle quality indicator */}
            <Circle
              cx={width - 60}
              cy={180}
              r="8"
              fill={lastKneeAngle < 90 ? '#00ff00' : lastKneeAngle < 120 ? '#ffff00' : '#ff4500'}
              opacity="0.8"
            />
          </>
        )}
        
        {/* Add rep phase indicator */}
        <SvgText
          x={20}
          y={50}
          fontSize="16"
          fill="#ffffff"
          fontWeight="bold"
        >
          Phase: {repPhase}
        </SvgText>
        
        {/* Add camera orientation guide */}
        <SvgText
          x={20}
          y={height - 100}
          fontSize="14"
          fill="#ffffff"
          fontWeight="bold"
        >
          💡 Turn sideways for best results
        </SvgText>
      </Svg>
    );
  };

  // Simplified connection rendering for arms only (since legs are now silhouettes)
  const renderArmConnections = (keypoints, scaleX, scaleY) => {
    const armConnections = [
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist']
    ];

    return armConnections.map(([start, end], index) => {
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];
      
      if (startPoint && endPoint && startPoint.visibility > 0.4 && endPoint.visibility > 0.4) {
        return (
          <Line
            key={index}
            x1={startPoint.x * scaleX}
            y1={startPoint.y * scaleY}
            x2={endPoint.x * scaleX}
            y2={endPoint.y * scaleY}
            stroke="#00bfff"
            strokeWidth="3"
            opacity="0.7"
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
            <View style={styles.detectionStatus}>
              <Text style={[styles.statusText, { 
                color: detectionStatus === 'webview' ? '#00ff00' : 
                       detectionStatus === 'mock' ? '#ffaa00' : '#666666' 
              }]}>
                {detectionStatus === 'webview' ? '🌐 WebView' :
                 detectionStatus === 'mock' ? '🎭 Smart Sim' : '⏳ Loading...'}
              </Text>
            </View>
          </View>
          
          <View style={styles.formScore}>
            <Text style={styles.formScoreText}>{Math.round(formScore)}%</Text>
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
  detectionStatus: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
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
