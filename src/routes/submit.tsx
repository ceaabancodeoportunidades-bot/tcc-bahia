import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { AREAS, parseKeywords, similarity } from "@/lib/areas";
import { AlertTriangle } from "lucide-react";

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB

async function isValidPdf(file: File): Promise<boolean> {
  if (file.type && file.type !== "application/pdf") return false;
  if (!/\.pdf$/i.test(file.name)) return false;
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
}

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Enviar TCC — Tcc Bahia" },
      { name: "description", content: "Envie seu trabalho de conclusão de curso do ensino médio: título, autores, ano, área, orientador, resumo, palavras-chave e o arquivo PDF para avaliação dos professores." },
      { property: "og:title", content: "Enviar TCC — Tcc Bahia" },
      { property: "og:description", content: "Formulário para alunos enviarem seu TCC com resumo e PDF para avaliação dos professores." },
      { property: "og:url", content: "https://tcc-bahia.lovable.app/submit" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://tcc-bahia.lovable.app/submit" }],
  }),
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
  const [area, setArea] = useState<string>("");
  const [abstract, setAbstract] = useState("");
  const [keywords, setKeywords] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [dupes, setDupes] = useState<{ id: string; title: string; year: number }[]>([]);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const findDuplicates = async () => {
    const { data } = await supabase.from("tccs").select("id,title,year").eq("status", "approved");
    return (data ?? []).filter((r) => similarity(r.title, title) >= 0.5);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      if (!forced) {
        const found = await findDuplicates();
        if (found.length > 0) {
          setDupes(found);
          setForced(true);
          setSaving(false);
          return;
        }
      }
      let pdf_path: string | null = null;
      if (pdf) {
        if (pdf.size > MAX_PDF_BYTES) {
          toast.error(t("submit.fileTooLarge"));
          setSaving(false);
          return;
        }
        if (!(await isValidPdf(pdf))) {
          toast.error(t("submit.invalidPdf"));
          setSaving(false);
          return;
        }
        const path = `${user.id}/${Date.now()}-${pdf.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("tcc-pdfs")
          .upload(path, pdf, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;
        pdf_path = path;
      }
      const { error } = await supabase.from("tccs").insert({
        user_id: user.id, title, authors, advisor, year, area, abstract, pdf_path,
        keywords: parseKeywords(keywords),
      });
      if (error) throw error;
      toast.success(t("submit.success"));
      navigate({ to: "/mine" });
    } catch (err) {
      console.error("submit error", err);
      toast.error(t("submit.error"));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">{t("submit.title")}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t("submit.title")}</CardTitle>
            <CardDescription>{t("submit.desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {dupes.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("submit.duplicateTitle")}</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">{t("submit.duplicateDesc")}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {dupes.map((d) => (
                      <li key={d.id}>
                        <a className="underline" href={`/tcc/${d.id}`} target="_blank" rel="noreferrer">
                          {d.title} ({d.year})
                        </a>
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div><Label>{t("submit.fTitle")}</Label><Input value={title} onChange={(e) => { setTitle(e.target.value); setForced(false); setDupes([]); }} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("submit.fYear")}</Label><Input type="number" min={1990} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} required /></div>
                <div>
                  <Label>{t("submit.fArea")}</Label>
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger><SelectValue placeholder={t("submit.selectArea")} /></SelectTrigger>
                    <SelectContent>
                      {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>{t("submit.fAuthors")}</Label><Input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder={t("submit.fAuthorsPh")} required /></div>
              <div><Label>{t("submit.fAdvisor")}</Label><Input value={advisor} onChange={(e) => setAdvisor(e.target.value)} /></div>
              <div><Label>{t("submit.fKeywords")}</Label><Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={t("submit.fKeywordsPh")} /></div>
              <div><Label>{t("submit.fAbstract")}</Label><Textarea rows={8} value={abstract} onChange={(e) => setAbstract(e.target.value)} required /></div>
              <div>
                <Label>{t("submit.fPdf")}</Label>
                <Input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? t("submit.sending") : dupes.length > 0 ? t("submit.duplicateContinue") : t("submit.send")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
