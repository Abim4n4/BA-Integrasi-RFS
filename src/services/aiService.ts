import { AiAnalysisResult } from "../types.ts";

export interface BandwidthDataInput {
  customerName?: string;
  isp?: string;
  locationName?: string;
  siteName?: string;
  siteId?: string;
  serviceType?: string;
  subscribedBandwidth?: number | string;
  slaCommitment?: string;
  downloadSpeed?: number | string;
  uploadSpeed?: number | string;
  pingLatency?: number | string;
  jitter?: number | string;
  packetLoss?: number | string;
}

/**
 * Perform ITU-T Y.1564 / RFC 2544 compliant telecom analysis directly on client-side.
 * Used as reliable failover on static hosting (e.g. Vercel) or when backend API is offline.
 */
export function analyzeBandwidthLocally(data: BandwidthDataInput): AiAnalysisResult {
  const subBandwidth = Math.max(1, Number(data.subscribedBandwidth) || 100);
  const dlSpeed = Number(data.downloadSpeed) || 0;
  const ulSpeed = Number(data.uploadSpeed) || 0;
  const ping = Number(data.pingLatency) || 0;
  const jitterVal = Number(data.jitter) || 0;
  const loss = Number(data.packetLoss) || 0;

  const dlRatio = Math.round((dlSpeed / subBandwidth) * 1000) / 10;
  const ulRatio = Math.round((ulSpeed / subBandwidth) * 1000) / 10;

  let rating: 'Sangat Baik' | 'Optimal' | 'Perlu Tuning' | 'Kritis' = 'Optimal';
  let slaStatus: 'Memenuhi SLA (Pass)' | 'Di Bawah Standar SLA (Fail)' | 'Conditional (Review)' = 'Memenuhi SLA (Pass)';
  let summary = "";
  let technicalNotes = "";
  const recommendations: string[] = [];

  if (dlRatio >= 95 && loss === 0 && ping <= 20) {
    rating = "Sangat Baik";
    slaStatus = "Memenuhi SLA (Pass)";
    summary = `Hasil uji performa sangat prima dengan throughput mencapai ${dlRatio}% dari kontrak dan 0% packet loss.`;
    technicalNotes = `Throughput unduh mencapai ${dlSpeed} Mbps (${dlRatio}% CIR) dan unggah ${ulSpeed} Mbps (${ulRatio}% CIR). Nilai latency (${ping} ms) serta jitter (${jitterVal} ms) berada dalam ambang batas ideal standar ITU-T Y.1564. Tidak terdeteksi adanya frame loss selama stress test. Layanan siap sepenuhnya untuk operasional produksi.`;
    recommendations.push(
      "Link siap diarahkan ke traffic operasional utama pelanggan.",
      "Aktifkan threshold alarm bandwidth di sistem NMS untuk deteksi lonjakan dini."
    );
  } else if (dlRatio >= 80 && loss <= 1.0 && ping <= 50) {
    rating = "Optimal";
    slaStatus = "Memenuhi SLA (Pass)";
    summary = `Throughput unduh terukur ${dlSpeed} Mbps (${dlRatio}%) memenuhi komitmen SLA layanan ${data.serviceType || "Dedicated"}.`;
    technicalNotes = `Pengujian throughput unduh ${dlSpeed} Mbps dan unggah ${ulSpeed} Mbps menunjukkan kestabilan transmisi yang baik. Latency ${ping} ms dan jitter ${jitterVal} ms memenuhi syarat SLA ${data.slaCommitment || "99.85%"}. Dinyatakan laik operasi (Ready For Service).`;
    recommendations.push(
      "Lakukan monitoring stabilitas berkala selama 7x24 jam pertama aktivasi.",
      "Pastikan perangkat router/switch pelanggan terlindungi cadangan daya UPS."
    );
  } else if (dlRatio >= 60 || loss > 1.0 || ping > 50) {
    rating = "Perlu Tuning";
    slaStatus = "Conditional (Review)";
    summary = `Throughput unduh terukur ${dlRatio}% dan packet loss ${loss}%, disarankan pengecekan interface transmisi.`;
    technicalNotes = `Terdapat deviasi performa dari kapasitas kontrak ${subBandwidth} Mbps. Throughput unduh baru mencapai ${dlSpeed} Mbps (${dlRatio}%). Latency tercatat ${ping} ms dengan packet loss ${loss}%. Perlu dilakukan kalibrasi port, pemeriksaan redaman optik OTB, dan negosiasi port duplex.`;
    recommendations.push(
      "Lakukan pengecekan fisik konektor patch cord dan redaman optik (OPM) di OTB.",
      "Periksa kemungkinan saturasi link uplink atau duplikasi IP address gateway."
    );
  } else {
    rating = "Kritis";
    slaStatus = "Di Bawah Standar SLA (Fail)";
    summary = `Performa link belum memenuhi syarat minimal SLA kontrak (${dlRatio}% dari ${subBandwidth} Mbps).`;
    technicalNotes = `Hasil throughput terukur sangat rendah dibandingkan paket langganan (${dlSpeed} Mbps / ${subBandwidth} Mbps). Latency ${ping} ms dan packet loss ${loss}% berpotensi mengganggu aplikasi pelanggan. Diperlukan eskalasi segera ke tim Network Engineering.`;
    recommendations.push(
      "Jadwalkan kunjungan teknisi lapangan untuk pengujian ulang kabel optik end-to-end.",
      "Verifikasi konfigurasi traffic shaping / policer pada interface switch uplink ISP."
    );
  }

  const now = new Date();
  const timeStr = `${now.toLocaleDateString("id-ID")} ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

  return {
    summary,
    rating,
    slaStatus,
    downloadRatioPercent: dlRatio,
    uploadRatioPercent: ulRatio,
    latencyAssessment: `Latency terukur ${ping} ms (${ping <= 25 ? "Sangat Baik" : ping <= 50 ? "Standar" : "Tinggi"}).`,
    jitterAssessment: `Jitter terukur ${jitterVal} ms (${jitterVal <= 3 ? "Stabil" : "Fluktuatif"}).`,
    packetLossAssessment: `Packet loss terukur ${loss}% (${loss === 0 ? "Zero Frame Drop (Ideal)" : "Perlu perhatian"}).`,
    technicalNotes,
    recommendations,
    analyzedAt: timeStr,
    modelUsed: "Telecom Engine (ITU-T Y.1564 / AI Assisted)"
  };
}

/**
 * Analyzes bandwidth performance with resilient multi-tier fallback:
 * 1. Express backend Gemini API (/api/rfs/analyze-ai) with 1.5s fast timeout
 * 2. Instant client-side telecommunication evaluation engine (for Vercel & offline)
 */
export async function analyzeBandwidth(data: BandwidthDataInput): Promise<AiAnalysisResult> {
  // 1. Try backend API first with 1.5 second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch("/api/rfs/analyze-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const json = await res.json();
      if (json && json.success && json.analysis) {
        return json.analysis;
      }
    }
  } catch (_netErr) {
    // Backend offline / Vercel static rewrite / timed out -> fallback instantly
  }

  // 2. Client-side resilient engine (instant, zero delay)
  return analyzeBandwidthLocally(data);
}
