/**
 * =========================================================================
 * GOOGLE APPS SCRIPT EXPORTER (Code.gs & Index.html)
 * Portal Berita Acara Ready For Service (BA-RFS)
 * Terintegrasi Google AI Studio (Gemini API), Google Sheets, & Google Drive
 * =========================================================================
 */

export const CODE_GS_CONTENT = `/**
 * =========================================================================
 * PORTAL BERITA ACARA READY FOR SERVICE (BA-RFS) - BACKEND (Code.gs)
 * Platform: Google Apps Script (GAS) + Google Sheets + Google Drive
 * Integrasi AI: Google AI Studio (Gemini API - gemini-2.5-flash)
 * =========================================================================
 */

// Konfigurasi Nama Sheet & Folder Google Drive
var SHEET_USERS = "Users";
var SHEET_DATA_BA = "DataBA";
var DRIVE_FOLDER_NAME = "Dokumen_RFS_Signatures";

/**
 * Handle HTTP GET - Menampilkan Web App Portal
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile("Index");
  return template.evaluate()
    .setTitle("Portal Berita Acara RFS - PT. FAJAR MITRA KRIDA ABADI")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Mendapatkan Spreadsheet aktif
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Inisialisasi awal Google Sheets jika belum tersedia (Jalankan sekali di Script Editor)
 */
function setupInitialSheets() {
  var ss = getSpreadsheet();
  
  // 1. Setup Sheet Users
  var sheetUsers = ss.getSheetByName(SHEET_USERS);
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet(SHEET_USERS);
    var headersUsers = ["ID", "Email", "Password", "Nama Lengkap", "Role", "Jabatan", "Departemen", "Status", "CreatedAt"];
    sheetUsers.appendRow(headersUsers);
    sheetUsers.getRange(1, 1, 1, headersUsers.length).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold");
    
    // Seed pengguna bawaan
    sheetUsers.appendRow(["USR-001", "admin@rfs.telco.id", "admin123", "Budi Santoso, S.T.", "admin", "Manajer Operasional & NOC", "Network Operations", "ACTIVE", new Date()]);
    sheetUsers.appendRow(["USR-002", "teknisi@rfs.telco.id", "teknisi123", "Rian Pratama", "user", "Senior Field Engineer", "Field Deployment", "ACTIVE", new Date()]);
    sheetUsers.appendRow(["USR-003", "sales@rfs.telco.id", "sales123", "Dewi Lestari", "user", "Account Manager", "Enterprise Sales", "ACTIVE", new Date()]);
    sheetUsers.appendRow(["USR-004", "waspang@rfs.telco.id", "waspang123", "Hendra Wijaya, S.T.", "waspang", "Pengawas Lapangan (Waspang)", "Pengawasan & QA Proyek", "ACTIVE", new Date()]);
  }
  
  // 2. Setup Sheet DataBA
  var sheetDataBA = ss.getSheetByName(SHEET_DATA_BA);
  if (!sheetDataBA) {
    sheetDataBA = ss.insertSheet(SHEET_DATA_BA);
    var headersBA = [
      "ID", "No BA", "Tanggal", "Waktu", "ISP", "Nama Lokasi", 
      "Alamat Lengkap", "Koordinat GPS", "Tipe Layanan", "Kapasitas", "Satuan",
      "Download (Mbps)", "Upload (Mbps)", "Latency (ms)", "Jitter (ms)", "Packet Loss (%)",
      "Teknisi", "Telp Teknisi", "PIC Customer", "Telp PIC", "Sales", "Approved By",
      "Pihak ISP", "Pihak WASPANG", "Pihak NE", "Status RFS",
      "Catatan AI (Gemini)", "Rating AI", "SLA AI Status",
      "URL TTD ISP", "URL TTD WASPANG", "URL TTD NE",
      "Created By", "CreatedAt"
    ];
    sheetDataBA.appendRow(headersBA);
    sheetDataBA.getRange(1, 1, 1, headersBA.length).setBackground("#047857").setFontColor("#FFFFFF").setFontWeight("bold");
  }
  
  return { success: true, message: "Database sheets Users & DataBA berhasil diinisialisasi!" };
}

/**
 * Validasi Login Sesi Pengguna dari Sheet Users
 */
function checkLogin(email, password) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_USERS);
    if (!sheet) {
      setupInitialSheets();
      sheet = ss.getSheetByName(SHEET_USERS);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: false, message: "Data pengguna belum terdaftar di sheet Users." };
    }
    
    var emailNorm = String(email || "").trim().toLowerCase();
    var passNorm = String(password || "").trim();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var userEmail = String(row[1] || "").trim().toLowerCase();
      var userPass = String(row[2] || "").trim();
      var status = String(row[7] || "ACTIVE").toUpperCase();
      
      if (userEmail === emailNorm && userPass === passNorm) {
        if (status !== "ACTIVE") {
          return { success: false, message: "Akun Anda dinonaktifkan. Hubungi Administrator." };
        }
        
        var userObj = {
          id: row[0],
          email: row[1],
          name: row[3],
          role: row[4],
          position: row[5],
          department: row[6]
        };
        
        return {
          success: true,
          user: userObj,
          sessionToken: Utilities.base64Encode(userEmail + ":" + new Date().getTime() + ":" + row[4])
        };
      }
    }
    
    return { success: false, message: "Email atau kata sandi tidak cocok." };
  } catch (err) {
    return { success: false, message: "Kesalahan server login: " + err.message };
  }
}

/**
 * Mengambil Riwayat Rekapan Data BA RFS dari Sheet DataBA
 */
function getDataBA() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_DATA_BA);
    if (!sheet) {
      setupInitialSheets();
      sheet = ss.getSheetByName(SHEET_DATA_BA);
    }
    
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return { success: true, data: [] };
    }
    
    var results = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      results.push({
        id: r[0],
        noBa: r[1],
        tanggal: formatDate(r[2]),
        waktu: r[3],
        isp: r[4],
        customerName: r[4],
        locationName: r[5],
        siteName: r[5],
        siteAddress: r[6],
        gpsCoordinates: r[7] || "",
        serviceType: r[8],
        subscribedBandwidth: Number(r[9]),
        bandwidthUnit: r[10] || "Mbps",
        downloadSpeed: Number(r[11]),
        uploadSpeed: Number(r[12]),
        pingLatency: Number(r[13]),
        jitter: Number(r[14]),
        packetLoss: Number(r[15]),
        technicianName: r[16],
        technicianPhone: r[17],
        picCustomerName: r[18],
        picCustomerPhone: r[19],
        salesName: r[20],
        approvedByName: r[21],
        ispSignerName: r[22] || "Pihak ISP",
        waspangSignerName: r[23] || "Pihak WASPANG",
        neSignerName: r[24] || "Pihak NE",
        status: r[25],
        aiAnalysis: {
          technicalNotes: r[26] || "",
          summary: r[26] || "",
          rating: r[27] || "Optimal",
          slaStatus: r[28] || "Memenuhi SLA (Pass)"
        },
        signatureIsp: r[29] || "",
        signatureWaspang: r[30] || "",
        signatureNe: r[31] || "",
        createdBy: r[32],
        createdAt: formatDate(r[33])
      });
    }
    
    results.reverse();
    return { success: true, data: results };
  } catch (err) {
    return { success: false, message: "Gagal mengambil data BA: " + err.message };
  }
}

/**
 * Analisis Bandwidth Otomatis menggunakan Google AI Studio (Gemini API: gemini-2.5-flash)
 */
function callGeminiBandwidthAnalysis(item) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) {
      return generateHeuristicAnalysis(item);
    }
    
    var unitStr = item.bandwidthUnit || "Mbps";
    var prompt = "Bertindaklah sebagai Senior Network Engineer QA & SLA Specialist Telekomunikasi. " +
      "Analisis hasil pengujian aktivasi Berita Acara Ready For Service (RFS) berikut:\\n" +
      "- ISP (Provider): " + (item.isp || item.customerName) + "\\n" +
      "- Nama Lokasi: " + (item.locationName || item.siteName) + "\\n" +
      "- Koordinat GPS: " + (item.gpsCoordinates || "Tidak ada") + "\\n" +
      "- Tipe Layanan: " + item.serviceType + "\\n" +
      "- Kapasitas Berlangganan: " + item.subscribedBandwidth + " " + unitStr + "\\n" +
      "- Hasil Pengujian Lapangan:\\n" +
      "  * Throughput Download: " + item.downloadSpeed + " Mbps\\n" +
      "  * Throughput Upload: " + item.uploadSpeed + " Mbps\\n" +
      "  * Latency: " + item.pingLatency + " ms\\n" +
      "  * Jitter: " + item.jitter + " ms\\n" +
      "  * Packet Loss: " + item.packetLoss + " %\\n\\n" +
      "Berikan evaluasi teknis profesional dalam format JSON valid:\\n" +
      "{\\n" +
      '  "summary": "Ringkasan kesimpulan dalam 1-2 kalimat bahasa Indonesia.",\\n' +
      '  "rating": "Sangat Baik" | "Optimal" | "Perlu Tuning" | "Kritis",\\n' +
      '  "slaStatus": "Memenuhi SLA (Pass)" | "Di Bawah Standar SLA (Fail)" | "Conditional (Review)",\\n' +
      '  "downloadRatioPercent": <angka persen>,\\n' +
      '  "uploadRatioPercent": <angka persen>,\\n' +
      '  "technicalNotes": "Paragraf evaluasi mendalam mencakup integritas media transmisi, rasio throughput terhadap paket, dan rekomendasi kesiapan operasional."\\n' +
      "}\\n" +
      "HANYA kembalikan teks JSON valid murni tanpa markdown triple backticks.";

    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
    var payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };
    
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      var json = JSON.parse(response.getContentText());
      var text = json.candidates[0].content.parts[0].text;
      var cleanJson = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      return JSON.parse(cleanJson);
    } else {
      return generateHeuristicAnalysis(item);
    }
  } catch (e) {
    Logger.log("Gemini API Error: " + e.toString());
    return generateHeuristicAnalysis(item);
  }
}

/**
 * Fallback Analisis Cerdas jika API Key belum disetel
 */
function generateHeuristicAnalysis(item) {
  var cap = Number(item.subscribedBandwidth) || 1;
  var dl = Number(item.downloadSpeed) || 0;
  var ul = Number(item.uploadSpeed) || 0;
  var dlRatio = Math.round((dl / cap) * 100);
  var ulRatio = Math.round((ul / cap) * 100);
  var latency = Number(item.pingLatency || 0);
  var packetLoss = Number(item.packetLoss || 0);
  var jitter = Number(item.jitter || 0);
  
  var rating = "Optimal";
  var slaStatus = "Memenuhi SLA (Pass)";
  var notes = "";
  
  if (dlRatio >= 95 && packetLoss === 0 && latency <= 25) {
    rating = "Sangat Baik";
    slaStatus = "Memenuhi SLA (Pass)";
    notes = "Koneksi prima. Penyaluran throughput mencapai " + dlRatio + "% dari kapasitas kontrak (" + cap + " " + (item.bandwidthUnit || "Mbps") + ") dengan latency rendah (" + latency + " ms) dan 0% packet loss. Jalur siap digunakan untuk operasional penuh.";
  } else if (dlRatio >= 85 && packetLoss <= 1 && latency <= 45) {
    rating = "Optimal";
    slaStatus = "Memenuhi SLA (Pass)";
    notes = "Performa bandwidth memenuhi standar operasional dengan rasio download " + dlRatio + "% dan upload " + ulRatio + "%. Latency (" + latency + " ms) dan jitter (" + jitter + " ms) berada dalam ambang batas toleransi normal.";
  } else if (packetLoss > 2 || dlRatio < 80) {
    rating = "Perlu Tuning";
    slaStatus = "Conditional (Review)";
    notes = "Ditemukan deviasi throughput download (" + dlRatio + "%) atau packet loss (" + packetLoss + "%). Direkomendasikan kalibrasi perangkat dan monitoring link selama 24 jam.";
  } else {
    rating = "Kritis";
    slaStatus = "Di Bawah Standar SLA (Fail)";
    notes = "Kinerja jaringan belum memenuhi standar minimum operasional. Perlu pengecekan fisik kabel dan perangkat transmisi.";
  }
  
  return {
    summary: "Hasil uji link: " + slaStatus + " (Rating: " + rating + ").",
    rating: rating,
    slaStatus: slaStatus,
    downloadRatioPercent: dlRatio,
    uploadRatioPercent: ulRatio,
    technicalNotes: notes
  };
}

/**
 * Menyimpan gambar Tanda Tangan Digital Base64 ke Google Drive
 */
function saveSignatureToDrive(base64Data, fileName) {
  if (!base64Data || base64Data.indexOf("data:image") === -1) {
    return "";
  }
  try {
    var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var contentType = base64Data.substring(5, base64Data.indexOf(";"));
    var bytes = Utilities.base64Decode(base64Data.substr(base64Data.indexOf("base64,") + 7));
    var blob = Utilities.newBlob(bytes, contentType, fileName);
    var file = folder.createFile(blob);
    return file.getUrl();
  } catch (e) {
    Logger.log("Error simpan TTD ke Drive: " + e.toString());
    return "";
  }
}

/**
 * Menyimpan Form Berita Acara RFS Baru
 */
function saveBeritaAcaraRFS(formData, userEmail) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_DATA_BA);
    if (!sheet) {
      setupInitialSheets();
      sheet = ss.getSheetByName(SHEET_DATA_BA);
    }
    
    // 1. Eksekusi Analisis Gemini AI
    var aiResult = callGeminiBandwidthAnalysis(formData);
    
    // 2. Simpan 3 Blok Tanda Tangan ke Google Drive (ISP, WASPANG, NE)
    var timestampId = new Date().getTime();
    var ttdIspUrl = "";
    var ttdWaspangUrl = "";
    var ttdNeUrl = "";
    
    if (formData.signatureIsp) {
      ttdIspUrl = saveSignatureToDrive(formData.signatureIsp, "TTD_ISP_" + timestampId + ".png");
    }
    if (formData.signatureWaspang) {
      ttdWaspangUrl = saveSignatureToDrive(formData.signatureWaspang, "TTD_WASPANG_" + timestampId + ".png");
    }
    if (formData.signatureNe) {
      ttdNeUrl = saveSignatureToDrive(formData.signatureNe, "TTD_NE_" + timestampId + ".png");
    }
    
    // 3. Generate ID dan No BA
    var docId = "RFS-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss");
    var noBa = formData.noBa || ("BA-RFS/" + Utilities.formatDate(new Date(), "GMT+7", "yyyy/MM/") + ("000" + (sheet.getLastRow())).slice(-4));
    
    // 4. Masukkan ke Google Sheet DataBA
    var rowData = [
      docId,
      noBa,
      formData.tanggal || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"),
      formData.waktu || Utilities.formatDate(new Date(), "GMT+7", "HH:mm"),
      formData.isp || formData.customerName,
      formData.locationName || formData.siteName,
      formData.siteAddress,
      formData.gpsCoordinates || "",
      formData.serviceType || "Dedicated",
      Number(formData.subscribedBandwidth),
      formData.bandwidthUnit || "Mbps",
      Number(formData.downloadSpeed),
      Number(formData.uploadSpeed),
      Number(formData.pingLatency),
      Number(formData.jitter),
      Number(formData.packetLoss),
      formData.technicianName,
      formData.technicianPhone || "",
      formData.picCustomerName,
      formData.picCustomerPhone || "",
      formData.salesName || "",
      formData.approvedByName || "",
      formData.ispSignerName || "Pihak ISP",
      formData.waspangSignerName || "Pihak WASPANG",
      formData.neSignerName || "Pihak NE",
      formData.status || "Ready For Service",
      aiResult.technicalNotes,
      aiResult.rating,
      aiResult.slaStatus,
      ttdIspUrl || formData.signatureIsp || "",
      ttdWaspangUrl || formData.signatureWaspang || "",
      ttdNeUrl || formData.signatureNe || "",
      userEmail || "System",
      new Date()
    ];
    
    sheet.appendRow(rowData);
    
    return {
      success: true,
      message: "Berita Acara RFS berhasil disimpan & dianalisis oleh AI Studio!",
      docId: docId,
      noBa: noBa,
      aiAnalysis: aiResult,
      ttdIspUrl: ttdIspUrl,
      ttdWaspangUrl: ttdWaspangUrl,
      ttdNeUrl: ttdNeUrl
    };
  } catch (err) {
    return { success: false, message: "Gagal menyimpan BA: " + err.message };
  }
}

/**
 * Format tanggal ramah tampilan
 */
function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT+7", "yyyy-MM-dd");
  }
  return String(val);
}
`;

export const INDEX_HTML_STANDALONE = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Berita Acara RFS - Google Apps Script</title>
  <!-- Tailwind CSS & Google Fonts -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    
    /* 6 THEMES SYSTEM */
    [data-theme="day"] {
      --bg: #f8fafc; --card: #ffffff; --elevated: #f1f5f9; --text: #0f172a; --muted: #64748b; --border: #cbd5e1; --accent: #059669; --glow: none;
    }
    [data-theme="night"] {
      --bg: #0b0f19; --card: #131b2e; --elevated: #1e293b; --text: #f1f5f9; --muted: #94a3b8; --border: #334155; --accent: #10b981; --glow: none;
    }
    [data-theme="metrik"] {
      --bg: #03140d; --card: #062317; --elevated: #0d3826; --text: #ecfdf5; --muted: #6ee7b7; --border: #047857; --accent: #10b981; --glow: 0 0 15px rgba(16,185,129,0.25);
    }
    [data-theme="electric-neon"] {
      --bg: #040914; --card: #081528; --elevated: #0f2442; --text: #e0f2fe; --muted: #7dd3fc; --border: #0284c7; --accent: #00f0ff; --glow: 0 0 16px rgba(0,240,255,0.4);
    }
    [data-theme="purple-neon"] {
      --bg: #0d0614; --card: #1b0c2a; --elevated: #2e1247; --text: #fae8ff; --muted: #d8b4fe; --border: #9333ea; --accent: #d946ef; --glow: 0 0 16px rgba(217,70,239,0.4);
    }
    [data-theme="blue-neon"] {
      --bg: #030a16; --card: #09172f; --elevated: #11284f; --text: #eff6ff; --muted: #93c5fd; --border: #2563eb; --accent: #3b82f6; --glow: 0 0 16px rgba(59,130,246,0.45);
    }

    .theme-bg { background-color: var(--bg); color: var(--text); }
    .theme-card { background-color: var(--card); border-color: var(--border); box-shadow: var(--glow); }
    .theme-elevated { background-color: var(--elevated); border-color: var(--border); }
    .theme-border { border-color: var(--border); }
    .theme-text-muted { color: var(--muted); }
    .theme-accent-btn { background-color: var(--accent); color: #ffffff; }

    canvas.sig-canvas {
      touch-action: none;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
    }

    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 10pt !important;
        line-height: 1.35 !important;
        width: 100% !important;
        min-width: 100% !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, nav, aside, header, button, #mainSidebar, #mobileBackdrop {
        display: none !important;
        visibility: hidden !important;
      }
      .print-only { display: block !important; }
      .theme-card, .surface-card, div[class*="fixed inset-0"], .modal-overlay {
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-section, section, table, tbody, tr, .signature-box {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      th, td {
        border: 1px solid #64748b !important;
        padding: 4px 6px !important;
      }
    }
  </style>
</head>
<body data-theme="day" class="theme-bg min-h-screen transition-colors duration-200">

  <!-- SIDEBAR NAVIGATION & TOPBAR LAYOUT -->
  <!-- Mobile Backdrop Overlay -->
  <div id="mobileBackdrop" onclick="toggleMobileSidebar()" class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm hidden md:hidden"></div>

  <!-- Vertical Sidebar Container (Fixed on Left) -->
  <aside id="mainSidebar" class="fixed top-0 bottom-0 left-0 z-50 w-64 surface-card border-r flex flex-col transition-transform duration-300 -translate-x-full md:translate-x-0 shadow-xl md:shadow-none theme-card">
    <!-- Brand Header -->
    <div class="h-16 px-4 flex items-center justify-between border-b theme-border shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow" style="background-color: var(--accent);">
          BA
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-sm tracking-tight">PORTAL RFS</span>
            <span class="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-full font-bold text-white" style="background-color: var(--accent);">v2.5</span>
          </div>
          <span class="text-[10px] theme-text-muted">GAS + Gemini AI</span>
        </div>
      </div>
      <button onclick="toggleMobileSidebar()" class="md:hidden p-1.5 rounded-lg theme-elevated">✕</button>
    </div>

    <!-- Navigation Menu List -->
    <div class="flex-1 overflow-y-auto px-3 py-4 space-y-4">
      <div class="space-y-1">
        <p class="px-3 text-[10px] font-bold uppercase tracking-wider theme-text-muted">Menu Utama</p>
        
        <!-- 1. Formulir Input BA-RFS -->
        <button id="tab-btn-form" onclick="switchTab('form')" class="w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left" style="background-color: var(--accent); color: white;">
          <span class="text-base">📝</span>
          <span>Formulir Input BA-RFS</span>
        </button>

        <!-- 2. Tbl Rek BA -->
        <button id="tab-btn-table" onclick="switchTab('table')" class="w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left theme-elevated">
          <span class="text-base">📊</span>
          <span>Tbl Rek BA</span>
        </button>
      </div>

      <div class="space-y-1">
        <p class="px-3 text-[10px] font-bold uppercase tracking-wider theme-text-muted">Admin & Integrasi</p>
        
        <!-- 3. Panel Admin -->
        <button id="tab-btn-admin" onclick="switchTab('admin')" class="w-full relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left theme-elevated">
          <div class="flex items-center gap-3">
            <span class="text-base">🛡️</span>
            <span>Panel Admin</span>
          </div>
          <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">PRO</span>
        </button>

        <!-- 4. Ekspor Kode GAS -->
        <button id="tab-btn-gas" onclick="switchTab('gas')" class="w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left theme-elevated">
          <span class="text-base">⚡</span>
          <span>Ekspor Kode GAS</span>
        </button>
      </div>

      <!-- Tools in Sidebar -->
      <div class="pt-3 border-t theme-border space-y-2">
        <p class="px-3 text-[10px] font-bold uppercase tracking-wider theme-text-muted">Tema & Waktu</p>
        <div class="px-1">
          <select id="themeSelector" onchange="applyTheme(this.value)" class="w-full text-xs font-semibold p-2 rounded-lg border theme-elevated cursor-pointer">
            <option value="day">☀️ Day Mode</option>
            <option value="night">🌙 Night Mode</option>
            <option value="metrik">🌲 Metrik Green</option>
            <option value="electric-neon">⚡ Electric Neon</option>
            <option value="purple-neon">🔮 Purple Neon</option>
            <option value="blue-neon">🌊 Blue Neon</option>
          </select>
        </div>

        <div id="realtime-clock" class="flex items-center gap-2 px-3 py-2 rounded-lg theme-elevated border theme-border font-mono text-[11px] font-semibold">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span id="liveClock">--:--:-- WIB</span>
        </div>
      </div>
    </div>

    <!-- Sidebar Footer -->
    <div class="p-3 border-t theme-border theme-elevated shrink-0">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            FE
          </div>
          <div>
            <p id="userDisplayName" class="text-xs font-bold leading-tight">Teknisi RFS</p>
            <p class="text-[10px] theme-text-muted">Field Engineer</p>
          </div>
        </div>
        <button id="btn-logout" onclick="logoutSession()" class="text-xs px-2.5 py-1.5 rounded-lg border theme-elevated text-red-400 hover:text-red-300">
          Keluar
        </button>
      </div>
    </div>
  </aside>

  <!-- Main Content Area (Safely offset by md:pl-64) -->
  <div class="md:pl-64 flex-1 flex flex-col min-h-screen transition-all duration-300">
    <!-- Top Header Bar -->
    <header class="theme-card border-b sticky top-0 z-30 px-4 sm:px-6 h-16 flex items-center justify-between shadow-sm">
      <div class="flex items-center gap-3">
        <button onclick="toggleMobileSidebar()" class="md:hidden p-2 rounded-xl theme-elevated border theme-border" aria-label="Buka Navigasi">
          ☰
        </button>
        <div>
          <h1 id="pageHeading" class="text-base font-extrabold tracking-tight">Form Input BA RFS</h1>
          <p class="text-[11px] theme-text-muted">Portal Berita Acara Ready For Service • PT. FAJAR MITRA KRIDA ABADI</p>
        </div>
      </div>
    </header>

    <main class="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
    <!-- TAB 1: FORMULIR BA-RFS -->
    <section id="tabForm" class="space-y-6">
      <form id="rfsForm" onsubmit="handleFormSubmit(event)" class="space-y-6">
        
        <!-- BAGIAN 1: IDENTITAS ISP & LOKASI -->
        <div class="theme-card rounded-2xl p-5 border space-y-4 shadow-sm">
          <h2 class="text-sm font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
            1. Identitas Penyedia Layanan (ISP) & Lokasi Instalasi
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1">ISP</label>
              <input type="text" id="inputIsp" required placeholder="Contoh: PT Solusi Jaringan Nusantara (ISP)" 
                class="w-full text-xs p-2.5 rounded-lg border theme-elevated focus:outline-none">
            </div>

            <div>
              <label class="block text-xs font-semibold mb-1">Nama Lokasi</label>
              <input type="text" id="inputLocationName" required placeholder="Contoh: Cyber Tower 2 Lt. 18 / IDC" 
                class="w-full text-xs p-2.5 rounded-lg border theme-elevated focus:outline-none">
            </div>
          </div>

          <!-- Alamat Lengkap & GPS Geolocation -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-semibold">Alamat Lengkap Lokasi</label>
              <button type="button" onclick="detectGPSLocation()" class="text-[11px] font-bold px-2.5 py-1 rounded bg-emerald-600 text-white flex items-center gap-1 hover:opacity-90 transition-all">
                📍 Deteksi GPS Otomatis
              </button>
            </div>
            <textarea id="inputAddress" rows="2" required placeholder="Dapat diisi secara manual atau klik tombol 'Deteksi GPS Otomatis'..."
              class="w-full text-xs p-2.5 rounded-lg border theme-elevated focus:outline-none resize-none"></textarea>
            <input type="hidden" id="inputGpsCoords" value="">
            <div id="gpsStatusBadge" class="hidden text-[11px] text-emerald-600 font-mono mt-1"></div>
          </div>
        </div>

        <!-- BAGIAN 2: SPESIFIKASI LAYANAN & PENGUJIAN JARINGAN -->
        <div class="theme-card rounded-2xl p-5 border space-y-4 shadow-sm">
          <h2 class="text-sm font-bold uppercase tracking-wider text-emerald-600">
            2. Spesifikasi Layanan & Pengujian Bandwidth
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold mb-1">Tipe Layanan</label>
              <select id="selectServiceType" class="w-full text-xs p-2.5 rounded-lg border theme-elevated cursor-pointer">
                <option value="Dedicated">Dedicated (1:1 Simetris)</option>
                <option value="SOHO">SOHO (Small Office Home Office)</option>
                <option value="Broadband">Broadband (Best Effort)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold mb-1">Kapasitas Berlangganan</label>
              <div class="flex items-center gap-2">
                <input type="number" id="inputSubBandwidth" value="100" min="1" required
                  class="flex-1 text-xs p-2.5 rounded-lg border theme-elevated font-mono">
                <select id="selectBandwidthUnit" class="w-28 text-xs font-semibold p-2.5 rounded-lg border theme-elevated cursor-pointer">
                  <option value="Mbps">Mbps</option>
                  <option value="Giga">Giga (Gbps)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Parameter Speedtest -->
          <div class="theme-elevated p-4 rounded-xl border space-y-3">
            <span class="text-xs font-bold block">Hasil Uji Parameter Jaringan (Speedtest / RFC 2544)</span>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label class="block text-[11px] theme-text-muted mb-1">Download (Mbps)</label>
                <input type="number" step="0.1" id="inputDlSpeed" value="98.5" required class="w-full text-xs p-2 rounded border bg-white text-slate-900 font-mono">
              </div>
              <div>
                <label class="block text-[11px] theme-text-muted mb-1">Upload (Mbps)</label>
                <input type="number" step="0.1" id="inputUlSpeed" value="97.2" required class="w-full text-xs p-2 rounded border bg-white text-slate-900 font-mono">
              </div>
              <div>
                <label class="block text-[11px] theme-text-muted mb-1">Latency (ms)</label>
                <input type="number" step="0.1" id="inputLatency" value="12.0" required class="w-full text-xs p-2 rounded border bg-white text-slate-900 font-mono">
              </div>
              <div>
                <label class="block text-[11px] theme-text-muted mb-1">Jitter (ms)</label>
                <input type="number" step="0.1" id="inputJitter" value="1.5" required class="w-full text-xs p-2 rounded border bg-white text-slate-900 font-mono">
              </div>
              <div>
                <label class="block text-[11px] theme-text-muted mb-1">Packet Loss (%)</label>
                <input type="number" step="0.1" id="inputPacketLoss" value="0.0" required class="w-full text-xs p-2 rounded border bg-white text-slate-900 font-mono">
              </div>
            </div>
          </div>
        </div>

        <!-- BAGIAN 3: 3 BLOK TANDA TANGAN DIGITAL MULTI-PIHAK -->
        <div class="theme-card rounded-2xl p-5 border space-y-4 shadow-sm">
          <h2 class="text-sm font-bold uppercase tracking-wider text-emerald-600">
            3. Pengesahan Pihak Mengetahui (3 Kolom Tanda Tangan Digital)
          </h2>
          <p class="text-xs theme-text-muted">Gunakan sentuhan jari/stylus di HP atau kursor mouse di laptop pada canvas di bawah ini.</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs">
            <!-- Blok 1: ISP -->
            <div class="theme-elevated p-3 rounded-xl border flex flex-col justify-between space-y-2">
              <span class="font-bold text-emerald-600 uppercase">ISP</span>
              <input type="text" id="signerIspName" placeholder="Nama PIC ISP" value="PT Solusi Jaringan Nusantara (ISP)" 
                class="text-xs p-1.5 rounded border bg-white text-slate-900 text-center font-medium">
              <canvas id="sigCanvasIsp" width="280" height="130" class="sig-canvas w-full"></canvas>
              <button type="button" onclick="clearCanvas('sigCanvasIsp')" class="text-[11px] text-red-500 hover:underline">Hapus Tanda Tangan</button>
            </div>

            <!-- Blok 2: WASPANG -->
            <div class="theme-elevated p-3 rounded-xl border flex flex-col justify-between space-y-2">
              <span class="font-bold text-sky-600">Waspang</span>
              <input type="text" id="signerWaspangName" placeholder="Nama Pengawas Lapangan" value="Ir. Joko Sutrisno (WASPANG)" 
                class="text-xs p-1.5 rounded border bg-white text-slate-900 text-center font-medium">
              <canvas id="sigCanvasWaspang" width="280" height="130" class="sig-canvas w-full"></canvas>
              <button type="button" onclick="clearCanvas('sigCanvasWaspang')" class="text-[11px] text-red-500 hover:underline">Hapus Tanda Tangan</button>
            </div>

            <!-- Blok 3: NE -->
            <div class="theme-elevated p-3 rounded-xl border flex flex-col justify-between space-y-2">
              <span class="font-bold text-purple-600 uppercase">NE</span>
              <input type="text" id="signerNeName" placeholder="Nama Network Engineer" value="Bambang Kurniawan, S.T. (NE)" 
                class="text-xs p-1.5 rounded border bg-white text-slate-900 text-center font-medium">
              <canvas id="sigCanvasNe" width="280" height="130" class="sig-canvas w-full"></canvas>
              <button type="button" onclick="clearCanvas('sigCanvasNe')" class="text-[11px] text-red-500 hover:underline">Hapus Tanda Tangan</button>
            </div>
          </div>
        </div>

        <!-- Tombol Submit -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button type="button" onclick="fillDemoData()" class="px-4 py-2.5 rounded-xl border theme-elevated text-xs font-semibold">
            Isi Data Contoh
          </button>
          <button type="submit" id="submitBtn" class="px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md flex items-center gap-2 hover:opacity-90 transition-all" style="background-color: var(--accent);">
            <span>Simpan & Analisis AI Gemini</span>
          </button>
        </div>
      </form>
    </section>

    <!-- TAB 2: TABEL RIWAYAT REKAPAN -->
    <section id="tabTable" class="hidden space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold uppercase tracking-wider">Rekapan Riwayat Berita Acara RFS</h2>
        <button onclick="loadTableData()" class="text-xs px-3 py-1.5 rounded-lg theme-elevated border font-semibold flex items-center gap-1">
          🔄 Muat Ulang Data
        </button>
      </div>

      <div class="theme-card rounded-2xl border overflow-x-auto shadow-sm">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="theme-elevated border-b text-[11px] font-bold uppercase tracking-wider theme-text-muted">
              <th class="p-3">No BA</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">ISP & Lokasi</th>
              <th class="p-3">Layanan</th>
              <th class="p-3 text-right">Hasil Uji (DL/UL)</th>
              <th class="p-3 text-center">Analisis AI</th>
              <th class="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody id="baTableBody" class="divide-y theme-border">
            <tr>
              <td colspan="7" class="p-8 text-center theme-text-muted">Memuat data dari Google Sheets...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 3: ADMIN PANEL -->
    <section id="tabAdmin" class="hidden space-y-4">
      <div class="theme-card rounded-2xl p-6 border space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-xl">🛡️</span>
          <div>
            <h2 class="text-sm font-bold uppercase tracking-wider">Panel Administrator (PRO)</h2>
            <p class="text-xs theme-text-muted">Akses penuh audit log dan manajemen data portal RFS.</p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3 rounded-xl theme-elevated border text-center">
            <span class="text-[10px] uppercase font-bold theme-text-muted block">Status Sistem</span>
            <span class="text-sm font-bold text-emerald-500">Normal / Online</span>
          </div>
          <div class="p-3 rounded-xl theme-elevated border text-center">
            <span class="text-[10px] uppercase font-bold theme-text-muted block">Integrasi AI</span>
            <span class="text-sm font-bold text-sky-400">Gemini 1.5 Flash</span>
          </div>
          <div class="p-3 rounded-xl theme-elevated border text-center">
            <span class="text-[10px] uppercase font-bold theme-text-muted block">Database Sheet</span>
            <span class="text-sm font-bold text-amber-400">DataBA & Users</span>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 4: EKSPOR GAS -->
    <section id="tabGas" class="hidden space-y-4">
      <div class="theme-card rounded-2xl p-6 border space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-xl">⚡</span>
          <div>
            <h2 class="text-sm font-bold uppercase tracking-wider">Eksportir Kode Google Apps Script</h2>
            <p class="text-xs theme-text-muted">Kode backend Code.gs dan frontend Index.html siap dideploy.</p>
          </div>
        </div>
        <p class="text-xs theme-text-muted">File ini dihasilkan langsung oleh sistem Portal RFS untuk dipasang pada Google Apps Script Editor.</p>
      </div>
    </section>
  </main>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    // 1. Mobile Sidebar Toggle
    function toggleMobileSidebar() {
      const sb = document.getElementById('mainSidebar');
      const bd = document.getElementById('mobileBackdrop');
      const isClosed = sb.classList.contains('-translate-x-full');
      if (isClosed) {
        sb.classList.remove('-translate-x-full');
        bd.classList.remove('hidden');
      } else {
        sb.classList.add('-translate-x-full');
        bd.classList.add('hidden');
      }
    }

    // 2. Theme Switcher Logic
    function applyTheme(theme) {
      document.body.setAttribute('data-theme', theme);
      localStorage.setItem('rfs_portal_theme', theme);
    }
    const savedTheme = localStorage.getItem('rfs_portal_theme') || 'day';
    applyTheme(savedTheme);
    document.getElementById('themeSelector').value = savedTheme;

    // 3. Real-time Clock
    setInterval(function() {
      const now = new Date();
      document.getElementById('liveClock').innerText = now.toLocaleTimeString('id-ID') + ' WIB';
    }, 1000);

    // 4. Tab Switching
    function switchTab(tab) {
      document.getElementById('tabForm').classList.toggle('hidden', tab !== 'form');
      document.getElementById('tabTable').classList.toggle('hidden', tab !== 'table');
      document.getElementById('tabAdmin').classList.toggle('hidden', tab !== 'admin');
      document.getElementById('tabGas').classList.toggle('hidden', tab !== 'gas');
      
      const tabs = ['form', 'table', 'admin', 'gas'];
      const accent = getComputedStyle(document.body).getPropertyValue('--accent');
      
      tabs.forEach(function(t) {
        const btn = document.getElementById('tab-btn-' + t);
        if (btn) {
          if (t === tab) {
            btn.style.backgroundColor = accent;
            btn.style.color = '#ffffff';
          } else {
            btn.style.backgroundColor = '';
            btn.style.color = '';
          }
        }
      });

      const titles = {
        form: 'Form Input BA RFS',
        table: 'Tbl Rek BA',
        admin: 'Panel Administrator',
        gas: 'Eksportir Kode GAS'
      };
      if (document.getElementById('pageHeading')) {
        document.getElementById('pageHeading').innerText = titles[tab] || 'Portal Berita Acara RFS';
      }

      if (window.innerWidth < 768) {
        const sb = document.getElementById('mainSidebar');
        const bd = document.getElementById('mobileBackdrop');
        if (!sb.classList.contains('-translate-x-full')) {
          toggleMobileSidebar();
        }
      }

      if (tab === 'table') {
        loadTableData();
      }
    }

    // 4. HTML5 Signature Pad Init
    function initCanvas(id) {
      const canvas = document.getElementById(id);
      const ctx = canvas.getContext('2d');
      let isDrawing = false;
      
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * (canvas.width / rect.width),
          y: (clientY - rect.top) * (canvas.height / rect.height)
        };
      }

      function start(e) { isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
      function move(e) { if (!isDrawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      function stop() { isDrawing = false; }

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', stop);

      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', stop);
    }

    function clearCanvas(id) {
      const canvas = document.getElementById(id);
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    initCanvas('sigCanvasIsp');
    initCanvas('sigCanvasWaspang');
    initCanvas('sigCanvasNe');

    // 5. GPS Geolocation
    function detectGPSLocation() {
      if (!navigator.geolocation) {
        alert("Browser Anda tidak mendukung deteksi GPS Geolocation.");
        return;
      }
      const badge = document.getElementById('gpsStatusBadge');
      badge.classList.remove('hidden');
      badge.innerText = "Mendeteksi sinyal satelit GPS...";

      navigator.geolocation.getCurrentPosition(function(pos) {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const accuracy = Math.round(pos.coords.accuracy);
        
        document.getElementById('inputGpsCoords').value = lat + ", " + lng;
        badge.innerText = "✓ Koordinat GPS: " + lat + ", " + lng + " (Akurasi: ±" + accuracy + " m)";
        
        const addrField = document.getElementById('inputAddress');
        if (!addrField.value.includes("GPS:")) {
          addrField.value = (addrField.value ? addrField.value + " " : "") + "[GPS: " + lat + ", " + lng + "]";
        }
      }, function(err) {
        badge.innerText = "Gagal membaca GPS: " + err.message;
      }, { enableHighAccuracy: true, timeout: 10000 });
    }

    // 6. Demo Data Filler
    function fillDemoData() {
      document.getElementById('inputIsp').value = "PT Solusi Jaringan Nusantara (ISP)";
      document.getElementById('inputLocationName').value = "Cyber Tower 2 Lt. 18 - IDC Data Center";
      document.getElementById('inputAddress').value = "Jl. HR Rasuna Said Blok X-5 No. 13, Kuningan Timur, Jakarta Selatan";
      document.getElementById('inputSubBandwidth').value = 150;
      document.getElementById('selectBandwidthUnit').value = "Mbps";
      document.getElementById('selectServiceType').value = "Dedicated";
      document.getElementById('inputDlSpeed').value = 148.5;
      document.getElementById('inputUlSpeed').value = 147.0;
      document.getElementById('inputLatency').value = 8.5;
      document.getElementById('inputJitter').value = 1.1;
      document.getElementById('inputPacketLoss').value = 0.0;
    }

    // 7. Form Submission
    function handleFormSubmit(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.innerText = "Menganalisis AI & Menyimpan...";

      const payload = {
        isp: document.getElementById('inputIsp').value,
        customerName: document.getElementById('inputIsp').value,
        locationName: document.getElementById('inputLocationName').value,
        siteName: document.getElementById('inputLocationName').value,
        siteAddress: document.getElementById('inputAddress').value,
        gpsCoordinates: document.getElementById('inputGpsCoords').value,
        serviceType: document.getElementById('selectServiceType').value,
        subscribedBandwidth: document.getElementById('inputSubBandwidth').value,
        bandwidthUnit: document.getElementById('selectBandwidthUnit').value,
        downloadSpeed: document.getElementById('inputDlSpeed').value,
        uploadSpeed: document.getElementById('inputUlSpeed').value,
        pingLatency: document.getElementById('inputLatency').value,
        jitter: document.getElementById('inputJitter').value,
        packetLoss: document.getElementById('inputPacketLoss').value,
        ispSignerName: document.getElementById('signerIspName').value,
        waspangSignerName: document.getElementById('signerWaspangName').value,
        neSignerName: document.getElementById('signerNeName').value,
        technicianName: document.getElementById('signerIspName').value,
        picCustomerName: document.getElementById('signerWaspangName').value,
        signatureIsp: document.getElementById('sigCanvasIsp').toDataURL(),
        signatureWaspang: document.getElementById('sigCanvasWaspang').toDataURL(),
        signatureNe: document.getElementById('sigCanvasNe').toDataURL()
      };

      // Call Google Apps Script backend
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Simpan & Analisis AI Gemini";
            if (res.success) {
              alert("Sukses! Berita Acara tersimpan di Google Sheets.\\n\\nAnalisis Gemini: " + (res.aiAnalysis ? res.aiAnalysis.summary : "-"));
              switchTab('table');
            } else {
              alert("Error: " + res.message);
            }
          })
          .withFailureHandler(function(err) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Simpan & Analisis AI Gemini";
            alert("Gagal memanggil GAS: " + err.message);
          })
          .saveBeritaAcaraRFS(payload, "user@rfs.telco.id");
      } else {
        setTimeout(function() {
          submitBtn.disabled = false;
          submitBtn.innerText = "Simpan & Analisis AI Gemini";
          alert("Mode Preview Mandiri: Data siap disinkronkan ke Code.gs saat dideploy!");
        }, 1000);
      }
    }

    // 8. Load Table Data
    function loadTableData() {
      const tbody = document.getElementById('baTableBody');
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center theme-text-muted">Memuat data dari Google Sheets...</td></tr>';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (res.success && res.data.length > 0) {
              let html = '';
              res.data.forEach(function(r) {
                html += '<tr class="hover:opacity-90">';
                html += '<td class="p-3 font-mono font-bold">' + r.noBa + '</td>';
                html += '<td class="p-3">' + r.tanggal + '</td>';
                html += '<td class="p-3"><strong class="block">' + (r.isp || r.customerName) + '</strong><span class="text-[10px] theme-text-muted">' + (r.locationName || r.siteName) + '</span></td>';
                html += '<td class="p-3 font-semibold">' + r.serviceType + ' (' + r.subscribedBandwidth + ' ' + (r.bandwidthUnit || 'Mbps') + ')</td>';
                html += '<td class="p-3 text-right font-mono font-bold text-emerald-600">' + r.downloadSpeed + ' / ' + r.uploadSpeed + ' Mbps</td>';
                html += '<td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">' + (r.aiAnalysis ? r.aiAnalysis.rating : 'Optimal') + '</span></td>';
                html += '<td class="p-3 text-center"><button onclick="window.print()" class="px-2 py-1 rounded theme-elevated text-[11px] font-semibold border">Cetak</button></td>';
                html += '</tr>';
              });
              tbody.innerHTML = html;
            } else {
              tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center theme-text-muted">Belum ada dokumen rekapan di sheet DataBA.</td></tr>';
            }
          })
          .withFailureHandler(function(err) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-red-500">Gagal memuat: ' + err.message + '</td></tr>';
          })
          .getDataBA();
      } else {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center theme-text-muted">Jalankan di Google Apps Script untuk menghubungkan data sheet secara real-time.</td></tr>';
      }
    }

    function logoutSession() {
      localStorage.removeItem('rfs_user_session');
      alert("Sesi telah diakhiri.");
    }

    // 9. Reset Print Freeze & Pointer Locks
    window.addEventListener('afterprint', function() {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.pointerEvents = '';
      window.focus();
    });
    window.addEventListener('beforeprint', function() {
      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';
    });
  </script>
</body>
</html>
`;
