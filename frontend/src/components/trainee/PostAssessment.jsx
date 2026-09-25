import React, { useState, useEffect } from 'react';
import {
  Award, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Lock,
  AlertTriangle, ShieldCheck, Clock, RefreshCw, Sparkles,
  BookOpen, AlertCircle, Check, HelpCircle
} from 'lucide-react';
import { finalAssessmentService } from '../../services/api';

export default function PostAssessment({ selectedCourse, onCertificateEarned, onBackToLearning }) {
  const courseId = selectedCourse?.id;

  const [loading, setLoading] = useState(true);
  const [assessmentStatus, setAssessmentStatus] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [error, setError] = useState('');

  // 1. Fetch real assessment data & policy status from backend
  const loadAssessment = async () => {
    setLoading(true);
    setResult(null);
    setAnswers({});
    setActiveIdx(0);
    setError('');
    try {
      if (!courseId) {
        setError('No course selected.');
        return;
      }
      const data = await finalAssessmentService.getAssessmentStatus(courseId);
      if (data) {
        setAssessmentStatus(data);
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        }
        if (data.time_limit_minutes && data.time_limit_minutes > 0) {
          setSecondsLeft(data.time_limit_minutes * 60);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load assessment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessment();
  }, [courseId]);

  // Timer countdown
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0 || result || assessmentStatus?.is_locked) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-submit if time runs out and every question is answered
          const isAllAnswered = questions.length > 0 &&
            Object.keys(answers).length >= questions.length;
          if (isAllAnswered) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, result, assessmentStatus?.is_locked, questions, answers]);

  const formatTimer = (secs) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId, optionIdx) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // The backend grades, enforces the learning policy lock, and issues
      // the certificate only when all completion requirements are met.
      const submitRes = await finalAssessmentService.submitAssessment(courseId, answers);
      setResult(submitRes);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === 'object' && detail.lock_reasons) {
        setError(`Final assessment is locked. ${detail.lock_reasons.join(' ')}`);
      } else {
        setError(detail || 'Assessment submission failed. Please try again.');
      }
      await loadAssessment();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimCertificate = () => {
    if (result && result.passed && result.certificate_code) {
      onCertificateEarned({
        certificate_code: result.certificate_code,
        course_title: selectedCourse?.title || 'Capacity Building Course',
        user_name: '',
        issued_date: new Date().toISOString(),
        score: result.percentage
      });
    }
  };

  // ------------------------------------
  // RENDER: Loading State
  // ------------------------------------
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center space-y-4 shadow-xl">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        <h3 className="text-sm font-semibold text-slate-200">Verifying Learning Policy & Loading Assessment...</h3>
        <p className="text-xs text-slate-400">Inspecting video watch progress, mandatory module completions, and telemetry records.</p>
      </div>
    );
  }

  // ------------------------------------
  // RENDER: Policy Locked Screen
  // ------------------------------------
  if (assessmentStatus?.is_locked) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-amber-500/30 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Learning Policy Lock Active
          </span>
          <h2 className="text-xl font-black text-white">
            Final Assessment Not Yet Unlocked
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The course trainer has enforced policy requirements that must be met before taking this final certification exam.
          </p>
        </div>

        {/* Lock Reasons List */}
        {assessmentStatus.lock_reasons && assessmentStatus.lock_reasons.length > 0 && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left space-y-2.5 max-w-lg mx-auto">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Requirements Pending:
            </h4>
            <ul className="space-y-2">
              {assessmentStatus.lock_reasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onBackToLearning && (
            <button
              onClick={onBackToLearning}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Learning Module
            </button>
          )}
          <button
            onClick={loadAssessment}
            className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-check Status
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------
  // RENDER: Max Attempts Reached
  // ------------------------------------
  if (
    assessmentStatus &&
    assessmentStatus.attempts_used >= assessmentStatus.max_attempts &&
    !assessmentStatus.has_passed &&
    !result
  ) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-rose-500/30 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Maximum Attempts Exhausted
          </span>
          <h2 className="text-xl font-black text-white">Assessment Attempts Limit Reached</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You have used all {assessmentStatus.max_attempts} attempts. Your best score was {assessmentStatus.best_score || 0}% (Required: {assessmentStatus.pass_percentage}%).
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          {onBackToLearning && (
            <button
              onClick={onBackToLearning}
              className="px-6 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Review Course Content
            </button>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------
  // RENDER: Load Error State
  // ------------------------------------
  if (error && !result && !assessmentStatus?.is_locked) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-rose-500/30 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">Assessment Unavailable</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          {onBackToLearning && (
            <button
              onClick={onBackToLearning}
              className="px-6 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Learning Module
            </button>
          )}
          <button
            onClick={loadAssessment}
            className="px-6 py-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------
  // RENDER: No Questions Configured
  // ------------------------------------
  if (questions.length === 0 && !assessmentStatus?.is_locked && !result) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-amber-500/30 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">No Assessment Configured</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The course trainer has not published final assessment questions for this course yet.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          {onBackToLearning && (
            <button
              onClick={onBackToLearning}
              className="px-6 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Learning Module
            </button>
          )}
          <button
            onClick={loadAssessment}
            className="px-6 py-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------
  // RENDER: Exam Result (Passed or Failed)
  // ------------------------------------
  if (result) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border rounded-2xl p-8 shadow-2xl space-y-6 text-center animate-fadeIn">
        {result.passed ? (
          <>
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Sparkles className="w-3.5 h-3.5" /> Assessment Passed!
              </span>
              <h2 className="text-2xl font-black text-white">Mastery Verified & Certified</h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                {result.message} Your performance validates complete comprehension of the course materials.
              </p>
            </div>

            {/* Score Card */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Score</span>
                <span className="text-lg font-black text-white">{result.score} / {result.total_marks}</span>
              </div>
              <div className="border-x border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Percentage</span>
                <span className="text-lg font-black text-emerald-400">{result.percentage}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Required</span>
                <span className="text-lg font-black text-slate-300">{result.pass_percentage}%</span>
              </div>
            </div>

            {result.certificate_code && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs">
                <span>Certificate ID:</span>
                <strong>{result.certificate_code}</strong>
              </div>
            )}

            <div className="pt-4 flex justify-center">
              <button
                onClick={handleClaimCertificate}
                className="px-8 py-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 inline-flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105 cursor-pointer"
              >
                <Award className="w-4 h-4" /> View & Download Official Certificate <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Passing Threshold Not Met
              </span>
              <h2 className="text-2xl font-black text-white">Score: {result.percentage}%</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Required passing threshold is {result.pass_percentage}%. You have {result.attempts_remaining} attempts remaining.
              </p>
            </div>

            {/* Score Card */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Earned</span>
                <span className="text-lg font-black text-rose-400">{result.score} pts</span>
              </div>
              <div className="border-x border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                <span className="text-lg font-black text-slate-300">{result.total_marks} pts</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Attempts Left</span>
                <span className="text-lg font-black text-amber-400">{result.attempts_remaining}</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              {result.attempts_remaining > 0 ? (
                <button
                  onClick={loadAssessment}
                  className="px-6 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Retake Assessment
                </button>
              ) : null}

              {onBackToLearning && (
                <button
                  onClick={onBackToLearning}
                  className="px-6 py-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Review Modules
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ------------------------------------
  // RENDER: Active Assessment Quiz Interface
  // ------------------------------------
  const currentQuestion = questions[activeIdx] || questions[0];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-3.5 h-3.5" /> Step 9: Final Certification Assessment
            </span>
            <span className="text-[11px] text-slate-400">
              Attempt {(assessmentStatus?.attempts_used || 0) + 1} of {assessmentStatus?.max_attempts || 2}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">
            {assessmentStatus?.title || `${selectedCourse?.title || 'Course'} Mastery Assessment`}
          </h2>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          {secondsLeft !== null && (
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold ${
              secondsLeft < 300
                ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{formatTimer(secondsLeft)}</span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300">
            Pass: <strong className="text-emerald-400">{assessmentStatus?.pass_percentage || 70}%</strong>
          </div>
        </div>
      </div>

      {/* Progress & Palette */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Question <strong className="text-white">{activeIdx + 1}</strong> of <strong className="text-white">{totalQuestions}</strong>
          </span>
          <span className="text-slate-400">
            Answered: <strong className="text-emerald-400">{answeredCount}</strong> / {totalQuestions}
          </span>
        </div>

        {/* Question Palette Buttons */}
        <div className="flex flex-wrap gap-2">
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = idx === activeIdx;
            return (
              <button
                key={q.id || idx}
                onClick={() => setActiveIdx(idx)}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'ring-2 ring-blue-400 bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : isAnswered
                    ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border border-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Question Card */}
      {currentQuestion && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-bold text-white leading-relaxed">
              <span className="text-blue-400 font-mono mr-2">Q{activeIdx + 1}.</span>
              {currentQuestion.question}
            </h3>
            {currentQuestion.marks && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-slate-900 border border-slate-700 text-slate-400 shrink-0">
                {currentQuestion.marks} Marks
              </span>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQuestion.options?.map((opt, optIdx) => {
              const isSelected = answers[currentQuestion.id] === optIdx;
              const optionLetters = ['A', 'B', 'C', 'D', 'E'];
              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                  className={`w-full text-left p-4 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/80 border-blue-500 text-blue-100 shadow-md shadow-blue-900/20 ring-1 ring-blue-400/50'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-700/40 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {optionLetters[optIdx] || optIdx + 1}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Navigation between questions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700/60">
            <button
              onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
              disabled={activeIdx === 0}
              className={`px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                activeIdx === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </button>

            {activeIdx < totalQuestions - 1 ? (
              <button
                onClick={() => setActiveIdx((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Next Question <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isAllAnswered || submitting}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all shadow-lg ${
                  isAllAnswered && !submitting
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer animate-pulse'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                ) : (
                  <>Submit Final Assessment <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
