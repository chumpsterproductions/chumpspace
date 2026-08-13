"use client";

import { useEffect, useState } from "react";
import { Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACCENT_STORAGE_KEY = "chumpspace-accent-color";
const BACKGROUND_STORAGE_KEY = "chumpspace-background-color";
const DEFAULT_ACCENT = "#fafafa";
const DEFAULT_BACKGROUND = "#09090b";
const ACCENT_PRESETS = ["#fafafa", "#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
const BACKGROUND_PRESETS = ["#09090b", "#18181b", "#1c1917", "#172033", "#f4f4f5", "#fafafa"];

function parseColor(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const channels = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return {
    red,
    green,
    blue,
    luminance: 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2],
  };
}

function shiftChannel(channel: number, amount: number) {
  return Math.max(0, Math.min(255, Math.round(channel + amount)));
}

function toHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function shiftedColor(red: number, green: number, blue: number, amount: number) {
  return toHex(shiftChannel(red, amount), shiftChannel(green, amount), shiftChannel(blue, amount));
}

function applyAccentColor(color: string) {
  const { red, green, blue, luminance } = parseColor(color);
  const root = document.documentElement;

  root.style.setProperty("--primary", color);
  root.style.setProperty("--primary-foreground", luminance > 0.36 ? "#09090b" : "#fafafa");
  root.style.setProperty("--ring", color);
  root.style.setProperty("--border-strong", `rgba(${red}, ${green}, ${blue}, 0.55)`);
  root.style.setProperty("--accent-soft", `rgba(${red}, ${green}, ${blue}, 0.14)`);
}

function applyBackgroundColor(color: string) {
  const { red, green, blue, luminance } = parseColor(color);
  const isLight = luminance > 0.42;
  const root = document.documentElement;
  const foreground = isLight ? "#09090b" : "#fafafa";
  const card = shiftedColor(red, green, blue, isLight ? -8 : 7);
  const raised = shiftedColor(red, green, blue, isLight ? -16 : 18);
  const secondary = shiftedColor(red, green, blue, isLight ? -20 : 24);
  const mutedForeground = isLight ? "#52525b" : "#a1a1aa";
  const border = isLight ? "rgba(9, 9, 11, 0.14)" : "rgba(255, 255, 255, 0.10)";
  const input = isLight ? "rgba(9, 9, 11, 0.18)" : "rgba(255, 255, 255, 0.13)";

  root.style.colorScheme = isLight ? "light" : "dark";
  root.style.setProperty("--background", color);
  root.style.setProperty("--foreground", foreground);
  root.style.setProperty("--card", card);
  root.style.setProperty("--card-foreground", foreground);
  root.style.setProperty("--popover", card);
  root.style.setProperty("--popover-foreground", foreground);
  root.style.setProperty("--secondary", secondary);
  root.style.setProperty("--secondary-foreground", foreground);
  root.style.setProperty("--muted", secondary);
  root.style.setProperty("--muted-foreground", mutedForeground);
  root.style.setProperty("--accent", raised);
  root.style.setProperty("--accent-foreground", foreground);
  root.style.setProperty("--border", border);
  root.style.setProperty("--input", input);
  root.style.setProperty("--panel", card);
  root.style.setProperty("--panel-strong", card);
  root.style.setProperty("--surface-raised", raised);
  root.style.setProperty("--surface-soft", isLight ? "rgba(9, 9, 11, 0.045)" : "rgba(255, 255, 255, 0.045)");
  root.style.setProperty("--line", border);
}

function ColorSetting({
  color,
  defaultColor,
  label,
  presets,
  storageKey,
  onChange,
  icon,
}: {
  color: string;
  defaultColor: string;
  label: string;
  presets: string[];
  storageKey: string;
  onChange: (color: string) => void;
  icon: React.ReactNode;
}) {
  function updateColor(nextColor: string) {
    const normalized = nextColor.toLowerCase();
    onChange(normalized);
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return;
    window.localStorage.setItem(storageKey, normalized);
    if (storageKey === ACCENT_STORAGE_KEY) applyAccentColor(normalized);
    else applyBackgroundColor(normalized);
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">{icon}{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="size-7 rounded-full border border-border outline-none ring-offset-2 ring-offset-background transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: preset, boxShadow: color === preset ? "0 0 0 2px var(--background), 0 0 0 4px var(--foreground)" : undefined }}
            onClick={() => updateColor(preset)}
            aria-label={`Use ${preset} ${label.toLowerCase()}`}
            aria-pressed={color === preset}
            title={preset}
          />
        ))}
        <label className="relative size-9 cursor-pointer overflow-hidden rounded-md border border-input bg-background" title={`Custom ${label.toLowerCase()}`}>
          <Palette className="pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2" />
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : defaultColor} onChange={(event) => updateColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Choose custom ${label.toLowerCase()}`} />
        </label>
      </div>
      <div className="flex gap-2">
        <Input value={color} onChange={(event) => updateColor(event.target.value)} maxLength={7} aria-label={`${label} hex color`} className="font-mono" />
        <Button type="button" variant="outline" size="icon" onClick={() => updateColor(defaultColor)} aria-label={`Reset ${label.toLowerCase()}`} title={`Reset ${label.toLowerCase()}`}><RotateCcw /></Button>
      </div>
    </div>
  );
}

export function AccentColorPicker() {
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);
      const savedBackground = window.localStorage.getItem(BACKGROUND_STORAGE_KEY);
      if (savedAccent != null && /^#[0-9a-f]{6}$/i.test(savedAccent)) setAccentColor(savedAccent);
      if (savedBackground != null && /^#[0-9a-f]{6}$/i.test(savedBackground)) setBackgroundColor(savedBackground);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="grid gap-6">
      <ColorSetting color={accentColor} defaultColor={DEFAULT_ACCENT} label="Accent" presets={ACCENT_PRESETS} storageKey={ACCENT_STORAGE_KEY} onChange={setAccentColor} icon={<Palette className="size-4 text-muted-foreground" />} />
      <ColorSetting color={backgroundColor} defaultColor={DEFAULT_BACKGROUND} label="Background" presets={BACKGROUND_PRESETS} storageKey={BACKGROUND_STORAGE_KEY} onChange={setBackgroundColor} icon={parseColor(backgroundColor).luminance > 0.42 ? <Sun className="size-4 text-muted-foreground" /> : <Moon className="size-4 text-muted-foreground" />} />
    </div>
  );
}
