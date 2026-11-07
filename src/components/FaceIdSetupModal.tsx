import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, CheckCircle2, Loader2 } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { loadModels, getBiometricVault, saveBiometricVault } from '../utils/biometric';

export const FaceIdSetupModal: React.FC = () => {
  const { isFaceSetupOpen, setIsFaceSetupOpen, user, addToast } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isFaceSetupOpen) {
      loadModels().then(startCamera);
    } else {
      stopCamera();
    }
  }, [isFaceSetupOpen]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      addToast('Camera access blocked.', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleEnroll = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    
    // TinyFaceDetector
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      addToast('No face detected. Please position your face clearly.', 'error');
      setIsProcessing(false);
      return;
    }

    // Liveness check (simple check for now, can be expanded)
    const { landmarks } = detection;
    const eyeOpen = landmarks.getLeftEye()[0].y < landmarks.getNose()[0].y; // Simplistic
    if (!eyeOpen) {
      addToast('Please blink or look at the camera.', 'warning');
      setIsProcessing(false);
      return;
    }

    const vault = getBiometricVault();
    vault[user.email] = Array.from(detection.descriptor);
    saveBiometricVault(vault);
    
    setIsEnrolled(true);
    setIsProcessing(false);
    addToast('✅ Biometric Face ID successfully linked!', 'success');
  };

  if (!isFaceSetupOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold">Setup Neural Face ID</h2>
          <button onClick={() => setIsFaceSetupOpen(false)}><X className="w-5 h-5"/></button>
        </div>
        
        {isEnrolled ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm">✅ Face ID Linked!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline className="w-full h-48 bg-black rounded-xl object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
            <button 
              onClick={handleEnroll} 
              disabled={isProcessing}
              className="w-full py-2 bg-purple-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : 'Scan & Link Face'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
