import type { ProdutoFull } from "@/integrations/supabase/produtos-extra";
import { brl, num } from "@/lib/format";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,} from "@/components/ui/alert-dialog";

type DetalhesProdutoProps = {
  produto: ProdutoFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DetalhesProduto({
  produto,
  open,
  onOpenChange,
}: DetalhesProdutoProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {produto?.nome ?? produto?.descricao}
          </AlertDialogTitle>

          <AlertDialogDescription asChild>
            <div className="grid grid-cols-2 gap-2 text-sm text-foreground">
              <div>
                <span className="text-muted-foreground">Código:</span>{" "}
                {produto?.codigo}
              </div>

              <div>
                <span className="text-muted-foreground">Categoria:</span>{" "}
                {produto?.categoria ?? "—"}
              </div>

              <div>
                <span className="text-muted-foreground">Marca:</span>{" "}
                {produto?.marca ?? "—"}
              </div>

              <div>
                <span className="text-muted-foreground">Unidade:</span>{" "}
                {produto?.unidade ?? "—"}
              </div>

              <div>
                <span className="text-muted-foreground">Custo:</span>{" "}
                {brl(Number(produto?.custo_compra ?? 0))}
              </div>

              <div>
                <span className="text-muted-foreground">Preço:</span>{" "}
                {brl(Number(produto?.preco_venda ?? 0))}
              </div>

              <div>
                <span className="text-muted-foreground">Estoque:</span>{" "}
                {num(Number(produto?.estoque_atual ?? 0))}
              </div>

              <div>
                <span className="text-muted-foreground">Mínimo:</span>{" "}
                {num(Number(produto?.estoque_minimo ?? 0))}
              </div>

              <div className="col-span-2">
                <span className="text-muted-foreground">Fornecedor:</span>{" "}
                {produto?.fornecedor ?? "—"}
              </div>

              <div className="col-span-2">
                <span className="text-muted-foreground">Descrição:</span>{" "}
                {produto?.descricao ?? "—"}
              </div>

              <div className="col-span-2">
                <span className="text-muted-foreground">
                  Observações:
                </span>{" "}
                {produto?.observacoes ?? "—"}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}