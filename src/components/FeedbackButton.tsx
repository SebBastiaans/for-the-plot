import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { errText } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const KINDS = [
  { v: "bug", label: "Something's wrong" },
  { v: "confusing", label: "How does this work?" },
  { v: "idea", label: "Idea" },
] as const;

const schema = z.object({ message: z.string().trim().min(1, "Write a few words first").max(2000, "Keep it under 2000 characters") });

export function FeedbackButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["v"]>("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ message });
    if (!parsed.success) { toast.error(parsed.error.issues[0]!.message); return; }
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({ page: pathname.slice(0, 300), kind, message: parsed.data.message });
    setBusy(false);
    if (error) { toast.error(errText(error)); return; }
    toast.success("Thanks! Your feedback was sent");
    setMessage(""); setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Send feedback"><MessageSquareText className="h-5 w-5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feedback on this page</DialogTitle>
          <DialogDescription>Tell us what's unclear or broken. We see which page you're on.</DialogDescription>
        </DialogHeader>
        <form onSubmit={send} className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type">
            {KINDS.map((k) => (
              <Button key={k.v} type="button" size="sm" role="radio" aria-checked={kind === k.v}
                variant={kind === k.v ? "default" : "secondary"} onClick={() => setKind(k.v)}>{k.label}</Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fb-msg">What happened?</Label>
            <Textarea id="fb-msg" rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={kind === "bug" ? "What did you do, and what went wrong?" : kind === "confusing" ? "What were you trying to do?" : "What would make this better?"} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send feedback"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
