import React, { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import mockQuestions from '@/data/mockQuestions.json';

export default function QuizInterface() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const q = mockQuestions[currentQuestion];

  const handleSelectOption = (index) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    if (index === q.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion + 1 < mockQuestions.length) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setScore(0);
    setShowResult(false);
  };

  if (showResult) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-md text-center max-w-xl mx-auto">
        <h3 className="text-xl font-bold text-white mb-2">Assessment Completed</h3>
        <p className="text-sm text-slate-400 mb-6">Here is your preliminary skill evaluation result:</p>
        
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-6 mb-6">
          <div className="text-4xl font-extrabold text-blue-400 mb-1">
            {score} / {mockQuestions.length}
          </div>
          <p className="text-xs text-slate-400">Correct Answers</p>
        </div>

        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Retake Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-md max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
        <span className="text-xs font-medium text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-500/20">
          {q.category}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          Question {currentQuestion + 1} of {mockQuestions.length}
        </span>
      </div>

      <h3 className="text-base font-semibold text-white mb-6">{q.question}</h3>

      <div className="space-y-3 mb-6">
        {q.options.map((option, index) => {
          let btnStyle = "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500";
          
          if (selectedOption !== null) {
            if (index === q.correctAnswer) {
              btnStyle = "bg-emerald-950/60 border-emerald-500/60 text-emerald-300";
            } else if (index === selectedOption) {
              btnStyle = "bg-rose-950/60 border-rose-500/60 text-rose-300";
            } else {
              btnStyle = "bg-slate-900/30 border-slate-800 text-slate-500 opacity-50";
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              disabled={selectedOption !== null}
              className={`w-full p-3.5 rounded-lg border text-left text-xs font-medium transition-all flex items-center justify-between ${btnStyle}`}
            >
              <span>{option}</span>
              {selectedOption !== null && index === q.correctAnswer && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {selectedOption !== null && index === selectedOption && index !== q.correctAnswer && (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={selectedOption === null}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            selectedOption !== null
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          {currentQuestion + 1 === mockQuestions.length ? 'Finish' : 'Next Question'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}