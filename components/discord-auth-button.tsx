"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export function DiscordAuthButton() {
  return (
    <Button asChild size="icon" className="size-12 rounded-xl">
      <a href="/auth/discord" aria-label="Continue with Discord" title="Continue with Discord">
        <LogIn className="size-5" />
      </a>
    </Button>
  );
}
