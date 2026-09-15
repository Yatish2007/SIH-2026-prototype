import React from 'react';
import QuizInterface from '../../components/trainee/QuizInterface';

export default function TraineeTestPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Trainee Knowledge Evaluation</h2>
        <p className="text-xs text-slate-400">
          Complete the automated assessment modules below to identify your core strengths and target skill gaps.
        </p>
      </div>

      <QuizInterface />
    </div>
  );
}