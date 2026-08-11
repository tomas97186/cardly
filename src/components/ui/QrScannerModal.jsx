import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";

// Scansione QR via fotocamera, senza librerie native — funziona ovunque ci sia
// getUserMedia (Android, iOS Safari, desktop con webcam), non solo su Chrome
// Android come l'alternativa BarcodeDetector nativa del browser.
export function QrScannerModal({ onScan, onClose }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream = null;
    let frameId = null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function tick(jsQR) {
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && !scannedRef.current) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          scannedRef.current = true;
          onScan(code.data);
          return;
        }
      }
      frameId = requestAnimationFrame(() => tick(jsQR));
    }

    (async () => {
      // getUserMedia doesn't exist at all in an insecure context (plain http,
      // other than localhost) — every browser hides the whole API rather than
      // asking for permission, which otherwise looks identical to a denied
      // permission from here. Worth telling apart: testing from a phone over
      // the dev server's LAN address (http://192.168.x.x:5173) hits exactly
      // this, not an actual permission problem.
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("boxes.cameraInsecureContext"));
        return;
      }
      try {
        // jsQR (~30KB) is Premium-only functionality — pulled in on demand instead
        // of bundled for every visitor, same lazy-loading precedent as jsPDF/Recharts.
        const [{ default: jsQR }, mediaStream] = await Promise.all([
          import("jsqr"),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }),
        ]);
        stream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick(jsQR);
        }
      } catch (e) {
        if (e.name === "NotAllowedError") setError(t("boxes.cameraPermissionDenied"));
        else if (e.name === "NotFoundError") setError(t("boxes.cameraNotFound"));
        else setError(t("boxes.cameraError"));
      }
    })();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Portal diretto su <body>, stesso motivo di Modal.jsx: qui si apre quasi
  // sempre da dentro un altro Modal (es. il picker "Posizione"), il cui overlay
  // con backdropFilter la intrappolerebbe altrimenti invece di coprire tutto lo
  // schermo.
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-[70] flex flex-col items-center justify-center px-5" style={{ background: "rgba(6,7,12,0.92)" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, color: "#fff" }}><X size={24} /></button>
      {error ? (
        <p className="text-sm text-center" style={{ color: "#fff" }}>{error}</p>
      ) : (
        <video ref={videoRef} playsInline muted style={{ width: "min(92vw, 420px)", borderRadius: 16 }} />
      )}
      <p className="text-[12.5px] mt-4 text-center" style={{ color: C.textFaint }}>{t("boxes.scanHint")}</p>
    </div>,
    document.body
  );
}
