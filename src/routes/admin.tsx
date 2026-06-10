import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { Check, X, Trash2, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Tcc Bahia" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { t: tr } = useI18n();
  const { user, isAdmin, isTeacher, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && (!user || !(isAdmin || isTeacher))) navigate({ to: "/" });
  }, [user, isAdmin, isTeacher, loading, navigate]);

  const { data: tccs = [] } = useQuery({
    queryKey: ["tccs", "admin"],
    enabled: !!user && (isAdmin || isTeacher),
    queryFn: async () => {
      const { data, error } = await supabase.from("tccs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
    const { error } = await supabase.from("tccs").update({ status }).eq("id", id);
    if (error) {
      console.error("update status error", error);
      return toast.error(tr("error.generic"));
    }
    toast.success(tr("admin.updated"));
    qc.invalidateQueries({ queryKey: ["tccs"] });
  };

  const del = async (id: string) => {
    if (!confirm(tr("admin.confirmDelete"))) return;
    const { error } = await supabase.from("tccs").delete().eq("id", id);
    if (error) {
      console.error("delete tcc error", error);
      return toast.error(tr("error.generic"));
    }
    toast.success(tr("admin.deleted"));
    qc.invalidateQueries({ queryKey: ["tccs"] });
  };

  const toggleRecommend = async (id: string, current: boolean) => {
    const { error } = await supabase.from("tccs").update({ recommended: !current }).eq("id", id);
    if (error) {
      console.error("recommend error", error);
      return toast.error(tr("error.generic"));
    }
    toast.success(tr("admin.updated"));
    qc.invalidateQueries({ queryKey: ["tccs"] });
  };

  if (loading || !user || !(isAdmin || isTeacher)) return null;

  const statusVariant = (s: string) =>
    s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
  const statusLabel = (s: string) =>
    s === "approved" ? tr("admin.status.approved") : s === "rejected" ? tr("admin.status.rejected") : tr("admin.status.pending");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">{tr("admin.title")}</h1>
        <div className="space-y-3">
          {tccs.length === 0 && <p className="text-muted-foreground">{tr("admin.empty")}</p>}
          {tccs.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.year} · {t.authors}{t.area ? ` · ${t.area}` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{t.abstract}</p>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && t.status !== "approved" && (
                    <Button size="sm" onClick={() => setStatus(t.id, "approved")}><Check className="h-4 w-4 mr-1" />{tr("admin.approve")}</Button>
                  )}
                  {isAdmin && t.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "rejected")}><X className="h-4 w-4 mr-1" />{tr("admin.reject")}</Button>
                  )}
                  {t.status === "approved" && (
                    <Button
                      size="sm"
                      variant={t.recommended ? "default" : "outline"}
                      onClick={() => toggleRecommend(t.id, t.recommended)}
                    >
                      <Star className={`h-4 w-4 mr-1 ${t.recommended ? "fill-current" : ""}`} />
                      {t.recommended ? tr("admin.unrecommend") : tr("admin.recommend")}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="destructive" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 mr-1" />{tr("admin.delete")}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}