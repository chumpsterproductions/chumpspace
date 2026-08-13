"use client";

import { Button } from "@/components/ui/button";

export function DiscordAuthButton() {
  return (
    <Button asChild size="lg" className="w-full">
      <a href="/auth/discord">Continue with Discord</a>
    </Button>
  );
}
