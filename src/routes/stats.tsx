import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Estatísticas do acervo — Tcc Bahia" },
      { name: "description", content: "Veja quantos TCCs existem por ano e por área, a média geral de avaliações e quais trabalhos são os mais bem avaliados do banco." },
      { property: "og:title", content: "Estatísticas do acervo — Tcc Bahia" },
      { property: "og:description", content: "TCCs por ano e área, média geral e trabalhos mais bem avaliados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://tcc-bahia.lovable.app/stats" },
    ],
    links: [{ rel: "canonical", href: "https://tcc-bahia.lovable.app/stats" }],
  }),
  component: StatsPage,
});

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm truncate">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-8 text-right text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

function StatsPage() {
  const { t: tr } = useI18n();

  const { data: tccs = [] } = useQuery({
    queryKey: ["tccs", "approved"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tccs").select("*").eq("status", "approved");
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

  const byYear = useMemo(() => {
    const m = new Map<number, number>();
    tccs.forEach((t) => m.set(t.year, (m.get(t.year) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [tccs]);

  const byArea = useMemo(() => {
    const m = new Map<string, number>();
    tccs.forEach((t) => { const a = t.area || "—"; m.set(a, (m.get(a) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [tccs]);

  const statMap = useMemo(() => new Map(stats.map((s) => [s.tcc_id, s])), [stats]);

  const avgAll = useMemo(() => {
    let sum = 0, count = 0;
    stats.forEach((s) => { sum += Number(s.avg_rating) * s.rating_count; count += s.rating_count; });
    return count ? sum / count : 0;
  }, [stats]);

  const bestRated = useMemo(() =>
    tccs
      .map((t) => ({ t, s: statMap.get(t.id) }))
      .filter((x) => x.s && x.s.rating_count > 0)
      .sort((a, b) => Number(b.s!.avg_rating) - Number(a.s!.avg_rating) || b.s!.rating_count - a.s!.rating_count)
      .slice(0, 10),
  [tccs, statMap]);

  const maxYear = Math.max(1, ...byYear.map((x) => x[1]));
  const maxArea = Math.max(1, ...byArea.map((x) => x[1]));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">{tr("stats.title")}</h1>

        <div className="grid gap-4 sm:grid-cols-4 mb-8">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{tr("stats.total")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{tccs.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{tr("stats.areasCount")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{byArea.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{tr("stats.yearsCount")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{byYear.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{tr("stats.avgAll")}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{avgAll ? avgAll.toFixed(1) : "—"}</p></CardContent></Card>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">{tr("stats.byYear")}</h2>
          <Card><CardContent className="pt-6 space-y-2">
            {byYear.map(([y, c]) => <Bar key={y} label={String(y)} value={c} max={maxYear} />)}
          </CardContent></Card>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">{tr("stats.byArea")}</h2>
          <Card><CardContent className="pt-6 space-y-2">
            {byArea.map(([a, c]) => <Bar key={a} label={a} value={c} max={maxArea} />)}
          </CardContent></Card>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">{tr("stats.bestRated")}</h2>
          <Card><CardContent className="pt-6 space-y-3">
            {bestRated.length === 0 && <p className="text-muted-foreground text-sm">{tr("home.noRatings")}</p>}
            {bestRated.map(({ t, s }) => (
              <div key={t.id} className="flex items-center justify-between gap-3 flex-wrap">
                <Link to="/tcc/$id" params={{ id: t.id }} className="text-sm font-medium hover:underline">{t.title}</Link>
                <div className="flex items-center gap-2">
                  <StarRating value={Number(s!.avg_rating)} readOnly size={14} />
                  <span className="text-xs text-muted-foreground">{Number(s!.avg_rating).toFixed(1)} ({s!.rating_count})</span>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </section>
      </main>
    </div>
  );
}
