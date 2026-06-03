import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acervo de TCCs do Ensino Médio" },
      { name: "description", content: "Banco de trabalhos de conclusão de curso (TCC) do ensino médio. Explore resumos por ano, área e autor." },
      { property: "og:title", content: "Acervo de TCCs do Ensino Médio" },
      { property: "og:description", content: "Explore trabalhos de conclusão de curso por ano, área e autor." },
    ],
  }),
  component: Index,
});

function Index() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string>("all");
  const [area, setArea] = useState<string>("all");

  const { data: tccs = [], isLoading } = useQuery({
    queryKey: ["tccs", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tccs")
        .select("*")
        .eq("status", "approved")
        .order("year", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const years = useMemo(() => Array.from(new Set(tccs.map((t) => t.year))).sort((a, b) => b - a), [tccs]);
  const areas = useMemo(() => Array.from(new Set(tccs.map((t) => t.area).filter(Boolean))).sort(), [tccs]);

  const filtered = tccs.filter((t) => {
    if (year !== "all" && t.year !== Number(year)) return false;
    if (area !== "all" && t.area !== area) return false;
    if (q) {
      const s = q.toLowerCase();
      return t.title.toLowerCase().includes(s) || t.authors.toLowerCase().includes(s) || t.abstract.toLowerCase().includes(s);
    }
    return true;
  });

  const downloadPdf = async (path: string) => {
    const { data, error } = await supabase.storage.from("tcc-pdfs").createSignedUrl(path, 60);
    if (error || !data) return;
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10">
        <section className="mb-10 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Acervo de TCCs</h1>
          <p className="text-muted-foreground text-lg">
            Trabalhos de conclusão de curso do ensino médio — anos anteriores e atuais.
          </p>
        </section>

        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por título, autor ou resumo" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum TCC encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge variant="secondary">{t.year}</Badge>
                    {t.area && <Badge variant="outline">{t.area}</Badge>}
                  </div>
                  <CardTitle className="text-lg leading-snug">{t.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">por {t.authors}{t.advisor ? ` · orient.: ${t.advisor}` : ""}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-5 flex-1">{t.abstract}</p>
                  {t.pdf_path && (
                    <Button variant="outline" size="sm" className="mt-4 w-fit" onClick={() => downloadPdf(t.pdf_path!)}>
                      <Download className="h-4 w-4 mr-1" /> Baixar PDF
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
