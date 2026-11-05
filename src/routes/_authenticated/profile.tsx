import { createFileRoute } from "@tanstack/react-router";
import { errText } from "@/components/States";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar, useAvatarUrls } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — For The Plot" },
      { name: "description", content: "Set your name and profile photo for the crew." },
      { property: "og:title", content: "Your profile — For The Plot" },
      { property: "og:description", content: "Set your name and profile photo for the crew." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: me } = useQuery({
    queryKey: ["profiles", "me", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).single()).data,
  });
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const avatarUrl = useAvatarUrls([me?.avatar_url]);

  useEffect(() => {
    if (me) setName(me.display_name);
  }, [me]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Pick an image"); return; }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const path = await uploadAvatar(userId, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Photo updated");
    } catch (e) {
      toast.error(errText(e));
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", userId);
    if (error) { toast.error(errText(error)); return; }
    qc.invalidateQueries({ queryKey: ["profiles"] });
    toast.success("Profile saved");
  }

  const src = preview ?? avatarUrl(me?.avatar_url);

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-24 sm:pt-28">
      <p className="eyebrow">You</p>
      <h1 className="mt-2 text-4xl">Profile</h1>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Avatar className="h-28 w-28 border-4 border-sage">
          {src && <AvatarImage src={src} className="object-cover" />}
          <AvatarFallback className="bg-accent text-3xl">{name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1}
          onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" /> {uploading ? "Uploading…" : "Choose photo"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">From your files, camera roll, or take a new one.</p>
      </div>
      <form onSubmit={save} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="n">Display name</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full sm:w-auto">Save</Button>
      </form>
      <Button type="button" variant="ghost" className="mt-10 w-full md:hidden"
        onClick={async () => { qc.clear(); await supabase.auth.signOut(); window.location.href = "/auth"; }}>
        Sign out
      </Button>
    </main>
  );
}
