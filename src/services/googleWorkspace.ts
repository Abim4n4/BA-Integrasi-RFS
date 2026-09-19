import { getAccessToken } from "../lib/firebase.ts";
import { BeritaAcaraRFS } from "../types.ts";

/**
 * Helper to ensure a valid Google Access Token is present
 */
async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Token Google Workspace belum tersedia. Silakan 'Sign in with Google' terlebih dahulu.");
  }
  return token;
}

// ==========================================
// 1. GOOGLE DRIVE API INTEGRATION
// ==========================================

const DRIVE_FOLDER_NAME = "BA-RFS - PT. FAJAR MITRA KRIDA ABADI";

/**
 * Finds or creates the dedicated BA-RFS folder in the user's Google Drive
 */
export async function getOrCreateDriveFolder(): Promise<string> {
  const token = await requireToken();

  // Search if folder exists
  const query = `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchRes.ok) {
    throw new Error(`Gagal mencari folder Google Drive: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder"
    })
  });

  if (!createRes.ok) {
    throw new Error(`Gagal membuat folder Google Drive: ${createRes.statusText}`);
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Uploads a BA-RFS Document to Google Drive
 */
export async function uploadBaDocumentToDrive(record: BeritaAcaraRFS): Promise<{
  fileId: string;
  webViewLink: string;
  fileName: string;
}> {
  const token = await requireToken();
  const folderId = await getOrCreateDriveFolder();

  const sanitizedNoBa = record.noBa.replace(/[/\\?%*:|"<>]/g, "-");
  const fileName = `BA-RFS_${sanitizedNoBa}_${record.locationName.replace(/\s+/g, "_")}.json`;

  // Multipart upload metadata + content
  const metadata = {
    name: fileName,
    parents: [folderId],
    description: `Arsip Resmi Dokumen BA-RFS PT. FAJAR MITRA KRIDA ABADI - No: ${record.noBa}`,
    properties: {
      noBa: record.noBa,
      isp: record.isp,
      location: record.locationName,
      status: record.status
    }
  };

  const fileContent = JSON.stringify(record, null, 2);
  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    fileContent +
    closeDelim;

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gagal menyimpan file ke Google Drive: ${errText}`);
  }

  const fileData = await uploadRes.json();
  return {
    fileId: fileData.id,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
    fileName: fileData.name
  };
}

// ==========================================
// 2. GOOGLE SHEETS API INTEGRATION
// ==========================================

export interface SheetExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowsAdded: number;
}

const SHEET_HEADERS = [
  "No BA",
  "Tanggal",
  "Waktu",
  "ISP / Mitra",
  "Nama Lokasi",
  "Alamat & GPS Koordinat",
  "Jenis Layanan",
  "Bandwidth",
  "Satuan",
  "Download (Mbps)",
  "Upload (Mbps)",
  "Ping (ms)",
  "Jitter (ms)",
  "Packet Loss (%)",
  "Nama Teknisi",
  "Kontak Teknisi",
  "PIC Pelanggan",
  "Kontak PIC",
  "Penandatangan ISP",
  "Penandatangan WASPANG",
  "Penandatangan NE",
  "Status RFS",
  "Catatan Teknis",
  "Waktu Input"
];

function recordToRow(r: BeritaAcaraRFS): any[] {
  return [
    r.noBa,
    r.tanggal,
    r.waktu,
    r.isp,
    r.locationName,
    `${r.siteAddress} ${r.gpsCoordinates ? `[GPS: ${r.gpsCoordinates}]` : ""}`,
    r.serviceType,
    r.subscribedBandwidth,
    r.bandwidthUnit,
    r.downloadSpeed,
    r.uploadSpeed,
    r.pingLatency,
    r.jitter,
    r.packetLoss,
    r.technicianName,
    r.technicianPhone,
    r.picCustomerName,
    r.picCustomerPhone,
    r.ispSignerName,
    r.waspangSignerName,
    r.neSignerName,
    r.status,
    r.generalNotes || "",
    r.createdAt
  ];
}

/**
 * Creates or updates a Google Sheet with all BA-RFS records
 */
export async function syncRecordsToGoogleSheet(
  records: BeritaAcaraRFS[],
  existingSpreadsheetId?: string
): Promise<SheetExportResult> {
  const token = await requireToken();

  let spreadsheetId = existingSpreadsheetId;
  let spreadsheetUrl = "";

  if (!spreadsheetId) {
    // Create new spreadsheet
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        properties: {
          title: "Rekapan BA-RFS - PT. FAJAR MITRA KRIDA ABADI"
        },
        sheets: [
          {
            properties: {
              title: "Data BA-RFS",
              gridProperties: {
                frozenRowCount: 1
              }
            }
          }
        ]
      })
    });

    if (!createRes.ok) {
      throw new Error(`Gagal membuat Google Sheet: ${await createRes.text()}`);
    }

    const sheetData = await createRes.json();
    spreadsheetId = sheetData.spreadsheetId;
    spreadsheetUrl = sheetData.spreadsheetUrl;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }

  // Populate data (Header + all rows)
  const rows = [SHEET_HEADERS, ...records.map(recordToRow)];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Data BA-RFS'!A1:X${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        range: `'Data BA-RFS'!A1:X${rows.length}`,
        majorDimension: "ROWS",
        values: rows
      })
    }
  );

  if (!updateRes.ok) {
    throw new Error(`Gagal menulis data ke Google Sheet: ${await updateRes.text()}`);
  }

  return {
    spreadsheetId: spreadsheetId!,
    spreadsheetUrl,
    rowsAdded: records.length
  };
}

// ==========================================
// 3. GMAIL API INTEGRATION
// ==========================================

export interface SendEmailPayload {
  to: string;
  cc?: string;
  subject: string;
  record: BeritaAcaraRFS;
  customNotes?: string;
}

/**
 * Encodes string to RFC 4648 Base64URL
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sends official BA-RFS Notification Email via Gmail API
 */
export async function sendBaEmailNotification(payload: SendEmailPayload): Promise<{ messageId: string }> {
  const token = await requireToken();
  const { to, cc, subject, record, customNotes } = payload;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: center; border-bottom: 4px solid #10b981; }
    .purple-strip { height: 6px; width: 140px; background: #50246a; margin: 0 auto 12px auto; border-radius: 3px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; font-style: italic; }
    .content { padding: 24px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #d1fae5; color: #065f46; }
    .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .table th { background: #f1f5f9; color: #475569; font-weight: 600; width: 35%; }
    .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="purple-strip"></div>
      <h1>PT. FAJAR MITRA KRIDA ABADI</h1>
      <p>Telecommunication & Civil Contractor</p>
    </div>
    <div class="content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 16px; color: #0f172a;">BERITA ACARA READY FOR SERVICE (BA-RFS)</h2>
        <span class="badge">${record.status}</span>
      </div>

      <p style="font-size: 13px; color: #475569;">
        Yth. Rekan Kerja & Mitra Bisnis,<br>
        Berikut disampaikan rincian penerbitan Berita Acara Ready For Service (BA-RFS) pelaksanaan aktivasi jaringan telekomunikasi:
      </p>

      <table class="table">
        <tr><th>Nomor BA</th><td><strong>${record.noBa}</strong></td></tr>
        <tr><th>Waktu Pelaksanaan</th><td>${record.tanggal} pukul ${record.waktu} WIB</td></tr>
        <tr><th>Penyedia Jasa (ISP)</th><td>${record.isp}</td></tr>
        <tr><th>Lokasi Instalasi</th><td>${record.locationName}</td></tr>
        <tr><th>Alamat & Koordinat</th><td>${record.siteAddress} ${record.gpsCoordinates ? `(${record.gpsCoordinates})` : ""}</td></tr>
        <tr><th>Jenis Layanan</th><td>${record.serviceType} - ${record.subscribedBandwidth} ${record.bandwidthUnit}</td></tr>
        <tr><th>Throughput Download</th><td><strong style="color: #059669;">${record.downloadSpeed} Mbps</strong></td></tr>
        <tr><th>Throughput Upload</th><td><strong style="color: #059669;">${record.uploadSpeed} Mbps</strong></td></tr>
        <tr><th>Latency / Jitter</th><td>${record.pingLatency} ms / ${record.jitter} ms</td></tr>
        <tr><th>Packet Loss</th><td>${record.packetLoss}%</td></tr>
        <tr><th>Teknisi Pelaksana</th><td>${record.technicianName} (${record.technicianPhone})</td></tr>
        <tr><th>Pihak Mengetahui</th><td>ISP: ${record.ispSignerName} | WASPANG: ${record.waspangSignerName} | NE: ${record.neSignerName}</td></tr>
      </table>

      ${
        customNotes
          ? `<div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; margin-top: 16px;">
              <strong>Pesan Tambahan:</strong><br>${customNotes}
            </div>`
          : ""
      }

      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        Dokumen ini dibuat dan dikirim secara otomatis melalui Portal Resmi BA-RFS PT. FAJAR MITRA KRIDA ABADI terintegrasi Firebase & Google Workspace.
      </p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} PT. FAJAR MITRA KRIDA ABADI • All rights reserved.
    </div>
  </div>
</body>
</html>
`;

  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit"
  ]
    .filter(Boolean)
    .join("\r\n");

  const rawEmail = `${headers}\r\n\r\n${htmlBody}`;
  const encodedEmail = base64UrlEncode(rawEmail);

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: encodedEmail
    })
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    throw new Error(`Gagal mengirim email melalui Gmail API: ${errText}`);
  }

  const result = await sendRes.json();
  return { messageId: result.id };
}
