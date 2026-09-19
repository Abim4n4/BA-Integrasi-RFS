import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Trash2,
  HardDrive,
  Mail,
  Download,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  Clock
} from "lucide-react";
import { BeritaAcaraRFS, User } from "../types.ts";
import { GoogleWorkspacePanel } from "./GoogleWorkspacePanel.tsx";

interface TableRekapanProps {
  records: BeritaAcaraRFS[];
  currentUser: User | null;
  isLoading: boolean;
  onRefresh: () => void;
  onViewPrint: (record: BeritaAcaraRFS) => void;
  onDeleteRecord: (id: string) => void;
  onShowToast?: (message: string, type: "success" | "error") => void;
}

export const TableRekapan: React.FC<TableRekapanProps> = ({
  records,
  currentUser,
  isLoading,
  onRefresh,
  onViewPrint,
  onDeleteRecord,
  onShowToast = () => {}
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [sortField, setSortField] = useState<keyof BeritaAcaraRFS>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records
      .filter((r) => {
        const matchesSearch =
          r.noBa.toLowerCase().includes(term) ||
          (r.isp || "").toLowerCase().includes(term) ||
          (r.customerName || "").toLowerCase().includes(term) ||
          (r.locationName || "").toLowerCase().includes(term) ||
          (r.siteName || "").toLowerCase().includes(term) ||
          (r.siteAddress || "").toLowerCase().includes(term) ||
          (r.technicianName || "").toLowerCase().includes(term);

        const matchesStatus =
          filterStatus === "ALL" || r.status === filterStatus;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const aVal = a[sortField] ?? "";
        const bVal = b[sortField] ?? "";
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [records, searchTerm, filterStatus, sortField, sortAsc]);

  // Metric calculations
  const totalDocs = records.length;
  const passCount = records.filter(
    (r) => r.aiAnalysis?.slaStatus?.includes("Pass") || r.status === "Ready For Service"
  ).length;
  const passRate = totalDocs > 0 ? Math.round((passCount / totalDocs) * 100) : 100;
  const avgSpeed =
    totalDocs > 0
      ? (
          records.reduce((acc, curr) => acc + Number(curr.downloadSpeed || 0), 0) /
          totalDocs
        ).toFixed(1)
      : "0";

  // Export table to CSV
  const handleExportCsv = () => {
    if (records.length === 0) return;
    const headers = [
      "No BA",
      "Tanggal",
      "ISP",
      "Lokasi",
      "Alamat Lokasi",
      "Koordinat GPS",
      "Layanan",
      "Kapasitas (Mbps)",
      "Download (Mbps)",
      "Upload (Mbps)",
      "Latency (ms)",
      "Packet Loss (%)",
      "Status RFS",
      "Rating AI",
      "Catatan AI",
      "Teknisi",
      "PIC Customer"
    ];

    const rows = records.map((r) => [
      `"${r.noBa}"`,
      `"${r.tanggal}"`,
      `"${(r.isp || r.customerName || "").replace(/"/g, '""')}"`,
      `"${(r.locationName || r.siteName || "").replace(/"/g, '""')}"`,
      `"${(r.siteAddress || "").replace(/"/g, '""')}"`,
      `"${r.gpsCoordinates || ""}"`,
      `"${r.serviceType}"`,
      r.subscribedBandwidth,
      r.downloadSpeed,
      r.uploadSpeed,
      r.pingLatency,
      r.packetLoss,
      `"${r.status}"`,
      `"${r.aiAnalysis?.rating || '-'}"`,
      `"${(r.aiAnalysis?.summary || '').replace(/"/g, '""')}"`,
      `"${r.technicianName}"`,
      `"${r.picCustomerName}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Rekapan_BA_RFS_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 space-y-6 animate-in fade-in duration-200">
      {/* Google Workspace & Firebase Cloud Panel */}
      <GoogleWorkspacePanel
        currentUser={currentUser}
        records={records}
        onShowToast={onShowToast}
      />

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="surface-card p-4 rounded-2xl border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Total Dokumen BA
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-extrabold text-main">{totalDocs}</h3>
            <span className="text-[10px] font-mono text-dim">Sheet DataBA</span>
          </div>
          <p className="text-[10px] text-muted mt-1">Tersinkronisasi ke Google Sheets</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            SLA Pass Rate
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-extrabold text-emerald-500">{passRate}%</h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {passCount}/{totalDocs} Lolos
            </span>
          </div>
          <p className="text-[10px] text-muted mt-1">Evaluasi otomatis Gemini AI</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Rata-rata Download
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-extrabold text-sky-500">{avgSpeed}</h3>
            <span className="text-xs font-bold text-muted">Mbps</span>
          </div>
          <p className="text-[10px] text-muted mt-1">Throughput riil pengukuran</p>
        </div>

        <div className="surface-card p-4 rounded-2xl border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Sistem Database
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-lg font-bold text-main flex items-center gap-1.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              Apps Script
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              Active
            </span>
          </div>
          <p className="text-[10px] text-muted mt-1">Code.gs & Google Sheets Live</p>
        </div>
      </div>

      {/* Table Toolbar: Search, Filters, CSV Export */}
      <div className="surface-card p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No BA, Pelanggan, Site ID, Kota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted hidden sm:inline" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs p-2 rounded-xl border surface-elevated text-main font-medium focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="Ready For Service">Ready For Service</option>
              <option value="Conditional RFS">Conditional RFS</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl border surface-elevated text-main hover:opacity-80 transition-all text-xs flex items-center gap-1.5"
            title="Muat ulang data dari sheet DataBA"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl accent-bg text-white hover:opacity-90 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Main Historical Table */}
      <div className="surface-card rounded-2xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-main border-collapse" id="data-ba-table">
            <thead>
              <tr className="surface-elevated border-b text-muted font-bold text-[11px] uppercase tracking-wider">
                <th className="p-3.5">No. Dokumen BA</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">ISP & Lokasi</th>
                <th className="p-3.5">Layanan & CIR</th>
                <th className="p-3.5 text-right">Hasil Uji (DL/UL)</th>
                <th className="p-3.5 text-center">Analisis AI</th>
                <th className="p-3.5 text-center">Status RFS</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted">
                    <p className="text-sm font-semibold">Tidak ada dokumen BA yang sesuai.</p>
                    <p className="text-xs text-dim mt-1">
                      Silakan buat dokumen baru melalui tab Formulir Input BA-RFS.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const dlRatio = Math.round(
                    (Number(item.downloadSpeed) / Math.max(1, Number(item.subscribedBandwidth))) * 100
                  );

                  return (
                    <tr
                      key={item.id}
                      className="hover:surface-elevated transition-colors duration-150 group"
                    >
                      {/* No BA */}
                      <td className="p-3.5 font-mono font-bold text-main">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          {item.noBa}
                        </div>
                        <span className="text-[10px] text-dim block font-sans">
                          ID: {item.id}
                        </span>
                      </td>

                      {/* Tanggal & Waktu */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold">{item.tanggal}</div>
                        <div className="text-[10px] text-muted flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {item.waktu} WIB
                        </div>
                      </td>

                      {/* ISP & Nama Lokasi */}
                      <td className="p-3.5">
                        <div className="font-bold text-main max-w-xs truncate" title={item.isp || item.customerName}>
                          {item.isp || item.customerName}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                          <span className="truncate max-w-[180px] font-medium text-main">
                            {item.locationName || item.siteName}
                          </span>
                          {item.gpsCoordinates && (
                            <span className="font-mono text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              GPS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Layanan & Bandwidth */}
                      <td className="p-3.5">
                        <div className="font-semibold text-main text-[11px]">
                          {item.serviceType}
                        </div>
                        <div className="text-[10px] text-muted">
                          Paket: <strong className="text-main">{item.subscribedBandwidth} Mbps</strong> (SLA {item.slaCommitment})
                        </div>
                      </td>

                      {/* Speed Test Results */}
                      <td className="p-3.5 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.downloadSpeed} <span className="text-[10px] font-sans">Mbps DL</span>
                        </div>
                        <div className="text-[10px] text-muted">
                          {item.uploadSpeed} Mbps UL ({dlRatio}%)
                        </div>
                      </td>

                      {/* AI Evaluation */}
                      <td className="p-3.5 text-center">
                        {item.aiAnalysis ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                item.aiAnalysis.rating === "Sangat Baik"
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : item.aiAnalysis.rating === "Optimal"
                                  ? "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              }`}
                              title={item.aiAnalysis.summary}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              {item.aiAnalysis.rating}
                            </span>
                            <span className="text-[9px] text-dim mt-0.5">
                              {item.aiAnalysis.slaStatus?.includes("Pass") ? "SLA Pass" : "Review"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-dim">-</span>
                        )}
                      </td>

                      {/* Status RFS */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            item.status === "Ready For Service"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : item.status === "Conditional RFS"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewPrint(item)}
                            className="p-1.5 rounded-lg border surface-card hover:accent-bg hover:text-white transition-all text-main"
                            title="Lihat & Cetak Dokumen Berita Acara Resmi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {currentUser?.role === "admin" && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus dokumen ${item.noBa}?`)) {
                                  onDeleteRecord(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border surface-card hover:bg-rose-500 hover:text-white transition-all text-rose-500"
                              title="Hapus Dokumen (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
