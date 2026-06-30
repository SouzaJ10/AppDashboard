import { createFileRoute, redirect, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional() });
const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(72);

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: redirectTo ?? "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) return toast.error(parsedEmail.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsedEmail.data, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
        setPendingConfirm(parsedEmail.data);
        toast.error("E-mail não confirmado", {
          description: "Verifique sua caixa de entrada ou reenvie o e-mail de confirmação.",
        });
      } else {
        toast.error("Falha no login", { description: error.message });
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) return toast.error(parsedEmail.error.issues[0].message);
    const parsedPwd = passwordSchema.safeParse(password);
    if (!parsedPwd.success) return toast.error(parsedPwd.error.issues[0].message);
    if (!fullName.trim()) return toast.error("Informe seu nome completo");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsedEmail.data,
      password: parsedPwd.data,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) return toast.error("Falha no cadastro", { description: error.message });

    // Quando confirmação de e-mail está ativa, session vem null.
    if (!data.session) {
      setPendingConfirm(parsedEmail.data);
      toast.success("Cadastro recebido!", {
        description: `Enviamos um link de confirmação para ${parsedEmail.data}. Confirme o e-mail antes de entrar.`,
      });
    } else {
      toast.success("Conta criada!");
    }
  };


  const handleResend = async (target: string) => {
    const parsed = emailSchema.safeParse(target);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: parsed.data,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error("Não foi possível reenviar", { description: error.message });
    else toast.success("E-mail de confirmação reenviado");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 font-bold">SP</div>
          <div>
            <div className="font-semibold">Gestão de Vendas</div>
            <div className="text-xs opacity-80">Sistema de Gestão Comercial</div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Toda sua operação em um só lugar.</h2>
          <p className="mt-3 max-w-md text-sm opacity-90">
            Vendas, estoque, financeiro e indicadores em tempo real. Pronto para usar no computador e no celular.
          </p>
        </div>
        <div className="text-xs opacity-70">© {new Date().getFullYear()} Gestão de Vendas</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">SP</div>
              <div className="font-semibold">Gestão de Vendas</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Acessar painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre ou crie sua conta para continuar.</p>

          {pendingConfirm && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Confirmação pendente para <strong>{pendingConfirm}</strong>. Verifique sua caixa de entrada (e o spam).
              <button
                type="button"
                className="ml-1 underline underline-offset-2 hover:opacity-80"
                onClick={() => handleResend(pendingConfirm)}
              >
                Reenviar e-mail
              </button>
            </div>
          )}

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <Label htmlFor="email-in">E-mail</Label>
                  <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pwd-in">Senha</Label>
                  <Input id="pwd-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar
                </Button>
                <div className="flex justify-between text-xs">
                  <ForgotPasswordDialog defaultEmail={email} />
                  {email && (
                    <button type="button" className="text-muted-foreground hover:underline" onClick={() => handleResend(email)}>
                      Reenviar confirmação
                    </button>
                  )}
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <Label htmlFor="name-up">Nome completo</Label>
                  <Input id="name-up" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email-up">E-mail</Label>
                  <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pwd-up">Senha</Label>
                  <Input id="pwd-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar conta
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Você receberá um e-mail para confirmar sua conta antes do primeiro acesso. O primeiro usuário cadastrado se torna administrador.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordDialog({ defaultEmail }: { defaultEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setEmail(defaultEmail); }, [defaultEmail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error("Não foi possível enviar", { description: error.message });
    else {
      toast.success("E-mail de redefinição enviado");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-primary hover:underline">Esqueci minha senha</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
          <DialogDescription>Enviaremos um link para redefinir sua senha.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="forgot-email">E-mail</Label>
            <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// silence unused import warning for Link in tree-shaken builds
void Link;
