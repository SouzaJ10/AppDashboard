import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { CATEGORIAS_PADRAO, FORMAS_PAGAMENTO, type CategoriaDespesa, type Despesa, type FormaPagamentoDespesa, } from "@/integrations/supabase/despesas-extra";
import type { StatusDespesa } from "@/types/domain";
import { queryKeys } from "@/constants/queryKeys";
import { todayISO } from "@/lib/format";

type Props = {
  despesa?: Despesa;
  trigger?: React.ReactNode;
};

export function DespesaDialog({
  despesa,
  trigger,
}: Props) {
  const qc = useQueryClient();

  const isEdit = !!despesa;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const catsQ = useQuery({
    queryKey: queryKeys.categoriasDespesa.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_despesa")
        .select("*")
        .order("nome");

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const categorias = (() => {
    const fromDb = (catsQ.data ?? []).map(
      (c) => c.nome
    );

    const all = new Set<string>([
      ...CATEGORIAS_PADRAO,
      ...fromDb,
    ]);

    return Array.from(all).sort();
  })();

  const today = todayISO();

  const [form, setForm] = useState({
    descricao: "",
    categoria: "Outros",
    valor: "0",
    data: today,
    forma_pagamento: "PIX" as FormaPagamentoDespesa,
    centro_custo: "",
    observacoes: "",
    status: "pago" as StatusDespesa,
    novaCategoria: "",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (despesa) {
      setForm({
        descricao: despesa.descricao ?? "",
        categoria:
          despesa.categoria ?? "Outros",
        valor: String(despesa.valor ?? 0),
        data: (
          despesa.data ?? today
        ).slice(0, 10),
        forma_pagamento:
          despesa.forma_pagamento ?? "PIX",
        centro_custo:
          despesa.centro_custo ?? "",
        observacoes:
          despesa.observacoes ?? "",
        status:
          despesa.status ?? "pago",
        novaCategoria: "",
      });
    } else {
      setForm({
        descricao: "",
        categoria: "Outros",
        valor: "0",
        data: today,
        forma_pagamento: "PIX",
        centro_custo: "",
        observacoes: "",
        status: "pago",
        novaCategoria: "",
      });
    }
  }, [open, despesa, today]);

  const set = <
    K extends keyof typeof form
  >(
    k: K,
    v: (typeof form)[K]
  ) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  const isRLSError = (err: unknown) => {
    const m = (
      err instanceof Error
        ? err.message
        : String(err)
    ).toLowerCase();

    return (
      m.includes("row-level security") ||
      m.includes("violates row")
    );
  };

  const isMissingTable = (err: unknown) => {
    const m = (
      err instanceof Error
        ? err.message
        : String(err)
    ).toLowerCase();

    return (
      m.includes("does not exist") ||
      m.includes("could not find the table") ||
      m.includes("schema cache")
    );
  };

  const onSave = async () => {
    if (!form.descricao.trim()) {
      return toast.error(
        "Descrição é obrigatória"
      );
    }

    const valor = Number(form.valor);

    if (!isFinite(valor) || valor <= 0) {
      return toast.error(
        "Valor deve ser maior que zero"
      );
    }

    if (!form.data) {
      return toast.error(
        "Informe a data da despesa"
      );
    }

    let categoria = form.categoria;

    if (form.novaCategoria.trim()) {
      categoria =
        form.novaCategoria.trim();

      try {
        const { error } = await supabase
          .from("categorias_despesa")
          .insert({
            nome: categoria,
          });

        if (error) {
          const message = error.message.toLowerCase();

          const categoriaDuplicada =
            message.includes("duplicate") ||
            message.includes("unique");

          if (!categoriaDuplicada) {
            throw error;
          }
        }
      } catch (e) {
        console.error(
          "Erro ao criar categoria de despesa:",
          e
        );

        return toast.error(
          "Não foi possível criar a nova categoria",
          {
            description:
              e instanceof Error
                ? e.message
                : String(e),
          }
        );
      }
    }

    setSaving(true);

    try {
      if (isEdit && despesa) {
        const { error } =
          await supabase.rpc(
            "atualizar_despesa",
            {
              p_despesa_id: despesa.id,
              p_descricao:
                form.descricao.trim(),
              p_valor: valor,
              p_data: form.data,
              p_categoria:
                categoria || null,
              p_forma_pagamento:
                form.forma_pagamento ||
                null,
              p_centro_custo:
                form.centro_custo.trim() ||
                null,
              p_observacoes:
                form.observacoes.trim() ||
                null,
              p_status: form.status,
            }
          );

        if (error) {
          throw error;
        }

        toast.success(
          "Despesa atualizada"
        );
      } else {
        const { error } =
          await supabase.rpc(
            "registrar_despesa",
            {
              p_descricao:
                form.descricao.trim(),
              p_valor: valor,
              p_data: form.data,
              p_categoria:
                categoria || null,
              p_forma_pagamento:
                form.forma_pagamento ||
                null,
              p_centro_custo:
                form.centro_custo.trim() ||
                null,
              p_observacoes:
                form.observacoes.trim() ||
                null,
              p_status: form.status,
            }
          );

        if (error) {
          throw error;
        }

        toast.success(
          "Despesa registrada"
        );
      }

      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.despesas.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.financeiro.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.movimentacoes.all,
        }),

        qc.invalidateQueries({
          queryKey: queryKeys.categoriasDespesa.all,
        }),
      ]);

      setOpen(false);
    } catch (e) {
      if (isMissingTable(e)) {
        toast.error(
          "Tabela despesas não existe",
          {
            description:
              "Aplique o módulo de despesas no Supabase.",
          }
        );
      } else if (isRLSError(e)) {
        toast.error(
          "Sem permissão (RLS)",
          {
            description:
              "Seu usuário não possui permissão para realizar esta operação.",
          }
        );
      } else {
        toast.error(
          "Erro ao salvar despesa",
          {
            description:
              e instanceof Error
                ? e.message
                : String(e),
          }
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        {trigger ??
          (isEdit ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Nova Despesa
            </Button>
          ))}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Editar despesa"
              : "Registrar nova despesa"}
          </DialogTitle>

          <DialogDescription>
            Despesas pagas impactam o
            fluxo de caixa. Despesas
            pendentes ficam registradas
            sem gerar saída financeira.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Descrição *</Label>

            <Input
              value={form.descricao}
              onChange={(e) =>
                set(
                  "descricao",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>Categoria</Label>

            <Select
              value={form.categoria}
              onValueChange={(v) =>
                set("categoria", v)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              Nova categoria (opcional)
            </Label>

            <Input
              placeholder="ex: Manutenção"
              value={
                form.novaCategoria
              }
              onChange={(e) =>
                set(
                  "novaCategoria",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>
              Valor (R$) *
            </Label>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.valor}
              onChange={(e) =>
                set(
                  "valor",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>Data *</Label>

            <Input
              type="date"
              value={form.data}
              onChange={(e) =>
                set(
                  "data",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>
              Forma de pagamento
            </Label>

            <Select
              value={
                form.forma_pagamento
              }
              onValueChange={(v) =>
                set(
                  "forma_pagamento",
                  v as FormaPagamentoDespesa
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {FORMAS_PAGAMENTO.map(
                  (f) => (
                    <SelectItem
                      key={f}
                      value={f}
                    >
                      {f}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              Centro de custo
            </Label>

            <Input
              value={form.centro_custo}
              onChange={(e) =>
                set(
                  "centro_custo",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <Label>Status</Label>

            <Select
              value={form.status}
              onValueChange={(v) =>
                set(
                  "status",
                  v as StatusDespesa
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="pago">
                  Pago
                </SelectItem>

                <SelectItem value="pendente">
                  Pendente
                </SelectItem>
              </SelectContent>
            </Select>

            <p className="mt-1 text-xs text-muted-foreground">
              {form.status === "pago"
                ? "A despesa será lançada como saída no caixa."
                : "A despesa ficará pendente e não alterará o caixa."}
            </p>
          </div>

          <div className="sm:col-span-2">
            <Label>
              Observações
            </Label>

            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) =>
                set(
                  "observacoes",
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() =>
              setOpen(false)
            }
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            onClick={onSave}
            disabled={saving}
          >
            {saving && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}

            {isEdit
              ? "Salvar"
              : "Registrar despesa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}