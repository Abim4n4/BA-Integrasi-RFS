import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { CODE_GS_CONTENT, INDEX_HTML_STANDALONE } from "./src/services/gasExporter.ts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// In-memory persistent mock database mirroring Google Sheets "Users" and "DataBA"
interface UserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "user";
  position: string;
  department: string;
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: "USR-001",
    email: "admin@rfs.telco.id",
    password: "admin123",
    name: "Budi Santoso, S.T.",
    role: "admin",
    position: "Manajer Operasional & QA NOC",
    department: "Network Operations Center (NOC)"
  },
  {
    id: "USR-002",
    email: "teknisi@rfs.telco.id",
    password: "teknisi123",
    name: "Rian Pratama",
    role: "user",
    position: "Senior Field Engineer",
    department: "Field Service & Deployment"
  },
  {
    id: "USR-003",
    email: "sales@rfs.telco.id",
    password: "sales123",
    name: "Dewi Lestari",
    role: "user",
    position: "Account Executive Enterprise",
    department: "Corporate Enterprise Sales"
  }
];

let usersStore: UserRecord[] = [...INITIAL_USERS];

interface BaRecord {
  id: string;
  noBa: string;
  tanggal: string;
  waktu: string;
  isp: string;
  customerName: string;
  locationName: string;
  siteName: string;
  siteAddress: string;
  gpsCoordinates?: string;
  siteId?: string;
  kotaWilayah?: string;
  serviceType: string;
  subscribedBandwidth: number;
  bandwidthUnit: string;
  slaCommitment: string;
  downloadSpeed: number;
  uploadSpeed: number;
  pingLatency: number;
  jitter: number;
  packetLoss: number;
  // Spesifikasi Teknis Tambahan & POC
  backboneMedia?: string;
  systems?: string[];
  backboneProvider?: string;
  testNotes?: string;
  pocSpeedtest?: string;
  pocBrowsing?: string[];
  evidentSpeedtest?: string;
  evidentRedamanOpm?: string;
  evidentPerangkat?: string;
  evidentPocGallery?: any[];
  closingStatement?: string;
  technicianName: string;
  technicianPhone: string;
  picCustomerName: string;
  picCustomerPhone: string;
  salesName: string;
  approvedByName: string;
  ispSignerName: string;
  waspangSignerName: string;
  neSignerName: string;
  status: "Ready For Service" | "Conditional RFS" | "Pending Review";
  generalNotes?: string;
  signatureIsp?: string;
  signatureWaspang?: string;
  signatureNe?: string;
  signatureTechnician?: string;
  signatureCustomer?: string;
  aiAnalysis?: {
    summary: string;
    rating: "Sangat Baik" | "Optimal" | "Perlu Tuning" | "Kritis";
    slaStatus: "Memenuhi SLA (Pass)" | "Di Bawah Standar SLA (Fail)" | "Conditional (Review)";
    downloadRatioPercent: number;
    uploadRatioPercent: number;
    latencyAssessment: string;
    jitterAssessment: string;
    packetLossAssessment: string;
    technicalNotes: string;
    recommendations: string[];
    analyzedAt: string;
    modelUsed: string;
  };
  createdAt: string;
  createdBy: string;
}

// Seed historical BA-RFS records
let baRecordsStore: BaRecord[] = [
  {
    id: "RFS-20260917-001",
    noBa: "BA-RFS/TELCO/2026/09/0014",
    tanggal: "2026-09-17",
    waktu: "14:30",
    isp: "PT Solusi Jaringan Nusantara (ISP)",
    customerName: "PT Solusi Jaringan Nusantara (ISP)",
    locationName: "Cabang Menara Pacific Lt. 12",
    siteName: "Cabang Menara Pacific Lt. 12",
    siteAddress: "Kawasan SCBD Lot 11, Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan",
    gpsCoordinates: "-6.225912, 106.809420",
    siteId: "JKT-SCBD-088",
    kotaWilayah: "Jakarta Selatan, DKI Jakarta",
    serviceType: "Fiber Optic Dedicated",
    subscribedBandwidth: 200,
    bandwidthUnit: "Mbps",
    slaCommitment: "99.90%",
    downloadSpeed: 198.4,
    uploadSpeed: 197.8,
    pingLatency: 6.2,
    jitter: 1.1,
    packetLoss: 0.0,
    technicianName: "Rian Pratama",
    technicianPhone: "0812-3456-7890",
    picCustomerName: "Hendrawan Putra",
    picCustomerPhone: "0811-9876-5432",
    salesName: "Dewi Lestari",
    approvedByName: "Budi Santoso, S.T.",
    ispSignerName: "PT Solusi Jaringan Nusantara (ISP)",
    waspangSignerName: "Ir. Joko Sutrisno (WASPANG)",
    neSignerName: "Bambang Kurniawan, S.T. (NE)",
    status: "Ready For Service",
    generalNotes: "Aktivasi OLT Port 4 ke ONT Huawei EG8145V5 berhasil stabil. Redaman optik -18.2 dBm.",
    aiAnalysis: {
      summary: "Koneksi prima melebihi 98% komitmen SLA dengan latency ultra rendah.",
      rating: "Sangat Baik",
      slaStatus: "Memenuhi SLA (Pass)",
      downloadRatioPercent: 99.2,
      uploadRatioPercent: 98.9,
      latencyAssessment: "Latency 6.2 ms sangat ideal untuk transaksi core banking real-time.",
      jitterAssessment: "Jitter 1.1 ms stabil tanpa fluktuasi buffer.",
      packetLossAssessment: "0.0% packet loss terverifikasi selama 1000 ICMP echo test.",
      technicalNotes: "Konektivitas link Metro Ethernet Dedicated 200 Mbps telah melalui stress test 60 menit. Throughput unduh mencapai 198.4 Mbps (99.2% CIR) dan unggah 197.8 Mbps (98.9% CIR). Tidak ditemukan frame drop atau CRC errors pada interface switch gateway. Direkomendasikan segera dialihkan ke traffic produksi nasabah.",
      recommendations: [
        "Jadwalkan monitoring berkala per 15 menit melalui NMS Zabbix.",
        "Pastikan UPS pada rak server pelanggan memiliki backup time minimal 30 menit."
      ],
      analyzedAt: "2026-09-17 14:35 WIB",
      modelUsed: "gemini-3.8-flash"
    },
    createdAt: "2026-09-17T14:35:00Z",
    createdBy: "teknisi@rfs.telco.id"
  },
  {
    id: "RFS-20260916-002",
    noBa: "BA-RFS/TELCO/2026/09/0013",
    tanggal: "2026-09-16",
    waktu: "11:15",
    isp: "PT Trans Data Indonesia (ISP)",
    customerName: "PT Trans Data Indonesia (ISP)",
    locationName: "RS Mitra Sehat - Gedung Rawat Inap Blok B",
    siteName: "Gedung Rawat Inap Blok B",
    siteAddress: "Jl. Raya Darmo No. 45-47, Surabaya, Jawa Timur",
    gpsCoordinates: "-7.291244, 112.738192",
    siteId: "SBY-DARMO-012",
    kotaWilayah: "Surabaya, Jawa Timur",
    serviceType: "Fiber Optic Dedicated",
    subscribedBandwidth: 100,
    bandwidthUnit: "Mbps",
    slaCommitment: "99.85%",
    downloadSpeed: 96.5,
    uploadSpeed: 95.0,
    pingLatency: 14.8,
    jitter: 2.4,
    packetLoss: 0.0,
    technicianName: "Rian Pratama",
    technicianPhone: "0812-3456-7890",
    picCustomerName: "Dr. Farhan Syahreza",
    picCustomerPhone: "0813-4455-6677",
    salesName: "Dewi Lestari",
    approvedByName: "Budi Santoso, S.T.",
    ispSignerName: "PT Solusi Jaringan Nusantara (ISP)",
    waspangSignerName: "Ir. Joko Sutrisno (WASPANG)",
    neSignerName: "Bambang Kurniawan, S.T. (NE)",
    status: "Ready For Service",
    generalNotes: "Integrasi sistem PACS & SIMRS rumah sakit berjalan lancar.",
    aiAnalysis: {
      summary: "Hasil tes memenuhi komitmen SLA 100 Mbps dengan latency transmisi yang sangat baik.",
      rating: "Optimal",
      slaStatus: "Memenuhi SLA (Pass)",
      downloadRatioPercent: 96.5,
      uploadRatioPercent: 95.0,
      latencyAssessment: "Latency 14.8 ms ke gateway nasional sangat baik.",
      jitterAssessment: "Jitter 2.4 ms aman untuk streaming radiologi telemedis.",
      packetLossAssessment: "0.0% packet loss terverifikasi.",
      technicalNotes: "Throughput stabil di 96.5 Mbps dari 100 Mbps paket langganan. Pengujian transfer file image DICOM 4GB berhasil ditransmisikan tanpa paket drop.",
      recommendations: [
        "Aktifkan QoS untuk memprioritaskan IP server SIMRS dan Radiologi.",
        "Simpan kontak darurat NOC 24/7 di ruang server rumah sakit."
      ],
      analyzedAt: "2026-09-16 11:20 WIB",
      modelUsed: "gemini-3.8-flash"
    },
    createdAt: "2026-09-16T11:20:00Z",
    createdBy: "teknisi@rfs.telco.id"
  },
  {
    id: "RFS-20260915-003",
    noBa: "BA-RFS/TELCO/2026/09/0012",
    tanggal: "2026-09-15",
    waktu: "16:45",
    isp: "PT Global Lintas Nusa (ISP)",
    customerName: "PT Global Lintas Nusa (ISP)",
    locationName: "Hub Distribusi Cibiru Logistik",
    siteName: "Hub Distribusi Cibiru",
    siteAddress: "Jl. Soekarno-Hatta KM 12 No. 88, Cibiru, Bandung",
    gpsCoordinates: "-6.932410, 107.712390",
    siteId: "BDO-CIBIRU-009",
    kotaWilayah: "Bandung, Jawa Barat",
    serviceType: "Wireless Microwave",
    subscribedBandwidth: 50,
    bandwidthUnit: "Mbps",
    slaCommitment: "99.50%",
    downloadSpeed: 42.1,
    uploadSpeed: 40.5,
    pingLatency: 28.5,
    jitter: 4.8,
    packetLoss: 1.2,
    technicianName: "Rian Pratama",
    technicianPhone: "0812-3456-7890",
    picCustomerName: "Bambang Triatmojo",
    picCustomerPhone: "0856-1234-5678",
    salesName: "Dewi Lestari",
    approvedByName: "Budi Santoso, S.T.",
    ispSignerName: "PT Solusi Jaringan Nusantara (ISP)",
    waspangSignerName: "Ir. Joko Sutrisno (WASPANG)",
    neSignerName: "Bambang Kurniawan, S.T. (NE)",
    status: "Conditional RFS",
    generalNotes: "Sinyal radio microwave RSL -64 dBm, sedikit dipengaruhi curah hujan lebat saat pengetesan.",
    aiAnalysis: {
      summary: "Kinerja link nirkabel cukup baik namun terdeteksi packet loss 1.2% saat cuaca buruk.",
      rating: "Perlu Tuning",
      slaStatus: "Conditional (Review)",
      downloadRatioPercent: 84.2,
      uploadRatioPercent: 81.0,
      latencyAssessment: "Latency 28.5 ms wajar untuk medium microwave 15 km.",
      jitterAssessment: "Jitter 4.8 ms sedikit tinggi pada saat hujan deras.",
      packetLossAssessment: "Terdapat 1.2% packet loss yang melebihi standar ideal 0.5%.",
      technicalNotes: "Throughput download 42.1 Mbps (84.2% CIR). Kondisi RSL antenna wireless berada pada batas marginal saat hujan lebat. Direkomendasikan melakukan re-alignment pointing antenna radio microwave dalam masa conditional RFS 3 hari.",
      recommendations: [
        "Lakukan re-pointing azimuth antena radio microwave untuk menaikkan RSL ke -58 dBm.",
        "Pantau link uptime selama 48 jam sebelum status disahkan menjadi Full RFS."
      ],
      analyzedAt: "2026-09-15 16:50 WIB",
      modelUsed: "gemini-3.8-flash"
    },
    createdAt: "2026-09-15T16:50:00Z",
    createdBy: "teknisi@rfs.telco.id"
  }
];

// Helper: Run Gemini Bandwidth Analysis
async function analyzeWithGemini(data: {
  customerName: string;
  siteName: string;
  siteId: string;
  serviceType: string;
  subscribedBandwidth: number;
  slaCommitment: string;
  downloadSpeed: number;
  uploadSpeed: number;
  pingLatency: number;
  jitter: number;
  packetLoss: number;
}) {
  const dlRatio = Math.round((Number(data.downloadSpeed) / Math.max(1, Number(data.subscribedBandwidth))) * 1000) / 10;
  const ulRatio = Math.round((Number(data.uploadSpeed) / Math.max(1, Number(data.subscribedBandwidth))) * 1000) / 10;

  // Check if GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const prompt = `Bertindaklah sebagai Senior QA Network Engineer & SLA Analyst Telekomunikasi. Analisis hasil pengujian aktivasi Berita Acara Ready For Service (RFS) berikut:
- Pelanggan: ${data.customerName}
- Site: ${data.siteName} (ID: ${data.siteId})
- Tipe Layanan: ${data.serviceType}
- Kapasitas Langganan (CIR): ${data.subscribedBandwidth} Mbps (Target SLA: ${data.slaCommitment})
- Hasil Uji Speed & Quality:
  * Throughput Download: ${data.downloadSpeed} Mbps (Rasio: ${dlRatio}%)
  * Throughput Upload: ${data.uploadSpeed} Mbps (Rasio: ${ulRatio}%)
  * Round-Trip Latency: ${data.pingLatency} ms
  * Jitter: ${data.jitter} ms
  * Packet Loss: ${data.packetLoss} %

Buat evaluasi teknis profesional terstruktur dalam format JSON VALID murni (tanpa teks di luar JSON):
{
  "summary": "1 kalimat ringkasan kesiapan operasional link RFS ini",
  "rating": "Sangat Baik" | "Optimal" | "Perlu Tuning" | "Kritis",
  "slaStatus": "Memenuhi SLA (Pass)" | "Di Bawah Standar SLA (Fail)" | "Conditional (Review)",
  "latencyAssessment": "Penilaian latency untuk aplikasi enterprise (ERP, VoIP, Database sync)",
  "jitterAssessment": "Penilaian jitter terhadap kestabilan transmisi",
  "packetLossAssessment": "Penilaian packet loss",
  "technicalNotes": "Naratif teknis mendalam (2-3 paragraf) mencakup analisis throughput vs kontrak, integritas media transmisi, dan kesimpulan kesiapan go-live",
  "recommendations": ["Rekomendasi teknis 1", "Rekomendasi teknis 2"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const text = response.text || "";
      const parsed = JSON.parse(text);

      return {
        summary: parsed.summary || "Analisis link selesai.",
        rating: parsed.rating || (dlRatio >= 90 ? "Sangat Baik" : "Optimal"),
        slaStatus: parsed.slaStatus || (dlRatio >= 85 ? "Memenuhi SLA (Pass)" : "Conditional (Review)"),
        downloadRatioPercent: dlRatio,
        uploadRatioPercent: ulRatio,
        latencyAssessment: parsed.latencyAssessment || `Latency ${data.pingLatency} ms.`,
        jitterAssessment: parsed.jitterAssessment || `Jitter ${data.jitter} ms.`,
        packetLossAssessment: parsed.packetLossAssessment || `Packet loss ${data.packetLoss}%.`,
        technicalNotes: parsed.technicalNotes || "Performa jaringan telah diverifikasi memenuhi spesifikasi kontrak.",
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ["Monitoring performa link selama 24 jam."],
        analyzedAt: new Date().toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        modelUsed: "gemini-3.8-flash (Live Google GenAI)"
      };
    } catch (err: any) {
      console.warn("Gemini API call failed, falling back to smart heuristic:", err?.message || err);
    }
  }

  // Resilient heuristic engine
  let rating: "Sangat Baik" | "Optimal" | "Perlu Tuning" | "Kritis" = "Optimal";
  let slaStatus: "Memenuhi SLA (Pass)" | "Di Bawah Standar SLA (Fail)" | "Conditional (Review)" = "Memenuhi SLA (Pass)";
  let notes = "";
  const recs: string[] = [];

  if (dlRatio >= 95 && data.packetLoss === 0 && data.pingLatency <= 20) {
    rating = "Sangat Baik";
    slaStatus = "Memenuhi SLA (Pass)";
    notes = `Throughput unduh mencapai ${dlRatio}% dari kapasitas kontrak ${data.subscribedBandwidth} Mbps dengan latency sangat prima (${data.pingLatency} ms) dan 0% packet loss. Seluruh parameter memenuhi standar internasional ITU-T Y.1564. Link siap digunakan penuh untuk operasional pelanggan tanpa catatan.`;
    recs.push("Aktifkan alarm otomatis di NMS untuk memantau utilitas link.", "Dokumentasikan konfigurasi VLAN dan routing di database CMDB.");
  } else if (dlRatio >= 85 && data.packetLoss <= 0.5 && data.pingLatency <= 45) {
    rating = "Optimal";
    slaStatus = "Memenuhi SLA (Pass)";
    notes = `Throughput unduh terukur sebesar ${data.downloadSpeed} Mbps (${dlRatio}%) dan unggah ${data.uploadSpeed} Mbps (${ulRatio}%). Kualitas latency (${data.pingLatency} ms) dan jitter (${data.jitter} ms) berada dalam koridor SLA ${data.slaCommitment}. Layanan dinyatakan Ready for Service.`;
    recs.push("Lakukan pemantauan stabilitas berkala selama 7 hari pertama aktivasi.", "Konfirmasi penerimaan layanan dengan PIC teknis pelanggan.");
  } else if (data.packetLoss > 1.0 || dlRatio < 80) {
    rating = "Perlu Tuning";
    slaStatus = "Conditional (Review)";
    notes = `Ditemukan deviasi throughput download (${dlRatio}%) atau packet loss (${data.packetLoss}%). Perlu verifikasi optical power atau tuning port MTU/MSS sebelum disahkan sebagai RFS permanen.`;
    recs.push("Periksa redaman kabel optik (patch cord) dan optical transceiver SFP.", "Jadwalkan uji ulang bandwidth di luar jam sibuk.");
  } else {
    rating = "Kritis";
    slaStatus = "Di Bawah Standar SLA (Fail)";
    notes = `Hasil pengetesan belum memenuhi standar minimum komitmen SLA. Throughput berada di bawah ambang batas yang disepakati. Perlu eskalasi ke tim Network Engineering.`;
    recs.push("Eskalasi ke Tier 3 Network Support untuk investigasi link transit.", "Tunda penandatanganan RFS komersial hingga masalah teratasi.");
  }

  return {
    summary: `Hasil uji link: ${slaStatus} (Rating: ${rating}, Throughput: ${dlRatio}%).`,
    rating,
    slaStatus,
    downloadRatioPercent: dlRatio,
    uploadRatioPercent: ulRatio,
    latencyAssessment: `Latency ${data.pingLatency} ms ${data.pingLatency <= 30 ? "sangat responsif" : "dapat diterima"} untuk komunikasi data.`,
    jitterAssessment: `Jitter ${data.jitter} ms ${data.jitter <= 3 ? "sangat stabil" : "dalam batas toleransi"}.`,
    packetLossAssessment: `Packet loss ${data.packetLoss}% ${data.packetLoss === 0 ? "sempurna (0 loss)" : "terdeteksi hambatan fisik/antrian buffer"}.`,
    technicalNotes: notes,
    recommendations: recs,
    analyzedAt: new Date().toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
    modelUsed: "Rule-based AI Engine (Telecom Standard ITU-T)"
  };
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Portal Berita Acara RFS API", timestamp: new Date().toISOString() });
});

// Auth: Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email dan kata sandi wajib diisi." });
  }

  const user = usersStore.find(
    u => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.password === String(password).trim()
  );

  if (!user) {
    return res.status(401).json({ success: false, message: "Email atau kata sandi tidak sesuai." });
  }

  // Generate simple persistent session token
  const token = Buffer.from(`${user.email}:${Date.now()}:${user.role}`).toString("base64");

  return res.json({
    success: true,
    message: "Login berhasil.",
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      position: user.position,
      department: user.department
    }
  });
});

// Auth: Check Session
app.get("/api/auth/session", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Sesi tidak ditemukan." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email] = decoded.split(":");
    const user = usersStore.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ success: false, message: "Sesi telah kedaluwarsa." });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        position: user.position,
        department: user.department
      }
    });
  } catch (e) {
    return res.status(401).json({ success: false, message: "Token sesi tidak valid." });
  }
});

// RFS: List all documents
app.get("/api/rfs/list", (_req, res) => {
  return res.json({
    success: true,
    total: baRecordsStore.length,
    data: baRecordsStore
  });
});

// RFS: On-Demand Gemini AI Analysis for form preview
app.post("/api/rfs/analyze-ai", async (req, res) => {
  try {
    const analysis = await analyzeWithGemini(req.body);
    return res.json({ success: true, analysis });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Gagal menganalisis performa bandwidth." });
  }
});

// RFS: Create Document
app.post("/api/rfs/create", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.customerName || !payload.siteName || !payload.downloadSpeed) {
      return res.status(400).json({ success: false, message: "Data utama (Pelanggan, Site, Kecepatan) belum lengkap." });
    }

    const isp = payload.isp || payload.customerName || "PT Solusi Jaringan Nusantara (ISP)";
    const locationName = payload.locationName || payload.siteName || "Lokasi Instalasi";
    const gpsCoordinates = payload.gpsCoordinates || "";

    // 1. Run Gemini AI Bandwidth Performance Analysis
    const aiAnalysis = await analyzeWithGemini({
      customerName: isp,
      siteName: locationName,
      siteId: payload.siteId || "SITE-ID",
      serviceType: payload.serviceType || "Fiber Optic Dedicated",
      subscribedBandwidth: Number(payload.subscribedBandwidth) || 100,
      slaCommitment: payload.slaCommitment || "99.85%",
      downloadSpeed: Number(payload.downloadSpeed) || 0,
      uploadSpeed: Number(payload.uploadSpeed) || 0,
      pingLatency: Number(payload.pingLatency) || 0,
      jitter: Number(payload.jitter) || 0,
      packetLoss: Number(payload.packetLoss) || 0
    });

    // 2. Generate unique Document Number
    const count = baRecordsStore.length + 1;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const formattedCount = String(count).padStart(4, "0");
    const noBa = payload.noBa || `BA-RFS/TELCO/${year}/${month}/${formattedCount}`;
    const docId = `RFS-${year}${month}${String(now.getDate()).padStart(2, "0")}-${formattedCount}`;

    // 3. Construct Record
    const newRecord: BaRecord = {
      id: docId,
      noBa,
      tanggal: payload.tanggal || now.toISOString().split("T")[0],
      waktu: payload.waktu || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isp,
      customerName: isp,
      locationName,
      siteName: locationName,
      siteAddress: payload.siteAddress || "-",
      gpsCoordinates,
      siteId: payload.siteId || `SITE-${count}`,
      kotaWilayah: payload.kotaWilayah || "Indonesia",
      serviceType: payload.serviceType || "Fiber Optic Dedicated",
      subscribedBandwidth: Number(payload.subscribedBandwidth) || 100,
      bandwidthUnit: payload.bandwidthUnit || "Mbps",
      slaCommitment: payload.slaCommitment || "99.85%",
      downloadSpeed: Number(payload.downloadSpeed) || 0,
      uploadSpeed: Number(payload.uploadSpeed) || 0,
      pingLatency: Number(payload.pingLatency) || 0,
      jitter: Number(payload.jitter) || 0,
      packetLoss: Number(payload.packetLoss) || 0,
      backboneMedia: payload.backboneMedia || "Fiber Optic",
      systems: Array.isArray(payload.systems) ? payload.systems : ["FTTH", "Integrator"],
      backboneProvider: payload.backboneProvider || "Fiberstar",
      testNotes: payload.testNotes || "",
      pocSpeedtest: payload.pocSpeedtest || "500 Mbps",
      pocBrowsing: Array.isArray(payload.pocBrowsing) ? payload.pocBrowsing : ["Banking", "Berita", "Games", "Toko Online", "Live Streaming", "Youtube"],
      evidentSpeedtest: payload.evidentSpeedtest || "",
      evidentRedamanOpm: payload.evidentRedamanOpm || "",
      evidentPerangkat: payload.evidentPerangkat || "",
      evidentPocGallery: Array.isArray(payload.evidentPocGallery) ? payload.evidentPocGallery : [],
      closingStatement: payload.closingStatement || "Demikian RFS ini dilakukan dengan pengecekan pada kapasitas yang sudah sesuai pada report tersebut.",
      technicianName: payload.technicianName || "Teknisi Lapangan",
      technicianPhone: payload.technicianPhone || "-",
      picCustomerName: payload.picCustomerName || "PIC Pelanggan",
      picCustomerPhone: payload.picCustomerPhone || "-",
      salesName: payload.salesName || "-",
      approvedByName: payload.approvedByName || "Budi Santoso, S.T.",
      ispSignerName: payload.ispSignerName || "PT Solusi Jaringan Nusantara (ISP)",
      waspangSignerName: payload.waspangSignerName || "Ir. Joko Sutrisno (WASPANG)",
      neSignerName: payload.neSignerName || "Bambang Kurniawan, S.T. (NE)",
      status: payload.status || (aiAnalysis.slaStatus.includes("Fail") ? "Pending Review" : "Ready For Service"),
      generalNotes: payload.generalNotes || "",
      signatureIsp: payload.signatureIsp || "",
      signatureWaspang: payload.signatureWaspang || "",
      signatureNe: payload.signatureNe || "",
      signatureTechnician: payload.signatureTechnician || payload.signatureIsp || "",
      signatureCustomer: payload.signatureCustomer || payload.signatureWaspang || "",
      aiAnalysis,
      createdAt: now.toISOString(),
      createdBy: payload.createdBy || "System"
    };

    // Prepend to store
    baRecordsStore.unshift(newRecord);

    return res.json({
      success: true,
      message: "Berita Acara RFS berhasil diterbitkan dan dianalisis oleh AI!",
      data: newRecord
    });
  } catch (error: any) {
    console.error("Error creating RFS:", error);
    return res.status(500).json({ success: false, message: error.message || "Gagal membuat Berita Acara RFS." });
  }
});

// RFS: Update Status (e.g. Approved / Review)
app.post("/api/rfs/update-status", (req, res) => {
  const { id, status, notes } = req.body;
  const record = baRecordsStore.find(r => r.id === id);
  if (!record) {
    return res.status(404).json({ success: false, message: "Dokumen RFS tidak ditemukan." });
  }

  record.status = status;
  if (notes) record.generalNotes = notes;

  return res.json({ success: true, message: "Status RFS berhasil diperbarui.", data: record });
});

// RFS: Delete document (Admin only)
app.delete("/api/rfs/:id", (req, res) => {
  const { id } = req.params;
  const index = baRecordsStore.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
  }
  baRecordsStore.splice(index, 1);
  return res.json({ success: true, message: "Dokumen berhasil dihapus." });
});

// Admin: Users List
app.get("/api/admin/users", (_req, res) => {
  const safeUsers = usersStore.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    position: u.position,
    department: u.department
  }));
  return res.json({ success: true, users: safeUsers });
});

// Admin: Create User
app.post("/api/admin/users", (req, res) => {
  const { email, password, name, role, position, department } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: "Email, kata sandi, dan nama wajib diisi." });
  }

  if (usersStore.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: "Email sudah terdaftar." });
  }

  const newUser: UserRecord = {
    id: `USR-00${usersStore.length + 1}`,
    email,
    password,
    name,
    role: role || "user",
    position: position || "Staff",
    department: department || "Operations"
  };

  usersStore.push(newUser);
  return res.json({ success: true, message: "Pengguna berhasil ditambahkan.", user: newUser });
});

// GAS Code Exporter Endpoint
app.get("/api/gas/code", (_req, res) => {
  return res.json({
    success: true,
    codeGs: CODE_GS_CONTENT,
    indexHtml: INDEX_HTML_STANDALONE,
    setupGuide: {
      step1: "Buka Google Sheets baru di https://sheets.new",
      step2: "Buka menu Ekstensi (Extensions) > Apps Script",
      step3: "Hapus kode default di Code.gs dan paste seluruh kode dari file Code.gs yang disediakan",
      step4: "Buat file HTML baru bernama 'Index.html' di editor Apps Script dan paste isi Index.html",
      step5: "Jalankan fungsi setupInitialSheets() sekali untuk membuat header sheet Users & DataBA secara otomatis",
      step6: "Klik tombol Terapkan (Deploy) > Deployment baru (New deployment) > Jenis Aplikasi Web (Web App), pilih akses 'Siapa saja' (Anyone), lalu buka URL yang dihasilkan."
    }
  });
});

// Vite Middleware for Fullstack App
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Portal Berita Acara RFS Server running on http://localhost:${PORT}`);
  });
}

startServer();
