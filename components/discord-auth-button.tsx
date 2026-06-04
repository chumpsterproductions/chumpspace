"use client";

export function DiscordAuthButton() {
  return (
    <a
      href="/auth/discord"
      className="surface px-4 py-3 text-sm transition hover:border-[var(--border-strong)] hover:text-[#a9c0ff]"
    >
      continue with discord
    </a>
  );
}
