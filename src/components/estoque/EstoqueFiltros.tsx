import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "../ui/button";

type OrdemCodigo = "codigo-asc" | "codigo-desc";

type EstoqueStatus = "todos" | "ok" | "baixo" | "zerado" | "inativo";

type EstoqueFiltrosProps = {
    busca: string;
    categoria: string;
    status: EstoqueStatus;
    categorias: string[];
    ordemCodigo: OrdemCodigo;
    onBuscaChange: (value: string) => void;
    onCategoriaChange: (value: string) => void;
    onStatusChange: (value: EstoqueStatus) => void;
    onOrdemCodigoChange: (value: OrdemCodigo) => void;
};

export function EstoqueFiltros({
    busca,
    categoria,
    status,
    categorias,
    ordemCodigo,
    onBuscaChange,
    onCategoriaChange,
    onStatusChange,
    onOrdemCodigoChange,
}: EstoqueFiltrosProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Input
                className="w-56"
                placeholder="Buscar nome, código, marca..."
                value={busca}
                onChange={(e) => onBuscaChange(e.target.value)}
            />

            <Select
                value={categoria}
                onValueChange={onCategoriaChange}
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Categoria" />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="__all">
                        Todas categorias
                    </SelectItem>

                    {categorias.map((item) => (
                        <SelectItem key={item} value={item}>
                            {item}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={status}
                onValueChange={onStatusChange}
            >
                <SelectTrigger className="w-36">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="todos">
                        Todos status
                    </SelectItem>

                    <SelectItem value="ok">
                        OK
                    </SelectItem>

                    <SelectItem value="baixo">
                        Estoque baixo
                    </SelectItem>

                    <SelectItem value="zerado">
                        Zerado
                    </SelectItem>

                    <SelectItem value="inativo">
                        Inativos
                    </SelectItem>
                </SelectContent>
            </Select>

            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                    onOrdemCodigoChange(
                        ordemCodigo === "codigo-asc"
                            ? "codigo-desc"
                            : "codigo-asc"
                    )
                }
                title={
                    ordemCodigo === "codigo-asc"
                        ? "Código: menor para maior"
                        : "Código: maior para menor"
                }
            >
                <ArrowUpDown className="h-4 w-4" />
            </Button>
        </div>
    );
}