import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description") ?? hash.get("error_description");

      if (errorDescription) {
        toast.error("Falha na confirmação", { description: errorDescription });
        navigate({ to: "/auth", replace: true });
        return;
      }

      // PKCE / OAuth code flow
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error("Não foi possível concluir o login", { description: error.message });
          navigate({ to: "/auth", replace: true });
          return;
        }
      }

      // Magic link / recovery vem como hash com type=recovery
      const type = hash.get("type");
      if (type === "recovery") {
        navigate({ to: "/reset-password", replace: true });
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (data.user) {
        toast.success("Bem-vindo!");
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/auth", replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Concluindo autenticação...
      </div>
    </div>
  );
}
