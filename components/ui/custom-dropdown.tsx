"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type CustomDropdownOption = {
  value: string;
  label: string;
  color?: string;
};

type CustomDropdownProps = {
  buttonClassName?: string;
  className?: string;
  name?: string;
  onChange?: (nextValue: string) => void;
  options: CustomDropdownOption[];
  placeholder?: string;
  value?: string;
};

export function CustomDropdown({
  buttonClassName = "",
  className = "",
  name,
  onChange,
  options,
  placeholder = "select option",
  value,
}: CustomDropdownProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(options[0]?.value ?? "");
  const currentValue = value ?? uncontrolledValue;

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === currentValue) ?? null;
  }, [currentValue, options]);

  useEffect(() => {
    if (value != null) {
      return;
    }

    if (options.some((option) => option.value === uncontrolledValue)) {
      return;
    }

    setUncontrolledValue(options[0]?.value ?? "");
  }, [options, uncontrolledValue, value]);

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

  function updateValue(nextValue: string) {
    if (value == null) {
      setUncontrolledValue(nextValue);
    }

    onChange?.(nextValue);
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name != null ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        onClick={() => setIsOpen((current) => current === false)}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background/70 px-3 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 ${buttonClassName}`}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {selectedOption?.color ? (
            <span className="h-3 w-3 shrink-0 border border-white/15" style={{ background: selectedOption.color }} />
          ) : null}
          <span className={`truncate ${selectedOption == null ? "text-muted-foreground" : ""}`}>
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-[120] min-w-full rounded-lg border border-border bg-popover p-1.5 shadow-xl"
        >
          <div className="grid gap-1">
            {options.map((option) => {
              const isSelected = option.value === currentValue;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => updateValue(option.value)}
                  className={`flex w-full items-center justify-between gap-3 border px-3 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                  }`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {option.color ? (
                      <span className="h-3 w-3 shrink-0 border border-white/15" style={{ background: option.color }} />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
