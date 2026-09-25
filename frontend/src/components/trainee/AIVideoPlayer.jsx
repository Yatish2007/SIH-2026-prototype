import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Pause, Volume2, VolumeX, CheckCircle2, FileText,
  File, Loader2, FolderOpen
} from 'lucide-react';
import { monitoringService } from '../../services/api';

const API_BASE = 'http://127.0.0.1:8001';
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

// Format seconds to MM:SS
const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

function segmentsDetails(start, end) {
  // Only report an actually-consumed range when it is meaningful.
  if (end === null || end === undefined || end - start <= 0) return '';
  const round2 = (v) => Math.round(v * 100) / 100;
  return JSON.stringify({ segments: [[round2(start), round2(end)]] });
}

// ============================
// REAL HTML5 VIDEO PLAYER
// ============================
function RealVideoPlayer({ material, sessionId, onProgress, onComplete }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const segmentStartRef = useRef(null);
  const lastBeatTimeRef = useRef(null);

  const currentProgress = () => {
    if (!duration) return 0;
    return Math.round((currentTime / duration) * 100);
  };

  const reportRange = (endTime, watchSec = 0, skippedSec = 0, eventType = 'progress_update') => {
    if (segmentStartRef.current !== null) {
      const start = segmentStartRef.current;
      monitoringService.sendTelemetry(
        sessionId,
        eventType,
        currentProgress(),
        segmentsDetails(start, endTime),
        watchSec,
        skippedSec,
        speed
      );
    } else if (watchSec > 0) {
      monitoringService.sendTelemetry(sessionId, eventType, currentProgress(), '', watchSec, skippedSec, speed);
    }
  };

  // Periodic telemetry heartbeat (silent).
  useEffect(() => {
    if (isPlaying) {
      lastBeatTimeRef.current = Date.now();
      const interval = setInterval(() => {
        const ct = videoRef.current?.currentTime || 0;
        const watchedSec = (Date.now() - (lastBeatTimeRef.current || Date.now())) / 1000;
        lastBeatTimeRef.current = Date.now();
        reportRange(ct, watchedSec);
        onProgress?.(currentProgress());
      }, 15000);
      return () => clearInterval(interval);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, sessionId, speed]);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play();
    setIsPlaying(true);
    segmentStartRef.current = video.currentTime;
    monitoringService.sendTelemetry(sessionId, 'play', currentProgress());
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    const ct = video.currentTime || 0;
    const watchedSec = segmentStartRef.current !== null ? Math.max(0, ct - segmentStartRef.current) : 0;
    reportRange(ct, watchedSec, 0, 'pause');
    segmentStartRef.current = null;
  };

  const handleSeeked = () => {
    // Seeking is freely allowed; the union of watched ranges simply
    // reflects which portions were actually consumed.
    if (segmentStartRef.current !== null) {
      const ct = videoRef.current?.currentTime || 0;
      const skippedSec = Math.max(0, ct - segmentStartRef.current);
      reportRange(ct, 0, skippedSec, 'seek_skip');
      segmentStartRef.current = ct;
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    setIsPlaying(false);
    if (video) {
      reportRange(video.duration || currentTime, Math.max(0, (video.duration || currentTime) - (segmentStartRef.current || 0)), 0, 'completed');
    }
    segmentStartRef.current = null;
    onProgress?.(100);
    onComplete?.();
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
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
    videoRef.current.currentTime = (clickPct / 100) * duration;
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
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleSeeked}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          crossOrigin="anonymous"
        />

        {/* Click to play/pause */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
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

      {/* Progress Bar (free seeking) */}
      <div
        className="relative h-2 bg-slate-800 cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* Controls */}
      <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-md"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-all">
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 accent-blue-500"
          />

          <span className="text-xs font-mono text-slate-400">
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-semibold">SPEED</span>
            <div className="flex gap-1">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                    speed === s
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
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

        {material.mime_type === 'application/pdf' && (
          <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: '400px' }}>
            <iframe
              src={fileUrl}
              className="w-full h-full"
              title={material.title}
            />
          </div>
        )}

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
// MAIN LEARNING MATERIAL VIEWER
// ============================
export default function AIVideoPlayer({ pathData, onVideoComplete, courseId = null, materialId = null, materialData = null }) {
  const [sessionId, setSessionId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');

  const hasRealVideo = materialData && materialData.material_type === 'video' && materialData.file_url;
  const hasRealDocument = materialData && ['document', 'presentation', 'note'].includes(materialData.material_type) && materialData.file_url;

  useEffect(() => {
    const startSession = async () => {
      setLoading(true);
      setError('');
      try {
        if (!courseId) {
          setError('No course context available.');
          return;
        }
        const session = await monitoringService.startSession(
          courseId,
          null,
          materialId || materialData?.id || null
        );
        setSessionId(session.session_id);
      } catch (e) {
        setError('Could not start the learning session. Please make sure the backend is running.');
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

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-3" />
        <span className="text-slate-400 text-sm">Loading learning session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center space-y-3">
        <FolderOpen className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-xs text-slate-300">{error}</p>
      </div>
    );
  }

  if (!hasRealVideo && !hasRealDocument) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center space-y-3">
        <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
        <h4 className="text-sm font-bold text-white">No learning material published yet</h4>
        <p className="text-xs text-slate-400">
          The course trainer has not uploaded content for this module. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasRealVideo ? (
        <RealVideoPlayer
          material={materialData}
          sessionId={sessionId}
          onProgress={setProgress}
          onComplete={handleVideoComplete}
        />
      ) : (
        <MaterialViewer
          material={materialData}
          sessionId={sessionId}
          onComplete={handleVideoComplete}
        />
      )}
      {completed && (
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4" /> Material completed!
        </div>
      )}
    </div>
  );
}