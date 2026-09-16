import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Layers, CheckCircle2, ArrowRight, Video, Target, ShieldCheck } from 'lucide-react';
import AIVideoPlayer from './AIVideoPlayer';
import { personalizationService } from '../../services/api';

export default function PersonalizedLearningPage({ scalingResult, onProceedToPostAssessment }) {
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoFinished, setVideoFinished] = useState(false);

  useEffect(() => {
    personalizationService.getPersonalizedPath().then((data) => {
      // Merge with recent scaling result if available
      if (scalingResult) {
        data.assessed_level = scalingResult.assessed_level || data.assessed_level;
        data.knowledge_gaps = scalingResult.knowledge_gaps || data.knowledge_gaps;
      }
      setPathData(data);
      setLoading(false);
    });
  }, [scalingResult]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        <span>Generating personalized AI learning module...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900/60 via-slate-800 to-indigo-900/60 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Step 6 & 7: Personalized AI Learning Path
            </span>
            <h2 className="text-2xl font-black text-white">
              {pathData?.course_title || 'Python Programming'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {pathData?.objective}
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Assessed Skill Tier
            </span>
            <span className="text-xl font-black text-blue-400 uppercase tracking-wide">
              {pathData?.assessed_level || 'Beginner'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: AI Video Player on Left, Tailored Modules on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): AI Video Player & Monitoring */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400" /> {pathData?.video_title}
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                AI Monitored Stream
              </span>
            </div>

            {/* AI Video Component */}
            <AIVideoPlayer
              pathData={pathData}
              onVideoComplete={() => setVideoFinished(true)}
            />
          </div>
        </div>

        {/* Right Column (1 col): Knowledge Gaps & Tailored Modules */}
        <div className="space-y-4">
          {/* Addressed Knowledge Gaps */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-400" /> Target Knowledge Gaps
            </h4>
            <div className="space-y-2">
              {pathData?.knowledge_gaps?.map((gap, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-700/50 p-2.5 rounded-lg flex items-center gap-2 text-xs text-amber-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{gap}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Module Breakdown List */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-md space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" /> Customized Learning Modules
            </h4>

            <div className="space-y-2.5">
              {pathData?.modules?.map((mod, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    mod.status === 'active'
                      ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                      : 'bg-slate-900/40 border-slate-700/40 text-slate-400'
                  }`}
                >
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>{mod.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">{mod.duration}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{mod.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger for Post-Assessment */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-md text-center space-y-3">
            <p className="text-xs text-slate-400">
              Complete the AI instructional video to unlock the Post-Learning Assessment & Certification.
            </p>
            <button
              onClick={onProceedToPostAssessment}
              disabled={!videoFinished}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-lg ${
                videoFinished
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {videoFinished ? (
                <>Take Post-Assessment <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Finish Video to Unlock Assessment</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
