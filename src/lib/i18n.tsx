import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "pt" | "en";

const dict = {
  // Header / nav
  "nav.brand": { pt: "Tcc Bahia", en: "Tcc Bahia" },
  "nav.submit": { pt: "Enviar TCC", en: "Submit TCC" },
  "nav.admin": { pt: "Admin", en: "Admin" },
  "nav.signout": { pt: "Sair", en: "Sign out" },
  "nav.signin": { pt: "Entrar", en: "Sign in" },

  // Home
  "home.title": { pt: "Banco de TCCs", en: "TCC Bank" },
  "home.subtitle": {
    pt: "Trabalhos de conclusão de curso do ensino médio — anos anteriores e atuais.",
    en: "High school capstone projects — current and past years.",
  },
  "home.search": { pt: "Buscar por título, autor ou resumo", en: "Search by title, author or abstract" },
  "home.year": { pt: "Ano", en: "Year" },
  "home.allYears": { pt: "Todos os anos", en: "All years" },
  "home.area": { pt: "Área", en: "Area" },
  "home.allAreas": { pt: "Todas as áreas", en: "All areas" },
  "home.loading": { pt: "Carregando...", en: "Loading..." },
  "home.empty": { pt: "Nenhum TCC encontrado.", en: "No TCC found." },
  "home.by": { pt: "por", en: "by" },
  "home.advisorShort": { pt: "orient.", en: "advisor" },
  "home.download": { pt: "Baixar PDF", en: "Download PDF" },
  "home.readMore": { pt: "Ler resumo", en: "Read abstract" },
  "home.tabs.all": { pt: "Todos", en: "All" },
  "home.tabs.recent": { pt: "Recentes", en: "Recent" },
  "home.tabs.top": { pt: "Top 3", en: "Top 3" },
  "home.close": { pt: "Fechar", en: "Close" },
  "home.rate": { pt: "Sua avaliação", en: "Your rating" },
  "home.avgRating": { pt: "Média", en: "Average" },
  "home.ratings": { pt: "avaliações", en: "ratings" },
  "home.noRatings": { pt: "Sem avaliações", en: "No ratings yet" },
  "home.signInToRate": { pt: "Entre para avaliar", en: "Sign in to rate" },
  "home.recommended": { pt: "Indicado por professor", en: "Teacher pick" },
  "home.top1": { pt: "Top 1", en: "Top 1" },
  "home.top2": { pt: "Top 2", en: "Top 2" },
  "home.top3": { pt: "Top 3", en: "Top 3" },
  "admin.recommend": { pt: "Indicar", en: "Recommend" },
  "admin.unrecommend": { pt: "Remover indicação", en: "Remove recommendation" },
  "theme.toggle": { pt: "Alternar tema", en: "Toggle theme" },
  "home.metaTitle": { pt: "Tcc Bahia — Banco de TCCs do Ensino Médio", en: "Tcc Bahia — High School TCC Bank" },
  "home.metaDesc": {
    pt: "Banco de trabalhos de conclusão de curso (TCC) do ensino médio. Explore resumos por ano, área e autor.",
    en: "High school capstone project archive. Browse abstracts by year, area, and author.",
  },

  // Submit
  "submit.title": { pt: "Enviar TCC", en: "Submit TCC" },
  "submit.desc": {
    pt: "Preencha as informações. Após o envio, um professor irá aprovar.",
    en: "Fill in the information. A teacher will review your submission.",
  },
  "submit.fTitle": { pt: "Título", en: "Title" },
  "submit.fYear": { pt: "Ano", en: "Year" },
  "submit.fArea": { pt: "Área", en: "Area" },
  "submit.fAreaPh": { pt: "Ex.: Biologia", en: "e.g. Biology" },
  "submit.fAuthors": { pt: "Autores", en: "Authors" },
  "submit.fAuthorsPh": { pt: "Nomes separados por vírgula", en: "Comma-separated names" },
  "submit.fAdvisor": { pt: "Orientador(a)", en: "Advisor" },
  "submit.fAbstract": { pt: "Resumo", en: "Abstract" },
  "submit.fPdf": { pt: "PDF (opcional)", en: "PDF (optional)" },
  "submit.sending": { pt: "Enviando...", en: "Submitting..." },
  "submit.send": { pt: "Enviar TCC", en: "Submit TCC" },
  "submit.success": { pt: "TCC enviado! Aguardando aprovação do professor.", en: "Submitted! Awaiting teacher approval." },
  "submit.error": { pt: "Erro ao enviar", en: "Submission error" },

  // Auth
  "auth.metaTitle": { pt: "Entrar — Tcc Bahia", en: "Sign in — Tcc Bahia" },
  "auth.cardTitle": { pt: "Acesso", en: "Access" },
  "auth.cardDesc": { pt: "Entre como aluno ou professor.", en: "Sign in as student or teacher." },
  "auth.signin": { pt: "Entrar", en: "Sign in" },
  "auth.signup": { pt: "Cadastrar (aluno)", en: "Sign up (student)" },
  "auth.email": { pt: "Email", en: "Email" },
  "auth.password": { pt: "Senha", en: "Password" },
  "auth.fullName": { pt: "Nome completo", en: "Full name" },
  "auth.create": { pt: "Criar conta", en: "Create account" },
  "auth.teacherNote": { pt: "Contas de professor são criadas pelo administrador.", en: "Teacher accounts are created by the administrator." },
  "auth.welcome": { pt: "Bem-vindo!", en: "Welcome!" },
  "auth.created": { pt: "Conta criada! Você já pode entrar.", en: "Account created! You can sign in now." },
  "auth.signinError": { pt: "Email ou senha inválidos.", en: "Invalid email or password." },
  "auth.signupError": { pt: "Não foi possível criar a conta. Verifique os dados e tente novamente.", en: "Could not create account. Check your details and try again." },
  "error.generic": { pt: "Algo deu errado. Tente novamente.", en: "Something went wrong. Please try again." },
  "submit.fileTooLarge": { pt: "Arquivo muito grande (máx. 25 MB).", en: "File too large (max 25 MB)." },
  "submit.invalidPdf": { pt: "Envie um arquivo PDF válido.", en: "Please upload a valid PDF file." },

  // Admin
  "admin.metaTitle": { pt: "Admin — Tcc Bahia", en: "Admin — Tcc Bahia" },
  "admin.title": { pt: "Painel do Professor", en: "Teacher Panel" },
  "admin.empty": { pt: "Nenhum TCC enviado ainda.", en: "No TCC submitted yet." },
  "admin.approve": { pt: "Aprovar", en: "Approve" },
  "admin.reject": { pt: "Rejeitar", en: "Reject" },
  "admin.delete": { pt: "Excluir", en: "Delete" },
  "admin.confirmDelete": { pt: "Excluir este TCC?", en: "Delete this TCC?" },
  "admin.updated": { pt: "Atualizado", en: "Updated" },
  "admin.deleted": { pt: "Excluído", en: "Deleted" },
  "admin.status.approved": { pt: "Aprovado", en: "Approved" },
  "admin.status.rejected": { pt: "Rejeitado", en: "Rejected" },
  "admin.status.pending": { pt: "Pendente", en: "Pending" },
} as const;

export type I18nKey = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: I18nKey) => string };
const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang") as Lang | null;
      if (saved === "pt" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  const t = (k: I18nKey) => dict[k]?.[lang] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}