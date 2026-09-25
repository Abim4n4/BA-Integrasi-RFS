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
  backboneMedia?: 'Wireless' | 'Fiber Optic' | 'FO';
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

// ==========================================
// LINK BUDGET & FIELD TESCOM SYSTEM TYPES
// ==========================================

export type SfpClass = 'Class B+' | 'Class C+' | 'Class C++' | 'Custom';
export type WavelengthNm = 1310 | 1490 | 1550;
export type SplitterRatio = 'None' | '1:2' | '1:4' | '1:8' | '1:16' | '1:32';
export type OpticalStatus = 'OPTIMAL' | 'PASS' | 'MARGINAL' | 'FAIL';

export interface OdpPortMeasurement {
  portNumber: number;
  measuredPowerDbm: number; // e.g. -19.8 dBm
  status: OpticalStatus;
  deltaFromTheory: number; // dBm deviation
  notes?: string;
}

export interface LinkBudgetRecord {
  id: string;
  projectCode: string; // e.g. LB-202609-001
  clusterName: string; // e.g. Paradise Serpong II
  oltName: string; // e.g. OLT-HUAWEI-MA5800-01
  oltFrameSlotPort: string; // e.g. 0/1/4
  odcName: string; // e.g. ODC-TNG-SETU-04
  odpName: string; // e.g. ODP-SETU-04/12
  technicianName: string;
  technicianPhone?: string;
  waspangName: string;
  waspangPhone?: string;
  measurementDate: string; // YYYY-MM-DD
  measurementTime?: string; // HH:mm
  
  // OLT Parameters
  sfpClass: SfpClass;
  txPowerDbm: number; // e.g. +3.0 to +7.0 dBm
  wavelength: WavelengthNm; // default 1490 nm
  
  // Segment 1: Feeder
  feederLengthKm: number; // e.g. 3.2 km
  fiberLossPerKm: number; // default 0.35 dB/km
  feederLossDb: number;
  
  // Optical Passive Components
  spliceCount: number; // e.g. 4
  spliceLossDbEach: number; // default 0.10 dB
  totalSpliceLossDb: number;
  
  connectorCount: number; // e.g. 4
  connectorLossDbEach: number; // default 0.30 dB
  totalConnectorLossDb: number;
  
  // Splitters
  splitter1Ratio: SplitterRatio; // e.g. 1:4 (7.25 dB)
  splitter1LossDb: number;
  
  // Segment 2: Distribution
  distributionLengthKm: number; // e.g. 0.85 km
  distributionLossDb: number;
  
  splitter2Ratio: SplitterRatio; // e.g. 1:8 (10.50 dB)
  splitter2LossDb: number;
  
  safetyMarginDb: number; // default 2.0 dB
  
  // Calculated Theoretical Values
  totalLossTheoryDb: number; // Sum of all losses
  expectedPowerOdcDbm: number; // Expected at ODC output
  expectedPowerOdpDbm: number; // Expected at ODP output
  
  // TesCom Field Measurement
  measuredOdcPowerDbm?: number; // e.g. -11.5 dBm
  odpCapacityPorts: 8 | 16 | 24;
  portsMeasurement: OdpPortMeasurement[];
  averageMeasuredOdpDbm: number;
  overallStatus: OpticalStatus;
  
  // Evidence photos (Base64)
  evidenceOpmPhoto?: string;
  evidenceOdpPhoto?: string;
  
  // Digital Signatures (Base64)
  signatureTechnician?: string;
  signatureWaspang?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

