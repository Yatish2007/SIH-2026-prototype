import React from 'react';
import { Award, CheckCircle2, Download, Printer, ShieldCheck, Sparkles, QrCode } from 'lucide-react';

export default function CertificateView({ certData, currentUser, onRestart }) {
  const code = certData?.certificate_code || '';
  const courseTitle = certData?.course_title || '';
  const name = currentUser?.name || certData?.user_name || '';
  const score = certData?.score ?? null;
  const dateStr = certData?.issued_date
    ? new Date(certData.issued_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString();

  const handlePrint = () => {
    window.print();
  };

  const grade = score != null
    ? (score >= 90 ? 'Distinction' : score >= 75 ? 'Merit' : 'Pass')
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <CheckCircle2 className="w-5 h-5" /> Certificate Successfully Issued
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`http://127.0.0.1:8001/certificates/download/${code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/30"
          >
            <Download className="w-4 h-4" /> Download PDF
          </a>
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={onRestart}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
          >
            Select Another Course
          </button>
        </div>
      </div>

      {/* Printable Certificate Frame */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 border-4 border-amber-500/40 rounded-3xl p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Decorative corner accents */}
        <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-amber-500/30 rounded-tl-xl" />
        <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-amber-500/30 rounded-tr-xl" />
        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-amber-500/30 rounded-bl-xl" />
        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-amber-500/30 rounded-br-xl" />

        {/* Background Emblem watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
          <Award className="w-96 h-96 text-amber-400" />
        </div>

        {/* Certificate Header */}
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Official Certificate of Capacity Building
          </div>
          <h1 className="text-4xl font-black text-white tracking-wide uppercase pt-2 drop-shadow-lg">
            Capacity Connect
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            Digital Skill-Gap & AI Learning Portal — SIH 2026
          </p>
        </div>

        <div className="w-32 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mx-auto relative z-10" />

        {/* Recipient info */}
        <div className="space-y-3 relative z-10">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">This is to certify that</p>
          <h2 className="text-3xl font-black text-blue-400 capitalize tracking-wide drop-shadow">
            {name}
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            has successfully completed the AI-Personalized Learning Module & Proctored Final Assessment for
          </p>
          <h3 className="text-xl font-bold text-white tracking-wide">{courseTitle}</h3>

          {score != null && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-black">
              <ShieldCheck className="w-4 h-4" />
              Final Score: {Math.round(score)}% — {grade}
            </div>
          )}
        </div>

        <div className="w-32 h-px bg-gradient-to-r from-transparent via-slate-600/60 to-transparent mx-auto relative z-10" />

        {/* Footer Details & Verification Stamp */}
        <div className="flex items-center justify-between text-left text-xs relative z-10 gap-3">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Issue Date</span>
            <span className="text-slate-300 font-semibold">{dateStr}</span>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
            <QrCode className="w-10 h-10 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Verification ID</span>
              <span className="text-xs font-mono font-bold text-amber-400">{code}</span>
              <span className="text-[9px] text-emerald-400 block font-semibold">✓ Officially Verified</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Issuing Authority</span>
            <span className="text-slate-300 font-semibold">SIH Capacity Connect System</span>
            <span className="text-[9px] text-slate-500 block">Ministry of Skill Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}
