import { PocEvidenceItem } from "../types.ts";

export const DEFAULT_POC_ITEMS: PocEvidenceItem[] = [
  // Kategori 1: Speedtest & Provider
  {
    id: "poc-1",
    category: "Speedtest",
    title: "Speedtest CBN",
    url: "cbn.id/speedtest",
    status: "Pass",
    latencyMs: 2,
    notes: "Unduh: 597.4 Mbps, Unggah: 434.3 Mbps, Jitter: 0 ms, Ping: 2 ms"
  },
  {
    id: "poc-2",
    category: "Speedtest",
    title: "Speedtest.net Global",
    url: "speedtest.net",
    status: "Pass",
    latencyMs: 2.4,
    notes: "Unduh: 611.8 Mbps, Unggah: 473.7 Mbps, Latency: 2.400 ms"
  },
  {
    id: "poc-3",
    category: "Speedtest",
    title: "CBN Official Portal",
    url: "cbn.id",
    status: "Pass",
    latencyMs: 5,
    notes: "Akses web portal CBN Fiber & Enterprise responsif"
  },

  // Kategori 2: Banking
  {
    id: "poc-4",
    category: "Banking",
    title: "KlikBCA (Bank BCA)",
    url: "klikbca.com",
    status: "Pass",
    latencyMs: 6,
    notes: "Layanan transaksi internet banking BCA normal & aman (SSL valid)"
  },
  {
    id: "poc-5",
    category: "Banking",
    title: "Bank Mandiri",
    url: "bankmandiri.co.id",
    status: "Pass",
    latencyMs: 7,
    notes: "Portal korporasi & retail Bank Mandiri lancar"
  },
  {
    id: "poc-6",
    category: "Banking",
    title: "Bank INA (Bina Digital)",
    url: "bankina.id",
    status: "Pass",
    latencyMs: 8,
    notes: "Layanan perbankan digital Bank INA responsif"
  },

  // Kategori 3: Berita & Media
  {
    id: "poc-7",
    category: "Berita",
    title: "Kompas.com",
    url: "kompas.com",
    status: "Pass",
    latencyMs: 4,
    notes: "Loading portal berita Kompas instan, aset gambar termuat sempurna"
  },
  {
    id: "poc-8",
    category: "Berita",
    title: "K-Vision TV",
    url: "k-vision.tv",
    status: "Pass",
    latencyMs: 6,
    notes: "Streaming cuplikan & portal K-Vision berjalan lancar"
  },
  {
    id: "poc-9",
    category: "Berita",
    title: "Detik.com",
    url: "detik.com",
    status: "Pass",
    latencyMs: 5,
    notes: "Portal berita Detik Network render cepat tanpa hambatan"
  },

  // Kategori 4: Games Online
  {
    id: "poc-10",
    category: "Games",
    title: "Valorant (Riot Games)",
    url: "playvalorant.com",
    status: "Pass",
    latencyMs: 9,
    notes: "Koneksi server game kompetitif stabil, packet loss 0%"
  },
  {
    id: "poc-11",
    category: "Games",
    title: "Garena Esports",
    url: "garena.co.id",
    status: "Pass",
    latencyMs: 8,
    notes: "Akses platform game & turnamen Garena optimal"
  },
  {
    id: "poc-12",
    category: "Games",
    title: "Point Blank (Zepetto)",
    url: "pointblank.id",
    status: "Pass",
    latencyMs: 7,
    notes: "Server gateway game Point Blank aktif & responsif"
  },

  // Kategori 5: Toko Online / E-Commerce
  {
    id: "poc-13",
    category: "Toko Online",
    title: "Shopee Indonesia",
    url: "shopee.co.id",
    status: "Pass",
    latencyMs: 5,
    notes: "Katalog marketplace & checkout Shopee lancar tanpa jeda"
  },
  {
    id: "poc-14",
    category: "Toko Online",
    title: "Tokopedia",
    url: "tokopedia.com",
    status: "Pass",
    latencyMs: 6,
    notes: "Platform e-commerce Tokopedia berjalan mulus"
  },
  {
    id: "poc-15",
    category: "Toko Online",
    title: "Blibli",
    url: "blibli.com",
    status: "Pass",
    latencyMs: 6,
    notes: "Akses katalog dan transaksi belanja online Blibli sukses"
  },

  // Kategori 6: Live Streaming & Video
  {
    id: "poc-16",
    category: "Streaming",
    title: "Netflix",
    url: "netflix.com",
    status: "Pass",
    latencyMs: 8,
    notes: "Playback Ultra HD 4K lancar tanpa buffer"
  },
  {
    id: "poc-17",
    category: "Streaming",
    title: "Vidio Premier",
    url: "vidio.com",
    status: "Pass",
    latencyMs: 7,
    notes: "Streaming siaran langsung dan VOD Vidio beresolusi tinggi"
  },
  {
    id: "poc-18",
    category: "Streaming",
    title: "RCTI+",
    url: "rctiplus.com",
    status: "Pass",
    latencyMs: 8,
    notes: "Siaran langsung TV nasional di RCTI+ berjalan jernih"
  },

  // Kategori 7: Video Conference & Productivity
  {
    id: "poc-19",
    category: "Conference",
    title: "YouTube",
    url: "youtube.com",
    status: "Pass",
    latencyMs: 4,
    notes: "Video streaming 1080p60 & 4K instan tanpa buffering"
  },
  {
    id: "poc-20",
    category: "Conference",
    title: "Microsoft Teams",
    url: "microsoft.com/teams",
    status: "Pass",
    latencyMs: 12,
    notes: "Koneksi video conference call & screen sharing stabil"
  },
  {
    id: "poc-21",
    category: "Conference",
    title: "Zoom Cloud Meetings",
    url: "zoom.us",
    status: "Pass",
    latencyMs: 10,
    notes: "Akses ruang meeting video HD Zoom responsif, jitter rendah"
  }
];

export const DEFAULT_CLOSING_STATEMENT = 
  "Demikian RFS ini dilakukan dengan pengecekan pada kapasitas yang sudah sesuai pada report tersebut.";
