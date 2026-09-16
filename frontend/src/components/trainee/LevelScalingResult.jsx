import React from 'react';
import { Cpu, CheckCircle2, AlertTriangle, ArrowRight, Shield, Award, BarChart3 } from 'lucide-react';

export default function LevelScalingResult({ scalingResult, onProceedToPersonalizedLearning }) {
  const {
    self_level = "Intermediate",
    assessed_level = "Beginner",
    score = 3,
    total_questions = 5,
    percentage = 60,
    difficulty_scores = {},
    knowledge_gaps = []
  } = scalingResult || {};

  const levelColor = (lvl) => {
    switch (lvl?.toLowerCase()) {
      case 'beginner': return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30';
      case 'intermediate': return 'text-blue-400 border-blue-500/30 bg-blue-950/30';
      case 'advanced': return 'text-purple-400 border-purple-500/30 bg-purple-950/30';
      default: return 'text-blue-400 border-blue-500/30 bg-blue-950/30';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-800 to-blue-900/60 border border-indigo-500/30 rounded-2xl p-6 shadow-xl text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-3">
          <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" /> AI Level Scaling Engine Output
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Pre-Assessment Evaluation Completed</h2>
        <p className="text-xs text-slate-300 max-w-xl mx-auto">
          Our AI algorithm evaluated your response accuracy across Easy, Moderate, and Pro difficulty tiers to calculate your optimal personalized learning level.
        </p>
      </div>

      {/* Level Comparison Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Your Self-Assessed Level
          </span>
          <div className="text-xl font-bold text-slate-300 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 mt-1">
            {self_level}
          </div>
          <span className="text-[11px] text-slate-500 mt-2">Declared before pre-assessment</span>
        </div>

        <div className={`border rounded-xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg ${levelColor(assessed_level)}`}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> AI Calculated Assessed Level
          </span>
          <div className="text-2xl font-black tracking-wide uppercase px-5 py-2 rounded-lg bg-slate-950/80 border border-current mt-1 shadow-inner">
            {assessed_level}
          </div>
          <span className="text-[11px] text-slate-300 mt-2 font-medium">
            Personalized course content will target this tier
          </span>
        </div>
      </div>

      {/* Score Breakdown & Difficulty Analysis */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Performance & Difficulty Breakdown
          </h3>
          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/80 px-3 py-1 rounded-md border border-blue-500/20">
            Overall Score: {score} / {total_questions} ({percentage.toFixed(0)}%)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">Easy Questions</span>
            <span className="text-sm font-mono text-white font-semibold">
              {difficulty_scores?.easy?.correct || 0} / {difficulty_scores?.easy?.total || 0}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase text-amber-400 block mb-1">Moderate Questions</span>
            <span className="text-sm font-mono text-white font-semibold">
              {difficulty_scores?.moderate?.correct || 0} / {difficulty_scores?.moderate?.total || 0}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase text-rose-400 block mb-1">Pro / Advanced</span>
            <span className="text-sm font-mono text-white font-semibold">
              {difficulty_scores?.pro?.correct || 0} / {difficulty_scores?.pro?.total || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Identified Knowledge Gaps */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-md space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> AI Identified Knowledge Gaps
        </h3>
        <p className="text-xs text-slate-400">
          The following key topics showed weak comprehension during pre-assessment and will be explicitly addressed in your personalized AI learning module:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {knowledge_gaps.map((gap, idx) => (
            <span
              key={idx}
              className="bg-amber-950/60 text-amber-300 border border-amber-500/30 text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> {gap}
            </span>
          ))}
        </div>
      </div>

      {/* Transition Button to Personalized Learning Page */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onProceedToPersonalizedLearning}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-xs inline-flex items-center gap-2 transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98]"
        >
          Proceed to Personalized AI Learning Page <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
