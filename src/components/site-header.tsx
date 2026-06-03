import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, LogOut, Upload, Shield } from "lucide-react";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  return (
    <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          <span>Acervo TCC</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/submit"><Upload className="h-4 w-4 mr-1" />Enviar TCC</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin"><Shield className="h-4 w-4 mr-1" />Admin</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                <LogOut className="h-4 w-4 mr-1" />Sair
              </Button>
            </>
          ) : (
            <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}