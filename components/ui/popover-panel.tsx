"use client";

import { useEffect, useRef, useState } from "react";

type PopoverPanelProps = {
  align?: "left" | "right";
  panelClassName?: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
};

export function PopoverPanel({
  align = "right",
  panelClassName = "",
  trigger,
  children,
}: PopoverPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen === false) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node) === true) {
        return;
      }

      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((current) => current === false)} className="contents">
        {trigger}
      </button>
      {isOpen ? (
        <div
          className={`absolute top-[calc(100%+0.75rem)] z-[110] w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 text-left text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
