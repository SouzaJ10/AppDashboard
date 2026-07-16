import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { listarProdutosParaVenda } from "@/service/vendas.service";

export function NovaVendaDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [produtoId, setProdutoId] = useState<string>("");
  const [qtd, setQtd] = useState("1");
  const [valorUnit, setValorUnit] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [frete, setFrete] = useState("0");
  const [cliente, setCliente] = useState("");
  const [obs, setObs] = useState("");

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos-select"],
    queryFn: listarProdutosParaVenda
  });

  // Auto-preenche o valor unitário com o preço cadastrado do produto.
  useEffect(() => {
    if (!produtoId) return;
    const p = produtos.find((x) => x.id === produtoId);
    const preco = Number(p?.preco_venda ?? 0);
    if (preco > 0) setValorUnit(String(preco));
  }, [produtoId, produtos]);

  const reset = () => {
    setProdutoId(""); setQtd("1"); setValorUnit(""); setDesconto("0");
    setFrete("0"); setCliente(""); setObs("");
  };

  const onSave = async () => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return toast.error("Selecione um produto");
    if (produto.ativo === false) return toast.error("Produto inativo — não é possível vender");
    const q = Number(qtd);
    const vu = Number(valorUnit);
    const desc = Number(desconto) || 0;
    const fr = Number(frete) || 0;
    if (!q || q <= 0) return toast.error("Quantidade inválida");
    if (!vu || vu <= 0) return toast.error("Valor unitário inválido");
    if (Number(produto.estoque_atual ?? 0) < q) {
      return toast.error("Estoque insuficiente", {
        description: `Disponível: ${produto.estoque_atual} un.`,
      });
    }

    const preco_venda = vu * q - desc;
    const despesas = fr;
    // Usa custo cadastrado do produto × quantidade (módulo de produtos).
    const custo = Number(produto.custo_compra ?? 0) * q;
    const lucro = preco_venda - custo - despesas;
    const margem = preco_venda ? lucro / preco_venda : 0;
    const descricao = [produto.descricao, cliente && `→ ${cliente}`, obs && `(${obs})`]
      .filter(Boolean).join(" ");

    setSaving(true);
    try {
      // 1. Insere venda
      const { error: e1 } = await supabase.from("vendas").insert({
        produto_id: produto.id,
        codigo: produto.codigo,
        descricao,
        quantidade: q,
        preco_venda,
        despesas,
        custo,
        lucro,
        margem,
        data: new Date().toISOString().slice(0, 10),
      });
      if (e1) throw e1;

      // 2. Baixa estoque
      const novoEstoque = Math.max(0, Number(produto.estoque_atual ?? 0) - q);
      const { error: e2 } = await supabase
        .from("produtos").update({ estoque_atual: novoEstoque }).eq("id", produto.id);
      if (e2) throw e2;

      // 3. Movimentação financeira (entrada de caixa)
      const { error: e3 } = await supabase.from("movimentacoes").insert({
        data: new Date().toISOString().slice(0, 10),
        entrada: preco_venda,
        saida: 0,
        descricao: `Venda: ${produto.descricao}${cliente ? ` — ${cliente}` : ""}`,
      });
      if (e3) throw e3;

      toast.success("Venda registrada com sucesso!");
      qc.invalidateQueries();
      reset();
      setOpen(false);
    } catch (e) {
      toast.error("Erro ao salvar venda", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> Nova Venda</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Registrar nova venda</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Produto</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.descricao} <span className="text-muted-foreground">(estoque: {p.estoque_atual})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </div>
            <div>
              <Label>Valor unitário (R$)</Label>
              <Input type="number" step="0.01" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} />
            </div>
            <div>
              <Label>Desconto (R$)</Label>
              <Input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
            </div>
            <div>
              <Label>Frete (R$)</Label>
              <Input type="number" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Cliente (opcional)</Label>
            <Input value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
