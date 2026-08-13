import { DiscordAuthButton } from "@/components/discord-auth-button";

export function AuthPanel({ error, message }: { error?: string; message?: string }) {
  return (
    <section className="w-full max-w-xs">
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

      <div className="flex flex-col items-center gap-7 rounded-2xl border border-border bg-card/80 px-8 py-10 shadow-2xl backdrop-blur-xl">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-xl shadow-primary/20">C</div>
        <DiscordAuthButton />
      </div>
    </section>
  );
}
