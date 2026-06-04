import type { Profile } from "@/lib/types";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function formatTimestamp(value?: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function compact<T>(items: Array<T | null | undefined>): T[] {
  return items.filter((item): item is T => item != null);
}

export function handleFromProfile(fullName: string | null, email: string) {
  const source = (fullName ?? email.split("@")[0]).toLowerCase();
  return source.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function normalizeDiscordUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export function getProfileHandle(profile: Pick<Profile, "discord_username" | "full_name" | "email">) {
  if (profile.discord_username != null && profile.discord_username.length > 0) {
    return normalizeDiscordUsername(profile.discord_username);
  }

  return handleFromProfile(profile.full_name, profile.email);
}

export function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url);
}

export function renderMentions(text: string) {
  const pieces = text.split(/(@[a-z0-9._-]+)/gi);

  return pieces.map((piece, index) => ({
    id: `${index}-${piece}`,
    value: piece,
    isMention: /^@[a-z0-9._-]+$/i.test(piece),
  }));
}
