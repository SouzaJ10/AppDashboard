import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "expired" | "submitting" | "done";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Z]/.test(pw)) return "A senha deve conter pelo menos uma letra maiúscula.";
  if (!/[a-z]/.test(pw)) return "A senha deve conter pelo menos uma letra minúscula.";
  if (!/[0-9]/.test(pw)) return "A senha deve conter pelo menos um número.";
  return null;
}

function parseHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  const out: Record<string, string> = {};
  if (!hash) return out;
  for (const part of hash.split("&")) {
    const [k, v] = part.split("=");
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return out;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const hashParams = parseHashParams();

        const errorCode = url.searchParams.get("error_code") ?? hashParams.error_code;
        const errorDesc = url.searchParams.get("error_description") ?? hashParams.error_description;

        if (errorCode) {
          if (!cancelled) {
            setErrorMsg(errorDesc ?? "O link de recuperação é inválido ou expirou.");
            setStatus("expired");
          }
          return;
        }

        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!cancelled) {
              setErrorMsg(error.message);
              setStatus("expired");
            }
            return;
          }
          window.history.replaceState({}, "", url.pathname);
          if (!cancelled) setStatus("ready");
          return;
        }

        const accessToken = hashParams.access_token;
        const refreshToken = hashParams.refresh_token;
        const type = hashParams.type;
        if (accessToken && refreshToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            if (!cancelled) {
              setErrorMsg(error.message);
              setStatus("expired");
            }
            return;
          }
          window.history.replaceState({}, "", url.pathname);
          if (!cancelled) setStatus("ready");
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setStatus(data.session ? "ready" : "expired");
          if (!data.session) {
            setErrorMsg("Abra novamente o link de recuperação enviado por e-mail.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Erro ao validar o link.");
          setStatus("expired");
        }
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) {
        setStatus("ready");
        setErrorMsg(null);
      }
    });

    void init();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== "ready") return;

    const validationError = validatePassword(password);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setStatus("ready");
      return;
    }

    toast.success("Senha redefinida com sucesso.");
    await supabase.auth.signOut();
    setStatus("done");
    setTimeout(() => {
      void navigate({ to: "/auth" });
    }, 1500);
  };

  const handleRequestNewLink = () => {
    void navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>
            Defina uma nova senha para acessar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "checking" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === "expired" && (
            <div className="space-y-4">
              <Alert variant="default" className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Link inválido ou expirado</AlertTitle>
                <AlertDescription>
                  {errorMsg ?? "Solicite um novo link de recuperação."}
                </AlertDescription>
              </Alert>
              <Button onClick={handleRequestNewLink} className="w-full">
                Solicitar novo link
              </Button>
            </div>
          )}

          {(status === "ready" || status === "submitting") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={status === "submitting"}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres, com maiúscula, minúscula e número.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={status === "submitting"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={status === "submitting"}>
                {status === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </form>
          )}

          {status === "done" && (
            <Alert className="border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Senha redefinida</AlertTitle>
              <AlertDescription>
                Redirecionando para a tela de login...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


<div></div>