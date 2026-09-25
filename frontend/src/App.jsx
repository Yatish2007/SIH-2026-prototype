import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import LoginPage from './pages/LoginPage';
import { authService } from './services/api';

// Trainee Components
import CourseSelection from './components/trainee/CourseSelection';
import SelfLevelSelector from './components/trainee/SelfLevelSelector';
import QuizInterface from './components/trainee/QuizInterface';
import LevelScalingResult from './components/trainee/LevelScalingResult';
import PersonalizedLearningPage from './components/trainee/PersonalizedLearningPage';
import PostAssessment from './components/trainee/PostAssessment';
import CertificateView from './components/trainee/CertificateView';

// Trainer & Admin Components
import TrainerDashboard from './components/trainer/TrainerDashboard';
import AdminDashboard from './components/admin/AdminDashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeRole, setActiveRole] = useState('trainee');

  // Trainee Workflow State Machine Steps:
  // 'course_select' -> 'self_level' -> 'quiz' -> 'scaling_result' -> 'personalized_learning' -> 'post_assessment' -> 'certificate'
  const [traineeStep, setTraineeStep] = useState('course_select');

  // Trainee Data State
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selfLevel, setSelfLevel] = useState('Intermediate');
  const [scalingResult, setScalingResult] = useState(null);
  const [certificateData, setCertificateData] = useState(null);

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    // The role is always taken from the backend-authenticated account.
    // There is no client-side role switching.
    setActiveRole(userData.role?.toLowerCase() || 'trainee');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveRole('trainee');
    setTraineeStep('course_select');
  };

  // Trainee Step Navigation Handlers
  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setTraineeStep('self_level');
  };

  const handleConfirmSelfLevel = (lvl) => {
    setSelfLevel(lvl);
    setTraineeStep('quiz');
  };

  const handleCompleteQuiz = (res) => {
    setScalingResult(res);
    setTraineeStep('scaling_result');
  };

  const handleProceedToPersonalizedLearning = () => {
    setTraineeStep('personalized_learning');
  };

  const handleProceedToPostAssessment = () => {
    setTraineeStep('post_assessment');
  };

  const handleCertificateEarned = (cert) => {
    setCertificateData(cert);
    setTraineeStep('certificate');
  };

  const handleRestartTraineeJourney = () => {
    setSelectedCourse(null);
    setScalingResult(null);
    setCertificateData(null);
    setTraineeStep('course_select');
  };

  // 1. Render Login Page if unauthenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Render main portal layout
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <div className="relative">
        <Header />
        {/* Logout & User Profile floating action */}
        <div className="absolute top-4 right-6 flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Logged in as <strong className="text-white capitalize">{currentUser?.name}</strong> ({activeRole})
          </span>
          <button
            onClick={handleLogout}
            className="bg-rose-600/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-rose-600 hover:text-white transition-all font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {activeRole === 'trainer' && <TrainerDashboard />}

        {activeRole === 'admin' && <AdminDashboard />}

        {activeRole === 'trainee' && (
          <div>
            {traineeStep === 'course_select' && (
              <CourseSelection onSelectCourse={handleSelectCourse} />
            )}

            {traineeStep === 'self_level' && (
              <SelfLevelSelector
                selectedCourse={selectedCourse}
                onConfirmLevel={handleConfirmSelfLevel}
              />
            )}

            {traineeStep === 'quiz' && (
              <QuizInterface
                selectedCourse={selectedCourse}
                selfLevel={selfLevel}
                onCompleteQuiz={handleCompleteQuiz}
              />
            )}

            {traineeStep === 'scaling_result' && (
              <LevelScalingResult
                scalingResult={scalingResult}
                onProceedToPersonalizedLearning={handleProceedToPersonalizedLearning}
              />
            )}

            {traineeStep === 'personalized_learning' && (
              <PersonalizedLearningPage
                scalingResult={scalingResult}
                selectedCourse={selectedCourse}
                onProceedToPostAssessment={handleProceedToPostAssessment}
              />
            )}

            {traineeStep === 'post_assessment' && (
              <PostAssessment
                selectedCourse={selectedCourse}
                onCertificateEarned={handleCertificateEarned}
                onBackToLearning={() => setTraineeStep('personalized_learning')}
              />
            )}

            {traineeStep === 'certificate' && (
              <CertificateView
                certData={certificateData}
                currentUser={currentUser}
                onRestart={handleRestartTraineeJourney}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}