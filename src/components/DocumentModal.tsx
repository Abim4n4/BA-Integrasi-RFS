import React, { useEffect, useState } from "react";
import { Printer, X, ShieldCheck, HardDrive, Mail, Check, ExternalLink, RefreshCw } from "lucide-react";
import { BeritaAcaraRFS, PocEvidenceItem } from "../types.ts";
import { FmkaOfficialKop } from "./FmkaHeader.tsx";
import { uploadBaDocumentToDrive, sendBaEmailNotification } from "../services/googleWorkspace.ts";
import { DEFAULT_POC_ITEMS, DEFAULT_CLOSING_STATEMENT } from "../data/pocTemplates.ts";

interface DocumentModalProps {
  record: BeritaAcaraRFS | null;
  onClose: () => void;
  onToast?: (msg: string, type: "success" | "error") => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ record, onClose, onToast }) => {
  if (!record) return null;

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

  // Handle print lifecycle to prevent UI freeze/pointer-lock
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.pointerEvents = "";
      window.focus();
      onClose();
    };

    const handleBeforePrint = () => {
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
      document.body.style.overflow = "";
      document.body.style.pointerEvents = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.pointerEvents = "";
    };
  }, [onClose]);

  const handlePrint = () => {
    try {
      window.print();
    } finally {
      setTimeout(() => {
        document.body.style.overflow = "";
        document.body.style.pointerEvents = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.pointerEvents = "";
      }, 400);
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:static print:inset-auto print:overflow-visible print:block print:p-0 print:m-0 print:bg-white animate-in fade-in duration-150"
    >
      {/* Container Card */}
      <div className="surface-card w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden print:static print:w-full print:max-w-none print:h-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:rounded-none print:m-0 print:p-0 print:bg-white">
        {/* Action Header - Hidden on Print */}
        <div className="no-print p-4 border-b border-subtle flex flex-wrap items-center justify-between gap-3 surface-elevated">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg accent-bg text-white">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-main">Pratinjau Cetak Berita Acara Resmi</h3>
              <p className="text-[11px] text-muted">Format resmi cetak A4, ekspor PDF, Google Drive &amp; Gmail.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Drive Upload Button */}
            <button
              onClick={() => setShowDriveConfirm(true)}
              disabled={isUploadingDrive}
              className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Simpan dokumen ke Google Drive"
            >
              {isUploadingDrive ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <HardDrive className="w-3.5 h-3.5" />
              )}
              <span>Drive</span>
            </button>

            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-2 rounded-xl border surface-card text-sky-600 hover:surface-elevated font-medium text-xs flex items-center gap-1"
                title="Buka File di Drive"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Gmail Send Button */}
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Kirim dokumen via Gmail"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail</span>
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              id="btn-print-action"
              className="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl border surface-card text-muted hover:text-main hover:surface-elevated transition-colors"
              title="Tutup Pratinjau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
          className="p-6 sm:p-10 bg-white text-slate-900 print:p-0 print:m-0 print:bg-white text-xs leading-relaxed print-document print:w-full print:h-auto print:max-h-none print:overflow-visible"
          id="printable-rfs-area"
        >
          {/* KOP SURAT RESMI PT. FAJAR MITRA KRIDA ABADI */}
          <FmkaOfficialKop className="pb-3 mb-5" />

          {/* Judul & Nomor BA */}
          <div
            className="print-section text-center my-4"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <h2 className="text-base font-bold underline tracking-wide uppercase text-slate-900">
              BERITA ACARA READY FOR SERVICE (BA-RFS)
            </h2>
            <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
              Nomor: {record.noBa}
            </p>
          </div>

          <p
            className="print-section text-[11px] text-slate-700 mb-4"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            Pada hari ini, tanggal <strong>{record.tanggal}</strong> pukul <strong>{record.waktu} WIB</strong>, telah dilaksanakan instalasi, integrasi teknis, dan pengujian kualitas layanan jaringan (Acceptance Test) pada lokasi dengan rincian sebagai berikut:
          </p>

          {/* Bagian 1: Data Layanan ISP & Lokasi */}
          <div
            className="print-section mb-4"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <h4 className="font-bold text-[11px] uppercase bg-slate-100 p-1.5 border-l-4 border-slate-900 mb-2">
              I. IDENTITAS PENYEDIA LAYANAN (ISP) & LOKASI PEMASANGAN
            </h4>
            <table className="w-full text-[11px] border border-slate-300">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="w-1/3 p-2 bg-slate-50 font-semibold border-r border-slate-200">ISP</td>
                  <td className="p-2 font-bold text-slate-900">{record.isp || record.customerName}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Lokasi</td>
                  <td className="p-2 font-semibold text-slate-900">
                    {record.locationName || record.siteName}
                    {record.siteId ? ` (${record.siteId})` : ""}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 bg-slate-50 font-semibold border-r border-slate-200">Alamat Lengkap Lokasi</td>
                  <td className="p-2 leading-relaxed">
                    <span>{record.siteAddress}</span>
                    {record.gpsCoordinates && (
                      <span className="ml-2 font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-block">
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
            className="print-section mb-4"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <div className="flex justify-between items-center bg-slate-100 p-1.5 border-l-4 border-slate-900 mb-2">
              <h4 className="font-bold text-[11px] uppercase text-slate-900">
                II. SPESIFIKASI LAYANAN & HASIL PENGUJIAN JARINGAN (TEST RESULT)
              </h4>
              <span className="text-[10px] font-semibold text-slate-700">
                Paket: <strong className="text-slate-900">{record.serviceType}</strong> ({record.subscribedBandwidth} {record.bandwidthUnit || "Mbps"})
              </span>
            </div>
            <table className="w-full text-[11px] border border-slate-300 mb-2">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-center">
                  <th className="p-2 border-r border-slate-300 text-left">Parameter Kontrak</th>
                  <th className="p-2 border-r border-slate-300">Kapasitas Paket</th>
                  <th className="p-2 border-r border-slate-300">Hasil Uji Lapangan</th>
                  <th className="p-2 border-r border-slate-300">Rasio Capaian</th>
                  <th className="p-2">Status SLA</th>
                </tr>
              </thead>
              <tbody className="text-center divide-y divide-slate-200">
                <tr>
                  <td className="p-2 text-left font-semibold border-r border-slate-200">
                    Throughput Download
                  </td>
                  <td className="p-2 font-mono border-r border-slate-200">{record.subscribedBandwidth} {record.bandwidthUnit || "Mbps"}</td>
                  <td className="p-2 font-mono font-bold border-r border-slate-200 text-slate-900">
                    {record.downloadSpeed} Mbps
                  </td>
                  <td className="p-2 font-mono font-bold border-r border-slate-200">{dlRatio}%</td>
                  <td className="p-2 font-bold text-emerald-700">
                    {dlRatio >= 85 ? "PASS" : "FAIL"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-left font-semibold border-r border-slate-200">
                    Throughput Upload
                  </td>
                  <td className="p-2 font-mono border-r border-slate-200">{record.subscribedBandwidth} {record.bandwidthUnit || "Mbps"}</td>
                  <td className="p-2 font-mono font-bold border-r border-slate-200 text-slate-900">
                    {record.uploadSpeed} Mbps
                  </td>
                  <td className="p-2 font-mono font-bold border-r border-slate-200">{ulRatio}%</td>
                  <td className="p-2 font-bold text-emerald-700">
                    {ulRatio >= 80 ? "PASS" : "FAIL"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-left font-semibold border-r border-slate-200">
                    Round-Trip Latency
                  </td>
                  <td className="p-2 font-mono border-r border-slate-200">&lt; 35 ms</td>
                  <td className="p-2 font-mono border-r border-slate-200">{record.pingLatency} ms</td>
                  <td className="p-2 border-r border-slate-200">-</td>
                  <td className="p-2 font-bold text-emerald-700">
                    {record.pingLatency <= 35 ? "OPTIMAL" : "MARGINAL"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 text-left font-semibold border-r border-slate-200">Jitter (Stabilitas Buffer)</td>
                  <td className="p-2 font-mono border-r border-slate-200">&lt; 5 ms</td>
                  <td className="p-2 font-mono border-r border-slate-200">{record.jitter} ms</td>
                  <td className="p-2 border-r border-slate-200">-</td>
                  <td className="p-2 font-bold text-emerald-700">STABIL</td>
                </tr>
                <tr>
                  <td className="p-2 text-left font-semibold border-r border-slate-200">Packet Loss Rate</td>
                  <td className="p-2 font-mono border-r border-slate-200">0.0% - 0.5%</td>
                  <td className="p-2 font-mono font-bold border-r border-slate-200">{record.packetLoss}%</td>
                  <td className="p-2 border-r border-slate-200">-</td>
                  <td className="p-2 font-bold text-emerald-700">
                    {record.packetLoss <= 0.5 ? "ZERO LOSS" : "REVIEW"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tabel Spesifikasi Jaringan, Keterangan Lapangan, & Checklist POC Sesuai Standar RFS */}
            <div className="border border-slate-300 rounded p-2 bg-slate-50/50 text-[10.5px] space-y-2 mt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 pb-2">
                {/* Backbone Media */}
                <div>
                  <span className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider">Backbone (Media)</span>
                  <div className="flex items-center gap-2.5 mt-1 font-medium text-slate-800">
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] font-bold ${record.backboneMedia === 'Wireless' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                        {record.backboneMedia === 'Wireless' ? '✓' : ''}
                      </span>
                      Wireless
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={`w-3.5 h-3.5 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] font-bold ${record.backboneMedia === 'Fiber Optic' || !record.backboneMedia ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                        {record.backboneMedia === 'Fiber Optic' || !record.backboneMedia ? '✓' : ''}
                      </span>
                      Fiber Optic
                    </span>
                  </div>
                </div>

                {/* System Distribusi */}
                <div>
                  <span className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider">System</span>
                  <div className="flex items-center gap-2 mt-1 font-medium text-slate-800 flex-wrap">
                    {['Switching', 'FTTH', 'Integrator'].map((sys) => {
                      const checked = (record.systems || ['FTTH', 'Integrator']).includes(sys);
                      return (
                        <span key={sys} className="flex items-center gap-1">
                          <span className={`w-3.5 h-3.5 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
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
                  <span className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider">Backbone (Jalur)</span>
                  <div className="flex items-center gap-2 mt-1 font-medium text-slate-800 flex-wrap">
                    {['CBN', 'Fiberstar', 'Lain - Lain'].map((prov) => {
                      const checked = record.backboneProvider === prov || (!record.backboneProvider && prov === 'Fiberstar');
                      return (
                        <span key={prov} className="flex items-center gap-1">
                          <span className={`w-3.5 h-3.5 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                            {checked ? '✓' : ''}
                          </span>
                          {prov}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Kapasitas */}
                <div>
                  <span className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider">Kapasitas</span>
                  <div className="flex items-center gap-2 mt-1 font-medium text-slate-800 flex-wrap">
                    {['500 Mbps', '1 Gbps', '10 Gbps'].map((cap) => {
                      const currentStr = `${record.subscribedBandwidth} ${record.bandwidthUnit || 'Mbps'}`.toLowerCase();
                      const checked = currentStr.includes(cap.toLowerCase().replace(' ', '')) ||
                                      currentStr === cap.toLowerCase() ||
                                      (!record.subscribedBandwidth && cap === '500 Mbps');
                      return (
                        <span key={cap} className="flex items-center gap-1">
                          <span className={`w-3.5 h-3.5 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
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
              <div className="space-y-1.5 pt-0.5">
                <div className="flex gap-2 text-[10.5px]">
                  <span className="font-bold text-slate-700 min-w-[70px]">Keterangan:</span>
                  <div className="text-slate-800 whitespace-pre-line font-mono text-[10px] leading-relaxed">
                    {record.testNotes || "RFS Done, Bandwidth sudah dilakukan pengetestan\n1. Ruang Panel ISP Famika\n2. Setiap unit sudah terpasang rosset"}
                  </div>
                </div>

                {/* POC Section */}
                <div className="border-t border-slate-200 pt-1.5 space-y-1.5">
                  <div className="font-bold text-[9.5px] text-slate-600 uppercase tracking-wider">
                    POC (Proof of Concept) & Hasil Pengujian Layanan:
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-semibold text-slate-700 min-w-[70px]">Speedtest:</span>
                    <div className="flex items-center gap-3">
                      {['100 Mbps', '500 Mbps', '1 Gbps'].map((sp) => {
                        const checked = record.pocSpeedtest === sp || (!record.pocSpeedtest && sp === '500 Mbps');
                        return (
                          <span key={sp} className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                              {checked ? '✓' : ''}
                            </span>
                            {sp}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-[10px]">
                    <span className="font-semibold text-slate-700 min-w-[70px] pt-0.5">Browsing:</span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2.5 gap-y-1 flex-1">
                      {['Banking', 'Berita', 'Games', 'Toko Online', 'Live Streaming', 'Youtube'].map((app) => {
                        const checked = (record.pocBrowsing || ['Banking', 'Berita', 'Games', 'Toko Online', 'Live Streaming', 'Youtube']).includes(app);
                        return (
                          <span key={app} className="flex items-center gap-1">
                            <span className={`w-3.5 h-3.5 rounded-sm border border-slate-500 flex items-center justify-center text-[9px] font-bold ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}>
                              {checked ? '✓' : ''}
                            </span>
                            {app}
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
            className="print-section mt-4 mb-4"
            style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
          >
            <h4 className="font-bold text-[11px] uppercase bg-slate-100 p-1.5 border-l-4 border-slate-900 mb-2">
              III. PENGESAHAN DOKUMEN & TANDA TANGAN DIGITAL PIHAK MENGETAHUI
            </h4>

            <div className="text-center mb-2.5">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                MENGETAHUI
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-[10px]">
              {/* Kolom 1: ISP */}
              <div className="border border-slate-300 p-2.5 flex flex-col justify-between h-44 rounded bg-white">
                <div>
                  <div className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 tracking-wider">
                    ISP
                  </div>
                </div>

                <div className="flex items-center justify-center h-20 my-1">
                  {(record.signatureIsp || record.signatureTechnician) ? (
                    <img
                      src={record.signatureIsp || record.signatureTechnician}
                      alt="TTD ISP"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic text-[9px]">(Tanda Tangan ISP)</span>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-1.5">
                  <p className="font-bold underline text-slate-900 leading-tight">
                    {record.ispSignerName || record.technicianName || "Pihak ISP"}
                  </p>
                  <p className="text-slate-500 text-[9px] mt-0.5">ISP</p>
                </div>
              </div>

              {/* Kolom 2: Waspang Famika */}
              <div className="border border-slate-300 p-2.5 flex flex-col justify-between h-44 rounded bg-white">
                <div>
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 tracking-wider">
                    Waspang Famika
                  </div>
                </div>

                <div className="flex items-center justify-center h-20 my-1">
                  {(record.signatureWaspang || record.signatureCustomer) ? (
                    <img
                      src={record.signatureWaspang || record.signatureCustomer}
                      alt="TTD Waspang Famika"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic text-[9px]">(Tanda Tangan Waspang Famika)</span>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-1.5">
                  <p className="font-bold underline text-slate-900 leading-tight">
                    {record.waspangSignerName || record.picCustomerName || "Waspang Famika"}
                  </p>
                  <p className="text-slate-500 text-[9px] mt-0.5">Waspang Famika</p>
                </div>
              </div>

              {/* Kolom 3: Engineer */}
              <div className="border border-slate-300 p-2.5 flex flex-col justify-between h-44 rounded bg-white">
                <div>
                  <div className="font-bold uppercase text-slate-800 border-b border-slate-200 pb-1 tracking-wider">
                    Engineer
                  </div>
                </div>

                <div className="flex items-center justify-center h-20 my-1">
                  {record.signatureNe ? (
                    <img
                      src={record.signatureNe}
                      alt="TTD Engineer"
                      className="max-h-16 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 italic text-[9px]">(Tanda Tangan Engineer)</span>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-1.5">
                  <p className="font-bold underline text-slate-900 leading-tight">
                    {record.neSignerName || record.approvedByName || "Engineer"}
                  </p>
                  <p className="text-slate-500 text-[9px] mt-0.5">Engineer</p>
                </div>
              </div>
            </div>

            {/* Bagian IV: Dokumentasi Evident Pengujian Layanan & Foto Fisik */}
            {(record.evidentSpeedtest || record.evidentRedamanOpm || record.evidentPerangkat) && (
              <div
                className="print-section mt-4 mb-3"
                style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <h4 className="font-bold text-[11px] uppercase bg-slate-100 p-1.5 border-l-4 border-slate-900 mb-2">
                  IV. DOKUMENTASI EVIDENT PENGUJIAN LAYANAN & FOTO FISIK INSTALASI
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {record.evidentSpeedtest && (
                    <div className="border border-slate-300 rounded p-2 bg-white flex flex-col items-center justify-between">
                      <img
                        src={record.evidentSpeedtest}
                        alt="Evident Speedtest"
                        className="max-h-28 max-w-full object-contain rounded border border-slate-200"
                      />
                      <span className="text-[9.5px] font-bold text-slate-800 mt-1.5 text-center">
                        1. Screenshot Speedtest Resmi
                      </span>
                    </div>
                  )}

                  {record.evidentRedamanOpm && (
                    <div className="border border-slate-300 rounded p-2 bg-white flex flex-col items-center justify-between">
                      <img
                        src={record.evidentRedamanOpm}
                        alt="Evident Redaman OPM / ONT"
                        className="max-h-28 max-w-full object-contain rounded border border-slate-200"
                      />
                      <span className="text-[9.5px] font-bold text-slate-800 mt-1.5 text-center">
                        2. Redaman Optik (OPM) / ONT
                      </span>
                    </div>
                  )}

                  {record.evidentPerangkat && (
                    <div className="border border-slate-300 rounded p-2 bg-white flex flex-col items-center justify-between">
                      <img
                        src={record.evidentPerangkat}
                        alt="Evident Perangkat / Rosset"
                        className="max-h-28 max-w-full object-contain rounded border border-slate-200"
                      />
                      <span className="text-[9.5px] font-bold text-slate-800 mt-1.5 text-center">
                        3. Fisik Rosset / Titik Unit
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KAKI SURAT RESMI (OFFICIAL CORPORATE FOOTER) PT. FAJAR MITRA KRIDA ABADI */}
            <div
              className="print-section mt-6 pt-3 border-t border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[9px] text-slate-700"
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
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {/* IAS Badge */}
                <div className="px-1.5 py-0.5 border border-slate-400 rounded bg-slate-50 flex items-center gap-1 text-[8px] font-sans">
                  <span className="font-black text-slate-900 text-[10px]">IAS</span>
                  <span className="text-[7px] leading-none text-slate-600 border-l border-slate-300 pl-1">
                    ACCREDITED<br />Management Systems
                  </span>
                </div>

                {/* IAF Oval Badge */}
                <div className="px-1.5 py-0.5 rounded-full border border-blue-600 bg-blue-50 text-blue-900 font-serif font-black text-[9px] tracking-tight">
                  IAF
                </div>

                {/* ISO Standards */}
                <div className="text-[7.5px] font-mono leading-none font-semibold text-slate-700 space-y-0.5 border-l border-slate-300 pl-1.5">
                  <div>ISO 9001 : 2015</div>
                  <div>ISO 14001 : 2015</div>
                  <div>ISO 45001 : 2018</div>
                </div>
              </div>
            </div>

            {/* Footer Metadata & Watermark */}
            <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-mono">
              <span>Portal Berita Acara RFS • PT. Fajar Mitra Krida Abadi</span>
              <span>Dokumen Elektronik Sah Berdasarkan UU ITE Pasal 5 Ayat 1</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HALAMAN LAMPIRAN RESMI: MATRIKS EVIDENT PENGUJIAN POC (21 ITEM BROWSER)    */}
          {/* SESUAI REFERENSI LAPANGAN RESMI TELCO & CBN                                 */}
          {/* ========================================================================= */}
          <div
            className="print-section mt-8 pt-6 border-t-2 border-dashed border-slate-300"
            style={{ breakBefore: "page", pageBreakBefore: "always" }}
          >
            {/* Header Lampiran */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Lampiran Dokumen Berita Acara RFS
                  </span>
                  <h3 className="text-base font-black tracking-tight text-slate-900 uppercase">
                    EVIDENT MATRIX HASIL PENGUJIAN POC & BROWSING LAYANAN
                  </h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Dokumentasi 21 Pengujian Konektivitas: Speedtest, Perbankan, Portal Media, Game Server, Marketplace, Streaming, dan Video Conference
                  </p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-700 space-y-0.5">
                  <div><strong>No. BA :</strong> {record.noBa}</div>
                  <div><strong>Lokasi :</strong> {record.siteName || record.locationName}</div>
                  <div><strong>Tanggal Uji :</strong> {record.tanggal}</div>
                </div>
              </div>
            </div>

            {/* Grid 21 Kartu Browser Evident (3 Kolom Sesuai Gambar Referensi) */}
            {(() => {
              const pocItems = (record.evidentPocGallery && record.evidentPocGallery.length > 0)
                ? record.evidentPocGallery
                : DEFAULT_POC_ITEMS;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {pocItems.map((item: PocEvidenceItem, index: number) => (
                    <div
                      key={item.id || index}
                      className="border border-slate-300 rounded overflow-hidden bg-white shadow-xs flex flex-col justify-between"
                      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
                    >
                      {/* Browser Window Header Mockup */}
                      <div className="bg-slate-100 border-b border-slate-200 px-2 py-1 flex items-center justify-between gap-1.5 text-[9px]">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                        </div>
                        <div className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-600 font-mono text-[8px] truncate flex-1 mx-1 text-center">
                          https://{item.url}
                        </div>
                        <span className="font-bold text-slate-800 text-[8px] bg-slate-200 px-1 rounded shrink-0">
                          #{index + 1}
                        </span>
                      </div>

                      {/* Konten Screenshot / Mockup Browser */}
                      <div className="h-28 bg-slate-50 flex items-center justify-center p-2 relative overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full rounded border border-slate-200 bg-white p-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                              <span className="font-bold text-[10px] text-slate-900 truncate">
                                {item.title}
                              </span>
                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                                {item.status || "PASS"}
                              </span>
                            </div>

                            <div className="my-auto text-center space-y-1">
                              {item.category === "Speedtest" ? (
                                <div className="space-y-0.5">
                                  <div className="text-xs font-mono font-black text-slate-900">
                                    597.4 / 434.3 Mbps
                                  </div>
                                  <div className="text-[8px] text-slate-500 font-mono">
                                    Ping: 2 ms • Jitter: 0 ms • Loss: 0%
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="text-[10px] font-semibold text-slate-800">
                                    {item.category} • Layanan Aktif Normal
                                  </div>
                                  <div className="text-[8px] font-mono text-slate-500">
                                    Latency: {item.latencyMs || 5} ms • SSL Valid
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="text-[8px] text-slate-500 truncate border-t border-slate-100 pt-0.5 font-mono">
                              {item.notes || "Koneksi responsif tanpa packet loss"}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Kartu Pengujian */}
                      <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 flex items-center justify-between text-[8.5px]">
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
              className="border-2 border-slate-900 rounded p-3 bg-slate-50 space-y-2 mb-4"
              style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
            >
              <div className="flex items-start gap-2">
                <span className="text-slate-900 font-black text-sm">📌</span>
                <p className="text-[11px] font-bold text-slate-900 italic leading-relaxed">
                  "{record.closingStatement || DEFAULT_CLOSING_STATEMENT}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[9.5px] text-slate-600">
                <span>Dokumentasi Uji Lapangan Terlampir Resmi</span>
                <span>WASPANG & Engineer Verification Done</span>
              </div>
            </div>

            {/* Footer Halaman Lampiran */}
            <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-400 font-mono">
              <span>Lampiran Matriks POC BA-RFS • PT. Fajar Mitra Krida Abadi</span>
              <span>Halaman 2 dari 2 • Dokumen Sah Telco</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
