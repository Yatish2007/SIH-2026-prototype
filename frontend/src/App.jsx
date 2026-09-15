import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import RoleSwitcher from '@/components/layout/RoleSwitcher';
import SopUploader from '@/components/trainer/SopUploader';
import QuizInterface from '@/components/trainee/QuizInterface';
import mockSkillGaps from '@/data/mockSkillGaps.json';

export default function App() {
  const [activeRole, setActiveRole] = useState('trainer');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Header />
      <RoleSwitcher activeRole={activeRole} setActiveRole={setActiveRole} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {activeRole === 'trainer' ? (
          <div className="space-y-6">
            <SopUploader />

            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-md">
              <h3 className="text-lg font-semibold text-white mb-1">Trainee Skill Gap Analytics</h3>
              <p className="text-xs text-slate-400 mb-4">
                Automated skill assessment overview based on historical trainee evaluations.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockSkillGaps.map((item) => (
                  <div key={item.id} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-white">{item.topic}</span>
                        <span className="text-xs font-mono text-blue-400">{item.proficiencyScore}%</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{item.gapDescription}</p>
                    </div>
                    <div className="border-t border-slate-800 pt-3">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                        Recommended Module
                      </span>
                      <span className="text-xs text-slate-300 font-medium">
                        {item.recommendedModules[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <QuizInterface />
          </div>
        )}
      </main>
    </div>
  );
}