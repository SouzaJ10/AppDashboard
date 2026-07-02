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
import { Loader2, Package2, Eye, EyeOff } from "lucide-react";
import { motion, useTime, useTransform } from "framer-motion";

const searchSchema = z.object({ redirect: z.string().optional() });
const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(255);
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const time = useTime();
  const floatY = useTransform(time, [0, 6000], [-20, 20], {
    clamp: false,
  });
  const floatY2 = useTransform(time, [0, 8000], [20, -20], {
    clamp: false,
  });

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
      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", }}
        className="hidden relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-blue-500 p-12 text-white lg:flex lg:flex-col lg:justify-between"
      >
        <motion.div
          style={{ y: floatY }}
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />

        <motion.div
          style={{ y: floatY2 }}
          className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue-300/10 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Package2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-wide">
              Gestão de Vendas
            </div>
            <div className="text-sm text-white/80">Sistema Comercial Inteligente</div>
          </div>
        </div>
        <div className="relative z-10 flex flex-col justify-center flex-1 max-w-lg">
          <h2 className="text-5xl font-extrabold leading-tight">
            Controle sua empresa
            <br />
            com rapidez e segurança.
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/90">
            Gerencie vendas, estoque e financeiro em um único sistema.
            Acompanhe indicadores em tempo real e tome decisões com mais confiança.
          </p>
        </div>
        <div className="text-xs opacity-70">© {new Date().getFullYear()} Gestão de Vendas</div>
      </motion.div>


      <div className="flex min-h-screen items-center justify-center p-6 -mt-12">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
          className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl"
        >        <div className="relative z-10 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Package2 className="h-5 w-5" />
            </div>
            <div className="font-semibold">Gestão de Vendas</div>
          </div>

          <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="text-3xl font-bold tracking-tight text-center"
          >
            Acessar painel
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-2 mb-6 text-center text-sm text-muted-foreground"
          >
            Entre com sua conta para continuar.
          </motion.p>
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
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <motion.form
                onSubmit={handleSignIn}
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                <div>
                  <Label
                    htmlFor="email-in"
                    className="mb-2 block font-medium"
                  >
                    E-mail
                  </Label>
                  <Input
                    id="email-in"
                    type="email"
                    placeholder="Digite seu e-mail"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-gray-300 bg-gray-50 transition-all duration-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <Label htmlFor="pwd-in">Senha</Label>

                  <div className="relative">

                    <Input
                      id="pwd-in"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12 h-12 rounded-xl border-gray-300 bg-gray-50 transition-all duration-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>

                  </div>
                </div>

                <Button
                  type="submit" disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-blue-800 hover:to-blue-600 hover:shadow-xl active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando...</>) : ("Entrar")}
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                </Button>

                <div className="flex justify-between text-sm">
                  <ForgotPasswordDialog defaultEmail={email} />

                  {pendingConfirm && (
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => handleResend(pendingConfirm)}
                    >
                      Reenviar confirmação
                    </button>
                  )}
                </div>
              </motion.form>
            </TabsContent>

          </Tabs>
        </motion.div>

      </div>
    </div >
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
            <Label htmlFor="forgot-email" className="mb-2 block font-medium">
              E-mail
            </Label>
            <Input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                disabled={loading}
                className=" w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar link
              </Button>
            </motion.div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// silence unused import warning for Link in tree-shaken builds
void Link;
