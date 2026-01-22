import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * PDF Export utilities
 *
 * For MVP, this provides basic PDF generation.
 * Enhance with custom layouts, headers, footers, etc.
 */

export async function exportResultsToPDF(
  elementId: string,
  filename: string = "analysis-results.pdf"
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  pdf.save(filename);
}

export function generateAnalysisReport(
  projectName: string,
  projectType: string,
  data: any
): jsPDF {
  const pdf = new jsPDF();

  // Header
  pdf.setFontSize(20);
  pdf.text("CESSCalculator Analysis Report", 20, 20);

  pdf.setFontSize(12);
  pdf.text(`Project: ${projectName}`, 20, 35);
  pdf.text(`Type: ${projectType}`, 20, 42);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 49);

  // Content
  pdf.setFontSize(10);
  pdf.text("Results and diagrams will be rendered here.", 20, 65);

  return pdf;
}
