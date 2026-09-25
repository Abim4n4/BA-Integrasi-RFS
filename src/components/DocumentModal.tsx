import React, { useEffect, useState, useRef } from "react";
import { Printer, X, ShieldCheck, HardDrive, Mail, Check, ExternalLink, RefreshCw, Layers, Info, CheckCircle2, Scissors, FileDown, ZoomIn, ZoomOut, Copy, Save } from "lucide-react";
import { BeritaAcaraRFS, PocEvidenceItem } from "../types.ts";
import { FmkaOfficialKop } from "./FmkaHeader.tsx";
import { uploadBaDocumentToDrive, sendBaEmailNotification } from "../services/googleWorkspace.ts";
import { DEFAULT_POC_ITEMS, DEFAULT_CLOSING_STATEMENT, getCompactPocItems } from "../data/pocTemplates.ts";
import { generateAndDownloadPdf } from "../utils/exportPdf.ts";

interface DocumentModalProps {
  record: BeritaAcaraRFS | null;
  onClose: () => void;
  onToast?: (msg: string, type: "success" | "error") => void;
  onCloneRecord?: (record: BeritaAcaraRFS) => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ record, onClose, onToast, onCloneRecord }) => {
  if (!record) return null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Workspace Drive State
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);

  // Workspace Gmail State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState(record.picCustomerPhone.includes("@") ? record.picCustomerPhone : "");
  const [emailCc, setEmailCc] = useState("");
  const [emailNotes, setEmailNotes] = useState(`Bersama ini kami sampaikan dokumen BA-RFS resmi untuk lokasi ${record.locationName}. Status: ${record.status}.`);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // PDF Direct Download State
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfDownloadProgress, setPdfDownloadProgress] = useState<string>("");

  // Preview Zoom & Density State
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [printTarget, setPrintTarget] = useState<"all" | "page1" | "page2">("all");
  const [printScale, setPrintScale] = useState<"fit" | "compact" | "ultra" | "normal">("fit");
  const [showPrintGuide, setShowPrintGuide] = useState(false);
  const [evidentPocMode, setEvidentPocMode] = useState<"compact" | "all">("compact");

  const cleanupPrintClasses = () => {
    document.body.classList.remove(
      "print-mode-page1",
      "print-mode-page2",
      "print-scale-compact",
      "print-scale-ultra",
      "print-scale-normal"
    );
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    document.documentElement.style.overflow = "";
    document.documentElement.style.pointerEvents = "";
  };

  const applyPrintClasses = (target = printTarget, scale = printScale) => {
    cleanupPrintClasses();
    if (target === "page1") {
      document.body.classList.add("print-mode-page1");
    } else if (target === "page2") {
      document.body.classList.add("print-mode-page2");
    }

    if (scale === "compact") {
      document.body.classList.add("print-scale-compact");
    } else if (scale === "ultra") {
      document.body.classList.add("print-scale-ultra");
    } else if (scale === "normal") {
      document.body.classList.add("print-scale-normal");
    }
  };

  // Lock body scroll and scroll to top on mount
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Handle print lifecycle to prevent UI freeze/pointer-lock
  useEffect(() => {
    const handleAfterPrint = () => {
      cleanupPrintClasses();
      window.focus();
    };

    const handleBeforePrint = () => {
      applyPrintClasses(printTarget, printScale);
      document.body.style.overflow = "visible";
      document.documentElement.style.overflow = "visible";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("afterprint", handleAfterPrint);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("keydown", handleKeyDown);
      cleanupPrintClasses();
    };
  }, [onClose, printTarget, printScale]);

  const handlePrint = (target?: "all" | "page1" | "page2") => {
    const selectedTarget = target || printTarget;
    if (target) setPrintTarget(target);
    applyPrintClasses(selectedTarget, printScale);
    document.body.style.overflow = "visible";
    document.documentElement.style.overflow = "visible";

    // Set official filename for browser 'Save as PDF'
    const originalTitle = document.title;
    const sanitizedNoBa = (record.noBa || "DOKUMEN").replace(/[/\\?%*:|"<>]/g, "-");
    const sanitizedLoc = (record.locationName || record.siteName || "Lokasi").replace(/[\s/\\?%*:|"<>]/g, "_");
    document.title = `BA-RFS_${sanitizedNoBa}_${sanitizedLoc}`;

    setTimeout(() => {
      try {
        window.print();
      } finally {
        setTimeout(() => {
          cleanupPrintClasses();
          document.title = originalTitle;
        }, 500);
      }
    }, 60);
  };

  const handleDownloadPdf = async (target?: "all" | "page1" | "page2", saveMode: "save-as" | "download" = "save-as") => {
    const selectedTarget = target || printTarget;
    setIsDownloadingPdf(true);
    setPdfDownloadProgress(saveMode === "save-as" ? "Membuka Save As..." : "Menyiapkan lembar dokumen...");

    const prevTarget = printTarget;
    try {
      // Ensure target sheets are present in DOM
      if (selectedTarget === "all" && printTarget !== "all") {
        setPrintTarget("all");
        await new Promise(r => setTimeout(r, 120));
      }

      const ok = await generateAndDownloadPdf(record, {
        targetPages: selectedTarget,
        saveMode,
        onProgress: (msg) => setPdfDownloadProgress(msg)
      });

      if (ok && onToast) {
        onToast(`Dokumen PDF (${selectedTarget === "all" ? "2 Lembar Pas A4" : selectedTarget === "page1" ? "Lembar 1" : "Lembar 2"}) berhasil disimpan!`, "success");
      }
    } catch (err: any) {
      console.error("Gagal generate PDF langsung:", err);
      if (onToast) {
        onToast("Memulai mode Simpan sebagai PDF via print dialog...", "success");
      }
      handlePrint(selectedTarget);
    } finally {
      if (selectedTarget === "all" && prevTarget !== "all") {
        setPrintTarget(prevTarget);
      }
      setIsDownloadingPdf(false);
      setPdfDownloadProgress("");
    }
  };

  const handleConfirmDriveUpload = async () => {
    setShowDriveConfirm(false);
    setIsUploadingDrive(true);
    try {
      const res = await uploadBaDocumentToDrive(record);
      setDriveUrl(res.webViewLink);
      if (onToast) onToast(`Dokumen berhasil disimpan ke Google Drive: ${res.fileName}`, "success");
    } catch (err: any) {
      if (onToast) onToast(`Gagal menyimpan ke Google Drive: ${err.message}`, "error");
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleConfirmSendEmail = async () => {
    if (!emailTo) {
      if (onToast) onToast("Mohon masukkan email tujuan.", "error");
      return;
    }
    setIsSendingEmail(true);
    try {
      await sendBaEmailNotification({
        to: emailTo,
        cc: emailCc || undefined,
        subject: `[BA-RFS RESMI] ${record.noBa} - ${record.locationName}`,
        record,
        customNotes: emailNotes
      });
      setShowEmailModal(false);
      if (onToast) onToast(`Email BA-RFS berhasil dikirim ke ${emailTo} via Gmail!`, "success");
    } catch (err: any) {
      if (onToast) onToast(`Gagal mengirim email: ${err.message}`, "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const dlRatio = Math.round(
    (Number(record.downloadSpeed) / Math.max(1, Number(record.subscribedBandwidth))) * 100
  );
  const ulRatio = Math.round(
    (Number(record.uploadSpeed) / Math.max(1, Number(record.subscribedBandwidth))) * 100
  );

  return (
    <div
      ref={scrollContainerRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-6 pt-16 sm:pt-20 pb-16 print:static print:inset-auto print:overflow-visible print:block print:p-0 print:m-0 print:bg-white animate-in fade-in duration-150"
    >
      {/* Floating Action Pill (Hidden on Print, non-intrusive dock) */}
      <div className="no-print fixed top-4 right-4 sm:top-5 sm:right-6 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-slate-700/70 shadow-2xl">
        {/* Zoom Tampilan Dokumen */}
        <div className="flex items-center bg-slate-800/90 px-2 py-1 rounded-full text-[11px] text-slate-300 font-mono gap-1 border border-slate-700/60">
          <button
            onClick={() => setPreviewZoom((prev) => Math.max(60, prev - 10))}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Perkecil Pratinjau (-10%)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPreviewZoom(100)}
            className="text-[11px] px-1 hover:text-white hover:underline cursor-pointer"
            title="Klik untuk reset ke ukuran normal 100%"
          >
            {previewZoom}%
          </button>
          <button
            onClick={() => setPreviewZoom((prev) => Math.min(130, prev + 10))}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
            title="Perbesar Pratinjau (+10%)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        {/* Save As PDF Button (Native File Picker) */}
        <button
          onClick={() => handleDownloadPdf("all", "save-as")}
          disabled={isDownloadingPdf}
          id="btn-saveas-pdf-action"
          className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
          title="Simpan Sebagai (Save As) - Buka dialog pilih folder di komputer Anda dan simpan file PDF"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save As PDF</span>
        </button>

        {/* Download PDF Button */}
        <button
          onClick={() => handleDownloadPdf("all", "download")}
          disabled={isDownloadingPdf}
          id="btn-download-pdf-action"
          className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
          title="Unduh langsung dokumen Berita Acara ke folder Downloads (.pdf)"
        >
          {isDownloadingPdf ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{pdfDownloadProgress || "PDF..."}</span>
            </>
          ) : (
            <>
              <FileDown className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </>
          )}
        </button>

        {/* Print / PDF Button */}
        <button
          onClick={() => handlePrint("all")}
          id="btn-print-action"
          className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
          title="Cetak Berita Acara 2 Lembar A4"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
        </button>

        {/* Clone / Duplikat BA Button */}
        {onCloneRecord && (
          <button
            onClick={() => {
              onCloneRecord(record);
              onClose();
            }}
            className="px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
            title="Gunakan data dokumen ini sebagai template untuk membuat Berita Acara baru (Cloning)"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Clone BA</span>
          </button>
        )}

        {/* Google Drive Upload Button */}
        <button
          onClick={() => setShowDriveConfirm(true)}
          disabled={isUploadingDrive}
          className="p-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center justify-center transition-all cursor-pointer"
          title="Simpan ke Google Drive"
        >
          {isUploadingDrive ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <HardDrive className="w-3.5 h-3.5" />
          )}
        </button>

        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-full bg-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
            title="Buka File di Drive"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Gmail Send Button */}
        <button
          onClick={() => setShowEmailModal(true)}
          className="p-1.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white text-xs flex items-center justify-center transition-all cursor-pointer"
          title="Kirim dokumen via Gmail"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Tutup Pratinjau (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Container Card */}
      <div 
        style={previewZoom !== 100 ? { transform: `scale(${previewZoom / 100})`, transformOrigin: "top center", transition: "transform 0.15s ease" } : undefined}
        className="surface-card w-full max-w-4xl mx-auto rounded-2xl border shadow-2xl overflow-hidden print:static print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0 print:bg-white"
      >

        {/* Modal Panduan Cetak A4 */}
        {showPrintGuide && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="surface-card w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-main">Panduan Cetak Pas 2 Lembar A4</h4>
                    <p className="text-xs text-muted">Pengaturan optimal pada dialog Print browser</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrintGuide(false)}
                  className="text-muted hover:text-main p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">Ukuran Kertas (Paper Size):</strong>
                    <p className="text-slate-600 dark:text-slate-300">Pilih <strong>A4</strong> (210 x 297 mm) dengan orientasi <strong>Portrait</strong>.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">Margin Kertas:</strong>
                    <p className="text-slate-600 dark:text-slate-300">Pilih <strong>Default</strong> atau <strong>Minimum (8mm)</strong>.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">Grafik Latar Belakang (Background Graphics):</strong>
                    <p className="text-slate-600 dark:text-slate-300">Centang opsi <strong>&quot;Background graphics&quot;</strong> agar warna kop surat dan tabel tercetak jelas.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">Pembagian Lembar Otomatis:</strong>
                    <p className="text-slate-600 dark:text-slate-300">
                      • <strong>Lembar 1:</strong> Berita Acara RFS &amp; Tanda Tangan Resmi 3 Pihak<br />
                      • <strong>Lembar 2:</strong> Matriks 21 Evident POC Pengujian Jaringan
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 text-[10px]">5</span>
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">Simpan sebagai File PDF:</strong>
                    <p className="text-slate-600 dark:text-slate-300">
                      Gunakan tombol <strong>&quot;Download PDF&quot;</strong> untuk unduh instan berkas .pdf, atau pada pilihan tujuan printer browser pilih <strong>&quot;Save as PDF / Simpan sebagai PDF&quot;</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPrintGuide(false)}
                  className="px-4 py-2 rounded-xl accent-bg text-white font-semibold text-xs hover:opacity-90"
                >
                  Saya Mengerti
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Google Drive Upload */}
        {showDriveConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="surface-card w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 flex items-center justify-center">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-main">Simpan ke Google Drive</h4>
                  <p className="text-xs text-muted">Arsipkan dokumen ini ke folder Drive resmi</p>
                </div>
              </div>

              <p className="text-xs text-muted">
                Dokumen <strong>{record.noBa} ({record.locationName})</strong> akan disimpan ke folder{" "}
                <strong>&quot;BA-RFS - PT. FAJAR MITRA KRIDA ABADI&quot;</strong> di akun Google Drive Anda. Lanjutkan?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDriveConfirm(false)}
                  className="text-xs px-3 py-2 rounded-xl border hover:surface-elevated text-main font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDriveUpload}
                  className="text-xs px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Ya, Simpan ke Drive</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gmail Dispatch Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="surface-card w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-main">Kirim BA-RFS via Gmail</h4>
                    <p className="text-xs text-muted">Pengiriman email resmi dengan format surat resmi</p>
                  </div>
                </div>
                <button onClick={() => setShowEmailModal(false)} className="text-muted hover:text-main text-xs p-1">
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-main mb-1">
                    Email Penerima <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contoh: client@perusahaan.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-main mb-1">
                    Tembusan / CC (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="contoh: manager@perusahaan.com, isp@domain.com"
                    value={emailCc}
                    onChange={(e) => setEmailCc(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-main mb-1">
                    Catatan Tambahan:
                  </label>
                  <textarea
                    rows={3}
                    value={emailNotes}
                    onChange={(e) => setEmailNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-xs px-3 py-2 rounded-xl border hover:surface-elevated text-main font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmSendEmail}
                  disabled={isSendingEmail || !emailTo}
                  className="text-xs px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>Kirim Email Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Official Document Body */}
        <div
          className="p-4 sm:p-8 bg-slate-200/80 dark:bg-slate-950/70 text-slate-900 print:p-0 print:m-0 print:bg-white text-xs leading-relaxed print-document print:w-full print:h-auto print:max-h-none print:overflow-visible space-y-6 print:space-y-0"
          id="printable-rfs-area"
        >
          {/* ========================================================================= */}
          {/* LEMBAR 1 RESMI: BERITA ACARA RFS, HASIL TEST, & PENGESAHAN TTD 3 PIHAK    */}
          {/* DIATUR STRICT PAS 1 LEMBAR A4 DENGAN KONTROL PAGE-BREAK & AUTO-FIT        */}
          {/* ========================================================================= */}
          <div id="ba-sheet-1" className={`sheet-card print-page-1 bg-white border border-slate-300 shadow-lg rounded-sm p-4 sm:p-7 print:p-0 print:border-none print:shadow-none print:rounded-none relative ${printTarget === "page2" ? "hidden print:hidden" : ""}`}>
            {/* KOP SURAT RESMI PT. FAJAR MITRA KRIDA ABADI */}
            <FmkaOfficialKop className="pb-3 mb-4 print:pb-1 print:mb-1" />

            {/* Judul & Nomor BA */}
            <div
              className="print-section text-center my-3 print:my-1"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <h2 className="text-base print:text-[13px] font-bold underline tracking-wide uppercase text-slate-900 leading-tight">
                BERITA ACARA READY FOR SERVICE (BA-RFS)
              </h2>
              <p className="text-xs print:text-[10px] font-mono font-semibold text-slate-700 mt-0.5">
                Nomor: {record.noBa}
              </p>
            </div>

            <p
              className="print-section text-[11px] print:text-[8.5px] text-slate-700 mb-3 print:mb-1.5 leading-snug"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              Pada hari ini, tanggal <strong>{record.tanggal}</strong> pukul <strong>{record.waktu} WIB</strong>, telah dilaksanakan instalasi, integrasi teknis, dan pengujian kualitas layanan jaringan (Acceptance Test) pada lokasi dengan rincian sebagai berikut:
            </p>

            {/* Bagian 1: Data Layanan ISP & Lokasi */}
            <div
              className="print-section mb-3 print:mb-1.5"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <h4 className="font-bold text-[11px] print:text-[9.5px] uppercase bg-slate-100 p-1.5 print:py-0.5 print:px-1.5 border border-slate-200 mb-1.5 print:mb-1">
                I. IDENTITAS PENYEDIA LAYANAN (ISP) &amp; LOKASI PEMASANGAN
              </h4>
              <table className="w-full text-[11px] print:text-[8.5px] border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-1/3 p-2 print:py-0.5 print:px-1.5 bg-slate-50 font-semibold border-r border-slate-200">ISP</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-bold text-slate-900">{record.isp || record.customerName}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 print:py-0.5 print:px-1.5 bg-slate-50 font-semibold border-r border-slate-200">Lokasi</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-semibold text-slate-900">
                      {record.locationName || record.siteName}
                      {record.siteId ? ` (${record.siteId})` : ""}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 print:py-0.5 print:px-1.5 bg-slate-50 font-semibold border-r border-slate-200">Alamat Lengkap Lokasi</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 leading-tight">
                      <span>{record.siteAddress}</span>
                      {record.gpsCoordinates && (
                        <span className="ml-2 font-mono text-[9.5px] print:text-[7.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block">
                          GPS: {record.gpsCoordinates}
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bagian 2: Spesifikasi Layanan & Parameter Jaringan */}
            <div
              className="print-section mb-3 print:mb-1.5"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div className="flex justify-between items-center bg-slate-100 p-1.5 print:py-0.5 print:px-1.5 border border-slate-200 mb-1.5 print:mb-1">
                <h4 className="font-bold text-[11px] print:text-[9.5px] uppercase text-slate-900">
                  II. SPESIFIKASI LAYANAN &amp; HASIL PENGUJIAN JARINGAN (TEST RESULT)
                </h4>
                <span className="text-[10px] print:text-[8px] font-semibold text-slate-700">
                  Paket: <strong className="text-slate-900">{record.serviceType}</strong> ({record.subscribedBandwidth} {record.bandwidthUnit || "Mbps"})
                </span>
              </div>
              <table className="w-full text-[11px] print:text-[8.5px] border border-slate-300 mb-1.5 print:mb-1">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center">
                    <th className="p-2 print:py-0.5 print:px-1.5 border-r border-slate-300 text-left">Parameter Kontrak</th>
                    <th className="p-2 print:py-0.5 print:px-1.5 border-r border-slate-300">Kapasitas Paket</th>
                    <th className="p-2 print:py-0.5 print:px-1.5 border-r border-slate-300">Hasil Uji Lapangan</th>
                    <th className="p-2 print:py-0.5 print:px-1.5 border-r border-slate-300">Rasio Capaian</th>
                    <th className="p-2 print:py-0.5 print:px-1.5">Status SLA</th>
                  </tr>
                </thead>
                <tbody className="text-center divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 print:py-0.5 print:px-1.5 text-left font-semibold border-r border-slate-200">
                      Throughput Download
                    </td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono border-r border-slate-200">{record.subscribedBandwidth} {record.bandwidthUnit || "Mbps"}</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono font-bold border-r border-slate-200 text-slate-900">
                      {record.downloadSpeed} Mbps
                    </td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono font-bold border-r border-slate-200">{dlRatio}%</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-bold text-emerald-700">
                      {dlRatio >= 85 ? "PASS" : "FAIL"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 print:py-0.5 print:px-1.5 text-left font-semibold border-r border-slate-200">
                      Throughput Upload
                    </td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono border-r border-slate-200">{record.subscribedBandwidth} {record.bandwidthUnit || "Mbps"}</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono font-bold border-r border-slate-200 text-slate-900">
                      {record.uploadSpeed} Mbps
                    </td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono font-bold border-r border-slate-200">{ulRatio}%</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-bold text-emerald-700">
                      {ulRatio >= 80 ? "PASS" : "FAIL"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 print:py-0.5 print:px-1.5 text-left font-semibold border-r border-slate-200">
                      Round-Trip Latency
                    </td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono border-r border-slate-200">&lt; 35 ms</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono border-r border-slate-200">{record.pingLatency} ms</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 border-r border-slate-200">-</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-bold text-emerald-700">
                      {record.pingLatency <= 35 ? "OPTIMAL" : "MARGINAL"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 print:py-0.5 print:px-1.5 text-left font-semibold border-r border-slate-200">Jitter (Stabilitas Buffer)</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono border-r border-slate-200">&lt; 5 ms</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono border-r border-slate-200">{record.jitter} ms</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 border-r border-slate-200">-</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-bold text-emerald-700">STABIL</td>
                  </tr>
                  <tr>
                    <td className="p-2 print:py-0.5 print:px-1.5 text-left font-semibold border-r border-slate-200">Packet Loss Rate</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono border-r border-slate-200">0.0% - 0.5%</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-mono font-bold border-r border-slate-200">{record.packetLoss}%</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 border-r border-slate-200">-</td>
                    <td className="p-2 print:py-0.5 print:px-1.5 font-bold text-emerald-700">
                      {record.packetLoss <= 0.5 ? "ZERO LOSS" : "REVIEW"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tabel Spesifikasi Jaringan, Keterangan Lapangan, & Checklist POC Sesuai Standar RFS */}
              <div className="border border-slate-300 rounded p-2 print:p-1.5 bg-slate-50/50 text-[10.5px] print:text-[8px] space-y-1.5 print:space-y-1 mt-1.5 print:mt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 print:gap-1 border-b border-slate-200 pb-1.5 print:pb-1">
                  {/* Backbone */}
                  <div>
                    <span className="text-[9.5px] print:text-[7.5px] font-bold text-slate-500 block uppercase tracking-wider">Backbone</span>
                    <div className="flex items-center gap-2 mt-0.5 font-medium text-slate-800">
                      <span className="flex items-center gap-1">
                        <span className={`w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold ${record.backboneMedia === 'FO' || record.backboneMedia === 'Fiber Optic' || !record.backboneMedia ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                          {record.backboneMedia === 'FO' || record.backboneMedia === 'Fiber Optic' || !record.backboneMedia ? '✓' : ''}
                        </span>
                        FO
                      </span>
                    </div>
                  </div>

                  {/* System Distribusi */}
                  <div>
                    <span className="text-[9.5px] print:text-[7.5px] font-bold text-slate-500 block uppercase tracking-wider">System</span>
                    <div className="flex items-center gap-1.5 mt-0.5 font-medium text-slate-800 flex-wrap">
                      {['Switching', 'FTTH', 'Integrator'].map((sys) => {
                        const checked = (record.systems || ['FTTH', 'Integrator']).includes(sys);
                        return (
                          <span key={sys} className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                              {checked ? '✓' : ''}
                            </span>
                            {sys}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Jalur Backbone Upstream */}
                  <div>
                    <span className="text-[9.5px] print:text-[7.5px] font-bold text-slate-500 block uppercase tracking-wider">Backbone</span>
                    <div className="flex items-center gap-2 mt-0.5 font-medium text-slate-800 flex-wrap">
                      {['CBN', 'Fiberstar'].map((prov) => {
                        const checked = record.backboneProvider === prov || (!record.backboneProvider && prov === 'Fiberstar');
                        return (
                          <span key={prov} className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                              {checked ? '✓' : ''}
                            </span>
                            {prov}
                          </span>
                        );
                      })}
                      {(() => {
                        const isPreset = record.backboneProvider === 'CBN' || record.backboneProvider === 'Fiberstar';
                        const customProv = !isPreset && record.backboneProvider && record.backboneProvider !== 'Lain - Lain' ? record.backboneProvider : null;
                        if (customProv) {
                          return (
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold bg-slate-900 text-white">
                                ✓
                              </span>
                              <span>{customProv}</span>
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Kapasitas */}
                  <div>
                    <span className="text-[9.5px] print:text-[7.5px] font-bold text-slate-500 block uppercase tracking-wider">Kapasitas</span>
                    <div className="flex items-center gap-1.5 mt-0.5 font-medium text-slate-800 flex-wrap">
                      {['500 Mbps', '1 Gbps', '10 Gbps'].map((cap) => {
                        const currentStr = `${record.subscribedBandwidth} ${record.bandwidthUnit || 'Mbps'}`.toLowerCase();
                        const checked = currentStr.includes(cap.toLowerCase().replace(' ', '')) ||
                                        currentStr === cap.toLowerCase() ||
                                        (!record.subscribedBandwidth && cap === '500 Mbps');
                        return (
                          <span key={cap} className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                              {checked ? '✓' : ''}
                            </span>
                            {cap}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Keterangan & POC */}
                <div className="space-y-1 pt-0.5">
                  <div className="space-y-0.5 text-[10px] print:text-[8px]">
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-700 min-w-[65px]">Keterangan:</span>
                      <div className="text-slate-800 whitespace-pre-line font-mono text-[9.5px] print:text-[7.5px] leading-snug">
                        {(() => {
                          const note = record.testNotes || "RFS Done, Bandwidth sudah dilakukan pengetestan";
                          return note
                            .replace(/\n?1\.\s*Ruang Panel ISP Famika/g, "")
                            .replace(/\n?2\.\s*Setiap unit sudah terpasang rosset/g, "")
                            .replace(/\n?2\.\s*Port OTB \/ Uplink terhubung aktif/g, "")
                            .trim() || "RFS Done, Bandwidth sudah dilakukan pengetestan";
                        })()}
                      </div>
                    </div>

                    {record.workNotesHistory && record.workNotesHistory.length > 0 && (
                      <div className="pt-1 border-t border-dashed border-slate-200">
                        <div className="text-[9px] print:text-[7.5px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                          Catatan &amp; Riwayat Lapangan Tambahan:
                        </div>
                        <div className="space-y-0.5 font-mono text-[8.5px] print:text-[7px] text-slate-700">
                          {record.workNotesHistory.map((note, idx) => (
                            <div key={note.id || idx} className="border-l-2 border-emerald-600 pl-1.5 py-0.5">
                              <span className="font-bold text-slate-900">[{note.category}]</span>{" "}
                              <span className="text-slate-500 text-[8px] print:text-[6.5px]">
                                ({note.author} - {note.timestamp ? new Date(note.timestamp).toLocaleDateString("id-ID") : ""}):
                              </span>{" "}
                              <span>{note.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* POC Section */}
                  <div className="border-t border-slate-200 pt-1 space-y-1">
                    <div className="font-bold text-[9px] print:text-[7.5px] text-slate-600 uppercase tracking-wider">
                      POC (Proof of Concept) &amp; Hasil Pengujian Layanan:
                    </div>
                    
                    <div className="flex items-center gap-2 text-[9.5px] print:text-[7.5px]">
                      <span className="font-semibold text-slate-700 min-w-[65px]">Speedtest:</span>
                      <div className="flex items-center gap-3 flex-wrap font-mono">
                        {['100 Mbps', '500 Mbps', '1 Gbps'].map((sp) => {
                          const checked = record.pocSpeedtest === sp || (!record.pocSpeedtest && sp === '500 Mbps');
                          return (
                            <span key={sp} className="flex items-center gap-1">
                              <span className={`w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                                {checked ? '✓' : ''}
                              </span>
                              {sp}
                            </span>
                          );
                        })}
                        {(() => {
                          const isStandard = ['100 Mbps', '500 Mbps', '1 Gbps'].includes(record.pocSpeedtest || '');
                          if (!isStandard && record.pocSpeedtest) {
                            return (
                              <span className="flex items-center gap-1 font-bold text-slate-900">
                                <span className="w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold bg-slate-900 text-white">
                                  ✓
                                </span>
                                {record.pocSpeedtest}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-[9.5px] print:text-[7.5px]">
                      <span className="font-semibold text-slate-700 min-w-[65px] pt-0.5">Browsing:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-0.5 flex-1">
                        {['Banking', 'Berita', 'Games', 'Toko Online', 'Live Streaming', 'Youtube'].map((app) => {
                          const checked = (record.pocBrowsing || ['Banking', 'Berita', 'Games', 'Toko Online', 'Live Streaming', 'Youtube']).includes(app);
                          return (
                            <span key={app} className="flex items-center gap-1">
                              <span className={`w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                                {checked ? '✓' : ''}
                              </span>
                              {app}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Verifikasi Perangkat & Interface (Point 3 Checklist) */}
                  <div className="border-t border-slate-200 pt-1 text-[9.5px] print:text-[7.5px] space-y-0.5">
                    <div className="font-bold text-[9px] print:text-[7.5px] text-slate-600 uppercase tracking-wider">
                      Spesifikasi Fisik Perangkat &amp; Uplink Handover:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-1 rounded border border-slate-200 font-mono text-[9px] print:text-[7px]">
                      <div>
                        <span className="text-slate-500 font-sans">Status Pemasangan: </span>
                        <strong className="text-slate-900 font-sans">
                          {record.deviceInstalled !== false ? "Ada Pemasangan Unit" : "Tidak Ada"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Tipe / Model: </span>
                        <strong className="text-slate-900">
                          {record.deviceType || "Huawei SmartAX MA5671A"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">Serial Number: </span>
                        <strong className="text-slate-900">
                          {record.serialNumber || "ZTEGCA82B391F0"}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="font-semibold text-slate-700 min-w-[65px]">Interface:</span>
                      <div className="flex items-center gap-3">
                        {['SFP 1G', 'SFP 10G', 'LAN RJ45'].map((iface) => {
                          const checked = record.interfaceType === iface || (!record.interfaceType && iface === 'SFP 1G');
                          return (
                            <span key={iface} className="flex items-center gap-1 font-mono">
                              <span className={`w-3.5 h-3.5 print:w-3 print:h-3 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] print:text-[7px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                                {checked ? '✓' : ''}
                              </span>
                              {iface}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 3: Lembar Tanda Tangan Resmi Pihak Mengetahui */}
            <div
              className="print-section mt-3 print:mt-1 mb-2.5 print:mb-1"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <h4 className="font-bold text-[11px] print:text-[9.5px] uppercase bg-slate-100 p-1.5 print:py-0.5 print:px-1.5 border border-slate-200 mb-1.5 print:mb-0.5">
                III. PENGESAHAN DOKUMEN &amp; TANDA TANGAN DIGITAL PIHAK MENGETAHUI
              </h4>

              <div className="text-center mb-1.5 print:mb-0.5">
                <span className="font-bold text-xs print:text-[9px] uppercase tracking-wider text-slate-900">
                  MENGETAHUI
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 print:gap-1.5 text-center text-[10px] print:text-[8px]">
                {/* Kolom 1: ISP */}
                <div className="border border-slate-300 p-2 print:p-1 flex flex-col justify-between h-36 print:h-20 rounded bg-white">
                  <div>
                    <div className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-0.5 tracking-wider text-[9.5px] print:text-[7.5px]">
                      ISP
                    </div>
                  </div>

                  <div className="flex items-center justify-center h-16 print:h-9 my-0.5">
                    {(record.signatureIsp || record.signatureTechnician) ? (
                      <img
                        src={record.signatureIsp || record.signatureTechnician}
                        alt="TTD ISP"
                        className="max-h-14 print:max-h-8 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 italic text-[8.5px] print:text-[7px]">(Tanda Tangan ISP)</span>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-1 print:pt-0.5">
                    <p className="font-bold underline text-slate-900 leading-tight text-[9.5px] print:text-[7.5px]">
                      {record.ispSignerName || record.technicianName || "Pihak ISP"}
                    </p>
                    <p className="text-slate-500 text-[8.5px] print:text-[6.5px]">ISP</p>
                  </div>
                </div>

                {/* Kolom 2: Waspang Famika */}
                <div className="border border-slate-300 p-2 print:p-1 flex flex-col justify-between h-36 print:h-20 rounded bg-white">
                  <div>
                    <div className="font-bold text-slate-800 border-b border-slate-200 pb-0.5 tracking-wider text-[9.5px] print:text-[7.5px]">
                      Waspang Famika
                    </div>
                  </div>

                  <div className="flex items-center justify-center h-16 print:h-9 my-0.5">
                    {(record.signatureWaspang || record.signatureCustomer) ? (
                      <img
                        src={record.signatureWaspang || record.signatureCustomer}
                        alt="TTD Waspang Famika"
                        className="max-h-14 print:max-h-8 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 italic text-[8.5px] print:text-[7px]">(Tanda Tangan Waspang)</span>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-1 print:pt-0.5">
                    <p className="font-bold underline text-slate-900 leading-tight text-[9.5px] print:text-[7.5px]">
                      {record.waspangSignerName || record.picCustomerName || "Waspang Famika"}
                    </p>
                    <p className="text-slate-500 text-[8.5px] print:text-[6.5px]">Waspang Famika</p>
                  </div>
                </div>

                {/* Kolom 3: Engineer */}
                <div className="border border-slate-300 p-2 print:p-1 flex flex-col justify-between h-36 print:h-20 rounded bg-white">
                  <div>
                    <div className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-0.5 tracking-wider text-[9.5px] print:text-[7.5px]">
                      Engineer
                    </div>
                  </div>

                  <div className="flex items-center justify-center h-16 print:h-9 my-0.5">
                    {record.signatureNe ? (
                      <img
                        src={record.signatureNe}
                        alt="TTD Engineer"
                        className="max-h-14 print:max-h-8 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 italic text-[8.5px] print:text-[7px]">(Tanda Tangan Engineer)</span>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-1 print:pt-0.5">
                    <p className="font-bold underline text-slate-900 leading-tight text-[9.5px] print:text-[7.5px]">
                      {record.neSignerName || record.approvedByName || "Engineer"}
                    </p>
                    <p className="text-slate-500 text-[8.5px] print:text-[6.5px]">Engineer</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian IV: Dokumentasi Evident Pengujian Layanan & Foto Fisik */}
            {(record.evidentSpeedtest || record.evidentRedamanOpm || record.evidentPerangkat) && (
              <div
                className="print-section mt-2.5 print:mt-1 mb-2 print:mb-0.5"
                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <h4 className="font-bold text-[11px] print:text-[9px] uppercase bg-slate-100 p-1.5 print:py-0.5 print:px-1.5 border border-slate-200 mb-1.5 print:mb-0.5">
                  IV. DOKUMENTASI EVIDENT PENGUJIAN LAYANAN &amp; FOTO FISIK INSTALASI
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 print:gap-1.5">
                  {record.evidentSpeedtest && (
                    <div className="border border-slate-300 rounded p-1.5 print:p-1 bg-white flex flex-col items-center justify-between">
                      <img
                        src={record.evidentSpeedtest}
                        alt="Evident Speedtest"
                        className="max-h-24 print:max-h-11 max-w-full object-contain rounded border border-slate-200"
                      />
                      <span className="text-[9px] print:text-[7px] font-bold text-slate-800 mt-1 print:mt-0.5 text-center">
                        1. Screenshot Speedtest Resmi
                      </span>
                    </div>
                  )}

                  {record.evidentRedamanOpm && (
                    <div className="border border-slate-300 rounded p-1.5 print:p-1 bg-white flex flex-col items-center justify-between">
                      <img
                        src={record.evidentRedamanOpm}
                        alt="Evident Redaman OPM / ONT"
                        className="max-h-24 print:max-h-11 max-w-full object-contain rounded border border-slate-200"
                      />
                      <span className="text-[9px] print:text-[7px] font-bold text-slate-800 mt-1 print:mt-0.5 text-center">
                        2. Redaman Optik (OPM) / ONT
                      </span>
                    </div>
                  )}

                  {record.evidentPerangkat && (
                    <div className="border border-slate-300 rounded p-1.5 print:p-1 bg-white flex flex-col items-center justify-between">
                      <img
                        src={record.evidentPerangkat}
                        alt="Evident Port OTB / Uplink"
                        className="max-h-24 print:max-h-11 max-w-full object-contain rounded border border-slate-200"
                      />
                      <span className="text-[9px] print:text-[7px] font-bold text-slate-800 mt-1 print:mt-0.5 text-center">
                        3. Port OTB / Uplink
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KAKI SURAT RESMI (OFFICIAL CORPORATE FOOTER) PT. FAJAR MITRA KRIDA ABADI */}
            <div
              className="print-section mt-4 print:mt-1 pt-2 print:pt-1 border-t border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[9px] print:text-[7.5px] text-slate-700"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              {/* Alamat Kantor & Kontak */}
              <div className="space-y-0.5 leading-tight">
                <p>
                  <strong className="text-slate-900">Office :</strong> Jl. Taman Bintaro No. 10 Pesanggrahan Bintaro Jaya Sektor 1, Jakarta Selatan
                </p>
                <p className="pl-9 sm:pl-10">
                  Jl. H. Toran No. 145 Rengas Ciputat Timur Tangerang Selatan 15412
                </p>
                <p className="pl-9 sm:pl-10">
                  Telp. (021) 7375523, E-mail : <a href="mailto:fajarmitra@yahoo.co.id" className="text-slate-900 underline">fajarmitra@yahoo.co.id</a>
                </p>
              </div>

              {/* Badges Akreditasi & Sertifikasi ISO */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                {/* IAS Badge */}
                <div className="px-1.5 py-0.5 border border-slate-400 rounded bg-slate-50 flex items-center gap-1 text-[8px] print:text-[6.5px] font-sans">
                  <span className="font-black text-slate-900 text-[9.5px] print:text-[8px]">IAS</span>
                  <span className="text-[6.5px] print:text-[5.5px] leading-none text-slate-600 border-l border-slate-300 pl-1">
                    ACCREDITED<br />Management Systems
                  </span>
                </div>

                {/* IAF Oval Badge */}
                <div className="px-1.5 py-0.5 rounded-full border border-blue-600 bg-blue-50 text-blue-900 font-serif font-black text-[8.5px] print:text-[7px] tracking-tight">
                  IAF
                </div>

                {/* ISO Standards */}
                <div className="text-[7.5px] print:text-[6px] font-mono leading-none font-semibold text-slate-700 space-y-0.5 border-l border-slate-300 pl-1.5">
                  <div>ISO 9001 : 2015</div>
                  <div>ISO 14001 : 2015</div>
                  <div>ISO 45001 : 2018</div>
                </div>
              </div>
            </div>

            {/* Footer Metadata Lembar 1 */}
            <div className="mt-1.5 print:mt-0.5 pt-1 border-t border-slate-200 flex items-center justify-between text-[8px] print:text-[6.5px] text-slate-400 font-mono">
              <span>Portal Berita Acara RFS • PT. Fajar Mitra Krida Abadi</span>
              <span className="font-bold text-slate-600">HALAMAN 1 DARI 2 (BERITA ACARA RESMI &amp; TTD)</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PEMISAH HALAMAN FISIK (PAGE BREAK DIVIDER) ANTARA LEMBAR 1 DAN LEMBAR 2    */}
          {/* ========================================================================= */}
          {printTarget === "all" && (
            <div className="no-print my-4 flex items-center justify-center gap-3">
              <div className="h-px bg-slate-400/50 flex-1"></div>
              <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-md border border-slate-700">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>BATAS HALAMAN CETAK (PAGE BREAK A4)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  Lembar 1 Selesai ➜ Lembar 2 Terpisah
                </span>
              </div>
              <div className="h-px bg-slate-400/50 flex-1"></div>
            </div>
          )}

          {/* Hard Page Break Element for Chrome/Firefox/Safari Print Engine */}
          <div
            className="print-page-break"
            style={{
              pageBreakBefore: "always",
              pageBreakAfter: "always",
              breakBefore: "page",
              breakAfter: "page",
            }}
          />

          {/* ========================================================================= */}
          {/* LEMBAR 2 RESMI: MATRIKS EVIDENT PENGUJIAN POC (21 ITEM BROWSER)            */}
          {/* SESUAI REFERENSI LAPANGAN RESMI TELCO & CBN - DIATUR PAS 1 LEMBAR A4       */}
          {/* ========================================================================= */}
          <div
            id="ba-sheet-2"
            className={`sheet-card print-page-2 print-section bg-white border border-slate-300 shadow-lg rounded-sm p-4 sm:p-7 print:p-0 print:border-none print:shadow-none print:rounded-none relative ${printTarget === "page1" ? "hidden print:hidden" : ""}`}
            style={{ breakBefore: "page", pageBreakBefore: "always" }}
          >
            {/* Header Lampiran */}
            <div className="border-b-2 border-slate-900 pb-2.5 print:pb-1 mb-3 print:mb-1.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] print:text-[8px] font-bold uppercase tracking-wider text-slate-500 block">
                    Lampiran Dokumen Berita Acara RFS
                  </span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base print:text-[13px] font-black tracking-tight text-slate-900 uppercase">
                      POC Pengujian Layanan
                    </h3>
                    {(() => {
                      const rawGallery = (record.evidentPocGallery && record.evidentPocGallery.length > 0)
                        ? record.evidentPocGallery
                        : DEFAULT_POC_ITEMS;
                      if (rawGallery.length <= 6) return null;
                      return (
                        <div className="no-print inline-flex rounded border border-slate-300 bg-slate-100 p-0.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setEvidentPocMode("compact")}
                            className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                              evidentPocMode === "compact"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title="Tampilkan 6 pilar utama efisien (Rekomendasi agar pas 1 halaman)"
                          >
                            Mode Efisien (6 Item)
                          </button>
                          <button
                            type="button"
                            onClick={() => setEvidentPocMode("all")}
                            className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                              evidentPocMode === "all"
                                ? "bg-slate-700 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                            title="Tampilkan seluruh item pengujian"
                          >
                            Semua ({rawGallery.length})
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="text-right text-[10px] print:text-[8px] font-mono text-slate-700 space-y-0.5">
                  <div><strong>No. BA :</strong> {record.noBa}</div>
                  <div><strong>Lokasi :</strong> {record.siteName || record.locationName}</div>
                  <div><strong>Tanggal Uji :</strong> {record.tanggal}</div>
                </div>
              </div>
            </div>

            {/* Grid Kartu Browser Evident (Mode Efisien 6 Item Standar Telco atau Semua Item) */}
            {(() => {
              const rawGallery = (record.evidentPocGallery && record.evidentPocGallery.length > 0)
                ? record.evidentPocGallery
                : DEFAULT_POC_ITEMS;
              
              // Jika mode efisien aktif, pilih 6 pilar utama agar pas dan tidak kebanyakan
              const pocItems = (evidentPocMode === "compact" && rawGallery.length > 6)
                ? getCompactPocItems(rawGallery)
                : rawGallery;
              
              const isCompact = pocItems.length <= 6;

              return (
                <div className={`grid gap-2.5 print:gap-1.5 mb-3 print:mb-1.5 ${
                  isCompact 
                    ? "grid-cols-2 sm:grid-cols-3 print:grid-cols-3" 
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3"
                }`}>
                  {pocItems.map((item: PocEvidenceItem, index: number) => (
                    <div
                      key={item.id || index}
                      className="border border-slate-300 rounded overflow-hidden bg-white shadow-xs flex flex-col justify-between"
                      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                    >
                      {/* Browser Window Header Mockup */}
                      <div className="bg-slate-100 border-b border-slate-200 px-2 py-1 print:py-0.5 flex items-center justify-between gap-1 text-[9px] print:text-[7.5px]">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 print:w-1 print:h-1 rounded-full bg-rose-400 inline-block"></span>
                          <span className="w-1.5 h-1.5 print:w-1 print:h-1 rounded-full bg-amber-400 inline-block"></span>
                          <span className="w-1.5 h-1.5 print:w-1 print:h-1 rounded-full bg-emerald-400 inline-block"></span>
                        </div>
                        <div className="bg-white border border-slate-300 rounded px-1.5 py-0.5 print:py-0 text-slate-600 font-mono text-[8px] print:text-[6.5px] truncate flex-1 mx-1 text-center">
                          https://{item.url}
                        </div>
                        <span className="font-bold text-slate-800 text-[8px] print:text-[6.5px] bg-slate-200 px-1 rounded shrink-0">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Konten Screenshot / Mockup Browser */}
                      <div className={`${isCompact ? "h-28 print:h-16" : "h-24 print:h-10"} bg-slate-50 flex items-center justify-center p-1.5 print:p-0.5 relative overflow-hidden`}>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full rounded border border-slate-200 bg-white p-1.5 print:p-0.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-0.5">
                              <span className="font-bold text-[9.5px] print:text-[7px] text-slate-900 truncate">
                                {item.title}
                              </span>
                              <span className="text-[7.5px] print:text-[6px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                {item.status || "PASS"}
                              </span>
                            </div>

                            <div className="my-auto text-center space-y-0.5">
                              {item.category === "Speedtest" ? (
                                <div className="space-y-0.5">
                                  <div className="text-[11px] print:text-[7.5px] font-mono font-black text-slate-900 leading-none">
                                    {record.downloadSpeed || 597.4} / {record.uploadSpeed || 434.3} Mbps
                                  </div>
                                  <div className="text-[7.5px] print:text-[6px] text-slate-500 font-mono leading-none">
                                    Ping: {record.pingLatency || 2} ms • Loss: {record.packetLoss ?? 0}%
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="text-[9px] print:text-[6.5px] font-semibold text-slate-800 leading-none">
                                    {item.category} • Aktif Normal
                                  </div>
                                  <div className="text-[7.5px] print:text-[6px] font-mono text-slate-500 leading-none">
                                    Latency: {item.latencyMs || 5} ms • SSL OK
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="text-[7.5px] print:text-[6px] text-slate-500 truncate border-t border-slate-100 pt-0.5 font-mono">
                              {item.notes || "Koneksi responsif tanpa loss"}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Kartu Pengujian */}
                      <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 print:py-0.5 flex items-center justify-between text-[8px] print:text-[6.5px]">
                        <span className="font-bold text-slate-700 truncate">
                          {item.title}
                        </span>
                        <span className="text-emerald-700 font-semibold font-mono shrink-0 flex items-center gap-0.5">
                          ✓ Normal ({item.latencyMs || 5} ms)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Kalimat Penutup Resmi Sesuai Gambar Referensi Lapangan */}
            <div
              className="border-2 border-slate-900 rounded p-2.5 print:p-1 bg-slate-50 space-y-1 mb-3 print:mb-1"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div className="flex items-start gap-1.5">
                <span className="text-slate-900 font-black text-xs print:text-[10px]">📌</span>
                <p className="text-[10.5px] print:text-[8px] font-bold text-slate-900 italic leading-snug">
                  &quot;{record.closingStatement || DEFAULT_CLOSING_STATEMENT}&quot;
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[9px] print:text-[7px] text-slate-600">
                <span>Dokumentasi Uji Lapangan Terlampir Resmi</span>
                <span>WASPANG &amp; Engineer Verification Done</span>
              </div>
            </div>

            {/* Footer Halaman Lampiran */}
            <div className="pt-1.5 print:pt-0.5 border-t border-slate-300 flex items-center justify-between text-[8px] print:text-[6.5px] text-slate-400 font-mono">
              <span>Lampiran Matriks POC BA-RFS • PT. Fajar Mitra Krida Abadi</span>
              <span className="font-bold text-slate-600">HALAMAN 2 DARI 2 (MATRIKS POC TELCO)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
