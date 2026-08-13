import { DiscordAuthButton } from "@/components/discord-auth-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthPanel({ error, message }: { error?: string; message?: string }) {
  return (
    <section className="w-full max-w-md">
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

      <Card className="bg-card/90 shadow-2xl backdrop-blur-xl">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">C</div>
          <CardTitle className="text-2xl">Welcome to Chumpspace</CardTitle>
          <CardDescription>Boards, decisions, and team context—all in one calm workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <DiscordAuthButton />
          <p className="mt-4 text-center text-xs text-muted-foreground">Sign in with your team Discord account to continue.</p>
        </CardContent>
      </Card>
    </section>
  );
}
