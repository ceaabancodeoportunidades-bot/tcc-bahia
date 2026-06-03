import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "Enviar TCC — Ceaa tcc" }] }),
  component: SubmitPage,
});

function SubmitPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [area, setArea] = useState("");
  const [abstract, setAbstract] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      let pdf_path: string | null = null;
      if (pdf) {
        const path = `${user.id}/${Date.now()}-${pdf.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("tcc-pdfs").upload(path, pdf);
        if (upErr) throw upErr;
        pdf_path = path;
      }
      const { error } = await supabase.from("tccs").insert({
        user_id: user.id, title, authors, advisor, year, area, abstract, pdf_path,
      });
      if (error) throw error;
      toast.success(t("submit.success"));
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? t("submit.error"));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t("submit.title")}</CardTitle>
            <CardDescription>{t("submit.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div><Label>{t("submit.fTitle")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("submit.fYear")}</Label><Input type="number" min={1990} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} required /></div>
                <div><Label>{t("submit.fArea")}</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("submit.fAreaPh")} /></div>
              </div>
              <div><Label>{t("submit.fAuthors")}</Label><Input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder={t("submit.fAuthorsPh")} required /></div>
              <div><Label>{t("submit.fAdvisor")}</Label><Input value={advisor} onChange={(e) => setAdvisor(e.target.value)} /></div>
              <div><Label>{t("submit.fAbstract")}</Label><Textarea rows={8} value={abstract} onChange={(e) => setAbstract(e.target.value)} required /></div>
              <div>
                <Label>{t("submit.fPdf")}</Label>
                <Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? t("submit.sending") : t("submit.send")}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}