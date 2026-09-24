import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { BeritaAcaraRFS } from "../types.ts";

export interface ExportPdfOptions {
  targetPages?: "all" | "page1" | "page2";
  onProgress?: (msg: string) => void;
  saveMode?: "save-as" | "download";
}

/**
 * Generates and triggers direct download of the official BA-RFS as a PDF file
 */
export async function generateAndDownloadPdf(
  record: BeritaAcaraRFS,
  options?: ExportPdfOptions
): Promise<boolean> {
  const target = options?.targetPages || "all";
  options?.onProgress?.("Menyiapkan dokumen...");

  const sanitizedNoBa = (record.noBa || "DOKUMEN").replace(/[/\\?%*:|"<>]/g, "-");
  const sanitizedLoc = (record.locationName || record.siteName || "Lokasi").replace(/[\s/\\?%*:|"<>]/g, "_");
  const pageSuffix = target === "page1" ? "_Lembar1" : target === "page2" ? "_Lembar2" : "";
  const filename = `BA-RFS_${sanitizedNoBa}_${sanitizedLoc}${pageSuffix}.pdf`;

  // Standard A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const sheetsToProcess: { id: string; name: string }[] = [];
  if (target === "all" || target === "page1") {
    sheetsToProcess.push({ id: "ba-sheet-1", name: "Lembar 1 (BA & TTD)" });
  }
  if (target === "all" || target === "page2") {
    sheetsToProcess.push({ id: "ba-sheet-2", name: "Lembar 2 (Evident POC)" });
  }

  let successCount = 0;

  for (let i = 0; i < sheetsToProcess.length; i++) {
    const sheetInfo = sheetsToProcess[i];
    options?.onProgress?.(`Memproses ${sheetInfo.name}...`);

    const element = document.getElementById(sheetInfo.id);
    if (!element) {
      console.warn(`Element #${sheetInfo.id} not found.`);
      continue;
    }

    // Hide UI elements with .no-print during capture
    const noPrintEls = element.querySelectorAll<HTMLElement>(".no-print");
    noPrintEls.forEach(el => {
      el.dataset.prevDisplay = el.style.display;
      el.style.display = "none";
    });

    // Ensure element is visible and scrolled to top before capture
    element.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    window.scrollTo(0, 0);

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution (retina 300dpi equivalent)
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200
      });

      if (successCount > 0) {
        pdf.addPage("a4", "portrait");
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 4; // 4mm margin
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight > pdfHeight - (margin * 2)) {
        const adjustedHeight = pdfHeight - (margin * 2);
        const adjustedWidth = (canvas.width * adjustedHeight) / canvas.height;
        const xOffset = margin + (contentWidth - adjustedWidth) / 2;
        pdf.addImage(imgData, "JPEG", xOffset, margin, adjustedWidth, adjustedHeight, undefined, "FAST");
      } else {
        pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, contentHeight, undefined, "FAST");
      }

      successCount++;
    } catch (err) {
      console.error(`Gagal render ${sheetInfo.name} ke canvas:`, err);
      throw err;
    } finally {
      noPrintEls.forEach(el => {
        el.style.display = el.dataset.prevDisplay || "";
        delete el.dataset.prevDisplay;
      });
    }
  }

  if (successCount === 0) {
    throw new Error("Tidak ada lembar dokumen yang dapat dirender ke PDF.");
  }

  options?.onProgress?.("Menyimpan file PDF...");

  // 1. Native Windows "Save As" (Simpan Sebagai) Dialog via File System Access API
  if (options?.saveMode === "save-as" && typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Dokumen PDF Berita Acara (*.pdf)",
            accept: {
              "application/pdf": [".pdf"]
            }
          }
        ]
      });
      const writable = await fileHandle.createWritable();
      const arrayBuffer = pdf.output("arraybuffer");
      await writable.write(arrayBuffer);
      await writable.close();
      return true;
    } catch (pickerErr: any) {
      if (pickerErr.name === "AbortError") {
        // User voluntarily closed the Save As dialog
        return false;
      }
      console.warn("SaveFilePicker tidak tersedia, beralih ke mode unduh standar:", pickerErr);
    }
  }

  // 2. Standard direct download with explicit application/pdf MIME type and permanent retention
  try {
    const rawBuffer = pdf.output("arraybuffer");
    const pdfBlob = new Blob([rawBuffer], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      // Retain blobUrl for at least 2 minutes so Edge / Chrome PDF viewer can stream and save
    }, 120000);
  } catch (_saveErr) {
    // 3. Fallback: jsPDF standard native save
    pdf.save(filename);
  }
  return true;
}
