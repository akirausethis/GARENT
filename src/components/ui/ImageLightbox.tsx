import React, { useState } from "react";
import { Modal } from "./Modal";
import { ExternalLink, Image as ImageIcon, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

export function ImageLightbox({
  isOpen,
  onClose,
  imageUrl,
  title = "Bukti Pembayaran",
  subtitle = "Dokumen resmi pelunasan sewa garasi",
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);

  const resetZoom = () => setZoom(1);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetZoom();
        onClose();
      }}
      title={title}
      subtitle={subtitle}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Controls bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((prev) => Math.min(prev + 0.25, 2.5))}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 flex items-center gap-1"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Perbesar</span>
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.75))}
              className="p-1.5 rounded hover:bg-slate-100 text-slate-700 flex items-center gap-1"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Perkecil</span>
            </button>
            <span className="text-slate-400 tabular-nums">({Math.round(zoom * 100)}%)</span>
          </div>

          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-steel-700 hover:text-steel-900 font-medium"
          >
            <span>Buka di tab baru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Image Display */}
        <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-100/70 rounded-lg p-2 border border-slate-200">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Bukti Transaksi"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              className="max-h-[60vh] max-w-full object-contain rounded transition-transform duration-150"
            />
          ) : (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 stroke-[1.5]" />
              <p className="text-xs">Gambar bukti pembayaran tidak tersedia.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
