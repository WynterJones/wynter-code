import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ value, size = 128, className }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return;
    }

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: "#cdd6f4",
        light: "#1e1e2e",
      },
    })
      .then(setDataUrl)
      .catch((err) => setError(err.message));
  }, [value, size]);

  if (error) {
    return (
      <div className={`flex items-center justify-center text-xs text-red-400 ${className}`}>
        QR Error
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-bg-tertiary animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={`rounded ${className}`}
    />
  );
}
