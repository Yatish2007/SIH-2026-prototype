import React, { useState } from 'react';
import { UploadCloud, FileText, BarChart3, Plus, CheckCircle2, Clock, Video } from 'lucide-react';
import mockSkillGaps from '../../data/mockSkillGaps.json';

export default function TrainerDashboard() {
  const [activeTab, setActiveTab] = useState('resources'); // resources, analytics, questionnaires
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('SOP Document');
  const [resources, setResources] = useState([
    { id: 1, title: 'Python Asyncio & Thread Safety SOP', type: 'PDF Document', course: 'Python Programming', date: '2026-09-15' },
    { id: 2, title: 'Industrial Safety & LOTO Protocol Video', type: 'Instructional Video', course: 'Industrial SOP', date: '2026-09-14' }
  ]);
  const [successMsg, setSuccessMsg] = useState('');

  const handleUpload = (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    const newRes = {
      id: resources.length + 1,
      title: uploadTitle,
      type: uploadType,
      course: 'Python Programming',
      date: new Date().toISOString().split('T')[0]
    };
    setResources([newRes, ...resources]);
    setUploadTitle('');
    setSuccessMsg('Verified learning resource uploaded successfully. Now available for AI personalization seeding.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Trainer Management Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload verified course SOPs, manage pre-assessment questionnaires, and monitor trainee skill gap analytics.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/60 shrink-0">
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Verified Resources
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Skill Gap Analytics
          </button>
        </div>
      </div>

      {activeTab === 'resources' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resource Upload Form */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-blue-400" /> Upload Verified Learning Resource
            </h3>
            <p className="text-xs text-slate-400">
              Uploaded materials serve as verified reference inputs for the AI personalized content generator.
            </p>

            {successMsg && (
              <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Resource Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Advanced Concurrency SOP Document"
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Resource Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="SOP Document">SOP Document (PDF / Doc)</option>
                  <option value="Instructional Video">Instructional Video (MP4)</option>
                  <option value="Questionnaire Set">Questionnaire Assessment</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-md shadow-blue-600/30"
              >
                Upload Resource to AI Repository
              </button>
            </form>
          </div>

          {/* Uploaded Resources List */}
          <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Active Verified Resource Repository
            </h3>

            <div className="space-y-3">
              {resources.map((res) => (
                <div key={res.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-950 border border-blue-500/30 text-blue-400">
                      {res.type.includes('Video') ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{res.title}</h4>
                      <p className="text-[11px] text-slate-400">{res.course} • {res.type}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">{res.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Trainee Skill Gap Analytics View */
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Aggregate Trainee Skill Gap Overview
          </h3>
          <p className="text-xs text-slate-400">
            Real-time analytics collected from trainee pre-assessment quizzes and AI level scaling results.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {mockSkillGaps.map((item) => (
              <div key={item.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">{item.topic}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">{item.proficiencyScore}% Avg</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.gapDescription}</p>
                </div>
                <div className="border-t border-slate-800 pt-2 text-[11px]">
                  <span className="text-slate-500 block font-semibold text-[10px] uppercase">Recommended Module</span>
                  <span className="text-blue-300 font-medium">{item.recommendedModules[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
