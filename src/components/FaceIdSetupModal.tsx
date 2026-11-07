import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Camera, CheckCircle2, AlertCircle } from 'lucide-react';

export const FaceIdSetupModal: React.FC = () => {
  const { isFaceSetupOpen, setIsFaceSetupOpen, user, addToast } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (isFaceSetupOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isFaceSetupOpen]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      console.error('Camera access failed', err);
      addToast('Camera access blocked. Please use the file upload option.', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    canvas.getContext('2d')?.drawImage(video, 0, 0, 160, 160);
    const signature = canvas.toDataURL('image/jpeg', 0.5);
    saveFaceSignature(signature);
  };

  const saveFaceSignature = (signature: string) => {
    const enrolledUser = {
      email: user.email,
      name: user.name,
      faceSignature: signature
    };
    localStorage.setItem('dbuy_enrolled_face_user', JSON.stringify(enrolledUser));
    setIsEnrolled(true);
    addToast(`✅ Face ID Linked to ${user.email}!`, 'success');
  };

  if (!isFaceSetupOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold">Setup Face ID for {user.email}</h2>
          <button onClick={() => setIsFaceSetupOpen(false)}><X className="w-5 h-5"/></button>
        </div>
        
        {isEnrolled ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm">✅ Face ID Linked to {user.email}!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <video ref={videoRef} autoPlay playsInline className="w-full h-48 bg-black rounded-xl object-cover" />
            <button onClick={handleCapture} className="w-full py-2 bg-purple-600 rounded-xl font-bold text-xs">Capture & Save Face ID</button>
            <div className="text-center text-[10px] text-slate-400">OR</div>
            <input type="file" accept="image/*" capture="user" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => saveFaceSignature(e.target?.result as string);
                reader.readAsDataURL(e.target.files[0]);
              }
            }} className="w-full text-xs text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
};
