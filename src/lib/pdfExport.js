import { jsPDF } from "jspdf";
import { money } from "./format";
import { loadPhotoValue } from "./storage";

const PAGE_W = 210, PAGE_H = 297, MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ROW_H = 24;
const PHOTO_SIZE = 18;

// Supabase Storage gives back a signed https: URL (not directly embeddable), while
// legacy/artifact storage already gives back a data: URL — normalize both to a base64
// data URL, which is what jsPDF's addImage needs to embed the bytes into the PDF.
async function toDataUrl(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

// `sections` is [{ gameLabel, gameColor, items: [{ name, setName, condition, language, photoKey, price }] }],
// already filtered/grouped by the caller (App.jsx knows the game filter and catalog order).
// Split from exportListingsPDF() so the layout logic can be exercised without a browser
// (no download side effect) — see scripts/ for the smoke test that does this.
export async function buildListingsPdfDoc(sections, t) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(needed) {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20);
  doc.text("Cardly", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text(t("pdfExport.generatedOn", { date: new Date().toLocaleDateString() }), PAGE_W - MARGIN, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text(t("pdfExport.title"), MARGIN, y);
  y += 10;

  for (const section of sections) {
    ensureSpace(16);
    try { doc.setFillColor(section.gameColor); } catch (e) { doc.setFillColor(150, 150, 150); }
    doc.rect(MARGIN, y, 3, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20);
    doc.text(section.gameLabel, MARGIN + 6, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(130);
    const total = section.items.reduce((s, it) => s + (it.price || 0), 0);
    const countLabel = t(section.items.length === 1 ? "pdfExport.itemsAndTotalOne" : "pdfExport.itemsAndTotalMany", { count: section.items.length, total: money(total) });
    doc.text(countLabel, PAGE_W - MARGIN, y + 6, { align: "right" });
    y += 12;
    doc.setDrawColor(225);
    doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);

    for (const item of section.items) {
      ensureSpace(ROW_H);

      doc.setDrawColor(225);
      doc.rect(MARGIN, y, PHOTO_SIZE, PHOTO_SIZE);
      const rawUrl = item.photoKey ? await loadPhotoValue(item.photoKey) : null;
      const photoData = rawUrl ? await toDataUrl(rawUrl) : null;
      if (photoData) {
        try {
          const props = doc.getImageProperties(photoData);
          const ratio = props.width / props.height;
          let w = PHOTO_SIZE, h = PHOTO_SIZE;
          if (ratio > 1) h = PHOTO_SIZE / ratio; else w = PHOTO_SIZE * ratio;
          doc.addImage(photoData, "JPEG", MARGIN + (PHOTO_SIZE - w) / 2, y + (PHOTO_SIZE - h) / 2, w, h);
        } catch (e) { /* keep the empty frame if the image can't be embedded */ }
      }

      const textX = MARGIN + PHOTO_SIZE + 4;
      const textW = CONTENT_W - PHOTO_SIZE - 4 - 32;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20);
      const nameLines = doc.splitTextToSize(item.name, textW).slice(0, 2);
      doc.text(nameLines, textX, y + 6);

      const gradingLabel = item.gradingCompany ? `${item.gradingCompany}${item.grade ? ` ${item.grade}` : ""}` : null;
      const subtitle = [gradingLabel, item.setName, item.condition, item.language].filter(Boolean).join(" · ");
      if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120);
        const subLines = doc.splitTextToSize(subtitle, textW).slice(0, 2);
        doc.text(subLines, textX, y + 6 + nameLines.length * 4.6 + 2);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(20);
      doc.text(money(item.price), PAGE_W - MARGIN, y + PHOTO_SIZE / 2 + 2, { align: "right" });

      y += ROW_H;
      doc.setDrawColor(240);
      doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);
    }
    y += 4;
  }

  return doc;
}

export async function exportListingsPDF(sections, t, filename) {
  const doc = await buildListingsPdfDoc(sections, t);
  doc.save(filename);
}
