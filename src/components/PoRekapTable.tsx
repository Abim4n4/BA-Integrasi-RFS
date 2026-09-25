import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Printer,
  Download,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Copy,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  PackageCheck,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Info,
  Check,
  AlertCircle
} from "lucide-react";
import { PoMaterialRequest, PoMaterialItem, User } from "../types.ts";

interface PoRekapTableProps {
  records: PoMaterialRequest[];
  currentUser?: User | null;
  isLoading?: boolean;
  onRefresh: () => void;
  onViewDocument: (record: PoMaterialRequest) => void;
  onEditDocument: (record: PoMaterialRequest) => void;
  onCloneDocument: (record: PoMaterialRequest) => void;
  onDeleteDocument: (id: string) => void;
  onNewPo: () => void;
  onStatusChange?: (id: string, newStatus: PoMaterialRequest["status"]) => void;
  onShowToast?: (message: string, type: "success" | "error") => void;
}

export const PoRekapTable: React.FC<PoRekapTableProps> = ({
  records,
  currentUser,
  isLoading = false,
  onRefresh,
  onViewDocument,
  onEditDocument,
  onCloneDocument,
  onDeleteDocument,
  onNewPo,
  onStatusChange,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "volume-desc">("date-desc");
  const [selectedDetailPo, setSelectedDetailPo] = useState<PoMaterialRequest | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique locations for filtering
  const locationList = useMemo(() => {
    const locs = new Set<string>();
    records.forEach((r) => {
      if (r.lokasiProyek) locs.add(r.lokasiProyek);
    });
    return Array.from(locs);
  }, [records]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalDocs = records.length;
    let totalVolume = 0;
    const materialNames = new Set<string>();
    let statusCounts = {
      Diajukan: 0,
      Disetujui: 0,
      Diproses: 0,
      Selesai: 0
    };

    records.forEach((r) => {
      const st = r.status || "Diajukan";
      if (st in statusCounts) {
        statusCounts[st as keyof typeof statusCounts]++;
      }
      if (Array.isArray(r.items)) {
        r.items.forEach((it) => {
          totalVolume += Number(it.volume) || 0;
          if (it.namaMaterial && it.namaMaterial.trim()) {
            materialNames.add(it.namaMaterial.trim().toLowerCase());
          }
        });
      }
    });

    return {
      totalDocs,
      totalVolume,
      uniqueMaterials: materialNames.size,
      statusCounts
    };
  }, [records]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return records
      .filter((r) => {
        // Location filter
        if (selectedLocation !== "ALL" && r.lokasiProyek !== selectedLocation) {
          return false;
        }

        // Status filter
        if (selectedStatus !== "ALL" && (r.status || "Diajukan") !== selectedStatus) {
          return false;
        }

        // Search text matching
        if (!term) return true;

        const inNomor = (r.nomorSurat || "").toLowerCase().includes(term);
        const inTanggal = (r.tanggalSurat || "").toLowerCase().includes(term);
        const inLokasi = (r.lokasiProyek || "").toLowerCase().includes(term);
        const inNotes = (r.notes || "").toLowerCase().includes(term);
        const inCreator =
          (r.creator1Name || "").toLowerCase().includes(term) ||
          (r.creator2Name || "").toLowerCase().includes(term);
        const inApprover =
          (r.approver1Name || "").toLowerCase().includes(term) ||
          (r.approver2Name || "").toLowerCase().includes(term);

        const inMaterials =
          Array.isArray(r.items) &&
          r.items.some(
            (it) =>
              (it.namaMaterial || "").toLowerCase().includes(term) ||
              (it.keterangan || "").toLowerCase().includes(term) ||
              (it.satuan || "").toLowerCase().includes(term)
          );

        return inNomor || inTanggal || inLokasi || inNotes || inCreator || inApprover || inMaterials;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === "date-asc") {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === "volume-desc") {
          const volA = (a.items || []).reduce((acc, it) => acc + (Number(it.volume) || 0), 0);
          const volB = (b.items || []).reduce((acc, it) => acc + (Number(it.volume) || 0), 0);
          return volB - volA;
        }
        return 0;
      });
  }, [records, searchTerm, selectedLocation, selectedStatus, sortBy]);

  // Copy PO Number to Clipboard
  const handleCopyNoSurat = (nomorSurat: string, id: string) => {
    navigator.clipboard.writeText(nomorSurat);
    setCopiedId(id);
    if (onShowToast) {
      onShowToast(`Nomor Surat "${nomorSurat}" berhasil disalin!`, "success");
    }
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Export Recap to CSV
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      if (onShowToast) onShowToast("Tidak ada data PO untuk diekspor.", "error");
      return;
    }

    const headers = [
      "No",
      "Nomor Dokumen",
      "Tanggal Surat",
      "Lokasi Proyek",
      "Total Item",
      "Total Volume",
      "Rincian Material & Satuan",
      "Diajukan Oleh",
      "Disetujui Oleh",
      "Status",
      "Catatan",
      "Tanggal Dibuat"
    ];

    const rows = filteredRecords.map((r, idx) => {
      const itemsSummary = (r.items || [])
        .map((it) => `${it.namaMaterial} (${it.volume} ${it.satuan})`)
        .join("; ");
      const totalVol = (r.items || []).reduce((acc, it) => acc + (Number(it.volume) || 0), 0);
      const pembuat = `${r.creator1Name || "-"}, ${r.creator2Name || "-"}`;
      const penyetuju = `${r.approver1Name || "-"}, ${r.approver2Name || "-"}`;

      return [
        idx + 1,
        `"${r.nomorSurat}"`,
        `"${r.tanggalSurat}"`,
        `"${r.lokasiProyek}"`,
        (r.items || []).length,
        totalVol,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        `"${pembuat}"`,
        `"${penyetuju}"`,
        `"${r.status || "Diajukan"}"`,
        `"${(r.notes || "").replace(/"/g, '""')}"`,
        `"${r.createdAt || ""}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Rekap_Permohonan_PO_Material_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast("Berkas Rekap CSV PO Material berhasil diunduh!", "success");
    }
  };

  // Print Recap Table
  const handlePrintRekap = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Metric Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 no-print">
        {/* Total Dokumen */}
        <div className="surface-card border rounded-2xl p-4 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Total Pengajuan PO
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-main mt-0.5">
              {stats.totalDocs}
              <span className="text-xs font-normal text-muted ml-1">Surat</span>
            </h3>
            <p className="text-[10px] text-emerald-500 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Rekap terdata resmi
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Volume Material */}
        <div className="surface-card border rounded-2xl p-4 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Akumulasi Volume
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-500 mt-0.5">
              {stats.totalVolume.toLocaleString("id-ID")}
              <span className="text-xs font-normal text-muted ml-1">Unit/Pcs</span>
            </h3>
            <p className="text-[10px] text-muted mt-1">Total kebutuhan lapangan</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Variasi Jenis Material */}
        <div className="surface-card border rounded-2xl p-4 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Varian Jenis Barang
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-indigo-500 mt-0.5">
              {stats.uniqueMaterials}
              <span className="text-xs font-normal text-muted ml-1">Macam</span>
            </h3>
            <p className="text-[10px] text-muted mt-1">Katalog item material</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="surface-card border rounded-2xl p-4 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div className="w-full">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
              Status Dokumen
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 font-semibold">
                <span>Disetujui:</span>
                <span className="font-bold">{stats.statusCounts.Disetujui}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 font-semibold">
                <span>Diproses:</span>
                <span className="font-bold">{stats.statusCounts.Diproses}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 font-semibold">
                <span>Diajukan:</span>
                <span className="font-bold">{stats.statusCounts.Diajukan}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-400 font-semibold">
                <span>Selesai:</span>
                <span className="font-bold">{stats.statusCounts.Selesai}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls, Search, Filter & Quick Actions */}
      <div className="surface-card border rounded-2xl p-4 shadow-xs space-y-3 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor surat, lokasi proyek, nama material, pembuat, catatan..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border surface-elevated text-main text-xs focus:ring-1 focus:ring-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-main"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lokasi Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 rounded-xl border surface-elevated text-main text-xs font-medium cursor-pointer"
            >
              <option value="ALL">Semua Lokasi Proyek</option>
              {locationList.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border surface-elevated text-main text-xs font-medium cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Diajukan">Diajukan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border surface-elevated text-main text-xs font-medium cursor-pointer"
            >
              <option value="date-desc">Urutkan: Tanggal Terbaru</option>
              <option value="date-asc">Urutkan: Tanggal Terlama</option>
              <option value="volume-desc">Urutkan: Volume Terbanyak</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl border surface-elevated text-muted hover:text-main hover:border-slate-400 transition-all text-xs cursor-pointer"
              title="Perbarui Data"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            {/* Ekspor CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl border surface-elevated text-main font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Unduh Rekap Format CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Ekspor CSV</span>
            </button>

            {/* Cetak Rekapan */}
            <button
              type="button"
              onClick={handlePrintRekap}
              className="px-3 py-2 rounded-xl border surface-elevated text-main font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Cetak Tabel Rekapan"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cetak Rekap</span>
            </button>

            {/* Buat PO Baru */}
            <button
              type="button"
              onClick={onNewPo}
              className="px-3.5 py-2 rounded-xl accent-bg text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto sm:ml-0"
              title="Buka Form untuk Buat Permohonan PO Baru"
            >
              <Plus className="w-4 h-4" />
              <span>Buat PO Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Indicator / Active Result Count */}
        <div className="flex items-center justify-between text-[11px] text-muted border-t pt-2.5">
          <div>
            Menampilkan <strong className="text-main">{filteredRecords.length}</strong> dari{" "}
            <strong className="text-main">{records.length}</strong> permohonan PO
            {searchTerm && ` untuk pencarian "${searchTerm}"`}
            {selectedLocation !== "ALL" && ` di lokasi "${selectedLocation}"`}
          </div>
          {(searchTerm || selectedLocation !== "ALL" || selectedStatus !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedLocation("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-emerald-500 hover:underline cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Rekap Table Container */}
      <div className="surface-card border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="surface-elevated text-main font-bold border-b border-subtle">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3 min-w-[170px]">Nomor Surat &amp; Tanggal</th>
                <th className="p-3 min-w-[180px]">Lokasi Proyek</th>
                <th className="p-3 min-w-[240px]">Rincian &amp; Volume Material</th>
                <th className="p-3 min-w-[180px]">Pejabat Pengesahan</th>
                <th className="p-3 w-32 text-center">Status PO</th>
                <th className="p-3 w-40 text-center no-print">Aksi Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full surface-elevated border flex items-center justify-center mx-auto text-muted">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-main">
                        Tidak ada data Permohonan PO yang cocok
                      </p>
                      <p className="text-xs text-muted">
                        Silakan ubah filter pencarian atau klik tombol "Buat PO Baru" untuk membuat
                        surat pengadaan material baru.
                      </p>
                      <button
                        type="button"
                        onClick={onNewPo}
                        className="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Input Permohonan PO Sekarang</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  const items = record.items || [];
                  const totalVol = items.reduce(
                    (acc, it) => acc + (Number(it.volume) || 0),
                    0
                  );
                  const status = record.status || "Diajukan";

                  return (
                    <tr
                      key={record.id}
                      className="hover:surface-elevated/40 transition-colors group"
                    >
                      {/* No */}
                      <td className="p-3 text-center font-bold text-muted">{index + 1}</td>

                      {/* Nomor Surat & Tanggal */}
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-main px-2 py-0.5 rounded-md surface-elevated border text-xs">
                              {record.nomorSurat}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyNoSurat(record.nomorSurat, record.id)}
                              className="text-muted hover:text-main p-1 transition-colors cursor-pointer"
                              title="Salin Nomor Surat"
                            >
                              {copiedId === record.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{record.tanggalSurat}</span>
                          </div>
                        </div>
                      </td>

                      {/* Lokasi Proyek */}
                      <td className="p-3">
                        <div className="flex items-start gap-1.5">
                          <Building2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-main leading-tight">
                              {record.lokasiProyek}
                            </p>
                            <p className="text-[10px] text-muted mt-0.5">
                              PT. Fajar Mitra Krida Abadi
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Rincian & Volume Material */}
                      <td className="p-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                              {items.length} Macam Material
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Vol: {totalVol} Unit
                            </span>
                          </div>

                          {/* Quick preview 2 items */}
                          <div className="text-[11px] text-muted space-y-0.5 max-w-[260px] truncate">
                            {items.slice(0, 2).map((it, i) => (
                              <div key={i} className="truncate">
                                • <span className="font-medium text-main">{it.namaMaterial}</span>{" "}
                                ({it.volume} {it.satuan})
                              </div>
                            ))}
                            {items.length > 2 && (
                              <span className="text-[10px] text-emerald-500 font-semibold">
                                +{items.length - 2} item lainnya...
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedDetailPo(record)}
                            className="text-[11px] text-emerald-500 hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer pt-0.5"
                          >
                            <Info className="w-3 h-3" />
                            <span>Lihat Rincian Lengkap</span>
                          </button>
                        </div>
                      </td>

                      {/* Pejabat Pengesahan */}
                      <td className="p-3">
                        <div className="space-y-1 text-[11px]">
                          <div>
                            <span className="text-muted block text-[10px]">Pembuat (Diajukan):</span>
                            <span className="font-semibold text-main">
                              {record.creator1Name || "Ismunandar"} &amp;{" "}
                              {record.creator2Name || "Rahadian"}
                            </span>
                            {(record.signatureCreator1 || record.signatureCreator2) && (
                              <span
                                className="ml-1 inline-block text-[10px] text-emerald-500"
                                title="Tanda tangan digital ada"
                              >
                                ✍️
                              </span>
                            )}
                          </div>
                          <div className="pt-0.5 border-t border-subtle">
                            <span className="text-muted block text-[10px]">
                              Mengetahui / Menyetujui:
                            </span>
                            <span className="font-semibold text-main">
                              {record.approver1Name || "Bayu Pujho"} &amp;{" "}
                              {record.approver2Name || "Budiharto"}
                            </span>
                            {(record.signatureApprover1 || record.signatureApprover2) && (
                              <span
                                className="ml-1 inline-block text-[10px] text-emerald-500"
                                title="Tanda tangan digital ada"
                              >
                                ✍️
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status PO */}
                      <td className="p-3 text-center">
                        {onStatusChange ? (
                          <select
                            value={status}
                            onChange={(e) =>
                              onStatusChange(record.id, e.target.value as PoMaterialRequest["status"])
                            }
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              status === "Disetujui"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : status === "Diproses"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : status === "Selesai"
                                ? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            }`}
                          >
                            <option value="Diajukan">Diajukan</option>
                            <option value="Disetujui">Disetujui</option>
                            <option value="Diproses">Diproses</option>
                            <option value="Selesai">Selesai</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                              status === "Disetujui"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : status === "Diproses"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : status === "Selesai"
                                ? "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {status}
                          </span>
                        )}
                      </td>

                      {/* Aksi Dokumen */}
                      <td className="p-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Buka Lembar Surat Resmi (Preview / Cetak / PDF) */}
                          <button
                            type="button"
                            onClick={() => onViewDocument(record)}
                            className="p-1.5 rounded-lg border surface-elevated text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors cursor-pointer"
                            title="Buka Lembar Surat Resmi (Cetak / Unduh PDF)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Dokumen */}
                          <button
                            type="button"
                            onClick={() => onEditDocument(record)}
                            className="p-1.5 rounded-lg border surface-elevated text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/40 transition-colors cursor-pointer"
                            title="Edit Data Dokumen PO"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Clone / Duplikasi */}
                          <button
                            type="button"
                            onClick={() => onCloneDocument(record)}
                            className="p-1.5 rounded-lg border surface-elevated text-indigo-500 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-colors cursor-pointer"
                            title="Duplikasi Dokumen PO ini"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Apakah Anda yakin ingin menghapus surat PO ${record.nomorSurat} (${record.lokasiProyek})?`
                                )
                              ) {
                                onDeleteDocument(record.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border surface-elevated text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/40 transition-colors cursor-pointer"
                            title="Hapus Dokumen PO"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* 4. Modal Rincian Detail PO Material */}
      {selectedDetailPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="surface-card border rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  Rincian Dokumen PO Pengadaan
                </span>
                <h3 className="text-base sm:text-lg font-bold text-main mt-0.5">
                  {selectedDetailPo.nomorSurat}
                </h3>
                <p className="text-xs text-muted">
                  Lokasi: <strong className="text-main">{selectedDetailPo.lokasiProyek}</strong> •{" "}
                  {selectedDetailPo.tanggalSurat}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailPo(null)}
                className="text-muted hover:text-main text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status & Quick Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 surface-elevated rounded-xl border text-xs">
              <div>
                <span className="text-muted block text-[10.5px]">Status Saat Ini:</span>
                <span className="font-bold text-emerald-500">
                  {selectedDetailPo.status || "Diajukan"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10.5px]">Jumlah Macam Barang:</span>
                <span className="font-bold text-main">
                  {(selectedDetailPo.items || []).length} Item
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10.5px]">Total Kuantitas:</span>
                <span className="font-bold text-main">
                  {(selectedDetailPo.items || []).reduce(
                    (acc, it) => acc + (Number(it.volume) || 0),
                    0
                  )}{" "}
                  Unit
                </span>
              </div>
            </div>

            {/* Tabel Daftar Material Lengkap */}
            <div>
              <p className="text-xs font-bold text-main mb-2">Daftar Kebutuhan Material:</p>
              <div className="overflow-x-auto rounded-xl border border-subtle">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="surface-elevated text-main font-bold border-b border-subtle">
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5">Nama Material</th>
                      <th className="p-2.5 w-24 text-center">Satuan</th>
                      <th className="p-2.5 w-20 text-center">Volume</th>
                      <th className="p-2.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {(selectedDetailPo.items || []).map((it, idx) => (
                      <tr key={it.id || idx} className="hover:surface-elevated/40">
                        <td className="p-2.5 text-center font-bold text-muted">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-main">{it.namaMaterial}</td>
                        <td className="p-2.5 text-center text-muted">{it.satuan}</td>
                        <td className="p-2.5 text-center font-bold text-emerald-500">
                          {it.volume}
                        </td>
                        <td className="p-2.5 text-[11px] text-muted">{it.keterangan || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Catatan Tambahan (Notes) */}
            {selectedDetailPo.notes && (
              <div className="p-3 surface-elevated rounded-xl border text-xs">
                <p className="font-bold text-main mb-1">Catatan Tambahan (Note):</p>
                <p className="text-muted italic leading-relaxed">{selectedDetailPo.notes}</p>
              </div>
            )}

            {/* Pejabat Pengesahan */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 border rounded-xl surface-elevated">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Diajukan Oleh (Pembuat):
                </p>
                <p className="font-bold text-main">
                  1. {selectedDetailPo.creator1Name || "Ismunandar"}
                </p>
                <p className="text-[10px] text-muted">
                  {selectedDetailPo.creator1Position || "Support Partnership"}
                </p>
                <p className="font-bold text-main mt-1">
                  2. {selectedDetailPo.creator2Name || "Rahadian"}
                </p>
                <p className="text-[10px] text-muted">
                  {selectedDetailPo.creator2Position || "Technical Engineering"}
                </p>
              </div>

              <div className="p-2.5 border rounded-xl surface-elevated">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                  Mengetahui &amp; Menyetujui:
                </p>
                <p className="font-bold text-main">
                  1. {selectedDetailPo.approver1Name || "Bayu Pujho"}
                </p>
                <p className="text-[10px] text-muted">
                  {selectedDetailPo.approver1Position || "Project Manager"}
                </p>
                <p className="font-bold text-main mt-1">
                  2. {selectedDetailPo.approver2Name || "Budiharto"}
                </p>
                <p className="text-[10px] text-muted">
                  {selectedDetailPo.approver2Position || "Senior Manager"}
                </p>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => setSelectedDetailPo(null)}
                className="px-4 py-2 rounded-xl border surface-elevated text-muted hover:text-main text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  onEditDocument(selectedDetailPo);
                  setSelectedDetailPo(null);
                }}
                className="px-4 py-2 rounded-xl border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Form</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewDocument(selectedDetailPo);
                  setSelectedDetailPo(null);
                }}
                className="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Buka Lembar Surat Resmi (Cetak/PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
