import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";
import { Button } from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { salvarProduto } from "@/service/produto.service";

type Props = {
  produto?: ProdutoFull;
  trigger?: React.ReactNode;
};

const UNIDADES = ["UN", "PC", "CX", "KG", "G", "L", "ML", "M", "M2", "M3", "PAR"];

export function ProdutoDialog({ produto, trigger }: Props) {
  const qc = useQueryClient();
  const isEdit = !!produto;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    nome: "",
    categoria: "",
    marca: "",
    descricao: "",
    unidade: "UN",
    custo_compra: "0",
    preco_venda: "0",
    estoque_atual: "0",
    estoque_minimo: "3",
    fornecedor: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    if (!open) return;
    if (produto) {
      setForm({
        codigo: String(produto.codigo ?? ""),
        nome: produto.nome ?? produto.descricao ?? "",
        categoria: produto.categoria ?? "",
        marca: produto.marca ?? "",
        descricao: produto.descricao ?? "",
        unidade: produto.unidade ?? "UN",
        custo_compra: String(produto.custo_compra ?? 0),
        preco_venda: String(produto.preco_venda ?? 0),
        estoque_atual: String(produto.estoque_atual ?? 0),
        estoque_minimo: String(produto.estoque_minimo ?? 3),
        fornecedor: produto.fornecedor ?? "",
        observacoes: produto.observacoes ?? "",
        ativo: produto.ativo ?? true,
      });
    }
  }, [open, produto]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    const codigo = Number(form.codigo);

    if (!codigo) {
      return toast.error("Código do produto é obrigatório");
    }

    if (!form.nome.trim()) {
      return toast.error("Nome do produto é obrigatório");
    }

    const payload = {
      codigo,
      nome: form.nome.trim(),
      descricao: (form.descricao || form.nome).trim(),
      categoria: form.categoria.trim() || null,
      marca: form.marca.trim() || null,
      unidade: form.unidade,
      custo_compra: Number(form.custo_compra) || 0,
      preco_venda: Number(form.preco_venda) || 0,
      estoque_atual: Number(form.estoque_atual) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 0,
      fornecedor: form.fornecedor.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
    };

    setSaving(true);

    try {
      await salvarProduto(
        payload,
        isEdit ? produto?.id : undefined
      );

      toast.success(
        isEdit
          ? "Produto atualizado"
          : "Produto cadastrado"
      );

      await qc.invalidateQueries({
        queryKey: ["produtos"],
      });

      setOpen(false);
    } catch (e) {
      toast.error("Erro ao salvar produto", {
        description:
          e instanceof Error ? e.message : String(e),
      });
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
            : <Button><Plus className="mr-1 h-4 w-4" /> Novo Produto</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar produto" : "Cadastrar novo produto"}</DialogTitle>
          <DialogDescription>
            Os campos marcados são obrigatórios. Os dados são salvos no banco.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Código *</Label>
            <Input type="number" value={form.codigo} onChange={(e) => set("codigo", e.target.value)} disabled={isEdit} />
          </div>
          <div>
            <Label>Nome do produto *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.categoria} onChange={(e) => set("categoria", e.target.value)} />
          </div>
          <div>
            <Label>Marca</Label>
            <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição detalhada</Label>
            <Textarea rows={2} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
          <div>
            <Label>Unidade de medida</Label>
            <Select value={form.unidade} onValueChange={(v) => set("unidade", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input value={form.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} />
          </div>
          <div>
            <Label>Custo de compra (R$)</Label>
            <Input type="number" step="0.01" value={form.custo_compra} onChange={(e) => set("custo_compra", e.target.value)} />
          </div>
          <div>
            <Label>Preço de venda (R$)</Label>
            <Input type="number" step="0.01" value={form.preco_venda} onChange={(e) => set("preco_venda", e.target.value)} />
          </div>
          <div>
            <Label>Quantidade em estoque</Label>
            <Input type="number" value={form.estoque_atual} onChange={(e) => set("estoque_atual", e.target.value)} />
          </div>
          <div>
            <Label>Estoque mínimo</Label>
            <Input type="number" value={form.estoque_minimo} onChange={(e) => set("estoque_minimo", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} id="ativo" />
            <Label htmlFor="ativo" className="cursor-pointer">
              Produto ativo {form.ativo ? "" : "(inativo — não aparece em novas vendas)"}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}