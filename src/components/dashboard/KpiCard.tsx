import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function KpiCard({
  label, value, hint, icon: Icon, tone = "default", children,
}: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon;
  tone?: "default" | "success" | "destructive" | "warning"; children?: ReactNode;
}) {
  const toneRing = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    destructive: "text-destructive bg-destructive/10",
    warning: "text-warning bg-warning/10",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", toneRing)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, description, actions, children, className }: {
  title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      {(title || actions) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="max-w-sm">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
