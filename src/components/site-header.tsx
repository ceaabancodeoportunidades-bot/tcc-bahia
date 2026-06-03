import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, LogOut, Upload, Shield, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const { t, lang, setLang } = useI18n();
  return (
    <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>{t("nav.brand")}</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "pt" ? "en" : "pt")}
            aria-label="Toggle language"
            title={lang === "pt" ? "Switch to English" : "Mudar para Português"}
          >
            <Languages className="h-4 w-4 mr-1" />
            {lang === "pt" ? "EN" : "PT"}
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/submit"><Upload className="h-4 w-4 mr-1" />{t("nav.submit")}</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin"><Shield className="h-4 w-4 mr-1" />{t("nav.admin")}</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                <LogOut className="h-4 w-4 mr-1" />{t("nav.signout")}
              </Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">{t("nav.signin")}</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}