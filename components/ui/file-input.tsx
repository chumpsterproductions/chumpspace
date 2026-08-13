"use client";

import { useId, useState } from "react";
import { Upload } from "lucide-react";

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
    <div className="flex h-11 items-center gap-3 rounded-lg border border-input bg-background/70 px-3 text-sm shadow-sm">
      <label
        htmlFor={inputId}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-secondary text-secondary-foreground transition hover:bg-secondary/80"
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <Upload className="size-4" />
      </label>
      <span className="min-w-0 truncate text-muted-foreground">{fileName}</span>
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
