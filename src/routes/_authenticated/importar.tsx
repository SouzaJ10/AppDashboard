import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Section } from "@/components/dashboard/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { type SheetKind, FIELD_SYNONYMS, REQUIRED_FIELDS, detectSheetKind, autoMap, missingRequired, } from "@/lib/excel-mapping";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";

async function carregarProdutos() {
  const { data, error } = await supabase
    .from("produtos")
    .select("id,codigo,descricao,custo_compra");

  if (error) throw error;

  const codeToId = new Map<string, string>();
  const nameToId = new Map<string, string>();
  const nameToCode = new Map<string, string>();
  const idToCusto = new Map<string, number>();
  const ambiguousNames = new Set<string>();

  for (const p of data ?? []) {
    const codigo = String(p.codigo ?? "").trim();
    const nome = String(p.descricao ?? "")
      .trim()
      .toLowerCase();

    if (codigo) {
      codeToId.set(codigo, p.id);
    }

    if (nome) {
      if (nameToId.has(nome)) {
        ambiguousNames.add(nome);
        nameToId.delete(nome);
        nameToCode.delete(nome);
      } else if (!ambiguousNames.has(nome)) {
        nameToId.set(nome, p.id);
        nameToCode.set(nome, codigo);
      }
    }

    idToCusto.set(
      p.id,
      Number(p.custo_compra ?? 0)
    );
  }

  return {
    codeToId,
    nameToId,
    nameToCode,
    idToCusto,
    ambiguousNames,
  };
}

function localizarProduto(
  codigo: string | null,
  nome: string,
  codeToId: Map<string, string>,
  nameToId: Map<string, string>,
  nameToCode: Map<string, string>,
  ambiguousNames: Set<string>,
) {
  if (codigo) {
    const id = codeToId.get(codigo);
    if (id) {
      return {
        produto_id: id,
        codigo,
        ambiguous: false,
      };
    }
  }
  const nomeNormalizado = nome
    .trim()
    .toLowerCase();
  if (ambiguousNames.has(nomeNormalizado)) {
    return {
      produto_id: null,
      codigo: codigo ?? "",
      ambiguous: true,
    };
  }

  const id = nameToId.get(nomeNormalizado);
  if (id) {
    return {
      produto_id: id,
      codigo: nameToCode.get(nomeNormalizado) ?? codigo ?? "",
      ambiguous: false,
    };
  }
  return {
    produto_id: null,
    codigo: codigo ?? "",
  };
}

export const Route = createFileRoute("/_authenticated/importar")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: ImportarPage,
});

type Row = Record<string, unknown>;
type SheetInfo = {
  sheetName: string;
  kind: SheetKind | null;
  headers: string[];
  rows: Row[];
  mapping: Record<string, string | null>;
  enabled: boolean;
};

const excelDateToISO = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
};
const num = (v: unknown): number => {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d,.-]/g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
};
const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v).trim());

function ImportarPage() {
  const qc = useQueryClient();
  const { isAdmin } = useUserRole();
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [wipeBeforeImport, setWipeBeforeImport] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [report, setReport] = useState<{ kind: SheetKind; ok: number; skipped: number; errors: string[] }[] | null>(null);

  const onFile = async (f: File | null) => {
    setFile(f); setReport(null); setSheets([]);
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const infos: SheetInfo[] = wb.SheetNames.map((name) => {
        const rows = XLSX.utils.sheet_to_json<Row>(wb.Sheets[name], { defval: null });
        const headers = rows.length ? Object.keys(rows[0]) : [];
        const kind = detectSheetKind(name, headers);
        const mapping = kind ? autoMap(kind, headers) : {};
        return { sheetName: name, kind, headers, rows, mapping, enabled: !!kind };
      });
      setSheets(infos);
    } catch (e) {
      toast.error("Não foi possível ler o arquivo", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const updateSheet = (i: number, patch: Partial<SheetInfo>) =>
    setSheets((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const updateMapping = (i: number, field: string, header: string | null) =>
    setSheets((arr) =>
      arr.map((s, idx) => (idx === i ? { ...s, mapping: { ...s.mapping, [field]: header } } : s))
    );

  const ready = useMemo(
    () => sheets.some((s) => s.enabled && s.kind && missingRequired(s.kind, s.mapping).length === 0),
    [sheets],
  );

  const doImport = async () => {
    setRunning(true); setProgress(0); setReport(null);
    const rep: { kind: SheetKind; ok: number; skipped: number; errors: string[] }[] = [];
    try {
      // 1. (opcional) limpar
      if (wipeBeforeImport) {
        setStep("Limpando dados anteriores...");

        for (const t of [
          "vendas",
          "compras",
          "movimentacoes",
          "produtos",
        ] as const) {
          const { error } = await supabase
            .from(t)
            .delete()
            .neq(
              "id",
              "00000000-0000-0000-0000-000000000000"
            );

          if (error) {
            throw new Error(
              `Falha ao limpar ${t}: ${error.message}`
            );
          }
        }
      }

      // 2. importar estoque primeiro (para produto_id)
      const enabled = sheets.filter((s) => s.enabled && s.kind);
      const order: SheetKind[] = ["estoque", "compras", "vendas", "movimentacoes"];
      const sortedSheets = [...enabled].sort(
        (a, b) => order.indexOf(a.kind as SheetKind) - order.indexOf(b.kind as SheetKind),
      );

      let codeToId = new Map<string, string>();
      let nameToId = new Map<string, string>();
      let nameToCode = new Map<string, string>();
      let idToCusto = new Map<string, number>();
      const totalSheets = sortedSheets.length || 1;

      for (let s = 0; s < sortedSheets.length; s++) {
        const sheet = sortedSheets[s];
        const kind = sheet.kind as SheetKind;
        setStep(`Importando ${kind} (${sheet.sheetName})...`);
        const errors: string[] = [];
        let ok = 0, skipped = 0;
        const m = sheet.mapping;
        const pick = (row: Row, field: string) => (m[field] ? row[m[field] as string] : null);

        if (kind === "estoque") {
          const rows = sheet.rows
            .map((r) => {
              const cod = str(pick(r, "codigo"));
              const desc = str(pick(r, "descricao"));

              if (!cod || !desc) {
                skipped++;
                return null;
              }

              const estoqueAtual = pick(r, "estoque_atual");
              const estoqueMinimo = pick(r, "estoque_minimo");

              const custoCompra = pick(r, "custo_compra");
              const precoVenda = pick(r, "preco_venda");

              return {
                codigo: cod,
                descricao: desc,

                ...(estoqueAtual != null
                  ? { estoque_atual: num(estoqueAtual) }
                  : {}),

                ...(estoqueMinimo != null
                  ? { estoque_minimo: num(estoqueMinimo) }
                  : {}),

                ...(custoCompra != null
                  ? { custo_compra: num(custoCompra) }
                  : {}),

                ...(precoVenda != null
                  ? { preco_venda: num(precoVenda) }
                  : {}),
              };
            })
            .filter((x): x is NonNullable<typeof x> => !!x);

          for (let i = 0; i < rows.length; i += 500) {
            const { error } = await supabase.from("produtos").upsert(rows.slice(i, i + 500), { onConflict: "codigo" });
            if (error) {
              errors.push(error.message); break;
            }
            ok += Math.min(500, rows.length - i);
          }
          const { data: pmap = [] } = await supabase.from("produtos").select("id,codigo");
          codeToId = new Map((pmap ?? []).map((p) => [String(p.codigo), p.id]));
        } else if (kind === "compras") {
          if (codeToId.size === 0) {
            const produtos = await carregarProdutos();
            codeToId = produtos.codeToId;
          }
          const rows = sheet.rows.map((r) => {
            const cod = pick(r, "codigo")
              ? String(pick(r, "codigo")).trim()
              : null; if (!cod) { skipped++; return null; }
            const q = num(pick(r, "quantidade"));
            const cu = num(pick(r, "custo_unitario"));
            return {
              produto_id: cod ? codeToId.get(cod) ?? null : null,
              codigo: cod,
              descricao: str(pick(r, "descricao")),
              fornecedor: str(pick(r, "fornecedor")) ?? "Importação",
              quantidade: q,
              custo_unitario: cu,
              custo_total: num(pick(r, "custo_total")) || q * cu,
              data: excelDateToISO(pick(r, "data")),
            };
          }).filter((x): x is NonNullable<typeof x> => !!x);
          for (let i = 0; i < rows.length; i += 500) {
            const { error } = await supabase.from("compras").insert(rows.slice(i, i + 500));
            if (error) {
              errors.push(error.message); break;
            }
            ok += Math.min(500, rows.length - i);
          }
        } else if (kind === "vendas") {
          const produtos = await carregarProdutos();

          codeToId = produtos.codeToId;
          nameToId = produtos.nameToId;
          nameToCode = produtos.nameToCode;
          idToCusto = produtos.idToCusto;

          const rows = sheet.rows.map((r) => {
            const cod = pick(r, "codigo")
              ? String(pick(r, "codigo")).trim()
              : null;

            const nomeProduto = String(
              pick(r, "descricao") ?? ""
            )
              .trim()
              .toLowerCase();

            const produto = localizarProduto(
              cod,
              nomeProduto,
              codeToId,
              nameToId,
              nameToCode,
              produtos.ambiguousNames,
            );

            if (produto.ambiguous) {
              skipped++;
              errors.push(
                `Produto ambíguo: "${String(
                  pick(r, "descricao") ?? ""
                )}". Informe o SKU/código do produto na planilha.`
              );
              return null;
            }

            const data = excelDateToISO(pick(r, "data"));
            if (!data) { skipped++; return null; }
            const q = num(pick(r, "quantidade"));

            const valorUnitario = num(
              pick(r, "valor_unitario")
            );

            const totalInformado = num(
              pick(r, "preco_venda")
            );

            const precoTotal =
              totalInformado > 0
                ? totalInformado
                : q * valorUnitario;

            const custoInformado = num(
              pick(r, "custo")
            );

            const custoUnitarioProduto =
              produto.produto_id
                ? idToCusto.get(produto.produto_id) ?? 0
                : 0;

            const custo =
              custoInformado > 0
                ? custoInformado
                : custoUnitarioProduto * q;

            const desp = num(
              pick(r, "despesas")
            );

            const lucroInformado = num(
              pick(r, "lucro")
            );

            const lucro =
              lucroInformado !== 0
                ? lucroInformado
                : precoTotal - custo - desp;
            return {
              produto_id: produto.produto_id,
              codigo: produto.codigo,
              descricao: str(
                pick(r, "descricao")
              ),
              quantidade: q,
              valor_unitario: valorUnitario,
              preco_venda: precoTotal,
              custo,
              despesas: desp,
              lucro,
              margem:
                precoTotal > 0
                  ? lucro / precoTotal
                  : 0,
              data,
            };
          }).filter((x): x is NonNullable<typeof x> => !!x);
          if (errors.length === 0) {
            for (let i = 0; i < rows.length; i += 500) {
              const { error } = await supabase
                .from("vendas")
                .insert(rows.slice(i, i + 500));

              if (error) {
                errors.push(error.message);
                break;
              }

              ok += Math.min(500, rows.length - i);
            }
          }
        }
        else if (kind === "movimentacoes") {
          const rows = sheet.rows.map((r) => {
            const data = excelDateToISO(pick(r, "data"));
            if (!data) { skipped++; return null; }
            return {
              data,
              entrada: num(pick(r, "entrada")),
              saida: num(pick(r, "saida")),
              descricao: str(pick(r, "descricao")),
            };
          }).filter((x): x is NonNullable<typeof x> => !!x);
          for (let i = 0; i < rows.length; i += 500) {
            const { error } = await supabase.from("movimentacoes").insert(rows.slice(i, i + 500));
            if (error) {
              errors.push(error.message); break;
            }
            ok += Math.min(500, rows.length - i);
          }
        }

        if (errors.length > 0) {
          rep.push({
            kind,
            ok,
            skipped,
            errors,
          });

          setReport(rep);

          throw new Error(
            `Falha ao importar ${kind}: ${errors[0]}`
          );
        }

        const produtos = await carregarProdutos();

        codeToId = produtos.codeToId;
        nameToId = produtos.nameToId;
        nameToCode = produtos.nameToCode;
        idToCusto = produtos.idToCusto;

        rep.push({ kind, ok, skipped, errors });
        setProgress(Math.round(((s + 1) / totalSheets) * 100));
      }
      setReport(rep);

      const houveErros = rep.some(
        (item) => item.errors.length > 0
      );

      if (houveErros) {
        toast.error(
          "Importação concluída com erros — veja o relatório abaixo"
        );
      } else {
        toast.success(
          "Importação finalizada — veja o relatório abaixo"
        );
      }
    } catch (e) {
      toast.error("Falha na importação", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: queryKeys.produtos.all,
        }),
        qc.invalidateQueries({
          queryKey: queryKeys.compras.all,
        }),
        qc.invalidateQueries({
          queryKey: queryKeys.vendas.all,
        }),
        qc.invalidateQueries({
          queryKey: queryKeys.movimentacoes.all,
        }),
      ]);

      setRunning(false);
      setStep("");
    }
  };

  if (!isAdmin) {
    return (
      <AppShell title="Importar Planilha">
        <Section title="Acesso restrito">
          <p className="text-sm text-muted-foreground">Apenas administradores podem importar dados.</p>
        </Section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Importar Planilha" subtitle="Auto-detecção de colunas, importação por aba">
      <Section title="1. Selecione o arquivo Excel">
        <div className="grid gap-3">
          <div>
            <Label htmlFor="file">Arquivo .xlsx ou .xls</Label>
            <Input id="file" type="file" accept=".xlsx,.xls"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" /> {file.name} — {sheets.length} aba(s) detectada(s)
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={wipeBeforeImport} onCheckedChange={(v) => setWipeBeforeImport(Boolean(v))} />
            Limpar dados importáveis antes de importar (substituição dos dados da planilha)
          </label>
        </div>
      </Section>

      {sheets.length > 0 && (
        <Section title="2. Confirme o mapeamento de cada aba" className="mt-6">
          <div className="space-y-4">
            {sheets.map((s, i) => {
              const missing = s.kind ? missingRequired(s.kind, s.mapping) : [];
              return (
                <div key={s.sheetName} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={s.enabled} onCheckedChange={(v) => updateSheet(i, { enabled: Boolean(v) })} />
                      <span className="font-semibold">{s.sheetName}</span>
                      <span className="text-xs text-muted-foreground">({s.rows.length} linhas)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Tipo:</Label>
                      <Select value={s.kind ?? ""} onValueChange={(v) => {
                        const kind = v as SheetKind;
                        updateSheet(i, { kind, mapping: autoMap(kind, s.headers) });
                      }}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Não importar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estoque">Estoque</SelectItem>
                          <SelectItem value="compras">Compras</SelectItem>
                          <SelectItem value="vendas">Vendas</SelectItem>
                          <SelectItem value="movimentacoes">Movimentações</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {s.kind && s.enabled && (
                    <>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.keys(FIELD_SYNONYMS[s.kind]).map((field) => {
                          const req = REQUIRED_FIELDS[s.kind!].includes(field);
                          const value = s.mapping[field] ?? "__none__";
                          return (
                            <div key={field}>
                              <Label className="text-xs">
                                {field} {req && <span className="text-destructive">*</span>}
                              </Label>
                              <Select value={value} onValueChange={(v) => updateMapping(i, field, v === "__none__" ? null : v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— ignorar —</SelectItem>
                                  {s.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                      {missing.length > 0 && (
                        <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          Colunas obrigatórias faltando: {missing.join(", ")}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {sheets.length > 0 && (
        <Section className="mt-6" title="3. Importar">
          <Button onClick={doImport} disabled={!ready || running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar abas selecionadas
          </Button>
          {running && (
            <div className="mt-3">
              <Progress value={progress} />
              <div className="mt-1 text-xs text-muted-foreground">{step}</div>
            </div>
          )}
          {report && (
            <div className="mt-4 space-y-2">
              {report.map((r) => (
                <div key={r.kind} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {r.errors.length === 0
                      ? <CheckCircle2 className="h-4 w-4 text-success" />
                      : <AlertCircle className="h-4 w-4 text-destructive" />}
                    {r.kind}
                    <Badge variant="secondary">{r.ok} importados</Badge>
                    {r.skipped > 0 && <Badge variant="outline">{r.skipped} ignorados</Badge>}
                  </div>
                  {r.errors.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                      {r.errors.slice(0, 5).map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </AppShell>
  );
}
