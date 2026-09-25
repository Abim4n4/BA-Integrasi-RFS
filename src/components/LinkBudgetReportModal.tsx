import React, { useRef, useState } from "react";
import { Printer, X, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, FileText, ZoomIn, ZoomOut, Download } from "lucide-react";
import { LinkBudgetRecord } from "../types.ts";
import { FmkaOfficialKop } from "./FmkaHeader.tsx";
import { getStatusBadgeInfo } from "../services/linkBudgetService.ts";

interface LinkBudgetReportModalProps {
  record: LinkBudgetRecord;
  onClose: () => void;
  onToast?: (msg: string, type: "success" | "error") => void;
}

export const LinkBudgetReportModal: React.FC<LinkBudgetReportModalProps> = ({
  record,
  onClose,
  onToast
}) => {
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 480) return 45; // HP kecil
      if (window.innerWidth < 768) return 60; // HP sedang / besar
      if (window.innerWidth < 1024) return 80; // Tablet
    }
    return 100; // Desktop PC & Big Screen
  });
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const statusInfo = getStatusBadgeInfo(record.overallStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-1 sm:p-4 overflow-y-auto">
      {/* Top Controls Toolbar (Touch-friendly & Responsive on HP, Tablet, PC) */}
      <div className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl text-white max-w-[95vw] overflow-x-auto no-scrollbar print:hidden">
        {/* Quick Fit Presets */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoom(45)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
              zoom === 45 ? "bg-teal-600 text-white" : "hover:bg-slate-800 text-slate-300"
            }`}
            title="Fit Layar HP"
          >
            Fit HP
          </button>
          <button
            onClick={() => setZoom(75)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
              zoom === 75 ? "bg-teal-600 text-white" : "hover:bg-slate-800 text-slate-300"
            }`}
            title="Fit Layar Tablet"
          >
            Tab
          </button>
          <button
            onClick={() => setZoom(100)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
              zoom === 100 ? "bg-teal-600 text-white" : "hover:bg-slate-800 text-slate-300"
            }`}
            title="Ukuran Nyata 100%"
          >
            100%
          </button>
        </div>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5 shrink-0" />

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoom(prev => Math.max(35, prev - 10))}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Perkecil"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-bold w-10 text-center text-slate-300 select-none">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(140, prev + 10))}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Perbesar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5 shrink-0" />

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md transition-all cursor-pointer shrink-0"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cetak /</span> PDF
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors ml-0.5 shrink-0"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Document Sheet Container */}
      <div className="overflow-x-auto w-full flex justify-center py-12 sm:py-16">
        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          className="w-full max-w-[850px] min-w-[700px] sm:min-w-0 bg-white text-slate-900 shadow-2xl rounded-sm p-5 sm:p-10 border border-slate-300 print:m-0 print:p-6 print:border-none print:shadow-none print:w-full print:max-w-none print:min-w-0 transition-transform duration-200"
          ref={printAreaRef}
        >
          {/* Official Header Kop */}
          <FmkaOfficialKop />

          {/* Title Block */}
          <div className="text-center my-4 pb-2 border-b-2 border-slate-900">
            <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-950">
              BERITA ACARA TES &amp; COMMISSIONING (TESCOM)
            </h1>
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-emerald-800">
              PENGUKURAN REDAMAN OPTIK OLT - ODC - ODP (LINK BUDGET SYSTEM)
            </p>
            <p className="text-[11px] font-mono font-semibold text-slate-600 mt-0.5">
              Nomor Pengujian: <span className="font-bold text-slate-900">{record.projectCode}</span>
            </p>
          </div>

          {/* Section 1: Ringkasan Informasi Lokasi & SFP OLT */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs mb-4">
            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
              <h3 className="font-black text-[11px] text-slate-700 uppercase tracking-wider mb-1.5 border-b pb-1">
                Data Site &amp; Lokasi Topologi
              </h3>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Cluster / Proyek</span>
                <span className="col-span-2 font-bold text-slate-900">: {record.clusterName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Node ODC</span>
                <span className="col-span-2 font-semibold text-slate-900">: {record.odcName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Titik ODP</span>
                <span className="col-span-2 font-bold text-slate-900">: {record.odpName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Tanggal &amp; Jam</span>
                <span className="col-span-2 font-semibold text-slate-900">
                  : {record.measurementDate} {record.measurementTime ? `• ${record.measurementTime} WIB` : ""}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
              <h3 className="font-black text-[11px] text-slate-700 uppercase tracking-wider mb-1.5 border-b pb-1">
                Parameter Pemancar OLT
              </h3>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Perangkat OLT</span>
                <span className="col-span-2 font-semibold text-slate-900">: {record.oltName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Port SFP OLT</span>
                <span className="col-span-2 font-bold text-slate-900">: {record.oltFrameSlotPort}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Class SFP / Tx</span>
                <span className="col-span-2 font-bold text-emerald-800">
                  : {record.sfpClass} ({record.txPowerDbm >= 0 ? `+${record.txPowerDbm}` : record.txPowerDbm} dBm)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Panjang Gelombang</span>
                <span className="col-span-2 font-semibold text-slate-900">: {record.wavelength} nm (GPON Downstream)</span>
              </div>
            </div>
          </div>

        {/* Section 2: Tabel Analisis Perhitungan Link Budget (Teori) */}
        <div className="mb-4">
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>A. Analisis Desain Link Budget (Teori Transmisi Optik)</span>
            <span className="text-[10px] font-normal text-slate-500">Standar Telkom / ITU-T G.984</span>
          </h3>
          <table className="w-full text-left text-[11px] border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-1.5 border-r border-slate-300">Komponen Segmen Link</th>
                <th className="p-1.5 border-r border-slate-300 text-center">Spesifikasi Parameter</th>
                <th className="p-1.5 border-r border-slate-300 text-center">Koefisien Loss Standar</th>
                <th className="p-1.5 text-right">Total Redaman (dB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-1.5 border-r border-slate-200 font-semibold">1. Kabel Feeder (OLT ke ODC)</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.feederLengthKm} km</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.fiberLossPerKm} dB/km</td>
                <td className="p-1.5 text-right font-mono font-bold">{record.feederLossDb.toFixed(2)} dB</td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-slate-200 font-semibold">2. Titik Sambungan (Fusion Splicing)</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.spliceCount} titik sambung</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.spliceLossDbEach} dB/titik</td>
                <td className="p-1.5 text-right font-mono font-bold">{record.totalSpliceLossDb.toFixed(2)} dB</td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-slate-200 font-semibold">3. Konektor Adaptor (SC/UPC - APC)</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.connectorCount} adapter pair</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.connectorLossDbEach} dB/conn</td>
                <td className="p-1.5 text-right font-mono font-bold">{record.totalConnectorLossDb.toFixed(2)} dB</td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-slate-200 font-semibold">4. Splitter Level 1 (ODC / FDT)</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">Rasio {record.splitter1Ratio}</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">PLC Splitter Spec</td>
                <td className="p-1.5 text-right font-mono font-bold">{record.splitter1LossDb.toFixed(2)} dB</td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-slate-200 font-semibold">5. Kabel Distribusi (ODC ke ODP)</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.distributionLengthKm} km</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">{record.fiberLossPerKm} dB/km</td>
                <td className="p-1.5 text-right font-mono font-bold">{record.distributionLossDb.toFixed(2)} dB</td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-slate-200 font-semibold">6. Splitter Level 2 (ODP)</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">Rasio {record.splitter2Ratio}</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">PLC Splitter Spec</td>
                <td className="p-1.5 text-right font-mono font-bold">{record.splitter2LossDb.toFixed(2)} dB</td>
              </tr>
              <tr>
                <td className="p-1.5 border-r border-slate-200 font-semibold">7. Safety / Maintenance Margin</td>
                <td className="p-1.5 border-r border-slate-200 text-center text-slate-500">Cadangan Penuaan Fiber</td>
                <td className="p-1.5 border-r border-slate-200 text-center font-mono">Standar Telco</td>
                <td className="p-1.5 text-right font-mono font-bold">{record.safetyMarginDb.toFixed(2)} dB</td>
              </tr>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                <td colSpan={3} className="p-1.5 text-right uppercase">Total Redaman Teori (Total Link Loss):</td>
                <td className="p-1.5 text-right text-rose-700 font-mono text-xs">{record.totalLossTheoryDb.toFixed(2)} dB</td>
              </tr>
              <tr className="bg-emerald-50/60 font-bold">
                <td colSpan={3} className="p-1.5 text-right text-emerald-900 uppercase">Estimasi Daya Terima di ODP (Rx Theory):</td>
                <td className="p-1.5 text-right text-emerald-800 font-mono text-xs">{record.expectedPowerOdpDbm.toFixed(2)} dBm</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Hasil Pengukuran Riil TesCom Lapangan (OPM) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">
              B. Matriks Hasil Pengukuran Lapangan (Field TesCom OPM)
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-600">
                Daya Terukur ODC: <strong className="font-mono">{record.measuredOdcPowerDbm !== undefined ? `${record.measuredOdcPowerDbm} dBm` : "-"}</strong>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusInfo.badgeClass}`}>
                STATUS: {record.overallStatus}
              </span>
            </div>
          </div>

          <table className="w-full text-left text-[10.5px] border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-1 border-r border-slate-300 text-center w-14">Port ODP</th>
                <th className="p-1 border-r border-slate-300 text-center">Standar Nilai</th>
                <th className="p-1 border-r border-slate-300 text-center font-bold">Daya Terukur (OPM)</th>
                <th className="p-1 border-r border-slate-300 text-center">Deviasi Thd Teori</th>
                <th className="p-1 border-r border-slate-300 text-center w-24">Status Uji</th>
                <th className="p-1 text-left">Catatan Teknis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {record.portsMeasurement.map(p => (
                <tr key={p.portNumber} className={p.status === "FAIL" ? "bg-rose-50" : ""}>
                  <td className="p-1 border-r border-slate-200 text-center font-bold font-mono">
                    Port {p.portNumber}
                  </td>
                  <td className="p-1 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                    -16 s/d -24 dBm
                  </td>
                  <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                    {p.measuredPowerDbm.toFixed(2)} dBm
                  </td>
                  <td className="p-1 border-r border-slate-200 text-center font-mono text-[10px] text-slate-600">
                    {p.deltaFromTheory.toFixed(2)} dB
                  </td>
                  <td className="p-1 border-r border-slate-200 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-tight ${
                        p.status === "OPTIMAL"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : p.status === "PASS"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : p.status === "MARGINAL"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-1 text-slate-600 text-[10px]">{p.notes || "-"}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td colSpan={2} className="p-1.5 text-right uppercase">Rata-rata Terukur:</td>
                <td className="p-1.5 text-center font-mono text-emerald-800 font-black">
                  {record.averageMeasuredOdpDbm.toFixed(2)} dBm
                </td>
                <td colSpan={3} className="p-1.5 text-left text-slate-700 text-[10px]">
                  {record.overallStatus === "OPTIMAL" || record.overallStatus === "PASS"
                    ? "✓ Seluruh port ODP memenuhi standar redaman optik FTTH GPON Bima Waluya Apps."
                    : "⚠️ Terdapat port dengan redaman tinggi / anomali. Perlu rekoneksi ulang."}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: Catatan Pekerjaan */}
        {record.notes && (
          <div className="mb-4 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-0.5">Catatan &amp; Kesimpulan Pengujian Lapangan:</span>
            <p className="text-slate-700 text-[11px] leading-relaxed italic">{record.notes}</p>
          </div>
        )}

        {/* Section 5: Lembar Tanda Tangan Resmi (3 Pihak) */}
        <div className="mt-6 pt-3 border-t-2 border-slate-800">
          <p className="text-center text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-4">
            Demikian Berita Acara Pengukuran Redaman Link Budget dan Hasil TesCom ini dibuat dengan sebenar-benarnya untuk digunakan sebagaimana mestinya.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            {/* 1. Pelaksana / Teknisi */}
            <div className="flex flex-col items-center justify-between h-32">
              <p className="font-bold text-slate-800 uppercase text-[10px]">Pelaksana Teknisi</p>
              <div className="h-16 flex items-center justify-center">
                {record.signatureTechnician ? (
                  <img src={record.signatureTechnician} alt="TTD Teknisi" className="max-h-14 max-w-full object-contain" />
                ) : (
                  <div className="w-28 border-b border-dashed border-slate-400 h-8" />
                )}
              </div>
              <div>
                <p className="font-black text-slate-900 underline">{record.technicianName || "Rian Pratama"}</p>
                <p className="text-[10px] text-slate-500">Bima Waluya Apps</p>
              </div>
            </div>

            {/* 2. Pengawas Lapangan (WASPANG) */}
            <div className="flex flex-col items-center justify-between h-32">
              <p className="font-bold text-slate-800 uppercase text-[10px]">Pengawas Lapangan (WASPANG)</p>
              <div className="h-16 flex items-center justify-center">
                {record.signatureWaspang ? (
                  <img src={record.signatureWaspang} alt="TTD Waspang" className="max-h-14 max-w-full object-contain" />
                ) : (
                  <div className="w-28 border-b border-dashed border-slate-400 h-8" />
                )}
              </div>
              <div>
                <p className="font-black text-slate-900 underline">{record.waspangName || "Ir. Joko Sutrisno"}</p>
                <p className="text-[10px] text-slate-500">Waspang Resmi Mitra / Pemberi Tugas</p>
              </div>
            </div>

            {/* 3. Network Engineer / ISP */}
            <div className="flex flex-col items-center justify-between h-32">
              <p className="font-bold text-slate-800 uppercase text-[10px]">Mengetahui Network Engineer</p>
              <div className="h-16 flex items-center justify-center">
                <div className="w-28 border-b border-dashed border-slate-400 h-8 flex items-center justify-center text-[9px] text-slate-400 italic">
                  (Stempel &amp; Paraf)
                </div>
              </div>
              <div>
                <p className="font-black text-slate-900 underline">Bambang Kurniawan, S.T.</p>
                <p className="text-[10px] text-slate-500">Network Engineer / ISP Core</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Audit Code */}
        <div className="mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span>BIMA WALUYA APPS • Sistem Validasi Mutu Jaringan Optik FTTH CIQS 2000:2018</span>
          <span>Doc ID: {record.id} • Dicetak: {new Date().toLocaleDateString("id-ID")}</span>
        </div>
      </div>
      </div>
    </div>
  );
};
