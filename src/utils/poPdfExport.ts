import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export interface PoPdfExportOptions {
  fileName?: string;
  onProgress?: (message: string) => void;
}

/**
 * Ekspor dokumen PO Material ke file PDF A4 berkualitas tinggi
 */
export async function exportPoToPdf(
  elementId: string,
  options?: PoPdfExportOptions
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemen dokumen #${elementId} tidak ditemukan.`);
  }

  options?.onProgress?.("Menyiapkan dokumen PO...");

  // Sembunyikan elemen non-print selama pengambilan snapshot
  const noPrintEls = element.querySelectorAll<HTMLElement>(".no-print");
  noPrintEls.forEach((el) => {
    el.dataset.prevDisplay = el.style.display;
    el.style.display = "none";
  });

  // Simpan style asli container untuk render optimal
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  const originalBoxShadow = element.style.boxShadow;

  try {
    options?.onProgress?.("Merender lembar dokumen ke resolusi tinggi...");

    // Render snapshot kanvas A4
    const canvas = await html2canvas(element, {
      scale: 2.2, // 300 DPI retina quality
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15000,
      windowWidth: 1050
    });

    options?.onProgress?.("Menyusun berkas PDF A4...");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.96);
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 6; // 6mm margin tepi kertas
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight > pdfHeight - margin * 2) {
      // Skala pas jika melebihi tinggi A4
      const adjustedHeight = pdfHeight - margin * 2;
      const adjustedWidth = (canvas.width * adjustedHeight) / canvas.height;
      const xOffset = margin + (contentWidth - adjustedWidth) / 2;
      pdf.addImage(imgData, "JPEG", xOffset, margin, adjustedWidth, adjustedHeight, undefined, "FAST");
    } else {
      pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, contentHeight, undefined, "FAST");
    }

    const defaultFileName = options?.fileName || `PO_Material_${new Date().toISOString().slice(0, 10)}.pdf`;
    options?.onProgress?.("Mengunduh berkas PDF...");
    pdf.save(defaultFileName);

    return true;
  } catch (error) {
    console.error("Gagal mengekspor PO ke PDF:", error);
    throw error;
  } finally {
    // Kembalikan style elemen
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.boxShadow = originalBoxShadow;

    noPrintEls.forEach((el) => {
      el.style.display = el.dataset.prevDisplay || "";
      delete el.dataset.prevDisplay;
    });
  }
}
