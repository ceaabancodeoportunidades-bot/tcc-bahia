import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacidade e Segurança — Tcc Bahia" },
      { name: "description", content: "Política de privacidade, segurança e termos de uso do banco de TCCs Tcc Bahia." },
      { property: "og:title", content: "Privacidade e Segurança — Tcc Bahia" },
      { property: "og:description", content: "Como o Tcc Bahia coleta, usa e protege os dados de alunos e professores, além dos termos de uso do banco de TCCs." },
      { property: "og:url", content: "https://tcc-bahia.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://tcc-bahia.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Privacidade, Segurança e Termos</h1>
        <p className="text-muted-foreground mb-8">
          Última atualização: 18 de junho de 2026
        </p>

        <section className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/90">
          <div>
            <h2 className="text-xl font-semibold mb-2">Sobre o Tcc Bahia</h2>
            <p>
              O Tcc Bahia é um banco público de Trabalhos de Conclusão de Curso (TCCs) do ensino médio.
              TCCs aprovados ficam visíveis para qualquer visitante; submissões pendentes ou rejeitadas
              ficam visíveis apenas para o autor e para a equipe responsável pela moderação.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Dados que coletamos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nome e e-mail informados no cadastro.</li>
              <li>Conteúdo dos TCCs enviados (título, resumo, autores, orientador, ano, área e PDF).</li>
              <li>Avaliações em estrelas que você atribuir aos TCCs.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Como usamos os dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Exibir TCCs aprovados publicamente no acervo.</li>
              <li>Calcular médias agregadas de avaliação para o ranking — avaliações individuais não são expostas.</li>
              <li>Permitir que professores indiquem TCCs e que administradores moderem o conteúdo.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Segurança</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Acesso ao banco de dados é protegido por políticas de segurança em nível de linha (RLS).</li>
              <li>PDFs ficam em armazenamento privado e só podem ser baixados via links assinados temporários.</li>
              <li>Suas avaliações são privadas: apenas você vê seu próprio voto; o público vê só a média.</li>
              <li>Apenas administradores podem alterar o status de aprovação de um TCC.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Seus direitos</h2>
            <p>
              Você pode editar ou excluir seus próprios TCCs (enquanto pendentes ou rejeitados) e suas avaliações
              a qualquer momento. Para solicitar a exclusão da sua conta ou de TCCs já aprovados, entre em
              contato com a equipe pelo e-mail informado pela administração da escola.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Termos de uso</h2>
            <p>
              Ao enviar um TCC você declara que possui os direitos sobre o trabalho e autoriza sua publicação
              no acervo. Conteúdo que viole direitos autorais, contenha plágio ou material ofensivo poderá ser
              removido sem aviso prévio.
            </p>
          </div>

          <p>
            <Link to="/" className="text-primary underline">Voltar para o início</Link>
          </p>
        </section>
      </main>
    </div>
  );
}