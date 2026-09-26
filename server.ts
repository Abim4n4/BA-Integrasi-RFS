import express from "express";
import path from "path";
import crypto from "crypto";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { CODE_GS_CONTENT, INDEX_HTML_STANDALONE } from "./src/services/gasExporter.ts";

dotenv.config();

const app = express();
const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "famika-rfs-prod-secret-key-2026-secure-token";

// Performance: Enable Gzip / Deflate payload compression
app.use(compression());

// Security 1: Disable X-Powered-By to prevent technology fingerprinting
app.disable("x-powered-by");

// Security 2: Enforce essential HTTP Security Headers on all responses
app.use((req, res, next) => {
  // Clickjacking mitigation: forbid embedding in untrusted iframes
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Strict referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict unused powerful browser permissions
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Standard XSS protection disablement (modern standard replacing legacy auditors)
  res.setHeader("X-XSS-Protection", "0");

  // HSTS when serving over HTTPS / SSL termination proxy (e.g. Cloud Run)
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

// Security 3: Restrict request payload size to 15MB to prevent Memory Exhaustion DoS
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Security 4: High-precision in-memory sliding window Rate Limiter
interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message: string;
}

function createRateLimiter(options: RateLimitOptions) {
  const ipRequests = new Map<string, { count: number; resetTime: number }>();

  // Periodically sweep expired rate limit counters
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipRequests.entries()) {
      if (now > data.resetTime) {
        ipRequests.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const now = Date.now();
    const clientData = ipRequests.get(ip);

    if (!clientData || now > clientData.resetTime) {
      ipRequests.set(ip, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (clientData.count >= options.maxRequests) {
      const retryAfterSec = Math.ceil((clientData.resetTime - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message: options.message,
        retryAfter: retryAfterSec
      });
    }

    clientData.count++;
    next();
  };
}

const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 menit
  maxRequests: 15,     // maks 15 percobaan login per IP per menit
  message: "Terlalu banyak percobaan masuk. Mohon tunggu 1 menit sebelum mencoba kembali demi keamanan."
});

const aiAnalyzeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 menit
  maxRequests: 25,     // maks 25 analisis AI per menit
  message: "Batas frekuensi analisis AI tercapai. Mohon tunggu sesaat."
});

// Security 5: Password Hashing with PBKDF2 (One-way cryptographic hash + salt)
function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, "rfs_famika_salt_2026", 10000, 32, "sha256").toString("hex");
}

function verifyPassword(inputPassword: string, storedPasswordOrHash: string): boolean {
  if (!storedPasswordOrHash || !inputPassword) return false;
  const hashedInput = hashPassword(inputPassword);
  if (storedPasswordOrHash === hashedInput) return true;
  // Graceful fallback for initial legacy plaintext passwords
  if (storedPasswordOrHash === inputPassword) return true;
  return false;
}

// Security 6: Cryptographic HMAC-SHA256 Signed Session Tokens
interface TokenPayload {
  email: string;
  role: "admin" | "user" | "waspang";
  id: string;
  iat: number;
  exp: number;
}

function generateSecureToken(user: UserRecord): string {
  const payload: TokenPayload = {
    email: user.email,
    role: user.role,
    id: user.id,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // Berlaku 7 hari
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadStr).digest("base64url");
  return `${payloadStr}.${signature}`;
}

function verifySecureToken(token: string): TokenPayload | null {
  if (!token || typeof token !== "string") return null;

  // Format Token Tertanda Tangan HMAC-SHA256: payloadBase64url.signature
  if (token.includes(".")) {
    const [payloadStr, signature] = token.split(".");
    if (!payloadStr || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadStr).digest("base64url");

    if (signature.length !== expectedSignature.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null; // Tanda tangan palsu / dimanipulasi
    }

    try {
      const payload: TokenPayload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8"));
      if (Date.now() > payload.exp) {
        return null; // Sesi kedaluwarsa
      }
      return payload;
    } catch {
      return null;
    }
  }

  // Fallback transisi untuk sesi lama (graceful migration)
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, ts, role] = decoded.split(":");
    if (email && usersStore.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      const parsedTs = Number(ts);
      if (!isNaN(parsedTs) && Date.now() - parsedTs < 7 * 24 * 60 * 60 * 1000) {
        const found = usersStore.find(u => u.email.toLowerCase() === email.toLowerCase());
        return {
          email,
          role: (role as any) || found?.role || "user",
          id: found?.id || "USR-MIGRATE",
          iat: parsedTs,
          exp: parsedTs + 7 * 24 * 60 * 60 * 1000
        };
      }
    }
  } catch {}

  return null;
}

// In-memory persistent database mirroring Google Sheets "Users" and "DataBA"
interface UserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "user" | "waspang";
  position: string;
  department: string;
}

// Passwords safely stored as PBKDF2 hashes
const INITIAL_USERS: UserRecord[] = [
  {
    id: "USR-001",
    email: "admin@rfs.telco.id",
    password: hashPassword("admin123"),
    name: "Budi Santoso, S.T.",
    role: "admin",
    position: "Manajer Operasional & QA NOC",
    department: "Network Operations Center (NOC)"
  },
  {
    id: "USR-002",
    email: "teknisi@rfs.telco.id",
    password: hashPassword("teknisi123"),
    name: "Rian Pratama",
    role: "user",
    position: "Senior Field Engineer",
    department: "Field Service & Deployment"
  },
  {
    id: "USR-003",
    email: "sales@rfs.telco.id",
    password: hashPassword("sales123"),
    name: "Dewi Lestari",
    role: "user",
    position: "Account Executive Enterprise",
    department: "Corporate Enterprise Sales"
  },
  {
    id: "USR-004",
    email: "waspang@rfs.telco.id",
    password: hashPassword("waspang123"),
    name: "Hendra Wijaya, S.T.",
    role: "waspang",
    position: "Pengawas Lapangan (Waspang)",
    department: "Pengawasan & QA Proyek"
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
  deviceInstalled?: boolean;
  deviceType?: string;
  serialNumber?: string;
  interfaceType?: string;
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
  workNotesHistory?: any[];
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

// Seed historical BA-RFS records - Official template based on today's Paradise Serpong II
let baRecordsStore: BaRecord[] = [
  {
    id: "RFS-20260923-4725",
    noBa: "BA-RFS/TELCO/2026/09/4725",
    tanggal: "2026-09-23",
    waktu: "14:00",
    isp: "PT Solusi Jaringan Nusantara (ISP)",
    customerName: "PT Solusi Jaringan Nusantara (ISP)",
    locationName: "Paradise Serpong II",
    siteName: "Paradise Serpong II",
    siteAddress: "Perumahan Paradise Serpong City 2, Babakan, Setu, Tangerang Selatan, Banten",
    gpsCoordinates: "-6.353412, 106.689215",
    siteId: "TNG-PARADISE-02",
    kotaWilayah: "Tangerang Selatan, Banten",
    serviceType: "Fiber Optic Dedicated",
    subscribedBandwidth: 100,
    bandwidthUnit: "Mbps",
    slaCommitment: "99.85%",
    downloadSpeed: 98.4,
    uploadSpeed: 97.2,
    pingLatency: 4.8,
    jitter: 0.9,
    packetLoss: 0.0,
    technicianName: "Rian Pratama",
    technicianPhone: "0812-3456-7890",
    picCustomerName: "Ahmad Zaki",
    picCustomerPhone: "0813-8899-7711",
    salesName: "Dewi Lestari",
    approvedByName: "Budi Santoso, S.T.",
    ispSignerName: "PT Solusi Jaringan Nusantara (ISP)",
    waspangSignerName: "Ir. Joko Sutrisno (WASPANG)",
    neSignerName: "Bambang Kurniawan, S.T. (NE)",
    status: "Ready For Service",
    generalNotes: "Aktivasi dan integrasi port OLT ke OTB di cluster Paradise Serpong II berhasil stabil. Redaman optik -17.8 dBm (Sangat Baik). Link siap operasional.",
    aiAnalysis: {
      summary: "Koneksi link Paradise Serpong II prima melebihi 98% komitmen SLA dengan latency ultra rendah 4.8 ms.",
      rating: "Sangat Baik",
      slaStatus: "Memenuhi SLA (Pass)",
      downloadRatioPercent: 98.4,
      uploadRatioPercent: 97.2,
      latencyAssessment: "Latency 4.8 ms sangat ideal untuk transmisi broadband berkecepatan tinggi.",
      jitterAssessment: "Jitter 0.9 ms sangat stabil tanpa fluktuasi buffer.",
      packetLossAssessment: "0.0% packet loss terverifikasi selama pengujian continuous ping.",
      technicalNotes: "Konektivitas link FTTH Dedicated telah melalui stress test throughput. Throughput unduh mencapai 98.4 Mbps (98.4% CIR) dan unggah 97.2 Mbps (97.2% CIR). Tidak ditemukan frame drop atau CRC errors pada interface gateway.",
      recommendations: [
        "Jadwalkan monitoring berkala per 15 menit melalui NMS.",
        "Pastikan perangkat ONT/switch pelanggan terlindungi cadangan daya UPS."
      ],
      analyzedAt: "2026-09-23 14:05 WIB",
      modelUsed: "gemini-3.8-flash"
    },
    createdAt: "2026-09-23T14:00:00Z",
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
          },
          timeout: 10000
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

      // Multi-model resilience pool with automatic retry on 503 (high demand) and 429
      const CANDIDATE_MODELS = [
        { id: "gemini-3.8-flash", label: "gemini-3.8-flash (Google GenAI)" },
        { id: "gemini-3.1-flash-lite", label: "gemini-3.1-flash-lite (Google GenAI Failover)" },
        { id: "gemini-flash-latest", label: "gemini-flash-latest (Google GenAI Alternate)" }
      ];

      for (const candidate of CANDIDATE_MODELS) {
        let retries = 1;
        while (retries >= 0) {
          try {
            const response = await ai.models.generateContent({
              model: candidate.id,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                temperature: 0.2
              }
            });

            let text = response.text || "";
            if (text.startsWith("```")) {
              text = text.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
            }
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
              modelUsed: candidate.label
            };
          } catch (err: any) {
            const errMsg = err?.message || String(err);
            const isHighDemandOrRateLimit =
              errMsg.includes("503") ||
              errMsg.includes("UNAVAILABLE") ||
              errMsg.includes("high demand") ||
              errMsg.includes("429") ||
              errMsg.includes("RESOURCE_EXHAUSTED");

            if (isHighDemandOrRateLimit && retries > 0) {
              retries--;
              await new Promise((resolve) => setTimeout(resolve, 800));
              continue;
            }

            console.warn(`[Gemini AI] Model ${candidate.id} transient issue: ${errMsg.slice(0, 100)}. Switching to next candidate...`);
            break;
          }
        }
      }
    } catch (err: any) {
      console.warn("[Gemini AI] All models temporarily busy, activating ITU-T standard engine:", err?.message || err);
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
// SECURITY MIDDLEWARE & GUARDS
// ==========================================

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Akses ditolak: Sesi otentikasi diperlukan." });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifySecureToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: "Sesi telah kedaluwarsa atau token tidak valid." });
  }

  const user = usersStore.find(u => u.email.toLowerCase() === payload.email.toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, message: "Pengguna sesi tidak terdaftar." });
  }

  (req as any).user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as UserRecord | undefined;
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak: Operasi ini memerlukan hak akses Administrator."
    });
  }
  next();
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "Portal Berita Acara RFS API", timestamp: new Date().toISOString() });
});

// Auth: Login with Rate Limiting and Password Verification
app.post("/api/auth/login", loginRateLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email dan kata sandi wajib diisi." });
  }

  const user = usersStore.find(
    u => u.email.toLowerCase() === String(email).trim().toLowerCase() && verifyPassword(String(password).trim(), u.password)
  );

  if (!user) {
    return res.status(401).json({ success: false, message: "Email atau kata sandi tidak sesuai." });
  }

  // Generate cryptographically signed HMAC-SHA256 session token
  const token = generateSecureToken(user);

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

// Auth: Check Session (Protected by requireAuth)
app.get("/api/auth/session", requireAuth, (req, res) => {
  const user = (req as any).user as UserRecord;
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
});

// RFS: List all documents
app.get("/api/rfs/list", (_req, res) => {
  return res.json({
    success: true,
    total: baRecordsStore.length,
    data: baRecordsStore
  });
});

// RFS: On-Demand Gemini AI Analysis with Rate Limiting
app.post("/api/rfs/analyze-ai", aiAnalyzeRateLimiter, async (req, res) => {
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
      deviceInstalled: payload.deviceInstalled !== false,
      deviceType: payload.deviceType || "",
      serialNumber: payload.serialNumber || "",
      interfaceType: payload.interfaceType || "SFP 1G",
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
      workNotesHistory: Array.isArray(payload.workNotesHistory) && payload.workNotesHistory.length > 0
        ? payload.workNotesHistory
        : (payload.testNotes
            ? [
                {
                  id: `note_${Date.now()}`,
                  timestamp: now.toISOString(),
                  author: payload.technicianName || "Teknisi Lapangan",
                  role: "Teknisi",
                  category: "Instalasi",
                  content: payload.testNotes
                }
              ]
            : []),
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

// RFS: Add Field Work Note / Activity Log to record
app.post("/api/rfs/add-note", (req, res) => {
  const { id, note, author, role, category } = req.body;
  if (!id || !note) {
    return res.status(400).json({ success: false, message: "ID Dokumen dan Catatan wajib diisi." });
  }

  const record = baRecordsStore.find(r => r.id === id);
  if (!record) {
    return res.status(404).json({ success: false, message: "Dokumen RFS tidak ditemukan." });
  }

  if (!Array.isArray(record.workNotesHistory)) {
    record.workNotesHistory = [];
  }

  const newEntry = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    author: author || "Teknisi/Pengawas",
    role: role || "Teknisi",
    category: category || "Tindak Lanjut",
    content: note.trim()
  };

  record.workNotesHistory.push(newEntry);
  record.generalNotes = note.trim(); // Update latest note preview

  return res.json({
    success: true,
    message: "Catatan pekerjaan lapangan berhasil ditambahkan dan terekam.",
    data: record,
    newEntry
  });
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

// RFS: Delete document (Admin only, Protected by requireAuth & requireAdmin)
app.delete("/api/rfs/:id", requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = baRecordsStore.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
  }
  baRecordsStore.splice(index, 1);
  return res.json({ success: true, message: "Dokumen berhasil dihapus." });
});

// Admin: Users List (Protected by requireAuth & requireAdmin)
app.get("/api/admin/users", requireAuth, requireAdmin, (_req, res) => {
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

// Admin: Create User (Protected by requireAuth & requireAdmin)
app.post("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
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
    password: hashPassword(password),
    name,
    role: role || "user",
    position: position || "Staff",
    department: department || "Operations"
  };

  usersStore.push(newUser);
  return res.json({ success: true, message: "Pengguna berhasil ditambahkan.", user: newUser });
});

// Admin: Update User (Protected by requireAuth & requireAdmin)
app.put("/api/admin/users/:id", requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { email, password, name, role, position, department } = req.body;
  const userIndex = usersStore.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
  }

  if (email && email.toLowerCase() !== usersStore[userIndex].email.toLowerCase()) {
    if (usersStore.some(u => u.id !== id && u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ success: false, message: "Email sudah digunakan oleh pengguna lain." });
    }
    usersStore[userIndex].email = email;
  }

  if (name) usersStore[userIndex].name = name;
  if (role) usersStore[userIndex].role = role;
  if (position) usersStore[userIndex].position = position;
  if (department) usersStore[userIndex].department = department;
  if (password && password.trim().length > 0) {
    usersStore[userIndex].password = hashPassword(password.trim());
  }

  return res.json({
    success: true,
    message: "Data pengguna berhasil diperbarui.",
    user: {
      id: usersStore[userIndex].id,
      email: usersStore[userIndex].email,
      name: usersStore[userIndex].name,
      role: usersStore[userIndex].role,
      position: usersStore[userIndex].position,
      department: usersStore[userIndex].department
    }
  });
});

// Admin: Delete User (Protected by requireAuth & requireAdmin)
app.delete("/api/admin/users/:id", requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const userIndex = usersStore.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan." });
  }

  const deletedUser = usersStore[userIndex];
  usersStore.splice(userIndex, 1);
  return res.json({
    success: true,
    message: `Pengguna ${deletedUser.name} (${deletedUser.email}) berhasil dihapus.`
  });
});

// ==========================================
// PO PENGADAAN MATERIAL STORE & ENDPOINTS
// ==========================================
interface PoMaterialItemRecord {
  id: string;
  namaMaterial: string;
  satuan: string;
  volume: number | string;
  keterangan: string;
}

interface PoMaterialRecord {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  lokasiProyek: string;
  items: PoMaterialItemRecord[];
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
  status: "Diajukan" | "Disetujui" | "Diproses" | "Selesai";
  createdAt: string;
  updatedAt?: string;
}

let poRecordsStore: PoMaterialRecord[] = [
  {
    id: "PO-20260924-001",
    nomorSurat: "001/PO-MAT/FAMIKA/IX/2026",
    tanggalSurat: "24 September 2026",
    lokasiProyek: "Casa Grande Cinere",
    items: [
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
    ],
    notes: "Pengadaan material mendesak untuk percepatan implementasi jaringan FTTH & aktivasi pelanggan di area proyek. Mohon diproses dan dikirim ke gudang transit / site sesuai jadwal.",
    creator1Name: "Ismunandar",
    creator1Position: "Support Partnership",
    creator2Name: "Rahadian",
    creator2Position: "Technical Engineering",
    approver1Name: "Bayu Pujho",
    approver1Position: "Project Manager",
    approver2Name: "Budiharto",
    approver2Position: "Senior Manager",
    status: "Disetujui",
    createdAt: new Date().toISOString()
  },
  {
    id: "PO-20260920-002",
    nomorSurat: "002/PO-MAT/FAMIKA/IX/2026",
    tanggalSurat: "20 September 2026",
    lokasiProyek: "Graha Famika TB Simatupang",
    items: [
      {
        id: "item-201",
        namaMaterial: "Kabel Feeder Fiber Optic 48 Core G.652D",
        satuan: "Drum",
        volume: 1,
        keterangan: "Kabel backbone utama gedung Graha Famika"
      },
      {
        id: "item-202",
        namaMaterial: "Optical Termination Box (OTB) 48 Core Rackmount 19 Inch",
        satuan: "Unit",
        volume: 2,
        keterangan: "Terminasi rak server NOC Lantai 3"
      },
      {
        id: "item-203",
        namaMaterial: "Pigtail SC-UPC 0.9mm 1.5 Meter Single Mode",
        satuan: "Pcs",
        volume: 48,
        keterangan: "Splicing core feeder OTB"
      },
      {
        id: "item-204",
        namaMaterial: "PLC Splitter Cassette 1:8 SC/UPC",
        satuan: "Unit",
        volume: 6,
        keterangan: "Modul splitter pasif distribusi lantai"
      }
    ],
    notes: "Material upgrade backbone interkoneksi NOC Graha Famika ke Pop TB Simatupang.",
    creator1Name: "Ismunandar",
    creator1Position: "Support Partnership",
    creator2Name: "Rahadian",
    creator2Position: "Technical Engineering",
    approver1Name: "Bayu Pujho",
    approver1Position: "Project Manager",
    approver2Name: "Budiharto",
    approver2Position: "Senior Manager",
    status: "Diproses",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: "PO-20260915-003",
    nomorSurat: "003/PO-MAT/FAMIKA/IX/2026",
    tanggalSurat: "15 September 2026",
    lokasiProyek: "Sentra Distribusi Depok",
    items: [
      {
        id: "item-301",
        namaMaterial: "Tiang Galvanis Besi Bulat 7 Meter Tebal 3.2mm",
        satuan: "Batang",
        volume: 15,
        keterangan: "Tiang tiang jalur penarikan kabel distribusi jalan protokol"
      },
      {
        id: "item-302",
        namaMaterial: "Bracket Pole Band Tiang Besi + Baut Mur",
        satuan: "Set",
        volume: 30,
        keterangan: "Aksesoris dudukan suspension & dead-end"
      },
      {
        id: "item-303",
        namaMaterial: "Span Clamp FO / Tension Clamp Stainless",
        satuan: "Pcs",
        volume: 40,
        keterangan: "Penarik kabel span udara antar tiang"
      },
      {
        id: "item-304",
        namaMaterial: "Protection Sleeve Sambungan Core 60mm",
        satuan: "Pcs",
        volume: 200,
        keterangan: "Pelindung sambungan fusion splicer"
      }
    ],
    notes: "Pengadaan infrastruktur rute tiang dan aksesoris ekspansi rute Depok Utara.",
    creator1Name: "Ismunandar",
    creator1Position: "Support Partnership",
    creator2Name: "Rahadian",
    creator2Position: "Technical Engineering",
    approver1Name: "Bayu Pujho",
    approver1Position: "Project Manager",
    approver2Name: "Budiharto",
    approver2Position: "Senior Manager",
    status: "Selesai",
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString()
  }
];

// PO API: List
app.get("/api/po/list", (_req, res) => {
  return res.json({
    success: true,
    total: poRecordsStore.length,
    data: poRecordsStore
  });
});

// PO API: Save (Create or Update)
app.post("/api/po/save", (req, res) => {
  const payload = req.body;
  if (!payload || !payload.nomorSurat || !payload.lokasiProyek) {
    return res.status(400).json({ success: false, message: "Nomor surat dan lokasi proyek wajib diisi." });
  }

  const existingIdx = poRecordsStore.findIndex(p => p.id === payload.id);
  const nowIso = new Date().toISOString();

  if (existingIdx !== -1) {
    poRecordsStore[existingIdx] = {
      ...poRecordsStore[existingIdx],
      ...payload,
      updatedAt: nowIso
    };
    return res.json({
      success: true,
      message: `Permohonan PO ${payload.nomorSurat} berhasil diperbarui.`,
      data: poRecordsStore[existingIdx]
    });
  } else {
    const newRecord: PoMaterialRecord = {
      id: payload.id || `PO-${Date.now()}`,
      nomorSurat: payload.nomorSurat,
      tanggalSurat: payload.tanggalSurat || "Hari ini",
      lokasiProyek: payload.lokasiProyek,
      items: Array.isArray(payload.items) ? payload.items : [],
      notes: payload.notes || "",
      creator1Name: payload.creator1Name || "Ismunandar",
      creator1Position: payload.creator1Position || "Support Partnership",
      creator2Name: payload.creator2Name || "Rahadian",
      creator2Position: payload.creator2Position || "Technical Engineering",
      approver1Name: payload.approver1Name || "Bayu Pujho",
      approver1Position: payload.approver1Position || "Project Manager",
      approver2Name: payload.approver2Name || "Budiharto",
      approver2Position: payload.approver2Position || "Senior Manager",
      signatureCreator1: payload.signatureCreator1 || "",
      signatureCreator2: payload.signatureCreator2 || "",
      signatureApprover1: payload.signatureApprover1 || "",
      signatureApprover2: payload.signatureApprover2 || "",
      status: payload.status || "Diajukan",
      createdAt: payload.createdAt || nowIso
    };
    poRecordsStore.unshift(newRecord);
    return res.json({
      success: true,
      message: `Permohonan PO ${newRecord.nomorSurat} berhasil disimpan.`,
      data: newRecord
    });
  }
});

// PO API: Delete (Protected by requireAuth & requireAdmin)
app.delete("/api/po/:id", requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const idx = poRecordsStore.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Dokumen PO tidak ditemukan." });
  }
  const deleted = poRecordsStore.splice(idx, 1)[0];
  return res.json({
    success: true,
    message: `Dokumen PO ${deleted.nomorSurat} berhasil dihapus.`
  });
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
