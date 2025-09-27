import { Pose, POSE_LANDMARKS, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// MediaPipe Pose landmark indices (following the standard MediaPipe format)
export const POSE_LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseResults {
  poseLandmarks: PoseLandmark[];
  poseWorldLandmarks: PoseLandmark[];
}

export interface SquatAngles {
  leftKneeAngle: number;
  rightKneeAngle: number;
  leftHipAngle: number;
  rightHipAngle: number;
  backAngle: number;
}

export interface SquatAnalysis {
  angles: SquatAngles;
  phase: 'starting' | 'descending' | 'bottom' | 'ascending' | 'completed';
  repCount: number;
  feedback: string[];
  isGoodForm: boolean;
  formScore: number;
}

export class PoseDetector {
  private pose: Pose;
  private camera: Camera | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private onResultsCallback: ((results: PoseResults) => void) | null = null;
  private onAnalysisCallback: ((analysis: SquatAnalysis) => void) | null = null;
  
  // Squat detection state
  private repCount = 0;
  private currentPhase: 'starting' | 'descending' | 'bottom' | 'ascending' | 'completed' = 'starting';
  private previousPhase: 'starting' | 'descending' | 'bottom' | 'ascending' | 'completed' = 'starting';
  private isSquatting = false;
  private frameCount = 0;
  private phaseFrameCount = 0;
  private isInitialized = false;
  private isDisposed = false;
  
  // Angle thresholds for squat detection (matching typical squat detection repos)
  private readonly SQUAT_THRESHOLDS = {
    KNEE_ANGLE_STANDING: 160,     // Standing position
    KNEE_ANGLE_DESCENDING: 120,   // Descending phase
    KNEE_ANGLE_BOTTOM: 90,        // Bottom position
    HIP_ANGLE_MIN: 45,            // Minimum hip angle for proper squat
    BACK_ANGLE_MAX: 45,           // Maximum forward lean
    MIN_PHASE_FRAMES: 5           // Minimum frames to confirm phase change
  };

  constructor() {
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.pose.onResults(this.onResults.bind(this));
  }

  // Calculate angle between three points (following standard angle calculation)
  private calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  }

  // Calculate all relevant angles for squat analysis
  private calculateSquatAngles(landmarks: PoseLandmark[]): SquatAngles {
    // Left knee angle (hip-knee-ankle)
    const leftKneeAngle = this.calculateAngle(
      landmarks[POSE_LANDMARK_INDICES.LEFT_HIP],
      landmarks[POSE_LANDMARK_INDICES.LEFT_KNEE],
      landmarks[POSE_LANDMARK_INDICES.LEFT_ANKLE]
    );

    // Right knee angle (hip-knee-ankle)
    const rightKneeAngle = this.calculateAngle(
      landmarks[POSE_LANDMARK_INDICES.RIGHT_HIP],
      landmarks[POSE_LANDMARK_INDICES.RIGHT_KNEE],
      landmarks[POSE_LANDMARK_INDICES.RIGHT_ANKLE]
    );

    // Left hip angle (shoulder-hip-knee)
    const leftHipAngle = this.calculateAngle(
      landmarks[POSE_LANDMARK_INDICES.LEFT_SHOULDER],
      landmarks[POSE_LANDMARK_INDICES.LEFT_HIP],
      landmarks[POSE_LANDMARK_INDICES.LEFT_KNEE]
    );

    // Right hip angle (shoulder-hip-knee)
    const rightHipAngle = this.calculateAngle(
      landmarks[POSE_LANDMARK_INDICES.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARK_INDICES.RIGHT_HIP],
      landmarks[POSE_LANDMARK_INDICES.RIGHT_KNEE]
    );

    // Back angle (vertical line from hip to shoulder)
    const leftShoulder = landmarks[POSE_LANDMARK_INDICES.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARK_INDICES.RIGHT_SHOULDER];
    const leftHip = landmarks[POSE_LANDMARK_INDICES.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARK_INDICES.RIGHT_HIP];
    
    // Calculate center points
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
      visibility: Math.min(leftShoulder.visibility, rightShoulder.visibility)
    };
    
    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
      visibility: Math.min(leftHip.visibility, rightHip.visibility)
    };

    // Calculate back angle relative to vertical
    const backAngle = Math.abs(Math.atan2(
      shoulderCenter.x - hipCenter.x,
      shoulderCenter.y - hipCenter.y
    ) * 180 / Math.PI);

    return {
      leftKneeAngle,
      rightKneeAngle,
      leftHipAngle,
      rightHipAngle,
      backAngle
    };
  }

  // Detect squat phase based on angles (following typical squat detection logic)
  private detectSquatPhase(angles: SquatAngles): 'starting' | 'descending' | 'bottom' | 'ascending' | 'completed' {
    const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;
    
    if (avgKneeAngle > this.SQUAT_THRESHOLDS.KNEE_ANGLE_STANDING) {
      return 'starting';
    } else if (avgKneeAngle > this.SQUAT_THRESHOLDS.KNEE_ANGLE_DESCENDING && this.currentPhase === 'starting') {
      return 'descending';
    } else if (avgKneeAngle <= this.SQUAT_THRESHOLDS.KNEE_ANGLE_BOTTOM) {
      return 'bottom';
    } else if (avgKneeAngle > this.SQUAT_THRESHOLDS.KNEE_ANGLE_BOTTOM && 
               avgKneeAngle <= this.SQUAT_THRESHOLDS.KNEE_ANGLE_DESCENDING && 
               this.currentPhase === 'bottom') {
      return 'ascending';
    } else if (avgKneeAngle > this.SQUAT_THRESHOLDS.KNEE_ANGLE_STANDING && this.currentPhase === 'ascending') {
      return 'completed';
    }
    
    return this.currentPhase;
  }

  // Analyze squat form and provide feedback
  private analyzeSquatForm(angles: SquatAngles, phase: string): SquatAnalysis {
    const feedback: string[] = [];
    let formScore = 100;
    
    const avgKneeAngle = (angles.leftKneeAngle + angles.rightKneeAngle) / 2;
    const avgHipAngle = (angles.leftHipAngle + angles.rightHipAngle) / 2;
    const kneeDifference = Math.abs(angles.leftKneeAngle - angles.rightKneeAngle);
    
    // Phase-specific feedback
    switch (phase) {
      case 'starting':
        if (avgKneeAngle < 170) {
          feedback.push("Stand up straight to begin");
          formScore -= 10;
        } else {
          feedback.push("Ready to squat! Start going down");
        }
        break;
        
      case 'descending':
        // Check knee alignment during descent
        if (kneeDifference > 20) {
          feedback.push("KNEES: Keep both knees aligned!");
          formScore -= 20;
        }
        
        // Check back posture during descent
        if (angles.backAngle > this.SQUAT_THRESHOLDS.BACK_ANGLE_MAX) {
          feedback.push("BACK: Keep chest up, don't lean forward!");
          formScore -= 25;
        }
        
        // Check if going down too fast
        if (avgKneeAngle < 120) {
          feedback.push("Good depth! Keep going down slowly");
        } else {
          feedback.push("Keep going down - bend your knees more");
        }
        break;
        
      case 'bottom':
        // Critical depth check
        if (avgKneeAngle > 110) {
          feedback.push("TOO HIGH: Go deeper! Thighs parallel to ground");
          formScore -= 30;
        } else if (avgKneeAngle > 90) {
          feedback.push("DEEPER: Almost there, go a bit lower");
          formScore -= 15;
        } else {
          feedback.push("PERFECT DEPTH: Great squat!");
        }
        
        // Knee alignment at bottom
        if (kneeDifference > 15) {
          feedback.push("KNEES: Keep knees aligned at bottom!");
          formScore -= 20;
        }
        
        // Back posture at bottom
        if (angles.backAngle > this.SQUAT_THRESHOLDS.BACK_ANGLE_MAX) {
          feedback.push("BACK: Keep chest up, core tight!");
          formScore -= 25;
        }
        
        // Hip positioning
        if (avgHipAngle < this.SQUAT_THRESHOLDS.HIP_ANGLE_MIN) {
          feedback.push("HIPS: Push hips back more");
          formScore -= 15;
        }
        break;
        
      case 'ascending':
        // Check for proper ascent
        if (angles.backAngle > this.SQUAT_THRESHOLDS.BACK_ANGLE_MAX) {
          feedback.push("BACK: Keep chest up while rising!");
          formScore -= 20;
        }
        
        if (kneeDifference > 15) {
          feedback.push("KNEES: Keep knees aligned while rising");
          formScore -= 15;
        }
        
        if (avgKneeAngle > 120) {
          feedback.push("Great! Keep pushing up to standing");
        } else {
          feedback.push("Push through your heels, drive up!");
        }
        break;
    }
    
    // Overall posture warnings (always check)
    if (kneeDifference > 25) {
      feedback.push("CRITICAL: Major knee misalignment!");
      formScore -= 30;
    }
    
    if (angles.backAngle > 160) {
      feedback.push("CRITICAL: Back too rounded!");
      formScore -= 35;
    }
    
    // Positive reinforcement for excellent form
    if (formScore >= 90 && phase === 'bottom') {
      feedback.push("🏆 EXCELLENT FORM! You're crushing it!");
    } else if (formScore >= 80) {
      feedback.push("Good form! Minor adjustments needed");
    }
    
    // If no specific feedback, give encouragement
    if (feedback.length === 0) {
      feedback.push("Keep going! You're doing great!");
    }
    
    return {
      angles,
      phase: phase as any,
      repCount: this.repCount,
      feedback,
      isGoodForm: formScore >= 70,
      formScore: Math.max(0, formScore)
    };
  }

  // Handle pose detection results
  private onResults(results: any): void {
    if (this.isDisposed) {
      return; // Don't process results if disposed
    }
    
    this.frameCount++;
    
    console.log('MediaPipe results:', {
      hasLandmarks: !!results.poseLandmarks,
      landmarkCount: results.poseLandmarks?.length || 0,
      canvasExists: !!this.canvasElement,
      canvasCtxExists: !!this.canvasCtx
    });
    
    if (!results.poseLandmarks) {
      console.log('No pose landmarks detected');
      return;
    }

    const landmarks = results.poseLandmarks;
    
    // Calculate angles
    const angles = this.calculateSquatAngles(landmarks);
    
    // Detect phase
    const newPhase = this.detectSquatPhase(angles);
    
    // Phase change logic with frame counting for stability
    if (newPhase !== this.currentPhase) {
      this.phaseFrameCount++;
      
      if (this.phaseFrameCount >= this.SQUAT_THRESHOLDS.MIN_PHASE_FRAMES) {
        this.previousPhase = this.currentPhase;
        this.currentPhase = newPhase;
        this.phaseFrameCount = 0;
        
        // Count reps when completing a squat
        if (this.currentPhase === 'completed' && this.previousPhase === 'ascending') {
          this.repCount++;
        }
      }
    } else {
      this.phaseFrameCount = 0;
    }
    
    // Analyze form
    const analysis = this.analyzeSquatForm(angles, this.currentPhase);
    
    // Draw pose on canvas
    if (this.canvasElement && this.canvasCtx) {
      console.log('Drawing pose on canvas:', {
        canvasWidth: this.canvasElement.width,
        canvasHeight: this.canvasElement.height,
        landmarkCount: landmarks.length
      });
      this.drawPose(results);
      this.drawAngles(landmarks, angles);
    } else {
      console.log('Canvas not available for drawing:', {
        canvasElement: !!this.canvasElement,
        canvasCtx: !!this.canvasCtx
      });
    }
    
    // Callback with results
    if (this.onResultsCallback) {
      this.onResultsCallback({
        poseLandmarks: landmarks,
        poseWorldLandmarks: results.poseWorldLandmarks || []
      });
    }
    
    if (this.onAnalysisCallback) {
      this.onAnalysisCallback(analysis);
    }
  }

  // Draw pose landmarks and connections
  private drawPose(results: any): void {
    if (!this.canvasCtx || !this.canvasElement) {
      console.log('Cannot draw: missing canvas context or element');
      return;
    }
    
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // Test draw - draw a simple rectangle to verify canvas is working
    this.canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    this.canvasCtx.fillRect(10, 10, 100, 50);
    this.canvasCtx.fillStyle = '#FFFFFF';
    this.canvasCtx.font = '16px Arial';
    
    // Save context, flip text back to normal, then restore
    this.canvasCtx.save();
    this.canvasCtx.scale(-1, 1);
    this.canvasCtx.fillText('Pose Active', -105, 35);
    this.canvasCtx.restore();
    
    try {
      // Draw pose connections
      drawConnectors(this.canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      });
      
      // Draw pose landmarks
      drawLandmarks(this.canvasCtx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 1,
        radius: 3
      });
      
      console.log('Successfully drew pose landmarks');
    } catch (error) {
      console.error('Error drawing pose:', error);
    }
    
    this.canvasCtx.restore();
  }

  // Draw angle measurements on specific joints
  private drawAngles(landmarks: PoseLandmark[], angles: SquatAngles): void {
    if (!this.canvasCtx || !this.canvasElement) return;
    
    const width = this.canvasElement.width;
    const height = this.canvasElement.height;
    
    this.canvasCtx.fillStyle = '#FFFFFF';
    this.canvasCtx.strokeStyle = '#000000';
    this.canvasCtx.lineWidth = 2;
    this.canvasCtx.font = '16px Arial';
    
    // Draw knee angles
    const leftKnee = landmarks[POSE_LANDMARK_INDICES.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARK_INDICES.RIGHT_KNEE];
    
    // Save context for text flipping
    this.canvasCtx.save();
    this.canvasCtx.scale(-1, 1);
    
    if (leftKnee.visibility > 0.5) {
      const x = leftKnee.x * width;
      const y = leftKnee.y * height;
      const text = `${Math.round(angles.leftKneeAngle)}°`;
      this.canvasCtx.strokeText(text, -(x + 10 + 30), y - 10);
      this.canvasCtx.fillText(text, -(x + 10 + 30), y - 10);
    }
    
    if (rightKnee.visibility > 0.5) {
      const x = rightKnee.x * width;
      const y = rightKnee.y * height;
      const text = `${Math.round(angles.rightKneeAngle)}°`;
      this.canvasCtx.strokeText(text, -(x - 40 + 30), y - 10);
      this.canvasCtx.fillText(text, -(x - 40 + 30), y - 10);
    }
    
    this.canvasCtx.restore();
  }

  // Initialize pose detection with video element
  public async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    onResults?: (results: PoseResults) => void,
    onAnalysis?: (analysis: SquatAnalysis) => void
  ): Promise<void> {
    console.log('Initializing PoseDetector...');
    
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.onResultsCallback = onResults || null;
    this.onAnalysisCallback = onAnalysis || null;
    
    // Wait for video metadata to load
    if (videoElement.videoWidth === 0) {
      await new Promise<void>((resolve) => {
        const checkVideo = () => {
          if (videoElement.videoWidth > 0) {
            resolve();
          } else {
            setTimeout(checkVideo, 100);
          }
        };
        checkVideo();
      });
    }
    
    // Set canvas size to match video
    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;
    canvasElement.width = width;
    canvasElement.height = height;
    
    console.log('Canvas initialized:', { width, height });
    
    // Initialize camera
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.pose.send({ image: videoElement });
      },
      width,
      height
    });
    
    console.log('Starting camera...');
    await this.camera.start();
    this.isInitialized = true;
    console.log('PoseDetector initialization complete');
  }

  // Start pose detection
  public start(): void {
    if (this.camera) {
      this.camera.start();
    }
  }

  // Stop pose detection
  public stop(): void {
    if (this.camera) {
      this.camera.stop();
    }
  }

  // Reset rep counter and phase
  public reset(): void {
    this.repCount = 0;
    this.currentPhase = 'starting';
    this.previousPhase = 'starting';
    this.frameCount = 0;
    this.phaseFrameCount = 0;
  }

  // Get current rep count
  public getRepCount(): number {
    return this.repCount;
  }

  // Get current phase
  public getCurrentPhase(): string {
    return this.currentPhase;
  }

  // Cleanup resources
  public dispose(): void {
    if (this.isDisposed) {
      console.log('PoseDetector already disposed, skipping...');
      return;
    }
    
    console.log('Disposing PoseDetector...');
    this.isDisposed = true;
    
    try {
      if (this.camera) {
        console.log('Stopping camera...');
        this.camera.stop();
        this.camera = null;
      }
    } catch (error) {
      console.warn('Error stopping camera:', error);
    }
    
    try {
      if (this.pose && this.isInitialized) {
        console.log('Closing pose...');
        this.pose.close();
        this.pose = null as any;
      }
    } catch (error) {
      console.warn('Error closing pose:', error);
    }
    
    // Clear references
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.onResultsCallback = null;
    this.onAnalysisCallback = null;
    this.isInitialized = false;
    
    console.log('PoseDetector disposed successfully');
  }
}
