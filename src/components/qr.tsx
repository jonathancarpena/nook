'use client';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
export function JoinQR({ size = 120 }: { size?: number }) {
  const [url, setUrl] = useState(
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/join`
      : '',
  );
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      queueMicrotask(() => setUrl(`${window.location.origin}/join`));
    }
  }, []);
  return (
    <div className="qr-code">
      {url ? (
        <QRCodeSVG
          value={url}
          size={size}
          bgColor="#f5f1eb"
          fgColor="#17131c"
          level="M"
          title="Scan to join The Halloween Games"
        />
      ) : (
        <span
          style={{
            width: size,
            height: size,
            display: 'grid',
            placeItems: 'center',
            color: '#17131c',
          }}
        >
          Loading QR…
        </span>
      )}
    </div>
  );
}
