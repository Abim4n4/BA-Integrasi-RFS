import React, { useState } from "react";
import {
  X,
  Send,
  Clock,
  User as UserIcon,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Activity,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Copy,
  Check
} from "lucide-react";
import { BeritaAcaraRFS, User, WorkNoteEntry } from "../types.ts";

interface WorkNotesModalProps {
  record: BeritaAcaraRFS | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (recordId: string, noteData: {
    note: string;
    author: string;
    role: string;
    category: WorkNoteEntry['category'];
  }) => Promise<void>;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const WorkNotesModal: React.FC<WorkNotesModalProps> = ({
  record,
  currentUser,
  isOpen,
  onClose,
  onAddNote,
  onShowToast
}) => {
  const [newNote, setNewNote] = useState("");
  const [category, setCategory] = useState<WorkNoteEntry['category']>("Tindak Lanjut");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !record) return null;

  const notesList: WorkNoteEntry[] = record.workNotesHistory && record.workNotesHistory.length > 0
    ? record.workNotesHistory
    : record.testNotes
    ? [
        {
          id: `initial_${record.id}`,
          timestamp: record.createdAt || new Date().toISOString(),
          author: record.technicianName || "Teknisi Lapangan",
          role: "Teknisi",
          category: "Instalasi",
          content: record.testNotes
        }
      ]
    : [];

  const handleCopyNote = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) {
      onShowToast("Catatan tidak boleh kosong.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const authorName = currentUser?.name || record.technicianName || "Petugas Lapangan";
      const authorRole = currentUser?.position || (currentUser?.role === "admin" ? "Admin" : "Teknisi");

      await onAddNote(record.id, {
        note: newNote.trim(),
        author: authorName,
        role: authorRole,
        category
      });

      setNewNote("");
      onShowToast("Catatan berhasil direkam ke riwayat pekerjaan!", "success");
    } catch (err: any) {
      onShowToast(err.message || "Gagal menyimpan catatan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick preset templates for rapid field input
  const quickPresets = [
    { label: "Ruang Panel Siap", cat: "Instalasi" as const, text: "Kerapian kabel di ruang panel ISP Famika dan port OTB / Uplink telah dicek sesuai standar." },
    { label: "Hasil Uji Sesuai CIR", cat: "Pengujian" as const, text: "Uji throughput download/upload telah melampaui komitmen bandwidth SLA dan browsing lancar." },
    { label: "Verifikasi Waspang", cat: "Waspang" as const, text: "Waspang telah memverifikasi fisik terminasi OTB/ONT dan menyetujui hasil uji aktivasi." },
    { label: "Redaman Normal", cat: "Instalasi" as const, text: "Pengukuran redaman optik OPM di angka -18.5 dBm (optimal tanpa fluktuasi)." },
    { label: "Permintaan Pelanggan", cat: "Tindak Lanjut" as const, text: "Pelanggan meminta pendampingan uji coba perangkat router internal pada hari operasional pertama." }
  ];

  const getCategoryBadge = (cat: WorkNoteEntry['category']) => {
    switch (cat) {
      case "Instalasi":
        return {
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
          icon: <Wrench className="w-3 h-3" />
        };
      case "Pengujian":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: <Activity className="w-3 h-3" />
        };
      case "Waspang":
        return {
          bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
          icon: <ShieldCheck className="w-3 h-3" />
        };
      case "Kendala":
        return {
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: <AlertTriangle className="w-3 h-3" />
        };
      case "Tindak Lanjut":
        return {
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: <Clock className="w-3 h-3" />
        };
      default:
        return {
          bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
          icon: <Tag className="w-3 h-3" />
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="surface-card w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b flex items-start justify-between gap-3 surface-elevated">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-main leading-tight">
                  Catatan & Riwayat Pekerjaan Lapangan
                </h3>
                <p className="text-xs text-muted">
                  Log terekam resmi untuk audit teknisi, waspang, dan riwayat operasional
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border surface-card text-muted hover:text-main hover:bg-slate-500/10 transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ringkasan Dokumen RFS Terkait */}
        <div className="px-5 py-3 border-b bg-slate-500/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-main font-mono">{record.noBa}</span>
            <span className="text-muted">•</span>
            <span className="text-muted truncate max-w-[200px]">
              {record.siteName || record.locationName || record.customerName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              record.status === "Ready For Service"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-500"
            }`}>
              {record.status}
            </span>
            <span className="text-[11px] font-semibold text-muted">
              Teknisi: <strong className="text-main">{record.technicianName}</strong>
            </span>
          </div>
        </div>

        {/* Isi Modal: Timeline Riwayat Catatan */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <span>Riwayat Catatan Terekam</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
                {notesList.length}
              </span>
            </h4>
            <span className="text-[10px] text-muted">Diurutkan berdasarkan waktu</span>
          </div>

          {notesList.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-xl border-subtle">
              <MessageSquare className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-main">Belum ada catatan pekerjaan tambahan.</p>
              <p className="text-[11px] text-muted mt-0.5">
                Gunakan formulir di bawah untuk menambahkan catatan instalasi atau tindak lanjut.
              </p>
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 before:z-0">
              {notesList.map((item, idx) => {
                const badge = getCategoryBadge(item.category);
                const isCopied = copiedId === item.id;

                return (
                  <div key={item.id || idx} className="relative z-10 pl-7 group">
                    {/* Dot on timeline */}
                    <div className="absolute left-2.5 top-3.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />

                    <div className="p-3.5 rounded-xl border surface-card hover:border-emerald-500/40 transition-all shadow-xs space-y-2">
                      {/* Top metadata */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg}`}>
                            {badge.icon}
                            {item.category}
                          </span>
                          <span className="font-bold text-main flex items-center gap-1 text-[11px]">
                            <UserIcon className="w-3 h-3 text-muted" />
                            {item.author}
                          </span>
                          {item.role && (
                            <span className="text-[10px] text-muted">
                              ({item.role})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-muted">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {item.timestamp ? new Date(item.timestamp).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : "-"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyNote(item.content, item.id)}
                            className="p-1 rounded hover:bg-slate-500/10 text-muted hover:text-main transition-colors cursor-pointer"
                            title="Salin teks catatan"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-xs text-main whitespace-pre-line leading-relaxed font-sans font-medium">
                        {item.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Form Tambah Catatan Baru (Mempermudah Pekerjaan & Terekord) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 border-t surface-elevated space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-main flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Tambah Catatan Baru Lapangan
            </span>

            {/* Category Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted text-[11px]">Kategori:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="text-xs p-1.5 rounded-lg border surface-card text-main font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Instalasi">Instalasi</option>
                <option value="Pengujian">Pengujian</option>
                <option value="Waspang">Waspang</option>
                <option value="Kendala">Kendala</option>
                <option value="Tindak Lanjut">Tindak Lanjut</option>
                <option value="Umum">Umum</option>
              </select>
            </div>
          </div>

          {/* Preset Buttons for Instant Input */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <span className="text-muted text-[10px] shrink-0 font-medium">Preset Cepat:</span>
            {quickPresets.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setCategory(preset.cat);
                  setNewNote(prev => prev ? `${prev}\n• ${preset.text}` : preset.text);
                }}
                className="px-2 py-0.5 rounded-md border surface-card text-muted hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 text-[10px] whitespace-nowrap transition-colors cursor-pointer"
              >
                + {preset.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Tuliskan catatan teknis, laporan waspang, atau tindak lanjut pekerjaan di sini..."
              className="w-full text-xs p-3 rounded-xl border surface-card text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted">
              Pencatat: <strong>{currentUser?.name || record.technicianName || "Petugas Lapangan"}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border surface-card text-muted hover:text-main text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newNote.trim()}
                className="px-4 py-1.5 rounded-xl accent-bg text-white hover:opacity-90 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Menyimpan..." : "Simpan Catatan"}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
