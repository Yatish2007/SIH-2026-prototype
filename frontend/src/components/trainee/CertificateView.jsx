import React from 'react';
import { Award, CheckCircle2, Download, Printer, ShieldCheck, Sparkles, QrCode } from 'lucide-react';

export default function CertificateView({ certData, currentUser, onRestart }) {
  const code = certData?.certificate_code || "CC-9F8A2E10";
  const courseTitle = certData?.course_title || "Python Programming";
  const name = currentUser?.username || certData?.user_name || "Certified Trainee";
  const dateStr = certData?.issued_date ? new Date(certData.issued_date).toLocaleDateString() : new Date().toLocaleDateString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <CheckCircle2 className="w-5 h-5" /> Certificate Successfully Issued
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" /> Print / PDF
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
      <div className="bg-slate-900 border-4 border-amber-500/40 rounded-3xl p-10 shadow-2xl relative overflow-hidden text-center space-y-6 backdrop-blur-md">
        {/* Background Emblem watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <Award className="w-96 h-96 text-amber-400" />
        </div>

        {/* Certificate Header */}
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Official Certificate of Capacity Building
          </div>
          <h1 className="text-3xl font-black text-white tracking-wide uppercase pt-2">
            Capacity Connect
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            Digital Skill-Gap & AI Learning Portal
          </p>
        </div>

        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto relative z-10"></div>

        {/* Recipient info */}
        <div className="space-y-2 relative z-10">
          <p className="text-xs text-slate-400 uppercase tracking-wider">This is to certify that</p>
          <h2 className="text-2xl font-extrabold text-blue-400 capitalize tracking-wide">
            {name}
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto pt-1 leading-relaxed">
            has successfully completed the AI-Personalized Learning Module & Post-Assessment for
          </p>
          <h3 className="text-xl font-bold text-white tracking-wide pt-1">
            {courseTitle}
          </h3>
        </div>

        {/* Footer Details & Verification Stamp */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-left text-xs relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Issue Date</span>
            <span className="text-slate-300 font-mono font-semibold">{dateStr}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
