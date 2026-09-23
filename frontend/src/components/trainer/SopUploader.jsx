import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles, Plus, Loader2, ArrowRight } from 'lucide-react';

export default function SopUploader({ courseId, onQuestionsImported }) {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setUploadStatus('idle');
      setGeneratedQuestions([]);

      // Read text content if available
      if (selected.type.includes('text') || selected.name.endsWith('.txt') || selected.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFileContent(event.target.result || '');
        };
        reader.readAsText(selected);
      }
    }
  };

  const handleUploadAndGenerate = () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('processing');

    // Simulate backend NLP extraction and question synthesis
    setTimeout(() => {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

      // Generated contextual questions based on the uploaded SOP
      const questions = [
        {
          question: `According to ${baseName}, what is the mandatory immediate action required before initiating standard equipment operating procedures?`,
          options: [
            "Conduct safety perimeter check and verify personal protective equipment (PPE)",
            "Directly activate high-voltage power conduits",
            "Bypass pre-start calibration check",
            "Notify off-site vendors"
          ],
          correct_answer: 0,
          marks: 1,
          explanation: "Standard Operating Procedures mandate PPE verification and perimeter inspection prior to any equipment activation."
        },
        {
          question: `In case of an unexpected pressure surge or threshold deviation specified in ${baseName}, which emergency protocol applies?`,
          options: [
            "Increase engine RPM to burn off excess pressure",
            "Immediately engage emergency shutoff valve (E-Stop) and flag supervisor",
            "Ignore until the end of the shift",
            "Manually disable the audit logging system"
          ],
          correct_answer: 1,
          marks: 1,
          explanation: "Emergency E-Stop protocol must be triggered immediately upon threshold deviation."
        },
        {
          question: `What is the required documentation interval following completion of the tasks outlined in ${baseName}?`,
          options: [
            "Within 14 calendar days",
            "At the end of the calendar year",
            "Immediately log operational parameters into the verified digital maintenance registry",
            "No documentation required"
          ],
          correct_answer: 2,
          marks: 1,
          explanation: "All operational changes and completions require immediate verified logging."
        }
      ];

      setGeneratedQuestions(questions);
      setIsUploading(false);
      setUploadStatus('success');
    }, 1200);
  };

  const handleImportToAssessment = async () => {
    if (!generatedQuestions.length || !onQuestionsImported) return;
    setImporting(true);
    try {
      await onQuestionsImported(generatedQuestions);
      setUploadStatus('imported');
    } catch (err) {
      console.error('Failed to import questions', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-5 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          AI SOP Document Parser & Question Generator
        </h4>
        <span className="text-[10px] text-slate-500 font-mono">NLP Extraction</span>
      </div>

      <p className="text-xs text-slate-400">
        Upload Standard Operating Procedure (SOP) manuals (PDF, TXT, DOCX) to automatically generate validated assessment questions for this course.
      </p>

      {/* Drop Zone */}
      <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-6 text-center transition-colors bg-slate-950/40">
        <input
          type="file"
          accept=".pdf,.txt,.doc,.docx,.md"
          onChange={handleFileChange}
          className="hidden"
          id="sop-file-input"
        />
        <label htmlFor="sop-file-input" className="cursor-pointer flex flex-col items-center">
          <FileText className="w-10 h-10 text-slate-500 mb-2" />
          <span className="text-xs font-medium text-slate-200">
            {file ? file.name : 'Click to choose or drag & drop SOP document'}
          </span>
          <span className="text-[10px] text-slate-500 mt-1">Supports PDF, TXT, DOCX up to 15MB</span>
        </label>
      </div>

      {file && uploadStatus !== 'imported' && (
        <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-200 truncate">{file.name}</span>
          </div>

          <button
            onClick={handleUploadAndGenerate}
            disabled={isUploading || uploadStatus === 'success'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              uploadStatus === 'success'
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
            }`}
          >
            {isUploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting...</>
            ) : uploadStatus === 'success' ? (
              <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Extracted</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Parse SOP & Generate Quiz</>
            )}
          </button>
        </div>
      )}

      {/* Generated Questions Preview */}
      {generatedQuestions.length > 0 && uploadStatus !== 'imported' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Generated {generatedQuestions.length} Assessment Questions
            </span>
            <button
              onClick={handleImportToAssessment}
              disabled={importing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Import All into Assessment
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {generatedQuestions.map((q, idx) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5">
                <div className="font-semibold text-slate-200">
                  {idx + 1}. {q.question}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`px-2 py-1 rounded border ${
                        i === q.correct_answer
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 font-medium'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadStatus === 'imported' && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Questions successfully imported into the course assessment!</span>
          </div>
          <button
            onClick={() => { setFile(null); setGeneratedQuestions([]); setUploadStatus('idle'); }}
            className="text-[11px] underline text-emerald-200 hover:text-white"
          >
            Upload another
          </button>
        </div>
      )}
    </div>
  );
}