import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileText, BarChart3, Plus, CheckCircle2, Video, Layers,
  Settings, BookOpen, Trash2, Edit3, Save, X, ChevronDown, ChevronUp,
  AlertTriangle, Users, Award, ShieldCheck, File, Presentation, FileVideo,
  Loader2, Eye, EyeOff, RefreshCw, Target, Sparkles
} from 'lucide-react';
import { trainerService, courseService } from '../../services/api';
import SopUploader from './SopUploader';


// ====== HELPERS ======
const MATERIAL_TYPE_ICONS = {
  video: <FileVideo className="w-4 h-4 text-blue-400" />,
  document: <FileText className="w-4 h-4 text-amber-400" />,
  presentation: <Presentation className="w-4 h-4 text-purple-400" />,
  note: <File className="w-4 h-4 text-emerald-400" />,
};

const MATERIAL_TYPE_LABELS = {
  video: 'Video (MP4/WebM)',
  document: 'Document (PDF/DOC/DOCX)',
  presentation: 'Presentation (PPT/PPTX)',
  note: 'Notes / Text File',
};

const ACCEPT_FOR_TYPE = {
  video: 'video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg',
  document: '.pdf,.doc,.docx,.txt,.md',
  presentation: '.ppt,.pptx,.pdf',
  note: '.txt,.md,.pdf,.doc,.docx',
};

function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-950/60 text-blue-300 border-blue-500/40',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-500/40',
    rose: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[color]}`}>
      {children}
    </span>
  );
}

function Section({ title, icon, children, collapsible = false }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-md overflow-hidden">
      <div
        className={`flex items-center justify-between px-5 py-4 border-b border-slate-700/60 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => collapsible && setOpen(!open)}
      >
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {collapsible && (open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />)}
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

// ============================
// COURSE MANAGER (Create/Select)
// ============================
function CourseManager({ selectedCourse, setSelectedCourse, courses, setCourses }) {
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', description: '', duration: '4 Hours', difficulty: 'Intermediate', learning_objectives: '' });
  const [err, setErr] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await courseService.getCourses();
      setCourses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.description) { setErr('Please fill in Title, Category and Description.'); return; }
    setLoading(true); setErr('');
    try {
      const course = await trainerService.createCourse(form);
      setCourses(prev => [...prev, course]);
      setSelectedCourse(course);
      setCreating(false);
      setForm({ title: '', category: '', description: '', duration: '4 Hours', difficulty: 'Intermediate', learning_objectives: '' });
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to create course. Ensure backend is running and you are logged in as Trainer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="Course Selection / Creation" icon={<BookOpen className="w-4 h-4 text-blue-400" />}>
      <div className="flex flex-wrap gap-3 mb-4">
        {courses.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCourse(c)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              selectedCourse?.id === c.id
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-blue-500/60'
            }`}
          >
            {c.title}
          </button>
        ))}
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 rounded-xl text-xs font-semibold border bg-slate-900 border-dashed border-blue-500/50 text-blue-400 hover:bg-blue-950/40 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New Course
        </button>
        <button onClick={loadCourses} className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="mt-2 bg-slate-900/80 border border-slate-700 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Create New Course</h4>
          {err && <p className="text-rose-400 text-xs">{err}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Course Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Category *" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
            <select className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
              {['Beginner', 'Intermediate', 'Advanced'].map(d => <option key={d}>{d}</option>)}
            </select>
            <input className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Duration (e.g. 6 Hours)" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
          </div>
          <textarea rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Course Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          <textarea rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Learning Objectives (optional)" value={form.learning_objectives} onChange={e => setForm({ ...form, learning_objectives: e.target.value })} />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create Course
            </button>
            <button type="button" onClick={() => { setCreating(false); setErr(''); }} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </form>
      )}

      {selectedCourse && (
        <div className="mt-3 bg-blue-950/30 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">Selected Course</span>
            <span className="text-sm font-bold text-white">{selectedCourse.title}</span>
            <span className="text-xs text-slate-400 ml-2">{selectedCourse.category} • {selectedCourse.difficulty}</span>
          </div>
          <Badge color="blue">ID: {selectedCourse.id}</Badge>
        </div>
      )}
    </Section>
  );
}

// ============================
// MODULE MANAGER
// ============================
function ModuleManager({ courseId, modules, setModules, onModuleSelect, selectedModuleId }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', is_mandatory: true });
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const loadModules = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await trainerService.getModules(courseId);
      setModules(data);
    } catch (e) {
      console.error('Failed to load modules', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadModules(); }, [courseId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title) { setErr('Module title is required.'); return; }
    setLoading(true); setErr('');
    try {
      const mod = await trainerService.createModule(courseId, form);
      setModules(prev => [...prev, mod]);
      setForm({ title: '', description: '', is_mandatory: true });
      setCreating(false);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to create module.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modId) => {
    if (!window.confirm('Delete this module and all its materials?')) return;
    try {
      await trainerService.deleteModule(modId);
      setModules(prev => prev.filter(m => m.id !== modId));
      if (selectedModuleId === modId) onModuleSelect(null);
    } catch (e) {
      alert('Failed to delete module: ' + (e?.response?.data?.detail || e.message));
    }
  };

  const startEdit = (mod) => {
    setEditingId(mod.id);
    setEditForm({ title: mod.title, description: mod.description || '', is_mandatory: mod.is_mandatory });
  };

  const handleSaveEdit = async (modId) => {
    try {
      const updated = await trainerService.updateModule(modId, editForm);
      setModules(prev => prev.map(m => m.id === modId ? { ...m, ...updated } : m));
      setEditingId(null);
    } catch (e) {
      alert('Failed to update module: ' + (e?.response?.data?.detail || e.message));
    }
  };

  if (!courseId) return null;

  return (
    <Section title="Module Manager" icon={<Layers className="w-4 h-4 text-purple-400" />} collapsible>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">{modules.length} module(s) in this course</p>
        <div className="flex gap-2">
          <button onClick={loadModules} className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setCreating(!creating)} className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Module
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 space-y-3 mb-4">
          {err && <p className="text-rose-400 text-xs">{err}</p>}
          <input className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Module Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <textarea rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Module Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm({ ...form, is_mandatory: e.target.checked })} className="accent-blue-500" />
            Mandatory Module
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Module
            </button>
            <button type="button" onClick={() => setCreating(false)} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {modules.map((mod, idx) => (
          <div
            key={mod.id}
            className={`bg-slate-900/80 border rounded-xl p-3.5 transition-all cursor-pointer ${
              selectedModuleId === mod.id ? 'border-purple-500/60 bg-purple-950/20' : 'border-slate-700/60 hover:border-slate-600'
            }`}
          >
            {editingId === mod.id ? (
              <div className="space-y-2" onClick={e => e.stopPropagation()}>
                <input className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                <textarea rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={editForm.is_mandatory} onChange={e => setEditForm({ ...editForm, is_mandatory: e.target.checked })} className="accent-blue-500" />
                  Mandatory
                </label>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(mod.id)} className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3 py-1 rounded-lg font-semibold flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                  <button onClick={() => setEditingId(null)} className="bg-slate-700 text-white text-xs px-3 py-1 rounded-lg font-semibold">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between" onClick={() => onModuleSelect(mod.id === selectedModuleId ? null : mod.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-slate-500 w-5">{idx + 1}.</span>
                  <div>
                    <span className="text-xs font-bold text-white">{mod.title}</span>
                    {mod.description && <p className="text-[11px] text-slate-400 mt-0.5">{mod.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {mod.is_mandatory && <Badge color="amber">Mandatory</Badge>}
                  <Badge color="purple">{(mod.materials || []).length} files</Badge>
                  <button onClick={e => { e.stopPropagation(); startEdit(mod); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(mod.id); }} className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {modules.length === 0 && !creating && (
          <div className="text-center py-6 text-slate-500 text-xs">No modules yet. Click "Add Module" to create the first one.</div>
        )}
      </div>
    </Section>
  );
}

// ============================
// MATERIAL UPLOADER
// ============================
function MaterialUploader({ courseId, moduleId, moduleName, onUploaded }) {
  const [materialType, setMaterialType] = useState('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setErr('Please select a file.'); return; }
    if (!title) { setErr('Please enter a title.'); return; }
    setUploading(true); setErr(''); setSuccess(''); setProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('material_type', materialType);
    if (description) fd.append('description', description);

    try {
      const result = await trainerService.uploadMaterial(courseId, moduleId, fd, setProgress);
      setSuccess(`✓ "${result.title}" uploaded successfully! (${(result.file_size / 1024).toFixed(1)} KB)`);
      setFile(null); setTitle(''); setDescription('');
      if (fileRef.current) fileRef.current.value = '';
      if (onUploaded) onUploaded(result);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Upload failed. Check backend is running.');
    } finally {
      setUploading(false);
    }
  };

  if (!moduleId) return null;

  return (
    <Section title={`Upload Materials → ${moduleName || 'Module'}`} icon={<UploadCloud className="w-4 h-4 text-blue-400" />}>
      <form onSubmit={handleUpload} className="space-y-4">
        {err && <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{err}</div>}
        {success && <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Material Type</label>
            <select
              value={materialType}
              onChange={e => { setMaterialType(e.target.value); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              {Object.entries(MATERIAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Python Variables"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Description (optional)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of this material..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
            File * — {MATERIAL_TYPE_LABELS[materialType]}
          </label>
          <div
            className="border-2 border-dashed border-slate-600 hover:border-blue-500/60 rounded-xl p-5 text-center cursor-pointer transition-all bg-slate-900/40 relative"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_FOR_TYPE[materialType]}
              className="hidden"
              onChange={e => setFile(e.target.files[0] || null)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {MATERIAL_TYPE_ICONS[materialType]}
                <span className="text-xs text-white font-medium">{file.name}</span>
                <span className="text-[10px] text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">Click to select file or drag & drop</p>
                <p className="text-[10px] text-slate-500">{ACCEPT_FOR_TYPE[materialType]}</p>
              </div>
            )}
          </div>
        </div>

        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Uploading...</span><span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-md shadow-blue-600/30"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {uploading ? `Uploading... ${progress}%` : 'Upload to Course'}
        </button>
      </form>
    </Section>
  );
}

// ============================
// MATERIALS LIST
// ============================
function MaterialsList({ courseId, moduleId, moduleName, modules, setModules }) {
  const materials = (modules.find(m => m.id === moduleId)?.materials) || [];

  const handleDelete = async (matId) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await trainerService.deleteMaterial(matId);
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, materials: m.materials.filter(mat => mat.id !== matId) } : m));
    } catch (e) {
      alert('Failed to delete material: ' + (e?.response?.data?.detail || e.message));
    }
  };

  if (!moduleId) return null;

  return (
    <Section title={`Uploaded Materials — ${moduleName || 'Module'}`} icon={<FileText className="w-4 h-4 text-amber-400" />} collapsible>
      {materials.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">No materials uploaded to this module yet.</p>
      ) : (
        <div className="space-y-2">
          {materials.map(mat => (
            <div key={mat.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                  {MATERIAL_TYPE_ICONS[mat.material_type] || <File className="w-4 h-4 text-slate-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{mat.title}</h4>
                  <p className="text-[11px] text-slate-400">
                    {mat.file_name} • {mat.material_type} {mat.file_size ? `• ${(mat.file_size / 1024).toFixed(1)} KB` : ''}
                  </p>
                  {mat.file_url && (
                    <a
                      href={`http://127.0.0.1:8001${mat.file_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-400 hover:underline mt-0.5 inline-block"
                    >
                      Preview file ↗
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(mat.id)} className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ============================
// LEARNING POLICY CONFIGURATOR
// ============================
function LearningPolicyConfig({ courseId }) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    trainerService.getLearningPolicy(courseId).then(d => { setPolicy(d); setLoading(false); }).catch(() => setLoading(false));
  }, [courseId]);

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true); setSaved(false);
    try {
      const updated = await trainerService.updateLearningPolicy(courseId, {
        minimum_content_percentage: policy.minimum_content_percentage,
        minimum_video_watch_percentage: policy.minimum_video_watch_percentage,
        maximum_skip_percentage: policy.maximum_skip_percentage,
        allowed_playback_speed: policy.allowed_playback_speed,
        inactivity_threshold: policy.inactivity_threshold,
        require_all_mandatory_modules: policy.require_all_mandatory_modules,
        final_assessment_required: policy.final_assessment_required
      });
      setPolicy(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!courseId) return null;
  if (loading) return <div className="text-slate-400 text-xs text-center p-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <Section title="Learning Policy Configurator" icon={<Settings className="w-4 h-4 text-emerald-400" />} collapsible>
      {saved && <div className="mb-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Policy saved successfully!</div>}
      {policy && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Min Content Consumption (%)', key: 'minimum_content_percentage', min: 0, max: 100, step: 5 },
              { label: 'Min Video Watch (%)', key: 'minimum_video_watch_percentage', min: 0, max: 100, step: 5 },
              { label: 'Max Skip Allowed (%)', key: 'maximum_skip_percentage', min: 0, max: 50, step: 5 },
              { label: 'Max Playback Speed (x)', key: 'allowed_playback_speed', min: 1, max: 3, step: 0.25 },
              { label: 'Inactivity Threshold (sec)', key: 'inactivity_threshold', min: 10, max: 300, step: 10 },
            ].map(({ label, key, min, max, step }) => (
              <div key={key}>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={min} max={max} step={step}
                    value={policy[key] || 0}
                    onChange={e => setPolicy({ ...policy, [key]: parseFloat(e.target.value) })}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-xs font-mono font-bold text-blue-300 w-10 text-right">{policy[key]}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Require All Mandatory Modules', key: 'require_all_mandatory_modules' },
              { label: 'Final Assessment Required', key: 'final_assessment_required' },
            ].map(({ label, key }) => (
              <label key={key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!policy[key]} onChange={e => setPolicy({ ...policy, [key]: e.target.checked })} className="accent-blue-500 w-4 h-4" />
                {label}
              </label>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all shadow-md shadow-emerald-600/30"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      )}
    </Section>
  );
}

// ============================
// FINAL ASSESSMENT BUILDER
// ============================
function AssessmentBuilder({ courseId }) {
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingQ, setAddingQ] = useState(false);
  const [showSopUploader, setShowSopUploader] = useState(false);
  const [qForm, setQForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: 0, marks: 1, explanation: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await trainerService.getAssessment(courseId);
      setAssessment(data.assessment);
      setQuestions(data.questions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [courseId]);

  const handleImportSopQuestions = async (newQuestions) => {
    for (const q of newQuestions) {
      try {
        const added = await trainerService.addQuestion(courseId, {
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          marks: q.marks || 1,
          explanation: q.explanation || null
        });
        setQuestions(prev => [...prev, added]);
      } catch (e) {
        console.error('Failed to import question', e);
      }
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.question || qForm.options.some(o => !o)) { setErr('Fill in all 4 options.'); return; }
    setSaving(true); setErr('');
    try {
      const q = await trainerService.addQuestion(courseId, {

        question: qForm.question,
        options: qForm.options,
        correct_answer: parseInt(qForm.correct_answer),
        marks: parseInt(qForm.marks) || 1,
        explanation: qForm.explanation || null
      });
      setQuestions(prev => [...prev, q]);
      setQForm({ question: '', options: ['', '', '', ''], correct_answer: 0, marks: 1, explanation: '' });
      setAddingQ(false);
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to add question.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQ = async (qId) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await trainerService.deleteQuestion(qId);
      setQuestions(prev => prev.filter(q => q.id !== qId));
    } catch (e) {
      alert('Failed to delete: ' + (e?.response?.data?.detail || e.message));
    }
  };

  if (!courseId) return null;

  return (
    <Section title="Final Assessment Builder" icon={<Award className="w-4 h-4 text-amber-400" />} collapsible>
      {assessment && (
        <div className="mb-4 bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 text-xs text-slate-400 flex flex-wrap gap-4">
          <span><strong className="text-white">{assessment.title}</strong></span>
          <span>Pass: <strong className="text-blue-300">{assessment.pass_percentage}%</strong></span>
          <span>Attempts: <strong className="text-blue-300">{assessment.max_attempts}</strong></span>
          <span>Time: <strong className="text-blue-300">{assessment.time_limit_minutes} min</strong></span>
          <span>{questions.length} question(s)</span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <p className="text-xs font-bold text-white mb-2">Q{idx + 1}. {q.question}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options.map((opt, i) => (
                    <div key={i} className={`text-[11px] px-2.5 py-1.5 rounded-lg border ${i === q.correct_answer ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-semibold' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'}`}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="text-[10px] text-slate-500 mt-2 italic">Explanation: {q.explanation}</p>}
              </div>
              <button onClick={() => handleDeleteQ(q.id)} className="p-1.5 rounded-lg hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-all shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {questions.length === 0 && !loading && (
          <p className="text-xs text-slate-500 text-center py-4">No questions yet. Add the first one!</p>
        )}
      </div>

      {!addingQ ? (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAddingQ(true)} className="flex items-center gap-1.5 text-xs font-semibold bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded-lg transition-all shadow-md">
            <Plus className="w-3.5 h-3.5" /> Add Question Manually
          </button>
          <button
            onClick={() => setShowSopUploader(!showSopUploader)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-lg transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {showSopUploader ? 'Hide SOP Parser' : 'Extract from SOP Manual'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleAddQuestion} className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-white">New Question</h4>
          {err && <p className="text-rose-400 text-xs">{err}</p>}
          <textarea rows={2} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Question text *" value={qForm.question} onChange={e => setQForm({ ...qForm, question: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            {qForm.options.map((opt, i) => (
              <input key={i} className={`bg-slate-800 border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${i === parseInt(qForm.correct_answer) ? 'border-emerald-500/60' : 'border-slate-600'}`}
                placeholder={`Option ${String.fromCharCode(65 + i)} *`}
                value={opt}
                onChange={e => { const opts = [...qForm.options]; opts[i] = e.target.value; setQForm({ ...qForm, options: opts }); }}
                required
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Correct Answer</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })}>
                {[0, 1, 2, 3].map(i => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Marks</label>
              <input type="number" min={1} max={10} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" value={qForm.marks} onChange={e => setQForm({ ...qForm, marks: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Explanation</label>
              <input className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="Optional" value={qForm.explanation} onChange={e => setQForm({ ...qForm, explanation: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Add Question
            </button>
            <button type="button" onClick={() => setAddingQ(false)} className="bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {showSopUploader && (
        <div className="mt-4">
          <SopUploader courseId={courseId} onQuestionsImported={handleImportSopQuestions} />
        </div>
      )}
    </Section>

  );
}

// ============================
// TRAINEE PROGRESS ANALYTICS
// ============================
function TraineeProgress({ courseId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const d = await trainerService.getTraineeProgress(courseId);
      setData(d);
    } catch (e) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [courseId]);

  if (!courseId) return null;

  return (
    <Section title="Trainee Progress Analytics" icon={<Users className="w-4 h-4 text-blue-400" />} collapsible>
      <div className="flex justify-end mb-3">
        <button onClick={load} className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && <div className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></div>}

      {!loading && data.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4">No trainee data found for this course.</p>
      )}

      {!loading && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                {['Trainee', 'Progress', 'Watch Time', 'Policy', 'Assessment', 'Completed', 'Certificate'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase text-slate-500 tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.map(t => (
                <tr key={t.trainee_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-white">{t.trainee_name}</div>
                    <div className="text-[10px] text-slate-500">{t.trainee_email}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full w-16">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(t.progress_pct, 100)}%` }} />
                      </div>
                      <span className="font-mono font-bold text-blue-300">{t.progress_pct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{Math.round(t.watch_time_seconds)}s</td>
                  <td className="py-2.5 px-3">
                    <Badge color={t.policy_passed ? 'emerald' : 'rose'}>{t.policy_passed ? 'Passed' : 'Pending'}</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    {t.assessment_score != null ? (
                      <span className={`font-mono font-bold ${t.assessment_passed ? 'text-emerald-400' : 'text-rose-400'}`}>{t.assessment_score.toFixed(1)}%</span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge color={t.course_completed ? 'emerald' : 'amber'}>{t.course_completed ? 'Done' : 'In Progress'}</Badge>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{t.certificate_code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ============================
// SKILL GAP & AI REMEDIAL ANALYTICS
// ============================
function SkillGapAnalytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await trainerService.getSkillGapAnalytics();
      setData(res || []);
    } catch (err) {
      console.error('Error fetching skill gap analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Section title="Cohort Skill-Gap & Analytics" icon={<Target className="w-4 h-4 text-emerald-400" />}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-slate-300 font-semibold">Cohort Progress Diagnostics</p>
          <p className="text-[11px] text-slate-500">
            Factual engagement and assessment metrics per course, derived from recorded learning sessions and final assessment attempts.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 space-y-2 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mr-2" />
          <span>Analyzing cohort metrics...</span>
        </div>
      ) : data.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-6">No course analytics recorded yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((item, idx) => {
            const avg = item.average_assessment_score;
            const isCritical = avg !== null && avg < 50;
            const isModerate = avg !== null && avg >= 50 && avg < 70;

            return (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-slate-600 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white tracking-wide">{item.course_title}</span>
                    <span className={`text-xs font-mono font-bold ${
                      avg === null ? 'text-slate-500' : isCritical ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {avg === null ? '—' : `${avg}% Avg Score`}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        avg === null ? 'bg-slate-600' : isCritical ? 'bg-rose-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${avg !== null ? Math.min(avg, 100) : 0}%` }}
                    />
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                    <span className="font-semibold text-slate-400 block mb-0.5">Trainees Engaged:</span>
                    {item.trainees_engaged} trainee(s)
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-500/30">
                      {item.completed_count} completed
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ============================
// MAIN TRAINER DASHBOARD
// ============================
export default function TrainerDashboard() {
  const [activeTab, setActiveTab] = useState('course_manager');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(null);

  const selectedModule = modules.find(m => m.id === selectedModuleId);

  const handleModuleUploaded = (material) => {
    setModules(prev => prev.map(m => m.id === selectedModuleId
      ? { ...m, materials: [...(m.materials || []), material] }
      : m
    ));
  };

  const TABS = [
    { id: 'course_manager', label: 'Course & Modules', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'policy', label: 'Learning Policy', icon: <Settings className="w-3.5 h-3.5" /> },
    { id: 'assessment', label: 'Assessment & SOP', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'analytics', label: 'Trainee Progress', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'skill_gaps', label: 'Skill Gap AI', icon: <Target className="w-3.5 h-3.5" /> },
  ];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/90 via-blue-900/30 to-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            Trainer Management Portal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Create courses, upload learning materials, configure learning policies, build assessments, and track trainee progress.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/60">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* COURSE MANAGER TAB */}
      {activeTab === 'course_manager' && (
        <div className="space-y-5">
          <CourseManager
            selectedCourse={selectedCourse}
            setSelectedCourse={(c) => { setSelectedCourse(c); setModules([]); setSelectedModuleId(null); }}
            courses={courses}
            setCourses={setCourses}
          />

          {selectedCourse && (
            <>
              <ModuleManager
                courseId={selectedCourse.id}
                modules={modules}
                setModules={setModules}
                selectedModuleId={selectedModuleId}
                onModuleSelect={setSelectedModuleId}
              />

              {selectedModuleId && (
                <>
                  <MaterialUploader
                    courseId={selectedCourse.id}
                    moduleId={selectedModuleId}
                    moduleName={selectedModule?.title}
                    onUploaded={handleModuleUploaded}
                  />
                  <MaterialsList
                    courseId={selectedCourse.id}
                    moduleId={selectedModuleId}
                    moduleName={selectedModule?.title}
                    modules={modules}
                    setModules={setModules}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* LEARNING POLICY TAB */}
      {activeTab === 'policy' && (
        selectedCourse
          ? <LearningPolicyConfig courseId={selectedCourse.id} />
          : <div className="text-center p-10 text-slate-500 text-sm">← Select a course first from the "Course & Modules" tab.</div>
      )}

      {/* ASSESSMENT BUILDER TAB */}
      {activeTab === 'assessment' && (
        selectedCourse
          ? <AssessmentBuilder courseId={selectedCourse.id} />
          : <div className="text-center p-10 text-slate-500 text-sm">← Select a course first from the "Course & Modules" tab.</div>
      )}

      {/* TRAINEE PROGRESS TAB */}
      {activeTab === 'analytics' && (
        selectedCourse
          ? <TraineeProgress courseId={selectedCourse.id} />
          : <div className="text-center p-10 text-slate-500 text-sm">← Select a course first from the "Course & Modules" tab.</div>
      )}

      {/* SKILL GAP ANALYTICS TAB */}
      {activeTab === 'skill_gaps' && <SkillGapAnalytics />}
    </div>
  );
}
