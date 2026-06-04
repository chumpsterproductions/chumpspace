"use client";

import { useId, useState } from "react";

export function FileInput({
  name,
  accept,
  buttonLabel,
  emptyLabel = "no file chosen",
}: {
  name: string;
  accept?: string;
  buttonLabel: string;
  emptyLabel?: string;
}) {
  const inputId = useId();
  const [fileName, setFileName] = useState(emptyLabel);

  return (
    <div className="surface flex items-center gap-3 px-4 py-3 text-sm">
      <label
        htmlFor={inputId}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[#c4d3ff] transition hover:opacity-90"
      >
        {buttonLabel}
      </label>
      <span className="min-w-0 truncate text-[var(--muted)]">{fileName}</span>
      <input
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          setFileName(nextFile?.name ?? emptyLabel);
        }}
      />
    </div>
  );
}
