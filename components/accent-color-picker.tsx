"use client";

import { useEffect, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "chumpspace-accent-color";
const DEFAULT_ACCENT = "#fafafa";
const PRESETS = ["#fafafa", "#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

function applyAccentColor(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const channels = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const root = document.documentElement;

  root.style.setProperty("--primary", color);
  root.style.setProperty("--primary-foreground", luminance > 0.36 ? "#09090b" : "#fafafa");
  root.style.setProperty("--ring", color);
  root.style.setProperty("--border-strong", `rgba(${red}, ${green}, ${blue}, 0.55)`);
  root.style.setProperty("--accent-soft", `rgba(${red}, ${green}, ${blue}, 0.14)`);
}

export function AccentColorPicker() {
  const [color, setColor] = useState(DEFAULT_ACCENT);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedColor = window.localStorage.getItem(STORAGE_KEY);
      if (savedColor != null && /^#[0-9a-f]{6}$/i.test(savedColor)) setColor(savedColor);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function updateColor(nextColor: string) {
    const normalized = nextColor.toLowerCase();
    setColor(normalized);
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return;
    window.localStorage.setItem(STORAGE_KEY, normalized);
    applyAccentColor(normalized);
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Palette className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Accent</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="size-7 rounded-full border border-white/15 outline-none ring-offset-2 ring-offset-background transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: preset, boxShadow: color === preset ? "0 0 0 2px var(--background), 0 0 0 4px var(--foreground)" : undefined }}
            onClick={() => updateColor(preset)}
            aria-label={`Use ${preset} accent`}
            aria-pressed={color === preset}
            title={preset}
          />
        ))}
        <label className="relative size-9 cursor-pointer overflow-hidden rounded-md border border-input bg-background" title="Custom accent">
          <Palette className="pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2" />
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_ACCENT} onChange={(event) => updateColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Choose custom accent" />
        </label>
      </div>
      <div className="flex gap-2">
        <Input value={color} onChange={(event) => updateColor(event.target.value)} maxLength={7} aria-label="Accent hex color" className="font-mono" />
        <Button type="button" variant="outline" size="icon" onClick={() => updateColor(DEFAULT_ACCENT)} aria-label="Reset accent" title="Reset accent"><RotateCcw /></Button>
      </div>
    </div>
  );
}
