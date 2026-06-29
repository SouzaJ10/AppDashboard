import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import {
  CATEGORIAS_PADRAO, FORMAS_PAGAMENTO, type CategoriaDespesa, type Despesa,
} from "@/integrations/supabase/despesas-extra";

type Props = { despesa?: Despesa; trigger?: React.ReactNode };

export function DespesaDialog({ despesa, trigger }: Props) {
  const qc = useQueryClient();
  const isEdit = !!despesa;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const catsQ = useQuery({
    queryKey: ["categorias_despesa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_despesa" as never)
        .select("*")
        .order("nome");
      if (error) return [] as CategoriaDespesa[];
      return (data ?? []) as unknown as CategoriaDespesa[];
    },
  });

  const categorias = (() => {
    const fromDb = (catsQ.data ?? []).map((c) => c.nome);
    const all = new Set<string>([...CATEGORIAS_PADRAO, ...fromDb]);
    return Array.from(all).sort();
  })();

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    descricao: "",
    categoria: "Outros",
    valor: "0",
    data: today,
    forma_pagamento: "PIX",
    centro_custo: "",
    observacoes: "",
    status: "pago" as "pago" | "pendente",
    novaCategoria: "",
  });

  useEffect(() => {
    if (!open) return;
    if (despesa) {
      setForm({
        descricao: despesa.descricao ?? "",
        categoria: despesa.categoria ?? "Outros",
        valor: String(despesa.valor ?? 0),
        data: (despesa.data ?? today).slice(0, 10),
        forma_pagamento: despesa.forma_pagamento ?? "PIX",
        centro_custo: despesa.centro_custo ?? "",
        observacoes: despesa.observacoes ?? "",
        status: (despesa.status ?? "pago") as "pago" | "pendente",
        novaCategoria: "",
      });
    } else {
      setForm((f) => ({ ...f, descricao: "", valor: "0", data: today, observacoes: "" }));
    }
  }, [open, despesa, today]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isRLSError = (err: unknown) => {
    const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return m.includes("row-level security") || m.includes("violates row");
  };
  const isMissingTable = (err: unknown) => {
    const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return m.includes("does not exist") || m.includes("could not find the table") || m.includes("schema cache");
  };

  const onSave = async () => {
    if (!form.descricao.trim()) return toast.error("Descrição é obrigatória");
    const valor = Number(form.valor);
    if (!isFinite(valor) || valor <= 0) return toast.error("Valor deve ser maior que zero");

    let categoria = form.categoria;
    if (form.novaCategoria.trim()) {
      categoria = form.novaCategoria.trim();
      // tenta persistir a categoria nova (best-effort, sem bloquear o save)
      try {
        await supabase.from("categorias_despesa" as never).insert({ nome: categoria } as never);
      } catch { /* ignore — UNIQUE conflict or RLS */ }
    }

    const payload = {
      descricao: form.descricao.trim(),
      categoria,
      valor,
      data: form.data,
      forma_pagamento: form.forma_pagamento || null,
      centro_custo: form.centro_custo.trim() || null,
      observacoes: form.observacoes.trim() || null,
      status: form.status,
    };

    setSaving(true);
    try {
      if (isEdit && despesa) {
        const { error } = await supabase.from("despesas" as never).update(payload as never).eq("id", despesa.id);
        if (error) throw error;
        toast.success("Despesa atualizada");
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const insertPayload = { ...payload, user_id: auth.user?.id ?? null };
        const { error } = await supabase.from("despesas" as never).insert(insertPayload as never);
        if (error) throw error;
        toast.success("Despesa registrada");
      }
      qc.invalidateQueries();
      setOpen(false);
    } catch (e) {
      if (isMissingTable(e)) {
        toast.error("Tabela despesas não existe", {
          description: "Aplique docs/sql/2026-06-28_despesas_module.sql no Supabase.",
        });
      } else if (isRLSError(e)) {
        toast.error("Sem permissão (RLS)", {
          description: "Seu usuário precisa ter role 'admin' em user_roles.",
        });
      } else {
        toast.error("Erro ao salvar despesa", {
          description: e instanceof Error ? e.message : String(e),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          isEdit
            ? <Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
            : <Button><Plus className="mr-1 h-4 w-4" /> Nova Despesa</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar despesa" : "Registrar nova despesa"}</DialogTitle>
          <DialogDescription>Saídas financeiras impactam o fluxo de caixa, lucro e KPIs.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nova categoria (opcional)</Label>
            <Input placeholder="ex: Manutenção" value={form.novaCategoria}
              onChange={(e) => set("novaCategoria", e.target.value)} />
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} />
          </div>
          <div>
            <Label>Data *</Label>
            <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={form.forma_pagamento} onValueChange={(v) => set("forma_pagamento", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Centro de custo</Label>
            <Input value={form.centro_custo} onChange={(e) => set("centro_custo", e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as "pago" | "pendente")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar" : "Registrar despesa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}