import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, AlertOctagon,
  CheckCircle2, ShieldAlert, FastForward, RotateCcw, FileText,
  File, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { monitoringService } from '../../services/api';

const API_BASE = 'http://localhost:8000';

// Format seconds to MM:SS
const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ============================
// REAL HTML5 VIDEO PLAYER
// ============================
function RealVideoPlayer({ material, sessionId, policy, onProgress, onComplete }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [telemetryAlert, setTelemetryAlert] = useState('');
  const [seekBlocked, setSeekBlocked] = useState(false);
  const maxWatchedRef = useRef(0);
  const watchStartRef = useRef(null);
  const telemetryTimerRef = useRef(null);
  const maxAllowedSpeed = policy?.allowed_playback_speed || 1.5;

  const showAlert = (msg) => {
    setTelemetryAlert(msg);
    setTimeout(() => setTelemetryAlert(''), 5000);
  };

  // Tab/window focus monitoring
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isPlaying) {
        videoRef.current?.pause();
        setIsPlaying(false);
        showAlert('⚠ AI Alert: Focus lost — tab switch detected. Video paused.');
        monitoringService.sendTelemetry(sessionId, 'focus_lost', currentProgress(), 'User switched tabs during playback');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying, sessionId]);

  const currentProgress = () => {
    if (!duration) return 0;
    return Math.round((currentTime / duration) * 100);
  };

  // Periodic telemetry heartbeat
  useEffect(() => {
    if (isPlaying) {
      watchStartRef.current = Date.now();
      telemetryTimerRef.current = setInterval(() => {
        const pct = currentProgress();
        const watchedMs = Date.now() - (watchStartRef.current || Date.now());
        monitoringService.sendTelemetry(sessionId, 'progress_update', pct, '', watchedMs / 1000, 0, speed);
        onProgress?.(pct);
      }, 10000); // every 10 seconds
    } else {
      clearInterval(telemetryTimerRef.current);
    }
    return () => clearInterval(telemetryTimerRef.current);
  }, [isPlaying, sessionId]);

  const handlePlay = () => {
    videoRef.current?.play();
    setIsPlaying(true);
    monitoringService.sendTelemetry(sessionId, 'play', currentProgress());
  };

  const handlePause = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
    const watchedSec = watchStartRef.current ? (Date.now() - watchStartRef.current) / 1000 : 0;
    monitoringService.sendTelemetry(sessionId, 'pause', currentProgress(), 'User paused', watchedSec);
  };

  const handleTimeUpdate = () => {
    const ct = videoRef.current?.currentTime || 0;
    setCurrentTime(ct);
    const pct = duration ? (ct / duration) * 100 : 0;
    if (pct > maxWatchedRef.current) {
      maxWatchedRef.current = pct;
    }
    onProgress?.(Math.round(pct));
  };

  const handleSeeked = () => {
    const ct = videoRef.current?.currentTime || 0;
    const seekedPct = duration ? (ct / duration) * 100 : 0;

    // Anti-cheat: block seeking beyond max watched + 2%
    if (seekedPct > maxWatchedRef.current + 2 && maxWatchedRef.current < 98) {
      // Reset to max watched position
      if (videoRef.current) {
        videoRef.current.currentTime = (maxWatchedRef.current / 100) * duration;
      }
      setSeekBlocked(true);
      setTimeout(() => setSeekBlocked(false), 1500);
      showAlert('⚠ AI Anti-Cheat: Fast-forward blocked. Watch content fully to advance.');
      monitoringService.sendTelemetry(sessionId, 'seek_skip', seekedPct, `Forward seek attempt at ${seekedPct.toFixed(1)}%`);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    monitoringService.sendTelemetry(sessionId, 'completed', 100, 'Video completed', duration, 0, speed);
    onComplete?.();
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
  };

  const handleSpeedChange = (newSpeed) => {
    if (newSpeed > maxAllowedSpeed) {
      showAlert(`⚠ Learning Policy: Playback speed ${newSpeed}x exceeds trainer limit of ${maxAllowedSpeed}x.`);
      monitoringService.sendTelemetry(sessionId, 'speed_change', currentProgress(), `Speed ${newSpeed}x rejected`, 0, 0, newSpeed);
      return;
    }
    setSpeed(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
    monitoringService.sendTelemetry(sessionId, 'speed_change', currentProgress(), `Speed changed to ${newSpeed}x`, 0, 0, newSpeed);
  };

  const handleVolumeChange = (v) => {
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
  };

  const handleProgressClick = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
    const targetTime = (clickPct / 100) * duration;
    const targetPct = clickPct;

    if (targetPct > maxWatchedRef.current + 2 && maxWatchedRef.current < 98) {
      showAlert('⚠ AI Anti-Cheat: Seeking ahead blocked. Complete content progressively.');
      return;
    }
    videoRef.current.currentTime = targetTime;
  };

  const videoUrl = material.file_url.startsWith('http')
    ? material.file_url
    : `${API_BASE}${material.file_url}`;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
      {/* Video Element */}
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          crossOrigin="anonymous"
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="bg-blue-600/80 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
            🔴 AI Monitored
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border backdrop-blur-sm ${
            progress >= 100
              ? 'bg-emerald-900/80 text-emerald-300 border-emerald-500/50'
              : 'bg-amber-900/80 text-amber-300 border-amber-500/50'
          }`}>
            {progress >= 100 ? '✓ COMPLETED' : `${Math.round(progress)}% WATCHED`}
          </span>
        </div>

        {/* Seek blocked overlay */}
        {seekBlocked && (
          <div className="absolute inset-0 bg-rose-900/30 flex items-center justify-center pointer-events-none">
            <div className="bg-rose-950 border border-rose-500 text-rose-300 text-xs px-6 py-3 rounded-xl flex items-center gap-2 font-bold">
              <AlertOctagon className="w-5 h-5" /> Seek Blocked
            </div>
          </div>
        )}

        {/* Telemetry Alert */}
        {telemetryAlert && (
          <div className="absolute bottom-4 left-4 right-4 bg-rose-950/95 border border-rose-500/60 text-rose-200 text-xs p-3 rounded-lg flex items-center gap-2 backdrop-blur-md">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            <span>{telemetryAlert}</span>
          </div>
        )}

        {/* Click to play/pause */}
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={isPlaying ? handlePause : handlePlay}
          style={{ background: 'transparent' }}
        >
          {!isPlaying && (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40">
              <Play className="w-7 h-7 text-white ml-1" />
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className="relative h-2 bg-slate-800 cursor-pointer group"
        onClick={handleProgressClick}
      >
        {/* Max watched indicator (lighter) */}
        <div
          className="absolute top-0 left-0 h-full bg-slate-600 transition-all"
          style={{ width: `${maxWatchedRef.current}%` }}
        />
        {/* Current progress */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all"
          style={{ width: `${progress}%` }}
        />
        {/* Scrubber thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* Controls */}
      <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-md"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Volume */}
          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-all">
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 accent-blue-500"
          />

          {/* Time */}
          <span className="text-xs font-mono text-slate-400">
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Playback Speed */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-semibold">SPEED</span>
            <div className="flex gap-1">
              {[0.75, 1, 1.25, 1.5, 2].map(s => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                    speed === s
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : s > maxAllowedSpeed
                        ? 'bg-slate-800 border-rose-500/40 text-rose-400/60 cursor-not-allowed'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* AI Shield */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Monitoring Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================
// NON-VIDEO MATERIAL VIEWER
// ============================
function MaterialViewer({ material, sessionId, onComplete }) {
  const [viewed, setViewed] = useState(false);

  const fileUrl = material.file_url.startsWith('http')
    ? material.file_url
    : `${API_BASE}${material.file_url}`;

  const isDoc = ['document', 'note'].includes(material.material_type);
  const isPpt = material.material_type === 'presentation';

  const handleMarkComplete = () => {
    setViewed(true);
    monitoringService.sendTelemetry(sessionId, 'completed', 100, `${material.material_type} reviewed`);
    onComplete?.();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700">
            {material.material_type === 'presentation' ? (
              <File className="w-6 h-6 text-purple-400" />
            ) : (
              <FileText className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{material.title}</h4>
            <p className="text-xs text-slate-400">{material.file_name} • {material.material_type}</p>
          </div>
        </div>

        {/* PDF Embedded Preview */}
        {material.mime_type === 'application/pdf' && (
          <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: '400px' }}>
            <iframe
              src={fileUrl}
              className="w-full h-full"
              title={material.title}
            />
          </div>
        )}

        {/* Download/Open for other types */}
        {material.mime_type !== 'application/pdf' && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
          >
            <File className="w-4 h-4" /> Open / Download File ↗
          </a>
        )}

        {/* Mark as Reviewed Button */}
        {!viewed ? (
          <button
            onClick={handleMarkComplete}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-md shadow-blue-600/30"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark as Reviewed
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4" /> Material marked as reviewed!
          </div>
        )}
      </div>
    </div>
  );
}

// ============================
// MAIN AI VIDEO PLAYER
// Handles both real uploaded videos and AI-generated slide view
// ============================
export default function AIVideoPlayer({ pathData, onVideoComplete, courseId = null, materialId = null, materialData = null }) {
  const [sessionId, setSessionId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  // ---- Fallback Slide-based player state (used when no real video) ----
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [telemetryAlert, setTelemetryAlert] = useState('');
  const [sessionStatus, setSessionStatus] = useState('in_progress');
  const [isMuted, setIsMuted] = useState(false);
  const intervalRef = useRef(null);

  // Determine if we have a real uploaded video material
  const hasRealVideo = materialData && materialData.material_type === 'video' && materialData.file_url;
  const hasRealDocument = materialData && ['document', 'presentation', 'note'].includes(materialData.material_type) && materialData.file_url;

  useEffect(() => {
    // Start a learning session
    const startSession = async () => {
      setLoading(true);
      try {
        const session = await monitoringService.startSession(
          courseId || pathData?.course_id || 1,
          null,
          materialId || materialData?.id || null
        );
        setSessionId(session.session_id);

        // Load policy
        const policyData = await monitoringService.getPolicyStatus(courseId || pathData?.course_id || 1);
        setPolicy(policyData);
      } catch (e) {
        setSessionId(Date.now());
      } finally {
        setLoading(false);
      }
    };
    startSession();
  }, [courseId, materialId]);

  const handleVideoComplete = () => {
    setCompleted(true);
    setProgress(100);
    if (onVideoComplete) onVideoComplete();
  };

  const handleProgressUpdate = (pct) => {
    setProgress(pct);
  };

  // ---- Slide-based fallback player (when no real material) ----
  const slides = [
    {
      title: `Overview: ${pathData?.course_title || 'Course Fundamentals'}`,
      subtitle: `Assessed Tier: ${pathData?.assessed_level || 'Beginner'}`,
      bullets: [
        `Custom objective: ${pathData?.objective || 'Focus on foundational comprehension'}`,
        `Addressing knowledge gap: ${pathData?.knowledge_gaps?.[0] || 'Core Syntax & Principles'}`,
        'AI Monitoring is actively tracking session focus and progression.'
      ],
      bg: 'from-slate-900 via-indigo-950 to-slate-900'
    },
    {
      title: `Deep Dive: ${pathData?.knowledge_gaps?.[0] || 'Key Topic Masterclass'}`,
      subtitle: 'Targeted Instructional Demonstration',
      bullets: [
        'Detailed breakdown of concepts missed during the pre-assessment quiz.',
        'Step-by-step logic execution and memory allocation walkthrough.',
        'Practical edge-case mitigation rules.'
      ],
      bg: 'from-slate-900 via-blue-950 to-slate-900'
    },
    {
      title: `Secondary Topic: ${pathData?.knowledge_gaps?.[1] || 'Practical Applications'}`,
      subtitle: 'Synthesis & Best Practices',
      bullets: [
        'Connecting theoretical principles to production architecture.',
        'Performance optimization tips to prepare for post-assessment.',
        'Final review of essential formulas and procedures.'
      ],
      bg: 'from-slate-900 via-purple-950 to-slate-900'
    }
  ];

  // Fallback tab monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        setIsPlaying(false);
        setTelemetryAlert('AI Telemetry Alert: Focus lost! Tab switch detected.');
        monitoringService.sendTelemetry(sessionId || 1, 'focus_lost', slideProgress, 'User switched tabs during video playback');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, slideProgress, sessionId]);

  // Fallback video playback timer loop
  useEffect(() => {
    if (!hasRealVideo && !hasRealDocument && isPlaying) {
      intervalRef.current = setInterval(() => {
        setSlideProgress((prev) => {
          const next = prev + 2;
          if (next >= 66) setCurrentSlideIndex(2);
          else if (next >= 33) setCurrentSlideIndex(1);
          else setCurrentSlideIndex(0);

          if (next % 10 === 0) {
            monitoringService.sendTelemetry(sessionId || 1, 'progress_update', next);
          }

          if (next >= 100) {
            clearInterval(intervalRef.current);
            setIsPlaying(false);
            setSessionStatus('completed');
            monitoringService.sendTelemetry(sessionId || 1, 'completed', 100);
            setCompleted(true);
            if (onVideoComplete) onVideoComplete();
            return 100;
          }
          return next;
        });
      }, 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, onVideoComplete, sessionId, hasRealVideo, hasRealDocument]);

  const handleSeekAttempt = () => {
    setTelemetryAlert('AI Anti-Cheat Alert: Fast-forward seek disabled. Complete content to satisfy learning monitoring.');
    monitoringService.sendTelemetry(sessionId || 1, 'seek_skip', slideProgress, 'Forward seek attempted');
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-3" />
        <span className="text-slate-400 text-sm">Starting AI monitoring session...</span>
      </div>
    );
  }

  // ---- REAL VIDEO PLAYER ----
  if (hasRealVideo) {
    return (
      <div className="space-y-2">
        <RealVideoPlayer
          material={materialData}
          sessionId={sessionId}
          policy={policy?.policy_rules || null}
          onProgress={handleProgressUpdate}
          onComplete={handleVideoComplete}
        />
        {completed && (
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl">
            <CheckCircle2 className="w-4 h-4" /> Video completed! Assessment unlocked.
          </div>
        )}
      </div>
    );
  }

  // ---- REAL DOCUMENT / PDF / PPT VIEWER ----
  if (hasRealDocument) {
    return (
      <div className="space-y-2">
        <MaterialViewer
          material={materialData}
          sessionId={sessionId}
          onComplete={handleVideoComplete}
        />
        {completed && (
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl">
            <CheckCircle2 className="w-4 h-4" /> Material reviewed! Assessment unlocked.
          </div>
        )}
      </div>
    );
  }

  // ---- FALLBACK: AI-generated slide player (when no real material uploaded) ----
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl space-y-0">
      {/* Slide Viewport */}
      <div className={`h-80 bg-gradient-to-br ${currentSlide.bg} relative flex flex-col justify-between p-8 text-white transition-all duration-700 select-none`}>
        <div className="flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
            ✦ AI Generated Instructional Video
          </span>
          <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border backdrop-blur-md ${
            sessionStatus === 'completed'
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
              : 'bg-amber-950/80 text-amber-400 border-amber-500/50'
          }`}>
            {sessionStatus.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="z-10 my-auto space-y-3">
          <span className="text-xs text-blue-400 font-mono tracking-wider uppercase font-semibold">{currentSlide.subtitle}</span>
          <h3 className="text-2xl font-extrabold tracking-tight text-white leading-tight">{currentSlide.title}</h3>
          <ul className="space-y-1.5 pt-1">
            {currentSlide.bullets.map((b, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>

        {telemetryAlert && (
          <div className="absolute bottom-16 left-6 right-6 z-20 bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-lg flex items-center gap-2 backdrop-blur-md animate-bounce">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{telemetryAlert}</span>
          </div>
        )}

        <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden relative cursor-pointer" onClick={handleSeekAttempt}>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full transition-all duration-300" style={{ width: `${slideProgress}%` }} />
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900 p-4 border-t border-slate-800 flex items-center justify-between px-6 text-xs text-slate-300">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setIsPlaying(!isPlaying); setTelemetryAlert(''); }}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-lg shadow-blue-600/30"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-white">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <span className="font-mono text-slate-400">
            {Math.floor((slideProgress / 100) * 180)}s / 180s ({slideProgress.toFixed(0)}%)
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          <span>AI Telemetry Active (Anti-cheat & seek tracking enabled)</span>
        </div>
      </div>
    </div>
  );
}
