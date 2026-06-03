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
import { Download, Search, FileText, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ceaa tcc — Acervo de TCCs" },
      { name: "description", content: "Ceaa tcc — banco de trabalhos de conclusão de curso (TCC) do ensino médio." },
      { property: "og:title", content: "Ceaa tcc — Acervo de TCCs" },
      { property: "og:description", content: "Explore trabalhos de conclusão de curso por ano, área e autor." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t: tr } = useI18n();
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [tab, setTab] = useState<"all" | "recent">("all");
  const [selected, setSelected] = useState<any | null>(null);

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

  const recent = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return [...tccs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((t) => new Date(t.created_at).getTime() >= cutoff)
      .slice(0, 12);
  }, [tccs]);

  const visible = tab === "recent" ? recent : filtered;

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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">{tr("home.title")}</h1>
          <p className="text-muted-foreground text-lg">{tr("home.subtitle")}</p>
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "recent")} className="mb-6">
          <TabsList>
            <TabsTrigger value="all"><FileText className="h-4 w-4 mr-1" />{tr("home.tabs.all")}</TabsTrigger>
            <TabsTrigger value="recent"><Clock className="h-4 w-4 mr-1" />{tr("home.tabs.recent")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "all" && (
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={tr("home.search")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder={tr("home.year")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr("home.allYears")}</SelectItem>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="md:w-52"><SelectValue placeholder={tr("home.area")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr("home.allAreas")}</SelectItem>
              {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">{tr("home.loading")}</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{tr("home.empty")}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => (
              <Card
                key={t.id}
                className="flex flex-col cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30"
                onClick={() => setSelected(t)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge variant="secondary">{t.year}</Badge>
                    {t.area && <Badge variant="outline">{t.area}</Badge>}
                  </div>
                  <CardTitle className="text-lg leading-snug">{t.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{tr("home.by")} {t.authors}{t.advisor ? ` · ${tr("home.advisorShort")}: ${t.advisor}` : ""}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-5 flex-1">{t.abstract}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(t); }}>
                      {tr("home.readMore")}
                    </Button>
                    {t.pdf_path && (
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); downloadPdf(t.pdf_path!); }}>
                        <Download className="h-4 w-4 mr-1" /> {tr("home.download")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{selected.year}</Badge>
                  {selected.area && <Badge variant="outline">{selected.area}</Badge>}
                </div>
                <DialogTitle className="text-2xl leading-tight">{selected.title}</DialogTitle>
                <DialogDescription>
                  {tr("home.by")} {selected.authors}
                  {selected.advisor ? ` · ${tr("home.advisorShort")}: ${selected.advisor}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 mt-2">
                {selected.abstract}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                {selected.pdf_path && (
                  <Button variant="outline" onClick={() => downloadPdf(selected.pdf_path!)}>
                    <Download className="h-4 w-4 mr-1" /> {tr("home.download")}
                  </Button>
                )}
                <Button onClick={() => setSelected(null)}>{tr("home.close")}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
