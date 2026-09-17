import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AREAS, parseKeywords } from "@/lib/areas";
import { AlertTriangle, Pencil } from "lucide-react";

export const Route = createFileRoute("/mine")({
  head: () => ({
    meta: [
      { title: "Meus TCCs — Tcc Bahia" },
      { name: "description", content: "Acompanhe a situação dos seus trabalhos enviados, veja o motivo de rejeições e reenvie a versão corrigida para nova avaliação." },
      { property: "og:title", content: "Meus TCCs — Tcc Bahia" },
      { property: "og:description", content: "Situação dos seus envios, motivos de rejeição e reenvio corrigido." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MinePage,
});

function MinePage() {
  const { t: tr } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: tccs = [] } = useQuery({
    queryKey: ["tccs", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tccs").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = async (resubmit: boolean) => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("tccs")
      .update({
        title: editing.title,
        authors: editing.authors,
        advisor: editing.advisor ?? "",
        year: Number(editing.year),
        area: editing.area ?? "",
        abstract: editing.abstract,
        keywords: parseKeywords(Array.isArray(editing.keywords) ? editing.keywords.join(", ") : String(editing.keywords ?? "")),
        ...(resubmit ? { status: "pending" as const } : {}),
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      console.error("mine update error", error);
      return toast.error(tr("error.generic"));
    }
    toast.success(resubmit ? tr("mine.resubmitted") : tr("admin.updated"));
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["tccs"] });
  };

  if (loading || !user) return null;

  const statusVariant = (s: string) => (s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary");
  const statusLabel = (s: string) =>
    s === "approved" ? tr("admin.status.approved") : s === "rejected" ? tr("admin.status.rejected") : tr("admin.status.pending");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">{tr("mine.title")}</h1>
        {tccs.length === 0 && <p className="text-muted-foreground">{tr("mine.empty")}</p>}
        <div className="space-y-3">
          {tccs.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{t.year}{t.area ? ` · ${t.area}` : ""}</p>
                  </div>
                  <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {t.status === "rejected" && t.rejection_reason && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{tr("mine.rejectedReason")}</AlertTitle>
                    <AlertDescription>{t.rejection_reason}</AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{t.abstract}</p>
                {t.status === "approved" ? (
                  <p className="text-xs text-muted-foreground">{tr("mine.locked")}</p>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setEditing({ ...t })}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {t.status === "rejected" ? tr("mine.fix") : tr("admin.edit")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tr("admin.editTitle")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>{tr("admin.field.title")}</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>{tr("admin.field.authors")}</Label><Input value={editing.authors} onChange={(e) => setEditing({ ...editing, authors: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{tr("admin.field.year")}</Label><Input type="number" value={editing.year} onChange={(e) => setEditing({ ...editing, year: e.target.value })} /></div>
                <div>
                  <Label>{tr("admin.field.area")}</Label>
                  <Select value={editing.area ?? ""} onValueChange={(v) => setEditing({ ...editing, area: v })}>
                    <SelectTrigger><SelectValue placeholder={tr("submit.selectArea")} /></SelectTrigger>
                    <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{tr("admin.field.advisor")}</Label><Input value={editing.advisor ?? ""} onChange={(e) => setEditing({ ...editing, advisor: e.target.value })} /></div>
              <div>
                <Label>{tr("admin.field.keywords")}</Label>
                <Input
                  value={Array.isArray(editing.keywords) ? editing.keywords.join(", ") : editing.keywords ?? ""}
                  onChange={(e) => setEditing({ ...editing, keywords: e.target.value })}
                  placeholder={tr("submit.fKeywordsPh")}
                />
              </div>
              <div><Label>{tr("admin.field.abstract")}</Label><Textarea rows={8} value={editing.abstract} onChange={(e) => setEditing({ ...editing, abstract: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>{tr("admin.cancel")}</Button>
            <Button variant="secondary" onClick={() => save(false)} disabled={saving}>{tr("admin.save")}</Button>
            <Button onClick={() => save(true)} disabled={saving}>{tr("mine.resubmit")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
