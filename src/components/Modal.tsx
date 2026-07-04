"use client";

import { ReactNode, useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-accent">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {icon && <span className="text-2xl">{icon}</span>}
              <div>
                <h2 className="text-xl font-bold leading-tight">{title}</h2>
                {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-lg px-2 py-1 text-white/90 transition hover:bg-white/20"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
