export type ThemeMode = 
  | 'day' 
  | 'night' 
  | 'metrik' 
  | 'electric-neon' 
  | 'purple-neon' 
  | 'blue-neon';

export type FontSizeMode = 'normal' | 'waspang' | 'extra';

export type UserRole = 'admin' | 'user' | 'waspang';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  position: string;
  department: string;
  avatarUrl?: string;
}

export type ServiceType = 
  | 'Dedicated' 
  | 'SOHO' 
  | 'Broadband'
  | string;

export type BandwidthUnit = 'Mbps' | 'Giga';

export type RfsStatus = 
  | 'Ready For Service' 
  | 'Conditional RFS' 
  | 'Pending Review';

export interface PocEvidenceItem {
  id: string;
  category: 'Speedtest' | 'Banking' | 'Berita' | 'Games' | 'Toko Online' | 'Streaming' | 'Conference' | string;
  title: string;
  url: string;
  status: 'Pass' | 'Fail' | 'Tested';
  image?: string; // Optional custom screenshot Base64
  latencyMs?: number;
  notes?: string;
}

export interface WorkNoteEntry {
  id: string;
  timestamp: string; // ISO or formatted date-time
  author: string; // Nama pembuat catatan
  role: string; // e.g. Teknisi, Waspang, Admin, PIC Customer
  category: 'Instalasi' | 'Pengujian' | 'Waspang' | 'Kendala' | 'Tindak Lanjut' | 'Umum';
  content: string; // Isi catatan pekerjaan lapangan
}

export interface AiAnalysisResult {
  summary: string;
  rating: 'Sangat Baik' | 'Optimal' | 'Perlu Tuning' | 'Kritis';
  slaStatus: 'Memenuhi SLA (Pass)' | 'Di Bawah Standar SLA (Fail)' | 'Conditional (Review)';
  downloadRatioPercent: number;
  uploadRatioPercent: number;
  latencyAssessment: string;
  jitterAssessment: string;
  packetLossAssessment: string;
  technicalNotes: string;
  recommendations: string[];
  analyzedAt: string;
  modelUsed: string;
}

export interface BeritaAcaraRFS {
  id: string;
  noBa: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  // Info Lokasi & ISP
  isp: string; // Nama ISP (Internet Service Provider)
  customerName?: string; // Fallback kompatibilitas
  locationName: string; // Nama Lokasi (sebelumnya Nama Site)
  siteName?: string; // Fallback kompatibilitas
  siteAddress: string; // Alamat Lengkap Lokasi (manual atau GPS)
  gpsCoordinates?: string; // Koordinat Latitude, Longitude (opsional dari GPS)
  siteId?: string; // Dihapus dari formulir (opsional)
  kotaWilayah?: string; // Dihapus dari formulir (opsional)
  // Service Info
  serviceType: ServiceType;
  subscribedBandwidth: number; // in Mbps / Giga
  bandwidthUnit: BandwidthUnit;
  slaCommitment?: string; // Dihapus dari formulir (opsional)
  // Network Test
  downloadSpeed: number; // in Mbps
  uploadSpeed: number; // in Mbps
  pingLatency: number; // in ms
  jitter: number; // in ms
  packetLoss: number; // in %
  // Spesifikasi Teknis Tambahan & POC (Standar Lapangan BA-RFS)
  backboneMedia?: 'Wireless' | 'Fiber Optic';
  systems?: string[]; // e.g. ['Switching', 'FTTH', 'Integrator']
  backboneProvider?: 'CBN' | 'Fiberstar' | 'Lain - Lain' | string;
  testNotes?: string; // Catatan teknis lapangan
  pocSpeedtest?: '100 Mbps' | '500 Mbps' | '1 Gbps' | string;
  pocBrowsing?: string[]; // e.g. ['Banking', 'Berita', 'Games', 'Toko Online', 'Live Streaming', 'Youtube']
  // Evident Uji Layanan (Foto / Screenshot Base64)
  evidentSpeedtest?: string; // Foto/Screenshot Speedtest
  evidentRedamanOpm?: string; // Foto Redaman Optik (OPM) / ONT
  evidentPerangkat?: string; // Foto Perangkat / Rosset Unit
  // Detail Pemasangan Perangkat & Interface (Checklist Lapangan Point 3)
  deviceInstalled?: boolean; // Ada / Tidak Pemasangan Perangkat
  deviceType?: string; // Tipe/Model Perangkat (e.g., Huawei SmartAX MA5671A)
  serialNumber?: string; // Serial Number Perangkat (e.g., ZTEGCA82B391F0)
  interfaceType?: 'SFP 1G' | 'SFP 10G' | 'LAN RJ45' | string; // Tipe Interface Uplink/Handover
  // Galeri Matriks Pengujian POC (21 Item Browser Sesuai Referensi Lapangan)
  evidentPocGallery?: PocEvidenceItem[];
  closingStatement?: string; // Teks Penutup Resmi Lapangan
  // Personnels & Pihak Mengetahui (3 Pihak)
  technicianName: string;
  technicianPhone: string;
  picCustomerName: string;
  picCustomerPhone: string;
  salesName: string;
  approvedByName: string;
  ispSignerName: string;
  waspangSignerName: string;
  neSignerName: string;
  // Status & Notes
  status: RfsStatus;
  generalNotes?: string;
  // Riwayat Catatan & Log Pekerjaan Lapangan (Audit & Work History)
  workNotesHistory?: WorkNoteEntry[];
  // 3 Blok Tanda Tangan Digital Pihak Mengetahui (Base64 data URLs)
  signatureIsp?: string;
  signatureWaspang?: string;
  signatureNe?: string;
  signatureTechnician?: string;
  signatureCustomer?: string;
  // AI Catatan
  aiAnalysis?: AiAnalysisResult;
  // Metadata
  createdAt: string;
  createdBy: string;
  driveFolderUrl?: string;
  sheetRowIndex?: number;
}

export interface PoMaterialItem {
  id: string;
  namaMaterial: string;
  satuan: string;
  volume: number | string;
  keterangan: string;
}

export interface PoMaterialRequest {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  lokasiProyek: string;
  items: PoMaterialItem[];
  notes: string;
  creator1Name: string;
  creator1Position: string;
  creator2Name: string;
  creator2Position: string;
  approver1Name: string;
  approver1Position: string;
  approver2Name: string;
  approver2Position: string;
  signatureCreator1?: string;
  signatureCreator2?: string;
  signatureApprover1?: string;
  signatureApprover2?: string;
  status?: 'Diajukan' | 'Disetujui' | 'Diproses' | 'Selesai';
  createdAt: string;
  updatedAt?: string;
}
