import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { courseService } from '../../services/api';

export default function CourseSelection({ onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseService.getCourses().then((data) => {
      setCourses(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        <span>Loading courses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/40 via-slate-800 to-indigo-900/40 border border-blue-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Step 1: Course Selection
          </span>
          <h2 className="text-2xl font-bold text-white mb-2">Select Your Target Skill Course</h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            Choose a learning domain below. Our AI system will assess your existing skill level with a pre-assessment quiz and construct a personalized AI-generated learning path.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-xl p-6 shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
            onClick={() => onSelectCourse(course)}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {course.category}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> {course.duration}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mb-2">
                {course.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                {course.description}
              </p>
            </div>

            <div className="border-t border-slate-700/60 pt-4 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium group-hover:text-slate-200">
                Pre-Assessment Included
              </span>
              <button className="bg-blue-600 group-hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20">
                Start Course <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
