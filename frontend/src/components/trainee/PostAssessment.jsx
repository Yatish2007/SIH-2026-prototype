import React, { useState } from 'react';
import { Award, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { certificateService } from '../../services/api';

export default function PostAssessment({ selectedCourse, onCertificateEarned }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const postQuestions = [
    {
      id: 1,
      question: "Which pattern best resolves memory leaks when handling asynchronous tasks?",
      options: ["Explicit reference cleanup & weak references", "Global variables", "Ignoring loops", "Restarting process"],
      correct: 0
    },
    {
      id: 2,
      question: "What is the primary benefit of AI-based level scaling over static courses?",
      options: ["Static duration for all learners", "Adapts instructional depth directly to demonstrated knowledge gaps", "Randomized certificates", "Disables video tracking"],
      correct: 1
    }
  ];

  const handleSelect = (qId, optionIdx) => {
    setAnswers({ ...answers, [qId]: optionIdx });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const courseId = selectedCourse?.id || 1;
    const formatted = Object.entries(answers).map(([qid, opt]) => ({
      question_id: parseInt(qid),
      selected_option: opt
    }));

    const certData = await certificateService.submitPostAssessment(courseId, formatted);
    setSubmitting(false);
    onCertificateEarned(certData);
  };

  const isComplete = Object.keys(answers).length === postQuestions.length;

  return (
    <div className="max-w-2xl mx-auto bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="text-center space-y-2 border-b border-slate-700/60 pb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Award className="w-3.5 h-3.5" /> Step 9: Post-Learning Assessment
        </span>
        <h2 className="text-xl font-bold text-white">
          Post-Assessment — {selectedCourse?.title || 'Course Mastery'}
        </h2>
        <p className="text-xs text-slate-400">
          Answer the validation questions below to verify your mastery of the personalized modules and earn your official completion certificate.
        </p>
      </div>

      <div className="space-y-6">
        {postQuestions.map((q, idx) => (
          <div key={q.id} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              {idx + 1}. {q.question}
            </h3>
            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                const isSelected = answers[q.id] === oIdx;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelect(q.id, oIdx)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950 border-blue-500 text-blue-200'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSubmit}
          disabled={!isComplete || submitting}
          className={`px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all shadow-lg ${
            isComplete && !submitting
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying & Generating Certificate...</>
          ) : (
            <>Submit Assessment & Earn Certificate <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
