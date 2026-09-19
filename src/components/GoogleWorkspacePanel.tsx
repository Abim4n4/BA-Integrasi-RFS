import React, { useState } from "react";
import {
  FileSpreadsheet,
  HardDrive,
  Mail,
  Flame,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Send,
  AlertCircle,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  Check
} from "lucide-react";
import { BeritaAcaraRFS, User } from "../types.ts";
import {
  syncRecordsToGoogleSheet,
  getOrCreateDriveFolder,
  uploadBaDocumentToDrive,
  sendBaEmailNotification,
  SheetExportResult
} from "../services/googleWorkspace.ts";
import { getAccessToken, googleSignIn } from "../lib/firebase.ts";

interface GoogleWorkspacePanelProps {
  currentUser: User | null;
  records: BeritaAcaraRFS[];
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const GoogleWorkspacePanel: React.FC<GoogleWorkspacePanelProps> = ({
  currentUser,
  records,
  onShowToast
}) => {
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  // Sheets Sync State
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSheetResult, setLastSheetResult] = useState<SheetExportResult | null>(null);
  const [showSheetConfirm, setShowSheetConfirm] = useState(false);

  // Drive Folder State
  const [isOpeningDrive, setIsOpeningDrive] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);

  // Gmail State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRecordForEmail, setSelectedRecordForEmail] = useState<BeritaAcaraRFS | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailNotes, setEmailNotes] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Check token status on render
  React.useEffect(() => {
    getAccessToken().then((token) => {
      setHasToken(!!token);
    });
  }, []);

  const handleConnectGoogle = async () => {
    setIsAuthorizing(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setHasToken(true);
        onShowToast("Berhasil terhubung ke Google Workspace (Drive, Sheets, Gmail)!", "success");
      }
    } catch (err: any) {
      onShowToast("Gagal menghubungkan Google Workspace: " + err.message, "error");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleSyncSheets = async () => {
    setShowSheetConfirm(false);
    setIsSyncingSheet(true);
    try {
      const result = await syncRecordsToGoogleSheet(records, lastSheetResult?.spreadsheetId);
      setLastSheetResult(result);
      onShowToast(`Berhasil menyinkronkan ${result.rowsAdded} data ke Google Sheets!`, "success");
    } catch (err: any) {
      onShowToast("Gagal menyinkronkan ke Google Sheets: " + err.message, "error");
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleOpenDriveFolder = async () => {
    setIsOpeningDrive(true);
    try {
      const folderId = await getOrCreateDriveFolder();
      setDriveFolderId(folderId);
      window.open(`https://drive.google.com/drive/folders/${folderId}`, "_blank");
      onShowToast("Folder Google Drive 'BA-RFS' berhasil dibuka!", "success");
    } catch (err: any) {
      onShowToast("Gagal mengakses Google Drive: " + err.message, "error");
    } finally {
      setIsOpeningDrive(false);
    }
  };

  const handleOpenEmailDialog = (record: BeritaAcaraRFS) => {
    setSelectedRecordForEmail(record);
    setEmailRecipient(record.picCustomerPhone.includes("@") ? record.picCustomerPhone : "");
    setEmailNotes(`Berikut kami lampirkan dokumen Berita Acara RFS untuk lokasi ${record.locationName}. Status: ${record.status}.`);
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!selectedRecordForEmail || !emailRecipient) {
      onShowToast("Harap isi alamat email penerima.", "error");
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendBaEmailNotification({
        to: emailRecipient,
        cc: emailCc || undefined,
        subject: `[BA-RFS RESMI] ${selectedRecordForEmail.noBa} - ${selectedRecordForEmail.locationName}`,
        record: selectedRecordForEmail,
        customNotes: emailNotes
      });
      setShowEmailModal(false);
      onShowToast(`Notifikasi BA-RFS berhasil dikirim ke ${emailRecipient} melalui Gmail!`, "success");
    } catch (err: any) {
      onShowToast("Gagal mengirim email: " + err.message, "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="surface-card rounded-2xl border p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-sky-500 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-main leading-tight flex items-center gap-2">
              Google Workspace &amp; Firebase Cloud Integration
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold border border-emerald-500/30">
                Connected
              </span>
            </h3>
            <p className="text-xs text-muted">
              Sinkronisasi dokumen otomatis ke Google Drive, Google Sheets, Gmail, dan Firebase Firestore
            </p>
          </div>
        </div>

        {!hasToken ? (
          <button
            onClick={handleConnectGoogle}
            disabled={isAuthorizing}
            className="text-xs px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-semibold flex items-center gap-2 shadow-sm shrink-0"
          >
            {isAuthorizing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Hubungkan Akun Google Workspace</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Google Otorisasi Aktif</span>
            </span>
          </div>
        )}
      </div>

      {/* Grid of 4 Connected Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Service 1: Firebase Firestore */}
        <div className="p-3.5 rounded-xl border surface-elevated flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold text-main">Firebase Firestore</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-[11px] text-muted">
            Database awan terenkripsi aktif. Dokumen BA-RFS tersimpan aman dan terupdate real-time.
          </p>
          <div className="pt-1 text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Koleksi: /beritaAcara</span>
          </div>
        </div>

        {/* Service 2: Google Sheets */}
        <div className="p-3.5 rounded-xl border surface-elevated flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-main">Google Sheets</span>
            </div>
            {lastSheetResult && (
              <span className="text-[10px] text-emerald-600 font-bold">Tersinkron</span>
            )}
          </div>
          <p className="text-[11px] text-muted">
            Ekspor seluruh data rekapan BA-RFS ke Google Spreadsheet dengan format tabel resmi.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowSheetConfirm(true)}
              disabled={isSyncingSheet}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex items-center gap-1"
            >
              {isSyncingSheet ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3 h-3" />
              )}
              <span>Sinkron ke Sheet</span>
            </button>
            {lastSheetResult && (
              <a
                href={lastSheetResult.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] px-2 py-1.5 rounded-lg border hover:surface-card text-main flex items-center gap-1"
                title="Buka Spreadsheet"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Service 3: Google Drive */}
        <div className="p-3.5 rounded-xl border surface-elevated flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-sky-500" />
              <span className="text-xs font-bold text-main">Google Drive</span>
            </div>
            <FolderOpen className="w-3.5 h-3.5 text-muted" />
          </div>
          <p className="text-[11px] text-muted">
            Penyimpanan arsip file BA-RFS resmi ke folder &quot;BA-RFS - PT. FAJAR MITRA KRIDA ABADI&quot;.
          </p>
          <div className="pt-1">
            <button
              onClick={handleOpenDriveFolder}
              disabled={isOpeningDrive}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors font-medium flex items-center gap-1"
            >
              {isOpeningDrive ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <FolderOpen className="w-3 h-3" />
              )}
              <span>Buka Folder Drive</span>
            </button>
          </div>
        </div>

        {/* Service 4: Gmail */}
        <div className="p-3.5 rounded-xl border surface-elevated flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-rose-500" />
              <span className="text-xs font-bold text-main">Gmail API</span>
            </div>
            <Send className="w-3.5 h-3.5 text-muted" />
          </div>
          <p className="text-[11px] text-muted">
            Kirim surat Berita Acara RFS resmi langsung ke email klien, ISP, atau manajemen via Gmail.
          </p>
          <div className="pt-1">
            {records.length > 0 ? (
              <button
                onClick={() => handleOpenEmailDialog(records[0])}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors font-medium flex items-center gap-1"
              >
                <Mail className="w-3 h-3" />
                <span>Kirim BA Terakhir</span>
              </button>
            ) : (
              <span className="text-[10px] text-muted italic">Belum ada dokumen</span>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Google Sheets Sync (Mandatory User Confirmation) */}
      {showSheetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface-card w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-main">Konfirmasi Sinkronisasi Google Sheets</h4>
                <p className="text-xs text-muted">Perbarui data spreadsheet di akun Google Anda</p>
              </div>
            </div>

            <p className="text-xs text-muted">
              Aplikasi akan memperbarui atau membuat Google Spreadsheet berjudul{" "}
              <strong>&quot;Rekapan BA-RFS - PT. FAJAR MITRA KRIDA ABADI&quot;</strong> dengan total{" "}
              <strong>{records.length} baris data Berita Acara</strong>. Apakah Anda ingin melanjutkan?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSheetConfirm(false)}
                className="text-xs px-3 py-2 rounded-xl border hover:surface-elevated text-main font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSyncSheets}
                className="text-xs px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Ya, Sinkronkan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Dialog with Explicit User Confirmation */}
      {showEmailModal && selectedRecordForEmail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface-card w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-main">Kirim Berita Acara via Gmail</h4>
                  <p className="text-xs text-muted">Kirim notifikasi resmi menggunakan akun Gmail Anda</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-muted hover:text-main text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-main mb-1">
                  Nomor BA &amp; Lokasi:
                </label>
                <div className="text-xs p-2 rounded-lg surface-elevated border text-main font-medium">
                  {selectedRecordForEmail.noBa} — {selectedRecordForEmail.locationName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-main mb-1">
                  Kirim Ke (Email Penerima) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: pic.client@perusahaan.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-main mb-1">
                  Tembusan / Cc (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="contoh: manager@perusahaan.com, tech@isp.com"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-main mb-1">
                  Pesan Pengantar Tambahan:
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
                onClick={handleSendEmail}
                disabled={isSendingEmail || !emailRecipient}
                className="text-xs px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Konfirmasi &amp; Kirim Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
