import { useEffect, useState } from "react";
import { boxQrPayload } from "../../lib/boxQr";

// Genera l'immagine QR interamente lato client (nessun servizio esterno) — il
// contenuto è sempre boxQrPayload(code), mai il code nudo, così una scansione
// distingue un QR di Cardly da un QR qualsiasi. La libreria è Premium-only,
// quindi caricata a runtime invece di gonfiare il bundle per tutti (vedi
// QrScannerModal per lo stesso trattamento sul lato scansione).
export function BoxQrImage({ code, size = 160 }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let active = true;
    import("qrcode").then(({ default: QRCode }) =>
      QRCode.toDataURL(boxQrPayload(code), { width: size, margin: 1 })
    ).then((url) => {
      if (active) setSrc(url);
    });
    return () => { active = false; };
  }, [code, size]);

  if (!src) return <div style={{ width: size, height: size }} />;
  return <img src={src} alt={code} width={size} height={size} style={{ borderRadius: 8, display: "block" }} />;
}
