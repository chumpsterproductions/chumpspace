import { DiscordAuthButton } from "@/components/discord-auth-button";

export function AuthPanel({ error, message }: { error?: string; message?: string }) {
  return (
    <section className="w-full max-w-fit lowercase">
      {error ? (
        <div className="mb-4 border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
          {message}
        </div>
      ) : null}

      <DiscordAuthButton />
    </section>
  );
}
