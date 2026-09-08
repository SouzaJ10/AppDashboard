import { Link, useRouter, useRouterState, } from "@tanstack/react-router";
import { useState, type ReactNode, } from "react";
import { LayoutDashboard, ShoppingCart, Package, Wallet, Calculator, Sparkles, Upload, LogOut, Menu, X, Shield, LineChart, TrendingDown, Receipt, Truck, Building2, } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/faturamento",
    label: "Faturamento",
    icon: LineChart,
  },
  {
    to: "/vendas",
    label: "Vendas",
    icon: ShoppingCart,
  },
  {
    to: "/despesas",
    label: "Despesas",
    icon: TrendingDown,
  },
  {
    to: "/fluxo-caixa",
    label: "Fluxo de Caixa",
    icon: Receipt,
  },
  {
    to: "/estoque",
    label: "Estoque",
    icon: Package,
  },
  {
    to: "/compras",
    label: "Compras",
    icon: Truck,
  },
  {
    to: "/financeiro",
    label: "Financeiro",
    icon: Wallet,
  },
  {
    to: "/precificacao",
    label: "Precificação",
    icon: Calculator,
  },
  {
    to: "/insights",
    label: "Insights",
    icon: Sparkles,
  },
  {
    to: "/importar",
    label: "Importar Planilha",
    icon: Upload,
    adminOnly: true,
  },
];

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: AppShellProps) {
  const [open, setOpen] =
    useState(false);

  const router = useRouter();

  const pathname =
    useRouterState({
      select: (state) =>
        state.location.pathname,
    });

  const { user } = useAuth();

  const {
    empresas,
    empresaAtual,
    isAdmin,
    isLoading: empresasLoading,
    selecionarEmpresa,
  } = useEmpresa();

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      router.navigate({
        to: "/auth",
        replace: true,
      });
    };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open
            ? "translate-x-0"
            : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link
            to="/dashboard"
            className="flex items-center gap-2"
          >
            <img
              src="/icon-512.png"
              alt="Gestão de Vendas"
              className="h-10 w-10 rounded-lg object-cover"
            />

            <div className="leading-tight">
              <div className="text-sm font-semibold text-sidebar-foreground">
                Gestão de Vendas
              </div>

              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                COMERCIAL
              </div>
            </div>
          </Link>

          <button
            type="button"
            className="lg:hidden"
            onClick={() =>
              setOpen(false)
            }
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {empresas.length > 1 && (
          <div className="border-b border-sidebar-border p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Empresa
            </div>

            <Select
              value={
                empresaAtual?.empresaId
              }
              onValueChange={
                selecionarEmpresa
              }
              disabled={
                empresasLoading
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>

              <SelectContent>
                {empresas.map(
                  (empresa) => (
                    <SelectItem
                      key={
                        empresa.empresaId
                      }
                      value={
                        empresa.empresaId
                      }
                    >
                      {empresa.nome}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <nav className="flex-1 space-y-1 p-3">
          {NAV.filter(
            (item) =>
              !item.adminOnly ||
              isAdmin
          ).map((item) => {
            const active =
              pathname.startsWith(
                item.to
              );

            const Icon =
              item.icon;

            return (
              <Link
                key={item.to}
                to={
                  item.to as never
                }
                onClick={() =>
                  setOpen(false)
                }
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />

                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-lg p-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {user?.email?.[0]?.toUpperCase() ??
                "?"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">
                {user?.email}
              </div>

              {empresaAtual ? (
                <>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Shield className="h-3 w-3" />

                    {isAdmin
                      ? "Administrador"
                      : "Usuário"}
                  </div>

                  <div className="truncate text-[10px] text-muted-foreground">
                    {empresaAtual.nome}
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-muted-foreground">
                  {empresasLoading
                    ? "Carregando empresa..."
                    : empresas.length > 0
                      ? "Selecione uma empresa"
                      : "Sem empresa vinculada"}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              title="Sair"
              aria-label="Sair"
              className="rounded-md p-2 hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() =>
            setOpen(false)
          }
        />
      )}

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() =>
              setOpen(true)
            }
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="truncate text-lg font-semibold leading-tight">
                {title}
              </h1>
            )}

            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {actions}
        </header>

        <div className="flex-1 p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}