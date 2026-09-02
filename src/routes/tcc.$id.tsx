import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { getPublicTcc } from "@/lib/tcc.functions";
import { toast } from "sonner";
import { ArrowLeft, Download, Link2, Star } from "lucide-react";

const SITE = "https://tcc-bahia.lovable.app";

export const Route = createFileRoute("/tcc/$id")({
  loader: ({ params }) => getPublicTcc({ data: { id: params.id } }),
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "TCC não encontrado — Tcc Bahia" }, { name: "robots", content: "noindex" }] };
    }
    const desc = loaderData.abstract.slice(0, 155).replace(/\s+/g, " ");
    const url = `${SITE}/tcc/${params.id}`;
    return {
      meta: [
        { title: `${loaderData.title} — Tcc Bahia` },
        { name: "description", content: desc },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ScholarlyArticle",
            headline: loaderData.title,
            abstract: loaderData.abstract,
            datePublished: loaderData.created_at,
            author: loaderData.authors.split(",").map((a: string) => ({ "@type": "Person", name: a.trim() })),
            keywords: (loaderData.keywords ?? []).join(", "),
            inLanguage: "pt-BR",
            url,
          }),
        },
      ],
    };
  },
  component: TccPage,
  errorComponent: () => <NotFoundState />,
  notFoundComponent: () => <NotFoundState />,
});

function NotFoundState() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-6">TCC não encontrado.</p>
        <Button asChild><Link to="/">Voltar ao banco</Link></Button>
      </main>
    </div>
  );
}

function TccPage() {
  const tcc = Route.useLoaderData();
  const { id } = Route.useParams();
  const { t: tr } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: stats = [] } = useQuery({
    queryKey: ["tcc_rating_stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_tcc_rating_stats");
      if (error) throw error;
      return data as { tcc_id: string; avg_rating: number; rating_count: number }[];
    },
  });

  const { data: mine } = useQuery({
    queryKey: ["tcc_rating_mine", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tcc_ratings").select("rating").eq("tcc_id", id).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data?.rating ?? 0;
    },
  });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!tcc?.pdf_path) return;
      const { data } = await supabase.storage.from("tcc-pdfs").createSignedUrl(tcc.pdf_path, 3600);
      if (active) setPdfUrl(data?.signedUrl ?? null);
    })();
    return () => { active = false; };
  }, [tcc?.pdf_path]);

  if (!tcc) return <NotFoundState />;

  const stat = stats.find((s) => s.tcc_id === tcc.id);
  const avg = stat ? Number(stat.avg_rating) : 0;
  const count = stat?.rating_count ?? 0;
  const isOwner = user?.id === tcc.user_id;

  const rate = async (rating: number) => {
    if (!user) return toast.error(tr("home.signInToRate"));
    if (isOwner) return toast.error(tr("home.ownTcc"));
    const { error } = await supabase
      .from("tcc_ratings")
      .upsert({ tcc_id: tcc.id, user_id: user.id, rating }, { onConflict: "tcc_id,user_id" });
    if (error) return toast.error(tr("error.generic"));
    qc.invalidateQueries({ queryKey: ["tcc_rating_stats"] });
    qc.invalidateQueries({ queryKey: ["tcc_rating_mine"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {tr("tcc.back")}
        </Button>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary">{tcc.year}</Badge>
          {tcc.area && <Badge variant="outline">{tcc.area}</Badge>}
          {tcc.recommended && (
            <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400">
              <Star className="h-3 w-3 mr-1 fill-current" /> {tr("home.recommended")}
            </Badge>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2">{tcc.title}</h1>
        <p className="text-muted-foreground mb-6">
          {tr("home.by")} {tcc.authors}
          {tcc.advisor ? ` · ${tr("home.advisorShort")}: ${tcc.advisor}` : ""}
        </p>

        {(tcc.keywords?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tcc.keywords!.map((k: string) => (
              <Badge key={k} variant="secondary">{k}</Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 rounded-md border p-3 mb-6">
          <div className="flex items-center gap-2">
            <StarRating value={avg} readOnly />
            <span className="text-sm text-muted-foreground">
              {count > 0 ? `${avg.toFixed(1)} · ${count} ${tr("home.ratings")}` : tr("home.noRatings")}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm">{tr("home.rate")}:</span>
            <StarRating value={mine ?? 0} onChange={rate} readOnly={!user || isOwner} />
            {!user && <span className="text-xs text-muted-foreground">{tr("home.signInToRate")}</span>}
            {isOwner && <span className="text-xs text-muted-foreground">{tr("home.ownTcc")}</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/tcc/${tcc.id}`);
              toast.success(tr("tcc.linkCopied"));
            }}
          >
            <Link2 className="h-4 w-4 mr-1" /> {tr("tcc.share")}
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader><CardTitle className="text-xl">{tr("submit.fAbstract")}</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{tcc.abstract}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-xl">{tr("tcc.viewer")}</CardTitle>
              {pdfUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={pdfUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-1" /> {tr("tcc.openPdf")}
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {tcc.pdf_path ? (
              pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title={tcc.title}
                  className="w-full h-[70vh] rounded-md border bg-white"
                />
              ) : (
                <p className="text-muted-foreground text-sm">{tr("home.loading")}</p>
              )
            ) : (
              <p className="text-muted-foreground text-sm">{tr("tcc.noPdf")}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
