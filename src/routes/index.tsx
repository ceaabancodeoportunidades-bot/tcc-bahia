import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, FileText, Clock, Trophy, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { StarRating } from "@/components/star-rating";
import { toast } from "sonner";
import heroImage from "@/assets/hero-banco-tccs.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tcc Bahia — Banco de TCCs" },
      { name: "description", content: "Tcc Bahia — banco de trabalhos de conclusão de curso (TCC) do ensino médio." },
      { property: "og:title", content: "Tcc Bahia — Banco de TCCs" },
      { property: "og:description", content: "Explore trabalhos de conclusão de curso por ano, área e autor." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t: tr } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [tab, setTab] = useState<"all" | "recent" | "top">("all");
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

  const { data: ratings = [] } = useQuery({
    queryKey: ["tcc_ratings"],
    queryFn: async () => {
      // Only own ratings are visible per RLS
      if (!user) return [];
      const { data, error } = await supabase
        .from("tcc_ratings")
        .select("tcc_id,user_id,rating")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["tcc_rating_stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_tcc_rating_stats");
      if (error) throw error;
      return data as { tcc_id: string; avg_rating: number; rating_count: number }[];
    },
  });

  const ratingStats = useMemo(() => {
    const map = new Map<string, { sum: number; count: number; mine: number | null }>();
    for (const s of stats) {
      map.set(s.tcc_id, {
        sum: Number(s.avg_rating) * s.rating_count,
        count: s.rating_count,
        mine: null,
      });
    }
    for (const r of ratings) {
      const cur = map.get(r.tcc_id) ?? { sum: 0, count: 0, mine: null };
      cur.mine = r.rating;
      map.set(r.tcc_id, cur);
    }
    return map;
  }, [ratings, stats]);

  const avgFor = (id: string) => {
    const s = ratingStats.get(id);
    return s && s.count ? s.sum / s.count : 0;
  };
  const countFor = (id: string) => ratingStats.get(id)?.count ?? 0;
  const mineFor = (id: string) => ratingStats.get(id)?.mine ?? 0;

  const years = useMemo(() => Array.from(new Set(tccs.map((t) => t.year))).sort((a, b) => b - a), [tccs]);
  const areas = useMemo(() => Array.from(new Set(tccs.map((t) => t.area).filter(Boolean))).sort(), [tccs]);

  const filtered = useMemo(() => {
    const norm = (s: string) =>
      (s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const stop = new Set(["de","da","do","das","dos","a","o","e","em","para","com","no","na","um","uma","the","of","and","in","for","to"]);
    const terms = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stop.has(w));

    const base = tccs.filter((t) => {
      if (year !== "all" && t.year !== Number(year)) return false;
      if (area !== "all" && t.area !== area) return false;
      return true;
    });

    if (terms.length === 0) return base;

    const scored = base
      .map((t) => {
        const title = norm(t.title);
        const authors = norm(t.authors);
        const abstract = norm(t.abstract);
        const areaTxt = norm(t.area ?? "");
        const advisor = norm(t.advisor ?? "");
        let score = 0;
        let matched = 0;
        for (const term of terms) {
          let s = 0;
          if (title.includes(term)) s += 10;
          if (areaTxt.includes(term)) s += 6;
          if (authors.includes(term) || advisor.includes(term)) s += 5;
          if (abstract.includes(term)) {
            const occurrences = abstract.split(term).length - 1;
            s += 3 + Math.min(occurrences - 1, 5);
          }
          // partial / stem match (plurals, variações)
          if (s === 0 && term.length > 4) {
            const stem = term.slice(0, Math.max(4, term.length - 2));
            if (title.includes(stem)) s += 5;
            else if (abstract.includes(stem) || areaTxt.includes(stem)) s += 2;
          }
          if (s > 0) matched++;
          score += s;
        }
        // bônus por cobrir todas as palavras-chave
        if (matched === terms.length) score += 8;
        return { t, score, matched };
      })
      .filter((x) => x.matched > 0)
      .sort((a, b) => b.score - a.score || b.t.year - a.t.year);

    return scored.map((x) => x.t);
  }, [tccs, q, year, area]);

  const recent = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return [...tccs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((t) => new Date(t.created_at).getTime() >= cutoff)
      .slice(0, 12);
  }, [tccs]);

  const top3 = useMemo(() => {
    return [...tccs]
      .map((t) => ({ t, avg: avgFor(t.id), count: countFor(t.id) }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 3)
      .map((x) => x.t);
  }, [tccs, ratingStats]);

  const visible = tab === "recent" ? recent : tab === "top" ? top3 : filtered;

  const downloadPdf = async (path: string) => {
    const { data, error } = await supabase.storage.from("tcc-pdfs").createSignedUrl(path, 60);
    if (error || !data) return;
    window.open(data.signedUrl, "_blank");
  };

  const rate = async (tccId: string, rating: number) => {
    if (!user) {
      toast.error(tr("home.signInToRate"));
      return;
    }
    const { error } = await supabase
      .from("tcc_ratings")
      .upsert({ tcc_id: tccId, user_id: user.id, rating }, { onConflict: "tcc_id,user_id" });
    if (error) {
      console.error("rate error", error);
      toast.error(tr("error.generic"));
      return;
    }
    qc.invalidateQueries({ queryKey: ["tcc_ratings"] });
    qc.invalidateQueries({ queryKey: ["tcc_rating_stats"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section
        className="relative w-full h-[340px] md:h-[420px] flex items-center justify-center overflow-hidden border-b"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/60" />
        <div className="relative z-10 text-center max-w-2xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-white drop-shadow-lg">
            {tr("home.title")}
          </h1>
          <p className="text-white/90 text-lg md:text-xl drop-shadow">{tr("home.subtitle")}</p>
        </div>
      </section>
      <main className="container mx-auto px-4 py-10">

        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "recent" | "top")} className="mb-6">
          <TabsList>
            <TabsTrigger value="all"><FileText className="h-4 w-4 mr-1" />{tr("home.tabs.all")}</TabsTrigger>
            <TabsTrigger value="recent"><Clock className="h-4 w-4 mr-1" />{tr("home.tabs.recent")}</TabsTrigger>
            <TabsTrigger value="top"><Trophy className="h-4 w-4 mr-1" />{tr("home.tabs.top")}</TabsTrigger>
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
            {visible.map((t, idx) => {
              const avg = avgFor(t.id);
              const count = countFor(t.id);
              const topRank = tab === "top" ? idx + 1 : null;
              return (
                <Card
                  key={t.id}
                  className="flex flex-col cursor-pointer transition-all bg-primary text-primary-foreground border-primary/40 hover:brightness-110 hover:shadow-lg"
                  onClick={() => setSelected(t)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {topRank && (
                          <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400">
                            <Trophy className="h-3 w-3 mr-1" /> #{topRank}
                          </Badge>
                        )}
                        <Badge className="bg-primary-foreground/15 text-primary-foreground border-0">{t.year}</Badge>
                        {t.area && <Badge variant="outline" className="border-primary-foreground/40 text-primary-foreground">{t.area}</Badge>}
                      </div>
                      {t.recommended && (
                        <span
                          title={tr("home.recommended")}
                          aria-label={tr("home.recommended")}
                          className="inline-flex items-center gap-1 text-yellow-300"
                        >
                          <Star className="h-5 w-5 fill-yellow-300" />
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-lg leading-snug text-primary-foreground">{t.title}</CardTitle>
                    <p className="text-xs text-primary-foreground/80">{tr("home.by")} {t.authors}{t.advisor ? ` · ${tr("home.advisorShort")}: ${t.advisor}` : ""}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-primary-foreground/90 line-clamp-5 flex-1">{t.abstract}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-primary-foreground/90">
                      <StarRating value={avg} readOnly size={14} />
                      <span>{count > 0 ? `${avg.toFixed(1)} (${count})` : tr("home.noRatings")}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(t); }}>
                        {tr("home.readMore")}
                      </Button>
                      {t.pdf_path && (
                        <Button variant="outline" size="sm" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={(e) => { e.stopPropagation(); downloadPdf(t.pdf_path!); }}>
                          <Download className="h-4 w-4 mr-1" /> {tr("home.download")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                  {selected.recommended && (
                    <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400">
                      <Star className="h-3 w-3 mr-1 fill-current" /> {tr("home.recommended")}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl leading-tight">{selected.title}</DialogTitle>
                <DialogDescription>
                  {tr("home.by")} {selected.authors}
                  {selected.advisor ? ` · ${tr("home.advisorShort")}: ${selected.advisor}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-3 flex items-center gap-3 flex-wrap rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{tr("home.avgRating")}:</span>
                  <StarRating value={avgFor(selected.id)} readOnly />
                  <span className="text-sm text-muted-foreground">
                    {countFor(selected.id) > 0 ? `${avgFor(selected.id).toFixed(1)} · ${countFor(selected.id)} ${tr("home.ratings")}` : tr("home.noRatings")}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm">{tr("home.rate")}:</span>
                  <StarRating
                    value={mineFor(selected.id)}
                    onChange={(v) => rate(selected.id, v)}
                    readOnly={!user}
                  />
                  {!user && <span className="text-xs text-muted-foreground">{tr("home.signInToRate")}</span>}
                </div>
              </div>
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
