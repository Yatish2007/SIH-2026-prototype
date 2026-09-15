import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function SopUploader({ onSopProcessed }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
    }
  };

  const handleUpload = () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('processing');

    // Simulate backend processing delay
    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus('success');
      if (onSopProcessed) {
        onSopProcessed({
          fileName: file.name,
          processedAt: new Date().toISOString(),
          questionsGenerated: 3,
        });
      }
    }, 1500);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 shadow-md">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-400" /> Upload Standard Operating Procedure (SOP)
      </h3>
      <p className="text-xs text-slate-400 mb-6">
        Upload PDF or TXT SOPs to automatically extract assessment criteria and generate quiz questions.
      </p>

      <div className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-lg p-8 text-center transition-colors">
        <input
          type="file"
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
          id="sop-file-input"
        />
        <label htmlFor="sop-file-input" className="cursor-pointer flex flex-col items-center">
          <FileText className="w-12 h-12 text-slate-500 mb-3" />
          <span className="text-sm font-medium text-slate-200">
            {file ? file.name : 'Click to choose or drag & drop SOP document'}
          </span>
          <span className="text-xs text-slate-500 mt-1">Supports PDF, TXT, DOCX up to 10MB</span>
        </label>
      </div>

      {file && (
        <div className="mt-4 flex items-center justify-between bg-slate-900/60 px-4 py-3 rounded-lg border border-slate-700/50">
          <span className="text-xs text-slate-300 truncate max-w-xs">{file.name}</span>
          <button
            onClick={handleUpload}
            disabled={isUploading || uploadStatus === 'success'}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              uploadStatus === 'success'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isUploading ? 'Processing...' : uploadStatus === 'success' ? 'Processed' : 'Extract & Generate'}
          </button>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          SOP parsed successfully! Mock assessment questions have been generated.
        </div>
      )}
    </div>
  );
}