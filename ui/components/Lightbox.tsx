"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LbImage = { src: string; name: string };

/** Visualizador de imagem em tela cheia: zoom, arrastar, anterior/próxima, baixar, fechar. */
export function Lightbox({ images, start, onClose }: { images: LbImage[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const img = images[i];

  const go = useCallback(
    (d: number) => {
      setI((n) => (n + d + images.length) % images.length);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    [images.length]
  );
  const zoomBy = (f: number) =>
    setZoom((z) => {
      const n = Math.min(8, Math.max(1, +(z * f).toFixed(2)));
      if (n === 1) setPan({ x: 0, y: 0 });
      return n;
    });

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && images.length > 1) go(1);
      else if (e.key === "ArrowLeft" && images.length > 1) go(-1);
      else if (e.key === "+" || e.key === "=") zoomBy(1.25);
      else if (e.key === "-") zoomBy(0.8);
      else if (e.key === "0") (setZoom(1), setPan({ x: 0, y: 0 }));
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [go, onClose, images.length]);

  if (!img) return null;
  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label={`Imagem: ${img.name}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lb__bar">
        <span className="lb__name" title={img.name}>
          {img.name}
          {images.length > 1 ? <span className="lb__count"> · {i + 1} de {images.length}</span> : null}
        </span>
        <div className="lb__tools">
          <button type="button" onClick={() => zoomBy(0.8)} disabled={zoom <= 1} aria-label="Diminuir" title="Diminuir (−)">
            −
          </button>
          <button type="button" className="lb__pct" onClick={() => (setZoom(1), setPan({ x: 0, y: 0 }))} title="Ajustar à tela (0)">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={() => zoomBy(1.25)} disabled={zoom >= 8} aria-label="Aumentar" title="Aumentar (+)">
            +
          </button>
          <a href={`${img.src}?baixar=1`} download={img.name} aria-label="Baixar" title="Baixar">
            ↓
          </a>
          <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar (Esc)">
            ✕
          </button>
        </div>
      </div>
      {images.length > 1 ? (
        <>
          <button type="button" className="lb__nav lb__nav--prev" onClick={() => go(-1)} aria-label="Imagem anterior">
            ‹
          </button>
          <button type="button" className="lb__nav lb__nav--next" onClick={() => go(1)} aria-label="Próxima imagem">
            ›
          </button>
        </>
      ) : null}
      <div
        className={`lb__stage${zoom > 1 ? " lb__stage--zoom" : ""}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) return onClose();
          if (zoom > 1) drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onMouseMove={(e) => drag.current && setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y })}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.1 : 0.9)}
        onDoubleClick={() => (zoom > 1 ? (setZoom(1), setPan({ x: 0, y: 0 })) : setZoom(2))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.src} alt={img.name} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} />
      </div>
    </div>
  );
}
