import React, { useState, useEffect } from 'react';
import {
  Sparkles, BookOpen, Layers, CheckCircle2, ArrowRight, Video,
  Target, ShieldCheck, FileText, File, ChevronRight, Loader2,
  Play, Presentation, Award
} from 'lucide-react';
import AIVideoPlayer from './AIVideoPlayer';
import { personalizationService, courseService } from '../../services/api';

const MATERIAL_TYPE_ICONS = {
  video: <Video className="w-4 h-4 text-blue-400" />,
  document: <FileText className="w-4 h-4 text-amber-400" />,
  presentation: <Presentation className="w-4 h-4 text-purple-400" />,
  note: <File className="w-4 h-4 text-emerald-400" />,
};

export default function PersonalizedLearningPage({ scalingResult, selectedCourse, onProceedToPostAssessment }) {
  const [pathData, setPathData] = useState(null);
  const [courseDetail, setCourseDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoFinished, setVideoFinished] = useState(false);

  // For module/material navigation
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [completedMaterials, setCompletedMaterials] = useState(new Set());

  // Load personalized path + course detail (real materials)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get personalized path (AI plan)
        const pathResult = await personalizationService.getPersonalizedPath();
        if (scalingResult) {
          pathResult.assessed_level = scalingResult.assessed_level || pathResult.assessed_level;
          pathResult.knowledge_gaps = scalingResult.knowledge_gaps || pathResult.knowledge_gaps;
        }
        setPathData(pathResult);

        // Get real course detail with modules & materials
        const courseId = selectedCourse?.id || pathResult.course_id;
        if (courseId) {
          const detail = await courseService.getCourseDetail(courseId);
          setCourseDetail(detail);

          // Auto-select first module with materials
          if (detail?.modules?.length > 0) {
            const firstWithMaterials = detail.modules.find(m => m.materials?.length > 0);
            if (firstWithMaterials) {
              setSelectedModule(firstWithMaterials);
              if (firstWithMaterials.materials?.length > 0) {
                setSelectedMaterial(firstWithMaterials.materials[0]);
              }
            } else {
              setSelectedModule(detail.modules[0]);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load learning path:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scalingResult, selectedCourse]);

  const handleMaterialComplete = (materialId) => {
    setCompletedMaterials(prev => new Set([...prev, materialId]));

    // Check if all materials in current module are done
    if (selectedModule) {
      const allDone = selectedModule.materials.every(
        m => m.id === materialId || completedMaterials.has(m.id)
      );
      if (allDone) {
        // Try to move to next module
        if (courseDetail) {
          const idx = courseDetail.modules.findIndex(m => m.id === selectedModule.id);
          if (idx < courseDetail.modules.length - 1) {
            const next = courseDetail.modules[idx + 1];
            setSelectedModule(next);
            setSelectedMaterial(next.materials?.[0] || null);
          }
        }
      }
    }

    // If this is a video, mark course as watchable for post-assessment
    if (selectedMaterial?.material_type === 'video') {
      setVideoFinished(true);
    }
  };

  const handleVideoComplete = () => {
    setVideoFinished(true);
    if (selectedMaterial) {
      handleMaterialComplete(selectedMaterial.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="animate-spin w-7 h-7 text-blue-500 mr-3" />
        <span>Loading personalized AI learning modules...</span>
      </div>
    );
  }

  // Check if all materials are completed (for assessment unlock)
  const totalMaterials = courseDetail?.modules?.reduce((sum, m) => sum + (m.materials?.length || 0), 0) || 0;
  const isReadyForAssessment = videoFinished || completedMaterials.size >= Math.max(1, Math.ceil(totalMaterials * 0.7));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-slate-800 to-indigo-900/60 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Personalized AI Learning Path
            </span>
            <h2 className="text-2xl font-black text-white">
              {courseDetail?.title || pathData?.course_title || 'Learning Module'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">{pathData?.objective}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-right shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Assessed Skill Tier
              </span>
              <span className="text-xl font-black text-blue-400 uppercase tracking-wide">
                {pathData?.assessed_level || 'Beginner'}
              </span>
            </div>

            <button
              onClick={onProceedToPostAssessment}
              className={`px-5 py-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg shrink-0 ${
                isReadyForAssessment
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 ring-2 ring-emerald-400/30 animate-pulse cursor-pointer'
                  : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 cursor-pointer'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Final Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT: Module & Material Navigator */}
        <div className="lg:col-span-1 space-y-4">
          {/* Knowledge Gaps */}
          {pathData?.knowledge_gaps?.length > 0 && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" /> Target Gaps
              </h4>
              <div className="space-y-1.5">
                {pathData.knowledge_gaps.map((gap, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-slate-700/50 p-2 rounded-lg flex items-center gap-2 text-xs text-amber-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Course Module & Material List */}
          {courseDetail?.modules?.length > 0 ? (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" /> Course Modules
              </h4>
              <div className="space-y-2">
                {courseDetail.modules.map((mod, mIdx) => (
                  <div key={mod.id} className="space-y-1">
                    <div
                      className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all text-xs font-bold ${
                        selectedModule?.id === mod.id
                          ? 'bg-blue-950/60 border border-blue-500/50 text-blue-300'
                          : 'border border-transparent hover:border-slate-600 text-slate-300'
                      }`}
                      onClick={() => { setSelectedModule(mod); if (mod.materials?.[0]) setSelectedMaterial(mod.materials[0]); }}
                    >
                      <span className="text-[10px] font-mono text-slate-500 w-4">{mIdx + 1}.</span>
                      <span className="flex-1 truncate">{mod.title}</span>
                      {mod.materials?.length > 0 && (
                        <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-400">{mod.materials.length}</span>
                      )}
                    </div>

                    {/* Materials list inside selected module */}
                    {selectedModule?.id === mod.id && mod.materials?.length > 0 && (
                      <div className="ml-5 space-y-1">
                        {mod.materials.map(mat => (
                          <div
                            key={mat.id}
                            onClick={() => setSelectedMaterial(mat)}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all text-[11px] ${
                              selectedMaterial?.id === mat.id
                                ? 'bg-slate-700/80 border border-slate-600 text-white'
                                : 'hover:bg-slate-700/40 text-slate-400 border border-transparent'
                            }`}
                          >
                            {completedMaterials.has(mat.id)
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              : (MATERIAL_TYPE_ICONS[mat.material_type] || <File className="w-3.5 h-3.5 text-slate-400" />)
                            }
                            <span className="truncate">{mat.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Show AI plan modules when no real materials exist
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" /> Learning Modules
              </h4>
              {pathData?.modules?.map((mod, idx) => (
                <div key={idx} className={`p-3 rounded-lg border text-xs transition-all ${
                  mod.status === 'active'
                    ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                    : 'bg-slate-900/40 border-slate-700/40 text-slate-400'
                }`}>
                  <div className="flex justify-between font-bold text-white mb-1">
                    <span>{mod.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">{mod.duration}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{mod.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Assessment Unlock Button */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-center space-y-3">
            {isReadyForAssessment ? (
              <div className="text-xs text-emerald-300 flex items-center gap-2 justify-center">
                <ShieldCheck className="w-4 h-4" /> Content requirements met!
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Complete at least 70% of materials to unlock the Final Assessment.
              </p>
            )}
            <button
              onClick={onProceedToPostAssessment}
              disabled={!isReadyForAssessment}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-lg ${
                isReadyForAssessment
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isReadyForAssessment ? (
                <>Take Final Assessment <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Complete Materials to Unlock</>
              )}
            </button>
            {totalMaterials > 0 && (
              <p className="text-[10px] text-slate-500">{completedMaterials.size}/{totalMaterials} materials done</p>
            )}
          </div>
        </div>

        {/* RIGHT: Main Content Viewer (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {selectedMaterial ? (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-4">
              {/* Material Header */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-700/60 border border-slate-600">
                  {MATERIAL_TYPE_ICONS[selectedMaterial.material_type] || <File className="w-4 h-4 text-slate-400" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedMaterial.title}</h3>
                  {selectedMaterial.description && (
                    <p className="text-xs text-slate-400">{selectedMaterial.description}</p>
                  )}
                </div>
                <span className="ml-auto text-[11px] text-slate-400 font-mono">
                  {completedMaterials.has(selectedMaterial.id) ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>
                  ) : 'In Progress'}
                </span>
              </div>

              {/* AI Video Player / Material Viewer */}
              <AIVideoPlayer
                pathData={pathData}
                materialData={selectedMaterial}
                courseId={selectedCourse?.id || courseDetail?.id || pathData?.course_id}
                materialId={selectedMaterial.id}
                onVideoComplete={handleVideoComplete}
              />
            </div>
          ) : (
            // No material selected — show a placeholder while content loads
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-400" /> {pathData?.video_title || 'Learning Material'}
                </h3>
              </div>
              <AIVideoPlayer
                pathData={pathData}
                courseId={selectedCourse?.id || courseDetail?.id || pathData?.course_id}
                onVideoComplete={() => setVideoFinished(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
