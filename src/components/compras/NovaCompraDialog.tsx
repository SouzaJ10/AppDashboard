import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { listarProdutosParaCompra, registrarCompra,} from "@/service/compras.service";
import { queryKeys } from "@/constants/queryKeys";
import { toast } from "sonner";

export function NovaCompraDialog() {
    const qc = useQueryClient();

    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [produtoId, setProdutoId] = useState("");
    const [quantidade, setQuantidade] = useState("1");
    const [custoUnitario, setCustoUnitario] = useState("");
    const [fornecedor, setFornecedor] = useState("");
    const [dataVencimento, setDataVencimento] = useState("");

    const [formaPagamento, setFormaPagamento] =
        useState<"a_vista" | "a_prazo">("a_vista");


    const { data: produtos = [] } = useQuery({
        queryKey: queryKeys.produtos.giro,
        queryFn: listarProdutosParaCompra,
        enabled: open,
    });

    useEffect(() => {
        if (!produtoId) return;

        const produto = produtos.find((p) => p.id === produtoId);

        const custo = Number(produto?.custo_compra ?? 0);

        if (custo > 0) {
            setCustoUnitario(String(custo));
        }
    }, [produtoId, produtos]);

    const totalCompra =
        (Number(quantidade) || 0) *
        (Number(custoUnitario) || 0);

    const reset = () => {
        setProdutoId("");
        setQuantidade("1");
        setCustoUnitario("");
        setFornecedor("");
        setFormaPagamento("a_vista");
        setDataVencimento("");
    };

    const onSave = async () => {
        const produto = produtos.find((p) => p.id === produtoId);

        if (!produto) {
            return toast.error("Selecione um produto");
        }

        const qtd = Number(quantidade);
        const custo = Number(custoUnitario);

        if (!qtd || qtd <= 0) {
            return toast.error("Quantidade inválida");
        }

        if (!custo || custo <= 0) {
            return toast.error("Custo unitário inválido");
        }

        if (formaPagamento === "a_prazo" && !dataVencimento) {
            return toast.error(
                "Informe a data de vencimento da compra a prazo"
            );
        }

        setSaving(true);

        try {
            await registrarCompra({
                produtoId: produto.id,
                quantidade: qtd,
                custoUnitario: custo,
                fornecedor: fornecedor.trim() || undefined,
                formaPagamento,
                dataVencimento:
                    formaPagamento === "a_prazo"
                        ? dataVencimento
                        : undefined,
            });

            toast.success("Compra registrada com sucesso!");

            await Promise.all([
                qc.invalidateQueries({
                    queryKey: queryKeys.produtos.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.produtos.giro,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.compras.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.dashboard.all,
                }),
                qc.invalidateQueries({
                    queryKey: queryKeys.movimentacoes.all,
                }),
            ]);

            reset();
            setOpen(false);
        } catch (e) {
            console.error("Erro ao registrar compra:", e);

            toast.error("A data de vencimento não pode ser anterior à data da compra.", {
                description:
                    e instanceof Error
                        ? e.message
                        : "Ocorreu um erro inesperado.",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-1 h-4 w-4" />
                    Nova Compra
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar nova compra</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                    <div>
                        <Label>Produto</Label>

                        <Select
                            value={produtoId}
                            onValueChange={setProdutoId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>

                            <SelectContent>
                                {produtos.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.descricao} (código: {p.codigo})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Quantidade</Label>

                            <Input
                                type="number"
                                min="1"
                                value={quantidade}
                                onChange={(e) =>
                                    setQuantidade(e.target.value)
                                }
                            />
                        </div>

                        <div>
                            <Label>Custo unitário (R$)</Label>

                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={custoUnitario}
                                onChange={(e) =>
                                    setCustoUnitario(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border bg-muted/40 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Total da compra
                            </span>

                            <span className="text-lg font-semibold">
                                {totalCompra.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                })}
                            </span>
                        </div>
                    </div>

                    <div>
                        <Label>Fornecedor</Label>

                        <Input
                            placeholder="Fornecedor (opcional)"
                            value={fornecedor}
                            onChange={(e) =>
                                setFornecedor(e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <Label>Forma de pagamento</Label>

                        <Select
                            value={formaPagamento}
                            onValueChange={(value) =>
                                setFormaPagamento(
                                    value as "a_vista" | "a_prazo"
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a forma de pagamento" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="a_vista">
                                    À vista
                                </SelectItem>

                                <SelectItem value="a_prazo">
                                    A prazo
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formaPagamento === "a_prazo" && (
                        <div>
                            <Label>Data de vencimento *</Label>

                            <Input
                                type="date"
                                value={dataVencimento}
                                onChange={(e) =>
                                    setDataVencimento(e.target.value)
                                }
                            />

                            <p className="mt-1 text-xs text-muted-foreground">
                                A compra ficará pendente até ser paga.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>

                    <Button onClick={onSave} disabled={saving}>
                        {saving && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}

                        Registrar compra
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}