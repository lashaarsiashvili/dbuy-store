import React, { useState, useEffect } from 'react';
import { Mic, Video, Sliders, ShieldCheck, Play, Pause, RefreshCw, Layers } from 'lucide-react';

export default function StudioDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [activeZone, setActiveZone] = useState('vocal');

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400">DBUY Studio & Control</h1>
          <p className="text-sm text-slate-400">Professional Studio & Recording Management Suite</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 mr-2 bg-emerald-400 rounded-full animate-pulse"></span>
            System Online
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Zones & Equipment */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Studio Zones
            </h2>
            <div className="space-y-2">
              {[
                { id: 'vocal', name: 'Vocal Booth / Recording', icon: Mic },
                { id: 'video', name: 'Video / Streaming Stage', icon: Video },
                { id: 'mixing', name: 'Mastering & Mixing Desk', icon: Sliders },
              ].map((zone) => {
                const Icon = zone.icon;
                return (
                  <button
                    key={zone.id}
                    onClick={() => setActiveZone(zone.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      activeZone === zone.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {zone.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Security & Biometrics
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Face-API authentication and secure session status are active for this terminal.
            </p>
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 flex items-center justify-between">
              <span className="text-sm text-slate-300">Face Recognition</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-2 py-1 rounded">Verified</span>
            </div>
          </div>
        </div>

        {/* Center/Right Column: Recorder & Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center min-h-[300px]">
            <div className="text-5xl font-mono font-bold tracking-widest text-indigo-400 mb-6">
              {formatTime(timer)}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all shadow-lg ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isRecording ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRecording ? 'Pause Recording' : 'Start Recording'}
              </button>

              <button
                onClick={() => {
                  setIsRecording(false);
                  setTimer(0);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Active Microphone</h3>
              <p className="text-lg font-semibold text-slate-200">Audio-Technica AT2040USB</p>
              <span className="text-xs text-indigo-400 mt-1 block">De-Esser & EQ Filter Active</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Acoustic Environment</h3>
              <p className="text-lg font-semibold text-slate-200">Optimized / Building 22</p>
              <span className="text-xs text-emerald-400 mt-1 block">Background noise minimal</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
