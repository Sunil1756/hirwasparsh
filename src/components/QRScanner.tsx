import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onResult: (text: string) => void;
  onClose: () => void;
};

export default function QRScanner({ onResult, onClose }: Props) {
  const elId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(elId);
    scannerRef.current = scanner;
    let stopped = false;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (stopped) return;
          stopped = true;
          scanner.stop().then(() => onResult(decodedText)).catch(() => onResult(decodedText));
        },
        () => {/* ignore per-frame errors */}
      )
      .catch((e) => {
        console.error("QR scanner failed", e);
      });
    return () => {
      try { scanner.stop().catch(() => {}); } catch { /* noop */ }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl p-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading font-semibold mb-2 text-center">📷 Scan Tree QR Code</h3>
        <div id={elId} className="rounded-xl overflow-hidden" />
        <p className="text-xs text-center text-muted-foreground mt-2">
          Hold the printed/displayed Tree QR in front of your camera.
        </p>
        <button onClick={onClose} className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}
