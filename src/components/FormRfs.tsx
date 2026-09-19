import React, { useState } from "react";
import {
  Send,
  Sparkles,
  Bot,
  CheckCircle,
  AlertTriangle,
  Server,
  Network,
  Users,
  Building,
  Activity,
  FileCheck2,
  RefreshCw,
  Printer,
  MapPin,
  Navigation,
  Compass,
  Loader2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckSquare,
  Globe,
  Check,
  LayoutGrid,
  MonitorCheck
} from "lucide-react";
import { BeritaAcaraRFS, ServiceType, BandwidthUnit, RfsStatus, AiAnalysisResult, User, PocEvidenceItem } from "../types.ts";
import { DigitalSignaturePad } from "./DigitalSignaturePad.tsx";
import { DEFAULT_POC_ITEMS, DEFAULT_CLOSING_STATEMENT } from "../data/pocTemplates.ts";

interface FormRfsProps {
  currentUser: User | null;
  onSuccessSubmit: (newRecord: BeritaAcaraRFS) => void;
  onViewPrintDoc: (record: BeritaAcaraRFS) => void;
}

export const FormRfs: React.FC<FormRfsProps> = ({
  currentUser,
  onSuccessSubmit,
  onViewPrintDoc
}) => {
  const today = new Date().toISOString().split("T")[0];
  const currentTimeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const [formData, setFormData] = useState({
    noBa: `BA-RFS/TELCO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/${Math.floor(1000 + Math.random() * 9000)}`,
    tanggal: today,
    waktu: currentTimeStr,
    isp: "PT Solusi Jaringan Nusantara (ISP)",
    customerName: "PT Solusi Jaringan Nusantara (ISP)",
    locationName: "",
    siteName: "",
    siteAddress: "",
    gpsCoordinates: "",
    serviceType: "Dedicated" as ServiceType,
    subscribedBandwidth: 500,
    bandwidthUnit: "Mbps" as BandwidthUnit,
    // Spesifikasi Layanan Lapangan (Checklist)
    backboneMedia: "Fiber Optic" as 'Wireless' | 'Fiber Optic',
    systems: ["FTTH", "Integrator"] as string[],
    backboneProvider: "Fiberstar",
    testNotes: "RFS Done, Bandwidth sudah dilakukan pengetestan\n1. Ruang Panel ISP Famika\n2. Setiap unit sudah terpasang rosset",
    pocSpeedtest: "500 Mbps",
    pocBrowsing: ["Banking", "Berita", "Games", "Toko Online", "Live Streaming", "Youtube"] as string[],
    // Evident Uji Layanan
    evidentSpeedtest: "",
    evidentRedamanOpm: "",
    evidentPerangkat: "",
    // Matriks Bukti Uji POC (21 Aplikasi Sesuai Referensi Lapangan)
    evidentPocGallery: [...DEFAULT_POC_ITEMS] as PocEvidenceItem[],
    closingStatement: DEFAULT_CLOSING_STATEMENT,
    downloadSpeed: 498.5,
    uploadSpeed: 495.2,
    pingLatency: 12.0,
    jitter: 1.5,
    packetLoss: 0.0,
    technicianName: currentUser?.name || "Rian Pratama",
    technicianPhone: "0812-3456-7890",
    picCustomerName: "Ir. Maulana Yusuf",
    picCustomerPhone: "0813-1122-3344",
    salesName: "",
    approvedByName: "",
    ispSignerName: "PT Solusi Jaringan Nusantara (ISP)",
    waspangSignerName: "Ir. Joko Sutrisno (WASPANG)",
    neSignerName: "Bambang Kurniawan, S.T. (NE)",
    status: "Ready For Service" as RfsStatus,
    generalNotes: ""
  });

  // 3 Digital Signature States: 1. ISP, 2. WASPANG, 3. NE
  const [sigIsp, setSigIsp] = useState<string>("");
  const [sigWaspang, setSigWaspang] = useState<string>("");
  const [sigNe, setSigNe] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [previewAi, setPreviewAi] = useState<AiAnalysisResult | null>(null);
  const [submitError, setSubmitError] = useState<string>("");

  // GPS Geolocation States
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);

  // Live speed ratio calculation
  const dlRatio = Math.round((Number(formData.downloadSpeed) / Math.max(1, Number(formData.subscribedBandwidth))) * 100);
  const ulRatio = Math.round((Number(formData.uploadSpeed) / Math.max(1, Number(formData.subscribedBandwidth))) * 100);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === "isp") {
        next.customerName = value;
        if (!next.ispSignerName) next.ispSignerName = value;
      }
      if (name === "locationName") {
        next.siteName = value;
      }
      return next;
    });
  };

  // Quick select capacity
  const handleSelectCapacity = (capacityNum: number, unit: BandwidthUnit) => {
    setFormData(prev => ({
      ...prev,
      subscribedBandwidth: capacityNum,
      bandwidthUnit: unit,
      downloadSpeed: Math.round(capacityNum * 0.98 * 10) / 10,
      uploadSpeed: Math.round(capacityNum * 0.97 * 10) / 10
    }));
  };

  // Toggle systems checkbox
  const toggleSystem = (sys: string) => {
    setFormData(prev => {
      const current = prev.systems || [];
      const exists = current.includes(sys);
      return {
        ...prev,
        systems: exists ? current.filter(s => s !== sys) : [...current, sys]
      };
    });
  };

  // Toggle browsing applications checkbox
  const toggleBrowsingApp = (app: string) => {
    setFormData(prev => {
      const current = prev.pocBrowsing || [];
      const exists = current.includes(app);
      return {
        ...prev,
        pocBrowsing: exists ? current.filter(a => a !== app) : [...current, app]
      };
    });
  };

  // Handle evident photo upload
  const handleEvidentUpload = (field: 'evidentSpeedtest' | 'evidentRedamanOpm' | 'evidentPerangkat', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar melebihi batas 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setFormData(prev => ({ ...prev, [field]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Handle remove evident photo
  const handleRemoveEvident = (field: 'evidentSpeedtest' | 'evidentRedamanOpm' | 'evidentPerangkat') => {
    setFormData(prev => ({ ...prev, [field]: "" }));
  };

  // Reset POC Gallery to 21 Reference Items
  const handleResetPocDefault = () => {
    setFormData(prev => ({
      ...prev,
      evidentPocGallery: [...DEFAULT_POC_ITEMS],
      closingStatement: DEFAULT_CLOSING_STATEMENT
    }));
  };

  // Toggle POC Item Status (Pass / Fail / Tested)
  const handleTogglePocStatus = (id: string) => {
    setFormData(prev => ({
      ...prev,
      evidentPocGallery: (prev.evidentPocGallery || []).map(item => {
        if (item.id === id) {
          const nextStatus = item.status === "Pass" ? "Tested" : "Pass";
          return { ...item, status: nextStatus };
        }
        return item;
      })
    }));
  };

  // Upload custom screenshot for an individual POC item
  const handleUploadPocItemImage = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar melebihi batas 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setFormData(prev => ({
        ...prev,
        evidentPocGallery: (prev.evidentPocGallery || []).map(item => 
          item.id === id ? { ...item, image: base64 } : item
        )
      }));
    };
    reader.readAsDataURL(file);
  };

  // Remove custom screenshot from individual POC item
  const handleRemovePocItemImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      evidentPocGallery: (prev.evidentPocGallery || []).map(item => 
        item.id === id ? { ...item, image: undefined } : item
      )
    }));
  };

  // GPS Geolocation Handler with reverse geocoding fallback
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setSubmitError("Perangkat atau browser Anda tidak mendukung fitur GPS Geolocation.");
      return;
    }

    setIsLocatingGps(true);
    setSubmitError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);
        const coordString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        setGpsData({
          lat,
          lng,
          accuracy,
          timestamp: new Date().toLocaleTimeString("id-ID")
        });

        let reverseAddress = "";
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              reverseAddress = data.display_name;
            }
          }
        } catch {
          // Graceful fallback to GPS coordinates
        }

        const formattedAddress = reverseAddress
          ? `${reverseAddress} [GPS: ${coordString}]`
          : `Titik Koordinat GPS: ${coordString} (Akurasi: ±${accuracy}m)`;

        setFormData(prev => ({
          ...prev,
          siteAddress: formattedAddress,
          gpsCoordinates: coordString
        }));

        setIsLocatingGps(false);
      },
      (error) => {
        setIsLocatingGps(false);
        let msg = "Gagal mendeteksi lokasi GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Izin akses lokasi GPS ditolak oleh browser/perangkat. Silakan izinkan akses lokasi.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Informasi posisi GPS tidak tersedia pada perangkat saat ini.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Permintaan deteksi lokasi GPS melebihi batas waktu (timeout).";
        }
        setSubmitError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Run On-Demand Gemini AI Bandwidth Analysis Preview
  const handleRunAiAnalysis = async () => {
    setIsAnalyzingAi(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/rfs/analyze-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setPreviewAi(data.analysis);
      } else {
        setSubmitError(data.message || "Gagal menjalankan analisis AI.");
      }
    } catch (err: any) {
      setSubmitError("Kesalahan jaringan saat memanggil Gemini API: " + err.message);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Submit complete BA RFS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!formData.isp.trim() || !formData.locationName.trim()) {
      setSubmitError("Mohon lengkapi Nama ISP dan Lokasi terlebih dahulu.");
      return;
    }

    if (!sigIsp) {
      setSubmitError("Tanda tangan ISP wajib diisi sebelum dokumen disahkan.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        customerName: formData.isp,
        siteName: formData.locationName,
        signatureIsp: sigIsp,
        signatureWaspang: sigWaspang,
        signatureNe: sigNe,
        signatureTechnician: sigIsp,
        signatureCustomer: sigWaspang,
        createdBy: currentUser?.email || "System"
      };

      const res = await fetch("/api/rfs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success && json.data) {
        onSuccessSubmit(json.data);
      } else {
        setSubmitError(json.message || "Gagal menyimpan Berita Acara.");
      }
    } catch (err: any) {
      setSubmitError("Terjadi kegagalan saat mengirim data: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill preset sample data
  const handleFillDemoData = () => {
    setFormData({
      noBa: `BA-RFS/TELCO/${new Date().getFullYear()}/09/${Math.floor(1000 + Math.random() * 9000)}`,
      tanggal: today,
      waktu: currentTimeStr,
      isp: "PT Solusi Jaringan Nusantara (ISP)",
      customerName: "PT Solusi Jaringan Nusantara (ISP)",
      locationName: "Cyber Tower 2, Lantai 18 - IDC Data Center",
      siteName: "Cyber Tower 2, Lantai 18 - IDC Data Center",
      siteAddress: "Jl. HR Rasuna Said Blok X-5 No. 13, Kuningan Timur, Jakarta Selatan [GPS: -6.224152, 106.831518]",
      gpsCoordinates: "-6.224152, 106.831518",
      serviceType: "Dedicated",
      subscribedBandwidth: 500,
      bandwidthUnit: "Mbps",
      backboneMedia: "Fiber Optic",
      systems: ["FTTH", "Integrator"],
      backboneProvider: "Fiberstar",
      testNotes: "RFS Done, Bandwidth sudah dilakukan pengetestan\n1. Ruang Panel ISP Famika\n2. Setiap unit sudah terpasang rosset",
      pocSpeedtest: "500 Mbps",
      pocBrowsing: ["Banking", "Berita", "Games", "Toko Online", "Live Streaming", "Youtube"],
      evidentSpeedtest: "",
      evidentRedamanOpm: "",
      evidentPerangkat: "",
      evidentPocGallery: [...DEFAULT_POC_ITEMS],
      closingStatement: DEFAULT_CLOSING_STATEMENT,
      downloadSpeed: 498.6,
      uploadSpeed: 496.2,
      pingLatency: 8.4,
      jitter: 1.2,
      packetLoss: 0.0,
      technicianName: currentUser?.name || "Rian Pratama",
      technicianPhone: "0812-8899-0011",
      picCustomerName: "Ir. Maulana Yusuf",
      picCustomerPhone: "0813-1122-3344",
      salesName: "",
      approvedByName: "",
      ispSignerName: "PT Solusi Jaringan Nusantara (ISP)",
      waspangSignerName: "Ir. Joko Sutrisno (WASPANG)",
      neSignerName: "Bambang Kurniawan, S.T. (NE)",
      status: "Ready For Service",
      generalNotes: "Instalasi ODF 24 Core selesai, OPM TX/RX -19.4 dBm. Berjalan sangat stabil tanpa error."
    });
    setGpsData({
      lat: -6.224152,
      lng: 106.831518,
      accuracy: 12,
      timestamp: new Date().toLocaleTimeString("id-ID")
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 space-y-6 animate-in fade-in duration-200">
      {/* Form Title & Quick Preset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 surface-card p-4 sm:p-5 rounded-2xl border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-main">
              Form BA-RFS
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold border border-emerald-500/30">
              Standar Telco
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFillDemoData}
          className="text-xs px-3 py-1.5 rounded-lg border surface-elevated text-main hover:opacity-80 transition-all font-medium flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 accent-color" />
          Isi Contoh Data Cepat
        </button>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: ID DOC & LOKASI */}
        <div className="surface-card rounded-2xl p-5 border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-subtle">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 accent-color" />
              <h3 className="text-sm font-bold text-main uppercase tracking-wider">
                1. ID DOC  & LOKASI
              </h3>
            </div>
            <span className="text-[10px] text-muted">Field ISP & Lokasi Geografis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                Nomor BA-RFS <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="noBa"
                value={formData.noBa}
                onChange={handleInputChange}
                required
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1">Tanggal Pelaksanaan</label>
              <input
                type="date"
                name="tanggal"
                value={formData.tanggal}
                onChange={handleInputChange}
                required
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1">Waktu Aktivasi (WIB)</label>
              <input
                type="text"
                name="waktu"
                value={formData.waktu}
                onChange={handleInputChange}
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Form Fields: ISP & Lokasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                ISP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="isp"
                value={formData.isp}
                onChange={handleInputChange}
                placeholder="Contoh: PT Solusi Jaringan Nusantara (ISP)"
                required
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                Lokasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleInputChange}
                placeholder="Contoh: Gedung Cyber 2 Lantai 18 / Kantor Cabang Surabaya"
                required
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Field Alamat Lengkap Lokasi dengan Tombol Deteksi GPS Otomatis */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-main">
                Alamat Lengkap Lokasi
              </label>
              <button
                type="button"
                onClick={handleGetGpsLocation}
                disabled={isLocatingGps}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                title="Deteksi koordinat GPS dan konversi alamat otomatis via geolokasi perangkat"
              >
                {isLocatingGps ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>Mendeteksi GPS...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gunakan Lokasi GPS Saya</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              name="siteAddress"
              rows={2}
              value={formData.siteAddress}
              onChange={handleInputChange}
              placeholder="Dapat diisi secara manual atau klik tombol 'Gunakan Lokasi GPS Saya' di atas untuk deteksi otomatis..."
              className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />

            {gpsData && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>
                    <strong>GPS Aktif:</strong> {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)} (Akurasi: ±{gpsData.accuracy} meter • {gpsData.timestamp})
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${gpsData.lat},${gpsData.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  <span>Lihat di Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Spesifikasi Layanan & Pengujian Bandwidth */}
        <div className="surface-card rounded-2xl p-5 border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-subtle">
            <Network className="w-4 h-4 accent-color" />
            <h3 className="text-sm font-bold text-main uppercase tracking-wider">
              2. Spesifikasi Layanan & Hasil Uji Bandwidth
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-main mb-1">Tipe Layanan</label>
              <select
                name="serviceType"
                value={formData.serviceType}
                onChange={handleInputChange}
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Dedicated">Dedicated (1:1 Simetris)</option>
                <option value="SOHO">SOHO (Small Office Home Office)</option>
                <option value="Broadband">Broadband (Best Effort)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                Kapasitas Berlangganan
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="subscribedBandwidth"
                  value={formData.subscribedBandwidth}
                  onChange={handleInputChange}
                  min={1}
                  placeholder="Kapasitas"
                  className="flex-1 text-xs p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <select
                  name="bandwidthUnit"
                  value={formData.bandwidthUnit}
                  onChange={handleInputChange}
                  className="w-28 text-xs font-semibold p-2.5 rounded-lg border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Mbps">Mbps</option>
                  <option value="Giga">Giga (Gbps)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preset Kapasitas Cepat & Spesifikasi Infrastruktur Jaringan Sesuai Gambar RFS */}
          <div className="p-4 rounded-xl surface-elevated border space-y-3.5">
            {/* Shortcut Kapasitas */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-main">Pilihan Cepat Kapasitas:</span>
              <div className="flex items-center gap-2">
                {[
                  { label: "500 Mbps", val: 500, unit: "Mbps" as BandwidthUnit },
                  { label: "1 Gbps", val: 1, unit: "Giga" as BandwidthUnit },
                  { label: "10 Gbps", val: 10, unit: "Giga" as BandwidthUnit }
                ].map(preset => {
                  const isActive = formData.subscribedBandwidth === preset.val && formData.bandwidthUnit === preset.unit;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSelectCapacity(preset.val, preset.unit)}
                      className={`px-3 py-1 text-xs rounded-lg font-mono font-bold transition-all ${
                        isActive
                          ? "accent-bg text-white shadow-sm ring-2 ring-emerald-500/30"
                          : "border surface-card text-muted hover:text-main"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist Media, System, Backbone Provider */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Media Backbone */}
              <div className="p-3 rounded-lg border surface-card space-y-2">
                <span className="block text-[11px] font-bold text-main uppercase tracking-wider">
                  Backbone (Media)
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="backboneMedia"
                      value="Wireless"
                      checked={formData.backboneMedia === "Wireless"}
                      onChange={() => setFormData(prev => ({ ...prev, backboneMedia: "Wireless" }))}
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="text-main">Wireless</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="backboneMedia"
                      value="Fiber Optic"
                      checked={formData.backboneMedia === "Fiber Optic"}
                      onChange={() => setFormData(prev => ({ ...prev, backboneMedia: "Fiber Optic" }))}
                      className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="text-main font-semibold">Fiber Optic</span>
                  </label>
                </div>
              </div>

              {/* System Distribusi */}
              <div className="p-3 rounded-lg border surface-card space-y-2">
                <span className="block text-[11px] font-bold text-main uppercase tracking-wider">
                  System
                </span>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {["Switching", "FTTH", "Integrator"].map(sys => (
                    <label key={sys} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.systems?.includes(sys)}
                        onChange={() => toggleSystem(sys)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="text-main">{sys}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Jalur Backbone Upstream */}
              <div className="p-3 rounded-lg border surface-card space-y-2">
                <span className="block text-[11px] font-bold text-main uppercase tracking-wider">
                  Backbone (Jalur)
                </span>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {["CBN", "Fiberstar", "Lain - Lain"].map(prov => (
                    <label key={prov} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="backboneProvider"
                        value={prov}
                        checked={formData.backboneProvider === prov}
                        onChange={() => setFormData(prev => ({ ...prev, backboneProvider: prov }))}
                        className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="text-main">{prov}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Test measurement inputs */}
          <div className="p-4 rounded-xl surface-elevated border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-main flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                Parameter Pengujian Jaringan (Speedtest / RFC 2544 / ITU-T Y.1564)
              </span>
              <div className="text-[11px] font-mono text-muted">
                Rasio: <span className="font-bold text-emerald-500">{dlRatio}% DL</span> / <span className="font-bold text-sky-500">{ulRatio}% UL</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Download (Mbps)</label>
                <input
                  type="number"
                  step="0.1"
                  name="downloadSpeed"
                  value={formData.downloadSpeed}
                  onChange={handleInputChange}
                  required
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Upload (Mbps)</label>
                <input
                  type="number"
                  step="0.1"
                  name="uploadSpeed"
                  value={formData.uploadSpeed}
                  onChange={handleInputChange}
                  required
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main font-mono font-bold focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Ping Latency (ms)</label>
                <input
                  type="number"
                  step="0.1"
                  name="pingLatency"
                  value={formData.pingLatency}
                  onChange={handleInputChange}
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main font-mono focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Jitter (ms)</label>
                <input
                  type="number"
                  step="0.1"
                  name="jitter"
                  value={formData.jitter}
                  onChange={handleInputChange}
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main font-mono focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] font-medium text-muted mb-1">Packet Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  name="packetLoss"
                  value={formData.packetLoss}
                  onChange={handleInputChange}
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main font-mono focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Quick SLA Health Indicator Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-300 ${
                  dlRatio >= 95 ? "bg-emerald-500" : dlRatio >= 85 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(100, dlRatio)}%` }}
              />
            </div>
          </div>

          {/* AI Pre-Check Trigger Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Verifikasi performa secara instan sebelum disimpan menggunakan <strong>Gemini AI</strong>.
              </span>
            </div>

            <button
              type="button"
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzingAi}
              className="text-xs font-semibold px-4 py-2 rounded-xl accent-bg text-white hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              {isAnalyzingAi ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Menganalisis dengan AI...
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  Uji Cerdas dengan Gemini AI
                </>
              )}
            </button>
          </div>

          {/* AI Analysis Result Card */}
          {previewAi && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-main">Catatan Teknis Otomatis Google AI Studio</span>
                    <span className="text-[10px] text-muted ml-2 font-mono">({previewAi.modelUsed})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      previewAi.rating === "Sangat Baik"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : previewAi.rating === "Optimal"
                        ? "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {previewAi.rating}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-main">
                    {previewAi.slaStatus}
                  </span>
                </div>
              </div>

              <p className="text-xs text-main leading-relaxed">{previewAi.technicalNotes}</p>

              {previewAi.recommendations && previewAi.recommendations.length > 0 && (
                <div className="pt-2 border-t border-emerald-500/20">
                  <span className="text-[11px] font-bold text-main">Rekomendasi Operasional:</span>
                  <ul className="text-[11px] text-muted list-disc list-inside space-y-0.5 mt-1">
                    {previewAi.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* POC (Proof of Concept) & Hasil Pengujian Layanan Sesuai Dokumen RFS */}
          <div className="p-4 rounded-xl surface-elevated border space-y-3.5">
            <div className="flex items-center justify-between border-b border-subtle pb-2">
              <span className="text-xs font-bold text-main flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                POC (Proof of Concept) & Uji Layanan Aplikasi
              </span>
              <span className="text-[11px] text-muted">
                {formData.pocBrowsing?.length || 0} aplikasi teruji aktif
              </span>
            </div>

            {/* Target Speedtest */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-main w-24">Speedtest:</span>
              <div className="flex items-center gap-4">
                {["100 Mbps", "500 Mbps", "1 Gbps"].map(sp => (
                  <label key={sp} className="inline-flex items-center gap-1.5 cursor-pointer font-mono">
                    <input
                      type="radio"
                      name="pocSpeedtest"
                      value={sp}
                      checked={formData.pocSpeedtest === sp}
                      onChange={() => setFormData(prev => ({ ...prev, pocSpeedtest: sp }))}
                      className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span className="text-main font-medium">{sp}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Browsing Applications Test */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 text-xs pt-1">
              <span className="font-semibold text-main sm:w-24 pt-1">Browsing:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 flex-1">
                {["Banking", "Berita", "Games", "Toko Online", "Live Streaming", "Youtube"].map(app => {
                  const isChecked = formData.pocBrowsing?.includes(app);
                  return (
                    <button
                      key={app}
                      type="button"
                      onClick={() => toggleBrowsingApp(app)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                          : "surface-card border-subtle text-muted hover:text-main"
                      }`}
                    >
                      <span>{app}</span>
                      <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] font-bold ${isChecked ? 'bg-emerald-600 text-white' : 'border border-subtle'}`}>
                        {isChecked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keterangan Fisik Lapangan */}
            <div className="pt-2 border-t border-subtle">
              <label className="block text-[11px] font-bold text-main uppercase tracking-wider mb-1.5">
                Keterangan & Catatan Instalasi Lapangan
              </label>
              <textarea
                name="testNotes"
                rows={2}
                value={formData.testNotes}
                onChange={handleInputChange}
                placeholder="Contoh: RFS Done, Bandwidth sudah dilakukan pengetestan&#10;1. Ruang Panel ISP Famika&#10;2. Setiap unit sudah terpasang rosset"
                className="w-full text-xs p-2.5 rounded-lg border surface-card text-main focus:ring-1 focus:ring-emerald-500 font-mono resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* DOKUMENTASI EVIDENT (BUKTI UJI LAYANAN & FISIK) */}
          <div className="p-4 rounded-xl surface-elevated border space-y-3">
            <div className="flex items-center justify-between border-b border-subtle pb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-500" />
                <div>
                  <h4 className="text-xs font-bold text-main uppercase tracking-wider">
                    Evident Pengujian Layanan (Foto / Tangkapan Layar)
                  </h4>
                  <p className="text-[11px] text-muted">
                    Lampiran digital opsional untuk validasi Waspang & Customer
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Maks. 5 MB / foto
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Slot 1: Speedtest Screenshot */}
              <div className="p-3 rounded-xl border surface-card flex flex-col justify-between space-y-2">
                <div>
                  <span className="block text-[11px] font-bold text-main">1. Tangkapan Layar Speedtest</span>
                  <p className="text-[10px] text-muted">Bukti throughput & latency resmi</p>
                </div>

                {formData.evidentSpeedtest ? (
                  <div className="relative rounded-lg overflow-hidden border border-subtle group">
                    <img
                      src={formData.evidentSpeedtest}
                      alt="Evident Speedtest"
                      className="w-full h-28 object-contain bg-black/5 dark:bg-black/30"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvident('evidentSpeedtest')}
                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white shadow hover:bg-rose-700 transition-all cursor-pointer"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border border-dashed rounded-lg border-subtle hover:border-emerald-500/50 cursor-pointer bg-slate-500/5 hover:bg-slate-500/10 transition-all">
                    <Upload className="w-5 h-5 text-muted mb-1" />
                    <span className="text-[11px] font-medium text-main">Unggah Speedtest</span>
                    <span className="text-[9px] text-muted">PNG / JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleEvidentUpload('evidentSpeedtest', e)}
                    />
                  </label>
                )}
              </div>

              {/* Slot 2: OPM Redaman / ONT */}
              <div className="p-3 rounded-xl border surface-card flex flex-col justify-between space-y-2">
                <div>
                  <span className="block text-[11px] font-bold text-main">2. Redaman Optik (OPM) / ONT</span>
                  <p className="text-[10px] text-muted">Foto nilai dBm atau lampu PON ONT</p>
                </div>

                {formData.evidentRedamanOpm ? (
                  <div className="relative rounded-lg overflow-hidden border border-subtle group">
                    <img
                      src={formData.evidentRedamanOpm}
                      alt="Evident OPM"
                      className="w-full h-28 object-contain bg-black/5 dark:bg-black/30"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvident('evidentRedamanOpm')}
                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white shadow hover:bg-rose-700 transition-all cursor-pointer"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border border-dashed rounded-lg border-subtle hover:border-emerald-500/50 cursor-pointer bg-slate-500/5 hover:bg-slate-500/10 transition-all">
                    <Upload className="w-5 h-5 text-muted mb-1" />
                    <span className="text-[11px] font-medium text-main">Unggah Foto OPM</span>
                    <span className="text-[9px] text-muted">PNG / JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleEvidentUpload('evidentRedamanOpm', e)}
                    />
                  </label>
                )}
              </div>

              {/* Slot 3: Titik Rosset / Perangkat */}
              <div className="p-3 rounded-xl border surface-card flex flex-col justify-between space-y-2">
                <div>
                  <span className="block text-[11px] font-bold text-main">3. Rosset / Ruang Panel Unit</span>
                  <p className="text-[10px] text-muted">Fisik kabel & terminasi terpasang</p>
                </div>

                {formData.evidentPerangkat ? (
                  <div className="relative rounded-lg overflow-hidden border border-subtle group">
                    <img
                      src={formData.evidentPerangkat}
                      alt="Evident Perangkat"
                      className="w-full h-28 object-contain bg-black/5 dark:bg-black/30"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvident('evidentPerangkat')}
                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white shadow hover:bg-rose-700 transition-all cursor-pointer"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-28 border border-dashed rounded-lg border-subtle hover:border-emerald-500/50 cursor-pointer bg-slate-500/5 hover:bg-slate-500/10 transition-all">
                    <Upload className="w-5 h-5 text-muted mb-1" />
                    <span className="text-[11px] font-medium text-main">Unggah Fisik Rosset</span>
                    <span className="text-[9px] text-muted">PNG / JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleEvidentUpload('evidentPerangkat', e)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* MATRIKS EVIDENT PENGUJIAN POC BROWSING (21 APLIKASI STANDAR TELCO SESUAI REFERENSI LAPANGAN) */}
          <div className="p-4 rounded-xl surface-elevated border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-bold text-main uppercase tracking-wider">
                    Matriks Evident Pengujian POC & Browsing (21 Aplikasi Standar Lapangan)
                  </h4>
                  <p className="text-[11px] text-muted">
                    Daftar referensi pengujian: Speedtest, Perbankan, Berita, Games, Marketplace, Streaming, dan Video Conference
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetPocDefault}
                className="self-start sm:self-auto text-[11px] font-semibold px-2.5 py-1 rounded-lg border surface-card text-muted hover:text-emerald-500 hover:border-emerald-500/40 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Muat Ulang 21 Item Standar</span>
              </button>
            </div>

            {/* Grid 21 Kartu Evident POC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(formData.evidentPocGallery || []).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-xl border surface-card p-3 flex flex-col justify-between space-y-2 hover:border-emerald-500/30 transition-all shadow-sm"
                >
                  {/* Header Kartu: Kategori & Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-0.5 rounded bg-slate-500/10">
                      {idx + 1}. {item.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePocStatus(item.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                        item.status === 'Pass'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      }`}
                      title="Klik untuk ubah status"
                    >
                      <Check className="w-2.5 h-2.5" />
                      {item.status}
                    </button>
                  </div>

                  {/* Browser URL Box Mockup */}
                  <div className="bg-slate-100 dark:bg-slate-900/60 rounded-lg p-2 border border-subtle">
                    <div className="flex items-center justify-between text-[11px] font-bold text-main">
                      <span className="truncate">{item.title}</span>
                      {item.latencyMs && (
                        <span className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400">
                          {item.latencyMs} ms
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-muted truncate mt-0.5 flex items-center gap-1">
                      <span className="text-[8px] text-slate-400">🌐</span>
                      <span>{item.url}</span>
                    </div>
                  </div>

                  {/* Catatan / Nilai Uji */}
                  <p className="text-[10px] text-muted leading-relaxed italic line-clamp-2">
                    {item.notes || "Pengujian konektivitas normal dan responsif."}
                  </p>

                  {/* Screenshot Thumbnail atau Upload Trigger */}
                  <div className="pt-1 border-t border-subtle flex items-center justify-between">
                    {item.image ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-7 h-7 object-cover rounded border border-subtle"
                          />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Screenshot Terlampir
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePocItemImage(item.id)}
                          className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                          title="Hapus gambar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-1 text-[10px] text-muted hover:text-emerald-500 cursor-pointer font-medium">
                        <Upload className="w-3 h-3" />
                        <span>Unggah Bukti Layar</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUploadPocItemImage(item.id, e)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Kalimat Penutup Resmi Lapangan Sesuai Dokumen RFS */}
            <div className="pt-3 border-t border-subtle space-y-1.5">
              <label className="block text-[11px] font-bold text-main uppercase tracking-wider">
                Kalimat Penutup / Pernyataan Akhir Hasil Pengujian
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="closingStatement"
                  value={formData.closingStatement}
                  onChange={handleInputChange}
                  placeholder="Demikian RFS ini dilakukan dengan pengecekan pada kapasitas yang sudah sesuai pada report tersebut."
                  className="flex-1 text-xs p-2.5 rounded-lg border surface-card text-main focus:ring-1 focus:ring-emerald-500 font-medium leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, closingStatement: DEFAULT_CLOSING_STATEMENT }))}
                  className="text-[10px] px-2.5 py-2.5 rounded-lg border surface-card text-muted hover:text-main whitespace-nowrap font-medium cursor-pointer"
                >
                  Reset Teks
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Personil & Otorisasi RFS */}
        <div className="surface-card rounded-2xl p-5 border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-subtle">
            <Users className="w-4 h-4 accent-color" />
            <h3 className="text-sm font-bold text-main uppercase tracking-wider">
              3. Pihak Terlibat & Penanggung Jawab
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3 p-3.5 rounded-xl surface-elevated border">
              <span className="text-xs font-bold text-main flex items-center gap-1.5">
                👷 ISP
              </span>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">PIC ISP</label>
                <input
                  type="text"
                  name="technicianName"
                  value={formData.technicianName}
                  onChange={handleInputChange}
                  required
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Nomor Kontak / WhatsApp</label>
                <input
                  type="text"
                  name="technicianPhone"
                  value={formData.technicianPhone}
                  onChange={handleInputChange}
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main"
                />
              </div>
            </div>

            <div className="space-y-3 p-3.5 rounded-xl surface-elevated border">
              <span className="text-xs font-bold text-main flex items-center gap-1.5">
                🏢 Waspang Famika
              </span>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Nama Waspang</label>
                <input
                  type="text"
                  name="picCustomerName"
                  value={formData.picCustomerName}
                  onChange={handleInputChange}
                  placeholder="Contoh: Hendra Pratama (Waspang)"
                  required
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Nomor Kontak Waspang</label>
                <input
                  type="text"
                  name="picCustomerPhone"
                  value={formData.picCustomerPhone}
                  onChange={handleInputChange}
                  placeholder="081x-xxxx-xxxx"
                  className="w-full text-xs p-2 rounded-lg border surface-card text-main"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                ISP
              </label>
              <input
                type="text"
                name="ispSignerName"
                value={formData.ispSignerName}
                onChange={handleInputChange}
                placeholder="Nama Perusahaan / Teknisi ISP"
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                WASPANG FAMIKA
              </label>
              <input
                type="text"
                name="waspangSignerName"
                value={formData.waspangSignerName}
                onChange={handleInputChange}
                placeholder="Nama Pengawas Lapangan"
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                Engineer
              </label>
              <input
                type="text"
                name="neSignerName"
                value={formData.neSignerName}
                onChange={handleInputChange}
                placeholder="Nama Network Engineer"
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-main mb-1">Status Rekomendasi RFS</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main font-semibold"
              >
                <option value="Ready For Service">✅ Ready For Service (Normal)</option>
                <option value="Conditional RFS">⚠️ Conditional RFS (Trial 3 Hari)</option>
                <option value="Pending Review">⏳ Pending Review / Retest</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-main mb-1">Catatan Tambahan Fisik/CPE</label>
              <input
                type="text"
                name="generalNotes"
                value={formData.generalNotes}
                onChange={handleInputChange}
                placeholder="Misal: Redaman kabel drop optik -18.5 dBm, SFP 10G terpasang."
                className="w-full text-xs p-2.5 rounded-lg border surface-elevated text-main"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: TTD */}
        <div className="surface-card rounded-2xl p-5 border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-subtle">
            <FileCheck2 className="w-4 h-4 accent-color" />
            <div>
              <h3 className="text-sm font-bold text-main uppercase tracking-wider">
                TTD
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Blok 1: ISP */}
            <DigitalSignaturePad
              id="sig-isp"
              label="ISP"
              signerName={formData.ispSignerName}
              value={sigIsp}
              onChange={setSigIsp}
              required
            />

            {/* Blok 2: Waspang Famika */}
            <DigitalSignaturePad
              id="sig-waspang"
              label="Waspang Famika"
              signerName={formData.waspangSignerName}
              value={sigWaspang}
              onChange={setSigWaspang}
            />

            {/* Blok 3: Engineer */}
            <DigitalSignaturePad
              id="sig-ne"
              label="Engineer"
              signerName={formData.neSignerName}
              value={sigNe}
              onChange={setSigNe}
            />
          </div>
        </div>

        {/* Action Controls: Submit to Sheets & Preview */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-submit-rfs"
            className="w-full sm:w-auto px-6 py-3 rounded-xl accent-bg text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Menyimpan ke DataBA & Analisis AI...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Terbitkan & Simpan Berita Acara RFS
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
