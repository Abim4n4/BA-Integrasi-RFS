import React, { useState, useRef } from "react";
import {
  Printer,
  Download,
  Plus,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  Calendar,
  FileText,
  Eye,
  Edit3,
  PenTool,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Info
} from "lucide-react";
import { PoMaterialItem, PoMaterialRequest, User } from "../types.ts";
import { FmkaOfficialKop } from "./FmkaHeader.tsx";
import { DigitalSignaturePad } from "./DigitalSignaturePad.tsx";
import { exportPoToPdf } from "../utils/poPdfExport.ts";

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const ROMAN_MONTHS = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
];

export const formatLiveIndonesianDate = (d = new Date()): string => {
  return `${d.getDate()} ${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const generateLivePoNumber = (d = new Date()): string => {
  const roman = ROMAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `FAMIKA/${roman}/${year}`;
};

const DEFAULT_ITEMS: PoMaterialItem[] = [
  {
    id: "item-1",
    namaMaterial: "Drop Core FO 1 Core 3 Seling (G.657A)",
    satuan: "Roll (1000m)",
    volume: 2,
    keterangan: "Material penarikan kabel dropwire pelanggan FTTH"
  },
  {
    id: "item-2",
    namaMaterial: "Closure Dome 24 Core Lengkap Aksesoris & Tray",
    satuan: "Set",
    volume: 1,
    keterangan: "Joint box distribusi percabangan feeder"
  },
  {
    id: "item-3",
    namaMaterial: "Clamp Penggantung (S-Clamp / Dead-end Clamp)",
    satuan: "Pcs",
    volume: 50,
    keterangan: "Aksesoris penambatan tiang distribusi"
  },
  {
    id: "item-4",
    namaMaterial: "Pre-connectorized Patchcord SC-UPC 3 Meter",
    satuan: "Pcs",
    volume: 20,
    keterangan: "Konektor patching roset optik ke ONT/modem"
  }
];

const PROJECT_LOCATIONS = [
  "Casa Grande Cinere",
  "Graha Famika TB Simatupang",
  "Cluster Bukit Cinere Indah",
  "Sentra Distribusi Depok",
  "Area Karawaci Tangerang",
  "Kawasan Industri Jababeka"
];

const COMMON_UNITS = [
  "Roll (1000m)",
  "Roll (500m)",
  "Meter",
  "Pcs",
  "Set",
  "Box",
  "Batang",
  "Pack",
  "Drum",
  "Unit",
  "Kg"
];

interface PoMaterialPanelProps {
  currentUser?: User | null;
  onShowToast?: (message: string, type: "success" | "error") => void;
}

export const PoMaterialPanel: React.FC<PoMaterialPanelProps> = ({
  currentUser,
  onShowToast
}) => {
  const [viewMode, setViewMode] = useState<"form" | "preview">("preview");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [tanggalSurat, setTanggalSurat] = useState<string>(formatLiveIndonesianDate());
  const [nomorSurat, setNomorSurat] = useState<string>(generateLivePoNumber());
  const [lokasiProyek, setLokasiProyek] = useState<string>("Casa Grande Cinere");
  const [items, setItems] = useState<PoMaterialItem[]>(DEFAULT_ITEMS);
  const [notes, setNotes] = useState<string>(
    "Pengadaan material mendesak untuk percepatan implementasi jaringan FTTH & aktivasi pelanggan di area proyek. Mohon diproses dan dikirim ke gudang transit / site sesuai jadwal."
  );

  // Penandatangan Pembuat (Pre-filled)
  const [creator1Name, setCreator1Name] = useState<string>("Ismunandar");
  const [creator1Position, setCreator1Position] = useState<string>("Support Partnership");
  const [creator2Name, setCreator2Name] = useState<string>("Rahadian");
  const [creator2Position, setCreator2Position] = useState<string>("Technical Engineering");

  // Penandatangan Mengetahui / Menyetujui (Pre-filled)
  const [approver1Name, setApprover1Name] = useState<string>("Bayu Pujho");
  const [approver1Position, setApprover1Position] = useState<string>("Project Manager");
  const [approver2Name, setApprover2Name] = useState<string>("Budiharto");
  const [approver2Position, setApprover2Position] = useState<string>("Senior Manager");

  // Tanda Tangan Digital (Base64 URL)
  const [sigCreator1, setSigCreator1] = useState<string>("");
  const [sigCreator2, setSigCreator2] = useState<string>("");
  const [sigApprover1, setSigApprover1] = useState<string>("");
  const [sigApprover2, setSigApprover2] = useState<string>("");
  const [activeSigPad, setActiveSigPad] = useState<string | null>(null);

  // State loading saat unduh PDF
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>("");

  const printSheetRef = useRef<HTMLDivElement>(null);

  // Perbarui tanggal dan nomor surat saat tanggal dipilih berubah
  const handleDateChange = (isoDate: string) => {
    setSelectedDate(isoDate);
    if (!isoDate) return;
    const parts = isoDate.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      setTanggalSurat(formatLiveIndonesianDate(d));
      setNomorSurat(generateLivePoNumber(d));
    }
  };

  const handleResetToToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().slice(0, 10));
    setTanggalSurat(formatLiveIndonesianDate(today));
    setNomorSurat(generateLivePoNumber(today));
    if (onShowToast) {
      onShowToast("Tanggal surat dan nomor surat diperbarui ke hari ini.", "success");
    }
  };

  // Penanganan Baris Material
  const handleAddItem = () => {
    const newItem: PoMaterialItem = {
      id: `item-${Date.now()}`,
      namaMaterial: "",
      satuan: "Pcs",
      volume: 1,
      keterangan: ""
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (
    id: string,
    field: keyof PoMaterialItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) {
      if (onShowToast) onShowToast("Minimal harus menyertakan 1 baris material.", "error");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleResetDefaults = () => {
    setItems(DEFAULT_ITEMS);
    setLokasiProyek("Casa Grande Cinere");
    setNotes(
      "Pengadaan material mendesak untuk percepatan implementasi jaringan FTTH & aktivasi pelanggan di area proyek. Mohon diproses dan dikirim ke gudang transit / site sesuai jadwal."
    );
    setCreator1Name("Ismunandar");
    setCreator1Position("Support Partnership");
    setCreator2Name("Rahadian");
    setCreator2Position("Technical Engineering");
    setApprover1Name("Bayu Pujho");
    setApprover1Position("Project Manager");
    setApprover2Name("Budiharto");
    setApprover2Position("Senior Manager");
    setSigCreator1("");
    setSigCreator2("");
    setSigApprover1("");
    setSigApprover2("");
    handleResetToToday();
  };

  // Cetak Dokumen via browser window.print()
  const handlePrint = () => {
    const originalTitle = document.title;
    const sanitizedNo = nomorSurat.replace(/[/\\?%*:|"<>]/g, "-");
    const sanitizedLoc = lokasiProyek.replace(/[\s/\\?%*:|"<>]/g, "_");
    document.title = `Surat_PO_Material_${sanitizedNo}_${sanitizedLoc}`;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Download PDF Langsung
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const sanitizedNo = nomorSurat.replace(/[/\\?%*:|"<>]/g, "_");
      const sanitizedLoc = lokasiProyek.replace(/[\s/\\?%*:|"<>]/g, "_");
      const fileName = `PO_Material_${sanitizedNo}_${sanitizedLoc}.pdf`;

      await exportPoToPdf("po-official-document-sheet", {
        fileName,
        onProgress: (msg) => setExportProgress(msg)
      });

      if (onShowToast) {
        onShowToast("Berkas PDF Surat Permohonan PO berhasil diunduh!", "success");
      }
    } catch (err: any) {
      console.error(err);
      if (onShowToast) {
        onShowToast("Gagal mengunduh PDF secara langsung. Membuka dialog cetak...", "error");
      }
      handlePrint();
    } finally {
      setIsExportingPdf(false);
      setExportProgress("");
    }
  };

  // Hitung total kuantitas
  const totalVolume = items.reduce((acc, it) => acc + (Number(it.volume) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Mode Switcher (Hidden when printing) */}
      <div className="surface-card border rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl accent-bg text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-main">
                Permohonan PO Pengadaan Material
              </h1>
              <p className="text-xs text-muted">
                Formulir resmi Purchase Order (PO) material proyek PT. Fajar Mitra Krida Abadi
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex p-1 rounded-xl surface-elevated border text-xs font-semibold">
            <button
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "preview"
                  ? "accent-bg text-white shadow-xs"
                  : "text-muted hover:text-main"
              }`}
              title="Tampilkan Pratinjau Lembar Surat Resmi"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lembar Surat</span>
            </button>
            <button
              onClick={() => setViewMode("form")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === "form"
                  ? "accent-bg text-white shadow-xs"
                  : "text-muted hover:text-main"
              }`}
              title="Edit Form & Input Data Material"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Input Data</span>
            </button>
          </div>

          {/* Reset Defaults */}
          <button
            onClick={handleResetDefaults}
            className="p-2 rounded-xl surface-elevated border text-muted hover:text-main hover:border-slate-400 transition-all text-xs cursor-pointer flex items-center gap-1"
            title="Muat Ulang Data Bawaan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 surface-elevated text-main font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            title="Cetak Surat atau Simpan sebagai PDF via Browser"
          >
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>Cetak / Print</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            title="Download Dokumen PDF Bersih Langsung"
          >
            {isExportingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{exportProgress || "Membuat PDF..."}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mode Form Input Data (Dapat diedit dengan mudah oleh pengguna) */}
      {viewMode === "form" && (
        <div className="space-y-6 no-print">
          {/* Bagian 1: Header Dokumen & Lokasi */}
          <div className="surface-card border rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-main flex items-center gap-2 border-b pb-2.5">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <span>1. Nomor Dokumen, Tanggal & Lokasi Proyek</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nomor Surat */}
              <div>
                <label className="block text-xs font-semibold text-main mb-1.5 flex items-center justify-between">
                  <span>Nomor Surat / Dokumen</span>
                  <button
                    type="button"
                    onClick={handleResetToToday}
                    className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto
                  </button>
                </label>
                <input
                  type="text"
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  placeholder="FAMIKA/IX/2026"
                  className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-muted mt-1">
                  Format otomatis: FAMIKA/[Bulan Romawi]/[Tahun]
                </p>
              </div>

              {/* Tanggal Surat */}
              <div>
                <label className="block text-xs font-semibold text-main mb-1.5 flex items-center justify-between">
                  <span>Tanggal Surat (Format Indonesia)</span>
                  <span className="text-[10px] text-muted">Hari ini</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-10 p-2 rounded-xl border surface-elevated text-main text-xs cursor-pointer"
                    title="Pilih tanggal dari kalender"
                  />
                  <input
                    type="text"
                    value={tanggalSurat}
                    onChange={(e) => setTanggalSurat(e.target.value)}
                    className="flex-1 text-xs font-semibold p-2.5 rounded-xl border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-muted mt-1">
                  Otomatis terisi live date bahasa Indonesia
                </p>
              </div>

              {/* Lokasi Proyek */}
              <div>
                <label className="block text-xs font-semibold text-main mb-1.5">
                  Lokasi Proyek
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    list="location-presets"
                    value={lokasiProyek}
                    onChange={(e) => setLokasiProyek(e.target.value)}
                    placeholder="Casa Grande Cinere"
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                  />
                  <datalist id="location-presets">
                    {PROJECT_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                  <p className="text-[10px] text-muted">
                    Bawaan: Casa Grande Cinere (dapat diganti)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bagian 2: Tabel Interaktif Daftar Material */}
          <div className="surface-card border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-main flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>2. Rincian Kebutuhan Material</span>
                </h2>
                <p className="text-xs text-muted">
                  Tambah, ubah, atau hapus baris daftar pengadaan material
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-xl accent-bg text-white font-semibold text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Baris Material</span>
              </button>
            </div>

            {/* Tabel Material */}
            <div className="overflow-x-auto rounded-xl border border-subtle">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="surface-elevated text-main font-bold border-b border-subtle">
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3 min-w-[240px]">Nama Material / Barang</th>
                    <th className="p-3 w-36">Satuan</th>
                    <th className="p-3 w-28 text-center">Volume</th>
                    <th className="p-3 min-w-[200px]">Keterangan / Spesifikasi</th>
                    <th className="p-3 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:surface-elevated/50 transition-colors">
                      <td className="p-3 text-center font-bold text-muted">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={item.namaMaterial}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "namaMaterial", e.target.value)
                          }
                          placeholder="Masukkan nama material..."
                          className="w-full text-xs p-2 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          list="unit-presets"
                          value={item.satuan}
                          onChange={(e) => handleUpdateItem(item.id, "satuan", e.target.value)}
                          placeholder="Pcs/Roll"
                          className="w-full text-xs p-2 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.volume}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "volume", Number(e.target.value) || 0)
                          }
                          className="w-full text-xs p-2 text-center font-bold rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.keterangan}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "keterangan", e.target.value)
                          }
                          placeholder="Contoh: Sambungan roset optik..."
                          className="w-full text-xs p-2 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Baris Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="unit-presets">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            {/* Total Summary */}
            <div className="flex flex-wrap items-center justify-between text-xs text-muted pt-1 px-1">
              <span>Total Item: <strong className="text-main">{items.length} macam</strong></span>
              <span>Akumulasi Volume: <strong className="text-emerald-500">{totalVolume}</strong> unit/satuan</span>
            </div>

            {/* Kolom Catatan (Note) Tambahan */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-main mb-1.5">
                Catatan (Note) Tambahan
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tuliskan catatan khusus pengiriman, target batas waktu instalasi, vendor rujukan, dll..."
                className="w-full text-xs p-3 rounded-xl border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Bagian 3: Pejabat Pembuat & Penyetujui (Pre-filled) */}
          <div className="surface-card border rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-main flex items-center gap-2 border-b pb-2.5">
              <PenTool className="w-4 h-4 text-emerald-500" />
              <span>3. Data Pejabat Pengesahan (Pembuat &amp; Mengetahui/Menyetujui)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolom Pembuat */}
              <div className="space-y-3 p-4 rounded-xl border border-subtle surface-elevated/40">
                <h3 className="text-xs font-bold text-main uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Bagian Pembuat (Diajukan Oleh)
                </h3>

                {/* Pembuat 1 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Nama Pembuat 1</label>
                    <input
                      type="text"
                      value={creator1Name}
                      onChange={(e) => setCreator1Name(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Jabatan 1</label>
                    <input
                      type="text"
                      value={creator1Position}
                      onChange={(e) => setCreator1Position(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                </div>

                {/* Pembuat 2 */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-subtle">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Nama Pembuat 2</label>
                    <input
                      type="text"
                      value={creator2Name}
                      onChange={(e) => setCreator2Name(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Jabatan 2</label>
                    <input
                      type="text"
                      value={creator2Position}
                      onChange={(e) => setCreator2Position(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                </div>
              </div>

              {/* Kolom Menyetujui */}
              <div className="space-y-3 p-4 rounded-xl border border-subtle surface-elevated/40">
                <h3 className="text-xs font-bold text-main uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Bagian Mengetahui / Menyetujui
                </h3>

                {/* Menyetujui 1 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Nama Penyetuju 1</label>
                    <input
                      type="text"
                      value={approver1Name}
                      onChange={(e) => setApprover1Name(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Jabatan 1</label>
                    <input
                      type="text"
                      value={approver1Position}
                      onChange={(e) => setApprover1Position(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                </div>

                {/* Menyetujui 2 */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-subtle">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Nama Penyetuju 2</label>
                    <input
                      type="text"
                      value={approver2Name}
                      onChange={(e) => setApprover2Name(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">Jabatan 2</label>
                    <input
                      type="text"
                      value={approver2Position}
                      onChange={(e) => setApprover2Position(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border surface-elevated text-main"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Pratinjau Dokumen Resmi (Live Document Preview) & Kertas Cetak A4 */}
      <div className="flex justify-center w-full">
        {/* Kontainer Lembar A4 Cetak Resmi */}
        <div
          id="po-official-document-sheet"
          ref={printSheetRef}
          className="w-full max-w-[850px] bg-white text-slate-900 border border-slate-300 shadow-xl rounded-sm p-6 sm:p-10 transition-all font-sans print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full print:bg-white"
          style={{ minHeight: "1050px" }}
        >
          {/* 1. Kop Surat Resmi FMKA */}
          <FmkaOfficialKop showPurpleBanner={true} className="mb-4" />

          {/* 2. Judul Dokumen Surat */}
          <div className="text-center my-5">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-[#0f2858] underline decoration-2 underline-offset-4">
              SURAT PERMOHONAN PURCHASE ORDER (PO)
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-wider mt-1 uppercase">
              PENGADAAN MATERIAL PROYEK
            </p>
          </div>

          {/* 3. Metadata Surat: No Surat, Tanggal & Lokasi Proyek */}
          <div className="border border-slate-800 rounded-sm mb-5 p-3 sm:p-4 bg-slate-50/70 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-1.5">
                <div className="flex items-start">
                  <span className="w-28 sm:w-32 font-bold text-slate-700 shrink-0">Nomor Surat</span>
                  <span className="mr-2 font-bold">:</span>
                  <span className="font-mono font-bold text-slate-950">{nomorSurat}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 sm:w-32 font-bold text-slate-700 shrink-0">Tanggal Pengajuan</span>
                  <span className="mr-2 font-bold">:</span>
                  <span className="font-semibold text-slate-900">{tanggalSurat}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-start">
                  <span className="w-28 sm:w-32 font-bold text-slate-700 shrink-0">Lokasi Proyek</span>
                  <span className="mr-2 font-bold">:</span>
                  <span className="font-bold text-slate-950 uppercase">{lokasiProyek}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-28 sm:w-32 font-bold text-slate-700 shrink-0">Perusahaan</span>
                  <span className="mr-2 font-bold">:</span>
                  <span className="font-semibold text-slate-900">PT. Fajar Mitra Krida Abadi</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Tabel Rincian Material */}
          <div className="mb-5">
            <p className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
              A. Daftar Kebutuhan Material:
            </p>
            <table className="w-full text-left text-xs border-collapse border border-slate-800">
              <thead>
                <tr className="bg-slate-200/90 text-slate-950 border-b border-slate-800 font-bold">
                  <th className="border border-slate-800 p-2 w-10 text-center">NO</th>
                  <th className="border border-slate-800 p-2 min-w-[200px]">NAMA MATERIAL / DESKRIPSI</th>
                  <th className="border border-slate-800 p-2 w-28 text-center">SATUAN</th>
                  <th className="border border-slate-800 p-2 w-24 text-center">VOLUME</th>
                  <th className="border border-slate-800 p-2">KETERANGAN / SPESIFIKASI</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="even:bg-slate-50/50">
                    <td className="border border-slate-800 p-2 text-center font-bold text-slate-800">
                      {index + 1}
                    </td>
                    <td className="border border-slate-800 p-2 font-semibold text-slate-900">
                      {item.namaMaterial || "-"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center text-slate-800">
                      {item.satuan || "-"}
                    </td>
                    <td className="border border-slate-800 p-2 text-center font-bold text-slate-950">
                      {item.volume}
                    </td>
                    <td className="border border-slate-800 p-2 text-slate-700 text-[11px]">
                      {item.keterangan || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-800">
                  <td colSpan={3} className="border border-slate-800 p-2 text-right uppercase tracking-wider">
                    Total Kuantitas:
                  </td>
                  <td className="border border-slate-800 p-2 text-center text-slate-950">
                    {totalVolume}
                  </td>
                  <td className="border border-slate-800 p-2 text-[11px] text-slate-600">
                    {items.length} macam item material
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Catatan Tambahan (Note) */}
          <div className="mb-6 p-3 border border-slate-800 rounded-sm bg-slate-50/60 text-xs">
            <p className="font-bold text-slate-900 uppercase mb-1">Catatan (Note):</p>
            <p className="text-slate-800 leading-relaxed italic whitespace-pre-wrap">
              {notes || "Tidak ada catatan khusus."}
            </p>
          </div>

          {/* 6. Matriks 4 Kolom Tanda Tangan Pengesahan Resmi */}
          <div className="mt-8 pt-2 print:mt-4">
            <p className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">
              B. Pengesahan &amp; Persetujuan Dokumen:
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Grup Kiri: Pembuat (Diajukan Oleh) */}
              <div className="border border-slate-800 rounded-sm p-3 bg-white">
                <p className="text-[11px] font-bold text-center uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                  Diajukan Oleh (Pembuat)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Pembuat 1: Ismunandar */}
                  <div className="text-center flex flex-col justify-between h-36">
                    <p className="text-[10.5px] font-semibold text-slate-700">Support Partnership</p>
                    <div className="flex-1 flex items-center justify-center my-1 relative group">
                      {sigCreator1 ? (
                        <img
                          src={sigCreator1}
                          alt="Tanda Tangan Ismunandar"
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-2 py-1 select-none">
                          [Tanda Tangan]
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSigPad("creator1")}
                        className="no-print absolute inset-0 bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity rounded cursor-pointer"
                        title="Bubuhkan Tanda Tangan Digital"
                      >
                        <PenTool className="w-3 h-3 mr-1" /> Tanda Tangan
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-950 underline underline-offset-2">
                        {creator1Name}
                      </p>
                      <p className="text-[10px] text-slate-600">{creator1Position}</p>
                    </div>
                  </div>

                  {/* Pembuat 2: Rahadian */}
                  <div className="text-center flex flex-col justify-between h-36 border-l border-slate-200 pl-2">
                    <p className="text-[10.5px] font-semibold text-slate-700">Technical Engineering</p>
                    <div className="flex-1 flex items-center justify-center my-1 relative group">
                      {sigCreator2 ? (
                        <img
                          src={sigCreator2}
                          alt="Tanda Tangan Rahadian"
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-2 py-1 select-none">
                          [Tanda Tangan]
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSigPad("creator2")}
                        className="no-print absolute inset-0 bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity rounded cursor-pointer"
                        title="Bubuhkan Tanda Tangan Digital"
                      >
                        <PenTool className="w-3 h-3 mr-1" /> Tanda Tangan
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-950 underline underline-offset-2">
                        {creator2Name}
                      </p>
                      <p className="text-[10px] text-slate-600">{creator2Position}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grup Kanan: Menyetujui */}
              <div className="border border-slate-800 rounded-sm p-3 bg-white">
                <p className="text-[11px] font-bold text-center uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                  Mengetahui &amp; Menyetujui
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Menyetujui 1: Bayu Pujho */}
                  <div className="text-center flex flex-col justify-between h-36">
                    <p className="text-[10.5px] font-semibold text-slate-700">Project Manager</p>
                    <div className="flex-1 flex items-center justify-center my-1 relative group">
                      {sigApprover1 ? (
                        <img
                          src={sigApprover1}
                          alt="Tanda Tangan Bayu Pujho"
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-2 py-1 select-none">
                          [Tanda Tangan]
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSigPad("approver1")}
                        className="no-print absolute inset-0 bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity rounded cursor-pointer"
                        title="Bubuhkan Tanda Tangan Digital"
                      >
                        <PenTool className="w-3 h-3 mr-1" /> Tanda Tangan
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-950 underline underline-offset-2">
                        {approver1Name}
                      </p>
                      <p className="text-[10px] text-slate-600">{approver1Position}</p>
                    </div>
                  </div>

                  {/* Menyetujui 2: Budiharto */}
                  <div className="text-center flex flex-col justify-between h-36 border-l border-slate-200 pl-2">
                    <p className="text-[10.5px] font-semibold text-slate-700">Senior Manager</p>
                    <div className="flex-1 flex items-center justify-center my-1 relative group">
                      {sigApprover2 ? (
                        <img
                          src={sigApprover2}
                          alt="Tanda Tangan Budiharto"
                          className="max-h-16 max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400 italic border border-dashed border-slate-300 rounded px-2 py-1 select-none">
                          [Tanda Tangan]
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveSigPad("approver2")}
                        className="no-print absolute inset-0 bg-slate-900/10 hover:bg-slate-900/20 text-slate-700 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity rounded cursor-pointer"
                        title="Bubuhkan Tanda Tangan Digital"
                      >
                        <PenTool className="w-3 h-3 mr-1" /> Tanda Tangan
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-950 underline underline-offset-2">
                        {approver2Name}
                      </p>
                      <p className="text-[10px] text-slate-600">{approver2Position}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Dokumen */}
            <div className="mt-8 pt-3 border-t border-slate-400 text-[10px] text-slate-500 flex items-center justify-between">
              <span>PT. FAJAR MITRA KRIDA ABADI • Divisi Pengadaan &amp; Proyek Jaringan</span>
              <span>Dokumen Resmi • PO Material</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Digital Signature Pad jika pengguna ingin membubuhkan tanda tangan */}
      {activeSigPad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print animate-fade-in">
          <div className="surface-card border rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-main flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-500" />
                Tanda Tangan Digital:{" "}
                {activeSigPad === "creator1"
                  ? creator1Name
                  : activeSigPad === "creator2"
                  ? creator2Name
                  : activeSigPad === "approver1"
                  ? approver1Name
                  : approver2Name}
              </h3>
              <button
                type="button"
                onClick={() => setActiveSigPad(null)}
                className="text-muted hover:text-main text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <DigitalSignaturePad
              id={`sig-${activeSigPad}`}
              label="Goreskan Tanda Tangan pada Bidang di Bawah"
              signerName={
                activeSigPad === "creator1"
                  ? creator1Name
                  : activeSigPad === "creator2"
                  ? creator2Name
                  : activeSigPad === "approver1"
                  ? approver1Name
                  : approver2Name
              }
              value={
                activeSigPad === "creator1"
                  ? sigCreator1
                  : activeSigPad === "creator2"
                  ? sigCreator2
                  : activeSigPad === "approver1"
                  ? sigApprover1
                  : sigApprover2
              }
              onChange={(base64) => {
                if (activeSigPad === "creator1") setSigCreator1(base64);
                else if (activeSigPad === "creator2") setSigCreator2(base64);
                else if (activeSigPad === "approver1") setSigApprover1(base64);
                else if (activeSigPad === "approver2") setSigApprover2(base64);
              }}
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setActiveSigPad(null)}
                className="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
