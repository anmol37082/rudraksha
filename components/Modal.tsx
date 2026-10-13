"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} className="m-auto w-[min(32rem,92vw)] rounded-lg p-0 backdrop:bg-forest-900/50">
      <div className="p-5">
        <h2 className="mb-3 text-xl">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
