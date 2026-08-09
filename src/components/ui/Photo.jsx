import { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Camera, ImageOff, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { C } from "../../lib/theme";
import { loadPhotoValue, loadThumbValue, loadPhotoValues } from "../../lib/storage";
import { resizeImage } from "../../lib/image";
import { useLanguage } from "../../context/LanguageContext";

// `photoKeys`, when passed, makes the thumb clickable and opens the full-screen
// lightbox over the whole set (starting at index 0) — used for cover thumbnails in
// detail views, which sit outside PhotoGallery's own strip-of-the-rest layout.
// `preferThumb` loads the small companion thumbnail instead of the full-size cover —
// only meaningful for the non-clickable, single-`photoKey` case (list rows), since
// only the first photo of an item ever gets a thumbnail generated (see storage.js).
export function PhotoThumb({ photoKey, photoKeys, fileNamePrefix, size = "100%", rounded = "12px", iconSize = 20, preferThumb = false }) {
  const [src, setSrc] = useState(null);
  const [lightboxUrls, setLightboxUrls] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  useEffect(() => {
    let active = true;
    setSrc(null);
    if (photoKey) (preferThumb ? loadThumbValue(photoKey) : loadPhotoValue(photoKey)).then((v) => { if (active) setSrc(v); });
    return () => { active = false; };
  }, [photoKey, preferThumb]);

  const clickable = !!(photoKeys && photoKeys.length);
  async function handleClick() {
    if (!clickable) return;
    const urls = lightboxUrls || (await loadPhotoValues(photoKeys));
    setLightboxUrls(urls);
    setLightboxIndex(0);
  }

  return (
    <>
      <div
        onClick={clickable ? handleClick : undefined}
        style={{ width: size, height: size, borderRadius: rounded, background: C.surfaceAlt, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: clickable ? "pointer" : undefined }}
      >
        {src ? <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageOff size={iconSize} color={C.textFaint} />}
      </div>
      {lightboxIndex !== null && lightboxUrls && (
        <Lightbox urls={lightboxUrls} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} fileNamePrefix={fileNamePrefix} />
      )}
    </>
  );
}

// ---------- Multi-photo picker used in forms: `value` is an array of data URLs
// (existing photos already loaded, plus any newly added ones); the first photo is
// the cover shown everywhere else in the app. ----------
export function PhotoPicker({ value, onChange, max = 3 }) {
  const { t } = useLanguage();
  const inputId = useId();
  const canAddMore = value.length < max;

  async function handleFiles(fileList) {
    const files = Array.from(fileList).slice(0, max - value.length);
    if (files.length === 0) return;
    const newUrls = await Promise.all(files.map((f) => resizeImage(f)));
    // Functional update: always appends onto whatever the latest state actually is
    // when this resolves, instead of the `value` this closure happened to capture
    // (photo resizing is async, so time passes between picking files and this running).
    onChange((prev) => [...prev, ...newUrls]);
  }
  function removeAt(idx) {
    onChange((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, idx) => (
          <div key={idx} style={{ position: "relative", width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {idx === 0 && value.length > 1 && (
              <span style={{ position: "absolute", left: 3, bottom: 3, background: "rgba(6,7,12,0.72)", color: C.gold, fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("photo.cover")}
              </span>
            )}
            <button
              type="button" onClick={() => removeAt(idx)}
              style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 999, background: "rgba(6,7,12,0.72)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {canAddMore && (
          <label
            key="add-tile"
            htmlFor={inputId}
            style={{ width: 72, height: 72, borderRadius: 12, background: C.surfaceAlt, border: `1.5px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Camera size={20} color={C.textFaint} />
          </label>
        )}
      </div>
      <span className="block text-[11px] mt-1.5" style={{ color: C.textFaint }}>
        {value.length === 0 ? t("photo.none") : t("photo.pickerCount", { count: value.length, max })}{value.length > 1 ? t("photo.firstIsCover") : ""}
      </span>
      <input
        id={inputId} type="file" accept="image/*" multiple className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length) await handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ---------- Read-only gallery for detail views: a row of thumbnails that open a
// full-screen lightbox with prev/next navigation. ----------
export function PhotoGallery({ photoKeys, fileNamePrefix, size = 72 }) {
  const { t } = useLanguage();
  const [urls, setUrls] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    let active = true;
    setUrls([]);
    if (photoKeys && photoKeys.length) loadPhotoValues(photoKeys).then((v) => { if (active) setUrls(v); });
    return () => { active = false; };
  }, [photoKeys]);

  // The first photo is already shown as the cover above this gallery, so here we
  // only list the rest — but the lightbox still lets you swipe back to the cover too,
  // since it navigates the full set.
  if (!photoKeys || photoKeys.length <= 1 || urls.length <= 1) return null;

  async function handleDownloadAll() {
    setDownloadingAll(true);
    try { await downloadAllPhotos(urls, fileNamePrefix); }
    finally { setDownloadingAll(false); }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>{t("photo.photoCount", { count: urls.length })}</span>
        <button onClick={handleDownloadAll} disabled={downloadingAll} className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: downloadingAll ? C.textFaint : C.info }}>
          <Download size={13} /> {downloadingAll ? t("photo.downloading") : t("photo.downloadAll")}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {urls.slice(1).map((url, i) => {
          const idx = i + 1;
          return (
            <button key={idx} onClick={() => setLightboxIndex(idx)} style={{ width: size, height: size, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.border}` }}>
              <img src={url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          );
        })}
      </div>
      {lightboxIndex !== null && (
        <Lightbox urls={urls} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} fileNamePrefix={fileNamePrefix} />
      )}
    </>
  );
}

function sanitizeFileName(name) {
  return (name || "foto").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 80);
}

// `url` may be a data: URL (artifact/legacy storage) or a remote https: signed URL
// (Supabase Storage) — the `download` attribute on an <a> is silently ignored by
// browsers for cross-origin URLs, which just navigates to it instead of downloading.
// Fetching the bytes first and downloading a same-origin blob: URL works either way.
async function downloadPhoto(url, index, prefix) {
  let href = url;
  let revoke = null;
  if (url.startsWith("http")) {
    try {
      const blob = await (await fetch(url)).blob();
      href = URL.createObjectURL(blob);
      revoke = href;
    } catch (e) {
      window.open(url, "_blank");
      return;
    }
  }
  const a = document.createElement("a");
  a.href = href;
  a.download = `${sanitizeFileName(prefix)} ${index + 1}.jpg`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  if (revoke) URL.revokeObjectURL(revoke);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Triggers one download per photo, one after another — browsers throttle/prompt for
// permission on rapid-fire automatic downloads, so a small pause between each keeps
// this reliable instead of silently dropping some.
async function downloadAllPhotos(urls, prefix) {
  for (let i = 0; i < urls.length; i++) {
    await downloadPhoto(urls[i], i, prefix);
    if (i < urls.length - 1) await wait(350);
  }
}

function Lightbox({ urls, index, onNavigate, onClose, fileNamePrefix }) {
  const { t } = useLanguage();
  // Rendered via a portal straight onto <body>: Modal's overlay uses backdropFilter,
  // which (like `transform`) creates a new containing block for `position: fixed`
  // descendants — without the portal, this would end up fixed to the Modal instead
  // of the viewport, appearing "trapped" inside it instead of truly full-screen.
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(6,7,12,0.92)" }} onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); downloadPhoto(urls[index], index, fileNamePrefix); }}
        style={{ position: "absolute", top: 16, right: 56, color: "#fff" }}
        title={t("photo.downloadOne")}
      >
        <Download size={22} />
      </button>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, color: "#fff" }}><X size={24} /></button>
      {urls.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate((index - 1 + urls.length) % urls.length); }}
          style={{ position: "absolute", left: 8, color: "#fff", padding: 8 }}
        >
          <ChevronLeft size={28} />
        </button>
      )}
      <img key={index} src={urls[index]} alt="" onClick={(e) => e.stopPropagation()} className="anim-scale-in" style={{ maxWidth: "88vw", maxHeight: "84vh", borderRadius: 12, objectFit: "contain" }} />
      {urls.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate((index + 1) % urls.length); }}
          style={{ position: "absolute", right: 8, color: "#fff", padding: 8 }}
        >
          <ChevronRight size={28} />
        </button>
      )}
      {urls.length > 1 && (
        <div style={{ position: "absolute", bottom: 20, color: "#fff", fontSize: 12 }}>{index + 1} / {urls.length}</div>
      )}
    </div>,
    document.body
  );
}
