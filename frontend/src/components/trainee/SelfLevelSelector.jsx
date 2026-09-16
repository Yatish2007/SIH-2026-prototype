import React, { useState } from 'react';
import { Target, Award, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SelfLevelSelector({ selectedCourse, onConfirmLevel }) {
  const [level, setLevel] = useState('Intermediate');

  const options = [
    {
      id: 'Beginner',
      title: 'Beginner Level',
      icon: Target,
      color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400',
      description: 'New to this course or need to build foundational concepts from scratch.'
    },
    {
      id: 'Intermediate',
      title: 'Intermediate Level',
      icon: Zap,
      color: 'border-blue-500/50 bg-blue-950/20 text-blue-400',
      description: 'Familiar with syntax and core concepts; looking to strengthen application skills.'
    },
    {
      id: 'Advanced',
      title: 'Advanced / Pro Level',
      icon: Award,
      color: 'border-purple-500/50 bg-purple-950/20 text-purple-400',
      description: 'Experienced practitioner targeting optimization, architecture, and advanced edge cases.'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /> Step 3: Self-Level Assessment
        </div>
        <h2 className="text-xl font-bold text-white mb-1">
          Self-Assessed Skill Level for <span className="text-blue-400">{selectedCourse?.title}</span>
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please select your self-perceived expertise level. Note: The system will use your pre-assessment quiz performance to perform final AI Level Scaling.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = level === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => setLevel(opt.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                isSelected
                  ? 'bg-slate-800 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
              }`}
            >
              <div className={`p-3 rounded-lg border ${opt.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{opt.title}</h3>
                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-950 border border-blue-500/30 px-2 py-0.5 rounded">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{opt.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onConfirmLevel(level)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-lg text-xs inline-flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
        >
          Proceed to Course Quiz <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
