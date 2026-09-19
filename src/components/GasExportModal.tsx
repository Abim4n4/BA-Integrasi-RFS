import React, { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  FileCode,
  FileText,
  ExternalLink,
  BookOpen,
  Sparkles,
  Layers
} from "lucide-react";
import { CODE_GS_CONTENT, INDEX_HTML_STANDALONE } from "../services/gasExporter.ts";

export const GasExportModal: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"code_gs" | "index_html" | "guide">("code_gs");
  const [copied, setCopied] = useState(false);

  const activeContent = activeSubTab === "code_gs" ? CODE_GS_CONTENT : INDEX_HTML_STANDALONE;
  const fileName = activeSubTab === "code_gs" ? "Code.gs" : "Index.html";

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="surface-card p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-main flex items-center gap-2">
              <Code2 className="w-5 h-5 text-sky-400" />
              Generator & Eksportir Kode Google Apps Script (GAS)
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Siap Deploy
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Unduh atau salin langsung kode terpisah <strong>Code.gs</strong> (backend) dan <strong>Index.html</strong> (frontend) untuk dipasang di Google Sheets & Google Apps Script Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl border surface-elevated text-main hover:opacity-90 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin {fileName}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh {fileName}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="surface-card rounded-2xl border overflow-hidden shadow-sm">
        {/* Sub-tab selection */}
        <div className="flex items-center justify-between border-b border-subtle surface-elevated px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab("code_gs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "code_gs"
                  ? "accent-bg text-white shadow-sm"
                  : "text-muted hover:text-main"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Code.gs (Backend & Gemini API)
            </button>

            <button
              onClick={() => setActiveSubTab("index_html")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "index_html"
                  ? "accent-bg text-white shadow-sm"
                  : "text-muted hover:text-main"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Index.html (Frontend Web App)
            </button>

            <button
              onClick={() => setActiveSubTab("guide")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === "guide"
                  ? "accent-bg text-white shadow-sm"
                  : "text-muted hover:text-main"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Panduan Pasang (Tutorial)
            </button>
          </div>

          <span className="text-[10px] font-mono text-dim hidden sm:inline">
            {activeSubTab === "code_gs" ? "Google Apps Script V8 Engine" : activeSubTab === "index_html" ? "HTML5 + Tailwind CSS" : "Dokumentasi"}
          </span>
        </div>

        {/* Content Viewer */}
        {activeSubTab === "guide" ? (
          <div className="p-6 text-xs leading-relaxed space-y-4 text-main">
            <h3 className="text-sm font-bold text-main flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Panduan Langkah Demi Langkah Deployment ke Google Sheets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl surface-elevated border space-y-2">
                <span className="w-6 h-6 rounded-full accent-bg text-white font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <h4 className="font-bold text-main">Buat Spreadsheet Baru</h4>
                <p className="text-muted">
                  Buka Google Sheets di browser Anda (atau ketik <code>sheets.new</code> di bilah URL). Beri nama spreadsheet misalnya &ldquo;Database Berita Acara RFS&rdquo;.
                </p>
              </div>

              <div className="p-4 rounded-xl surface-elevated border space-y-2">
                <span className="w-6 h-6 rounded-full accent-bg text-white font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <h4 className="font-bold text-main">Buka Ekstensi Apps Script</h4>
                <p className="text-muted">
                  Di menu atas Google Sheets, klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>. Jendela editor Google Apps Script akan terbuka.
                </p>
              </div>

              <div className="p-4 rounded-xl surface-elevated border space-y-2">
                <span className="w-6 h-6 rounded-full accent-bg text-white font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <h4 className="font-bold text-main">Paste Kode Backend (Code.gs)</h4>
                <p className="text-muted">
                  Pilih tab <strong>Code.gs</strong> di sebelah kiri, hapus kode <code>function myFunction()</code> yang ada, lalu salin dan tempelkan seluruh kode dari tab <strong>Code.gs</strong> di portal ini.
                </p>
              </div>

              <div className="p-4 rounded-xl surface-elevated border space-y-2">
                <span className="w-6 h-6 rounded-full accent-bg text-white font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <h4 className="font-bold text-main">Buat File Index.html</h4>
                <p className="text-muted">
                  Klik tanda <strong>+</strong> di samping tulisan &ldquo;File&rdquo; pada editor Apps Script, pilih <strong>HTML</strong>, beri nama <code>Index</code>, lalu salin dan tempelkan isi dari tab <strong>Index.html</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl surface-elevated border space-y-2">
                <span className="w-6 h-6 rounded-full accent-bg text-white font-bold flex items-center justify-center text-xs">
                  5
                </span>
                <h4 className="font-bold text-main">Inisialisasi Sheet Otomatis</h4>
                <p className="text-muted">
                  Di bilah alat atas Apps Script, pilih fungsi <code>setupInitialSheets</code> lalu klik tombol <strong>Jalankan (Run)</strong>. Ini akan otomatis membuat sheet <code>Users</code> dan <code>DataBA</code> beserta seluruh headernya.
                </p>
              </div>

              <div className="p-4 rounded-xl surface-elevated border space-y-2">
                <span className="w-6 h-6 rounded-full accent-bg text-white font-bold flex items-center justify-center text-xs">
                  6
                </span>
                <h4 className="font-bold text-main">Deploy sebagai Web App</h4>
                <p className="text-muted">
                  Klik tombol <strong>Terapkan (Deploy)</strong> di sudut kanan atas &gt; <strong>Deployment baru</strong> &gt; pilih jenis <strong>Aplikasi Web</strong>. Setel akses ke <em>&ldquo;Siapa saja&rdquo; (Anyone)</em> dan klik Terapkan. Web portal Anda langsung aktif online!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <pre className="p-4 sm:p-6 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[600px] bg-slate-950 text-slate-200">
              <code>{activeContent}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
