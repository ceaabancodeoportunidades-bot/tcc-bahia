import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Tcc Bahia" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      console.error("sign in error", error);
      toast.error(t("auth.signinError"));
    }
    else { toast.success(t("auth.welcome")); navigate({ to: "/" }); }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      console.error("sign up error", error);
      toast.error(t("auth.signupError"));
    }
    else { toast.success(t("auth.created")); }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.cardTitle")}</CardTitle>
            <CardDescription>{t("auth.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 mb-4 w-full">
                <TabsTrigger value="signin">{t("auth.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-3">
                  <div><Label>{t("auth.email")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <div><Label>{t("auth.password")}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{t("auth.signin")}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3">
                  <div><Label>{t("auth.fullName")}</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                  <div><Label>{t("auth.email")}</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                  <div><Label>{t("auth.password")}</Label><Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                  <Button type="submit" className="w-full" disabled={loading}>{t("auth.create")}</Button>
                  <p className="text-xs text-muted-foreground">{t("auth.teacherNote")}</p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}