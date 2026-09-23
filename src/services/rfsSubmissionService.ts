import { BeritaAcaraRFS, User } from "../types.ts";
import { analyzeBandwidth } from "./aiService.ts";
import { saveRecordToFirestore } from "./firestoreService.ts";

export async function submitBaRecord(
  payload: any,
  currentUser: User | null
): Promise<{ success: boolean; data?: BeritaAcaraRFS; message?: string }> {
  // 1. Try Express backend API first with 1.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch("/api/rfs/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const json = await res.json();
      if (json && json.success && json.data) {
        return { success: true, data: json.data };
      }
    }
  } catch (_netErr) {
    // Backend offline / Vercel static deployment / timed out
  }

  // 2. Client-side creation & Instant Persistence (Vercel & offline compatible)
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);

    const docId = `RFS-${year}${month}${day}-${randomSuffix}`;
    const noBa = payload.noBa || `BA-RFS/TELCO/${year}/${month}/${randomSuffix}`;

    // Use existing AI analysis if already previewed, or run quick client-side analysis
    const aiAnalysis = payload.aiAnalysis || await analyzeBandwidth({
      customerName: payload.isp || payload.customerName,
      locationName: payload.locationName || payload.siteName,
      siteId: payload.siteId || `SITE-${randomSuffix}`,
      serviceType: payload.serviceType || "Fiber Optic Dedicated",
      subscribedBandwidth: Number(payload.subscribedBandwidth) || 100,
      slaCommitment: payload.slaCommitment || "99.85%",
      downloadSpeed: Number(payload.downloadSpeed) || 0,
      uploadSpeed: Number(payload.uploadSpeed) || 0,
      pingLatency: Number(payload.pingLatency) || 0,
      jitter: Number(payload.jitter) || 0,
      packetLoss: Number(payload.packetLoss) || 0
    });

    const newRecord: BeritaAcaraRFS = {
      ...payload,
      id: docId,
      noBa,
      tanggal: payload.tanggal || `${year}-${month}-${day}`,
      waktu: payload.waktu || now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isp: payload.isp || payload.customerName || "PT Solusi Jaringan Nusantara (ISP)",
      customerName: payload.isp || payload.customerName,
      locationName: payload.locationName || payload.siteName || "Lokasi Instalasi",
      siteName: payload.locationName || payload.siteName,
      siteAddress: payload.siteAddress || "-",
      gpsCoordinates: payload.gpsCoordinates || "",
      siteId: payload.siteId || `SITE-${randomSuffix}`,
      kotaWilayah: payload.kotaWilayah || "Jakarta",
      serviceType: payload.serviceType || "Fiber Optic Dedicated",
      subscribedBandwidth: Number(payload.subscribedBandwidth) || 100,
      bandwidthUnit: payload.bandwidthUnit || "Mbps",
      slaCommitment: payload.slaCommitment || "99.85%",
      downloadSpeed: Number(payload.downloadSpeed) || 0,
      uploadSpeed: Number(payload.uploadSpeed) || 0,
      pingLatency: Number(payload.pingLatency) || 0,
      jitter: Number(payload.jitter) || 0,
      packetLoss: Number(payload.packetLoss) || 0,
      status: "Ready For Service",
      aiAnalysis,
      createdAt: now.toISOString(),
      createdBy: currentUser?.email || "System"
    };

    // Save to local storage immediately for zero-delay UX
    try {
      const existingStr = localStorage.getItem("rfs_local_records");
      const existing: BeritaAcaraRFS[] = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(newRecord);
      localStorage.setItem("rfs_local_records", JSON.stringify(existing));
    } catch (_lsErr) {}

    // Async save to Firestore in background (non-blocking)
    saveRecordToFirestore(newRecord).catch((fsErr) => {
      console.warn("Background Firestore sync notice:", fsErr);
    });

    return { success: true, data: newRecord };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal membuat dokumen Berita Acara: " + (err.message || "Terjadi kesalahan sistem")
    };
  }
}
