import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mt-8 flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, label = "Couldn't load this." }: { error?: unknown; onRetry?: () => void; label?: string }) {
  return (
    <div role="alert" className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-5 w-5" />{label}</div>
      {error instanceof Error && <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>}
      {onRetry && <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Friendly text for an error from the database or storage. */
export function errText(e: unknown) {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "No connection. Check your internet and try again.";
  if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return "That file is too big.";
  return m;
}
