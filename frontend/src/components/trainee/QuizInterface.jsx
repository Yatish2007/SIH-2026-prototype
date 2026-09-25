import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, HelpCircle, AlertCircle, Loader2 } from 'lucide-react';
import { courseService, personalizationService } from '../../services/api';

export default function QuizInterface({ selectedCourse, selfLevel, onCompleteQuiz }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]); // [{ question_id, selected_option }]
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const courseId = selectedCourse?.id || 1;
    courseService.getQuizQuestions(courseId).then((data) => {
      setQuestions(data);
      setLoading(false);
    });
  }, [selectedCourse]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Preparing course pre-assessment quiz...</span>
      </div>
    );
  }

  const q = questions[currentQuestion] || questions[0];

  const handleSelectOption = (index) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    const updated = [...userAnswers];
    updated[currentQuestion] = { question_id: q.id, selected_option: index };
    setUserAnswers(updated);
  };

  const handleNext = async () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedOption(userAnswers[currentQuestion + 1]?.selected_option ?? null);
    } else {
      // Quiz finished - Submit to AI Level Scaling engine
      setSubmitting(true);
      const courseId = selectedCourse?.id || 1;
      const scalingResult = await personalizationService.scaleLevel(courseId, selfLevel, userAnswers);
      setSubmitting(false);
      onCompleteQuiz(scalingResult);
    }
  };

  const difficultyBadgeColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30';
      case 'moderate':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/30';
      case 'pro':
      case 'advanced':
        return 'bg-rose-950/80 text-rose-400 border-rose-500/30';
      default:
        return 'bg-blue-950 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Pre-Assessment Quiz — {selectedCourse?.title || 'Course'}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-md ${difficultyBadgeColor(q?.difficulty)}`}>
              {q?.difficulty?.toUpperCase()} QUESTION
            </span>
            <span className="text-xs text-slate-400 font-medium">Topic: {q?.topic}</span>
          </div>
        </div>
        <span className="text-xs font-mono text-blue-400 bg-blue-950 border border-blue-800 px-3 py-1 rounded-full">
          {currentQuestion + 1} of {questions.length}
        </span>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white leading-relaxed">
          {q?.question}
        </h3>

        <div className="space-y-3">
          {q?.options?.map((option, index) => {
            let btnStyle = "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500";
            
            if (selectedOption !== null) {
              if (index === selectedOption) {
                btnStyle = "bg-blue-950/80 border-blue-500 text-blue-200 ring-1 ring-blue-500/50";
              } else {
                btnStyle = "bg-slate-900/30 border-slate-800 text-slate-500 opacity-60";
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleSelectOption(index)}
                className={`w-full p-3.5 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${btnStyle}`}
              >
                <span>{option}</span>
                {selectedOption === index && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-slate-700/60 pt-4">
        <p className="text-[11px] text-slate-500">
          Self-level: <span className="text-slate-300 font-semibold">{selfLevel}</span>
        </p>

        <button
          onClick={handleNext}
          disabled={selectedOption === null || submitting}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-md ${
            selectedOption !== null && !submitting
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Scaling Level...
            </>
          ) : currentQuestion + 1 === questions.length ? (
            <>Finish & Calculate Level <ArrowRight className="w-4 h-4" /></>
          ) : (
            <>Next Question <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}