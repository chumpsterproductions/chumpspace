import { cn } from "@/lib/utils";

function Separator({ className }: { className?: string }) { return <div role="separator" data-slot="separator" className={cn("h-px w-full shrink-0 bg-border", className)} />; }
export { Separator };
