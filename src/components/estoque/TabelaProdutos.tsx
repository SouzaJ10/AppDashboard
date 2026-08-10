import { Eye, Trash2,} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,} from "@/components/ui/alert-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ProdutoDialog } from "@/components/produtos/ProdutoDialog";
import { brl, num } from "@/lib/format";

import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";

type TabelaProdutosProps = {
  produtos: ProdutoFull[];
  giroMap: Map<string, number>;
  onDetalhes: (produto: ProdutoFull) => void;
  onExcluir: (produto: ProdutoFull) => void;
};

export function TabelaProdutos({
  produtos,
  giroMap,
  onDetalhes,
  onExcluir,
}: TabelaProdutosProps) {
  const statusOf = (estoque: number, minimo: number) => {
    if (estoque <= 0) {
      return {
        label: "Zerado",
        tone: "destructive" as const,
      };
    }

    if (estoque <= minimo) {
      return {
        label: "Crítico",
        tone: "warning" as const,
      };
    }

    return {
      label: "OK",
      tone: "success" as const,
    };
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Estoque</TableHead>
            <TableHead className="text-right">Mín.</TableHead>
            <TableHead className="text-right">Giro</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {produtos.slice(0, 300).map((produto) => {
            const estoque = Number(
              produto.estoque_atual ?? 0
            );

            const minimo = Number(
              produto.estoque_minimo ?? 0
            );

            const giro =
              giroMap.get(produto.descricao ?? "") ?? 0;

            const status = statusOf(
              estoque,
              minimo
            );

            const toneCls =
              status.tone === "destructive"
                ? "bg-destructive/15 text-destructive border-destructive/30"
                : status.tone === "warning"
                  ? "bg-warning/15 text-warning-foreground border-warning/30"
                  : "bg-success/15 text-success border-success/30";

            const rowCls =
              status.tone === "destructive"
                ? "bg-destructive/5"
                : status.tone === "warning"
                  ? "bg-warning/5"
                  : "";

            return (
              <TableRow
                key={produto.id}
                className={rowCls}
              >
                <TableCell className="font-mono text-xs">
                  {produto.codigo}
                </TableCell>

                <TableCell className="max-w-xs truncate">
                  <div className="font-medium">
                    {produto.nome ?? produto.descricao}
                  </div>

                  {produto.marca && (
                    <div className="text-[11px] text-muted-foreground">
                      {produto.marca}
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  {produto.categoria ?? "—"}
                </TableCell>

                <TableCell className="text-right">
                  {brl(
                    Number(produto.preco_venda ?? 0)
                  )}
                </TableCell>

                <TableCell className="text-right font-medium">
                  {num(estoque)}
                </TableCell>

                <TableCell className="text-right text-muted-foreground">
                  {num(minimo)}
                </TableCell>

                <TableCell className="text-right">
                  {num(giro)}
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={toneCls}
                  >
                    {status.label}
                  </Badge>

                  {produto.ativo === false && (
                    <Badge
                      variant="outline"
                      className="ml-1 border-border text-muted-foreground"
                    >
                      Inativo
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Detalhes"
                      onClick={() =>
                        onDetalhes(produto)
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <ProdutoDialog produto={produto} />

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Excluir produto?
                          </AlertDialogTitle>

                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                            O produto
                            <span className="font-semibold">
                              {" "}
                              {produto.nome ??
                                produto.descricao}{" "}
                            </span>
                            será removido permanentemente.
                            Vendas já registradas serão
                            mantidas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            Cancelar
                          </AlertDialogCancel>

                          <AlertDialogAction
                            onClick={() =>
                              onExcluir(produto)
                            }
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {produtos.length > 300 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Mostrando 300 de {produtos.length}.
        </div>
      )}
    </div>
  );
}