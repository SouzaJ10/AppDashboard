<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Contexto arquitetural

Direção preferencial:

Página/UI → Hook React Query → Service → Supabase/RPC → Banco/RLS.

Essa é uma direção arquitetural, não uma obrigação de criar camadas sem benefício concreto.

Evitar:

- abstrações puramente estéticas;
- refactors grandes junto com features;
- duplicação de regras de negócio;
- acesso direto ao Supabase em páginas quando já existe service adequado.

Exceção conhecida:

- o importador possui uma orquestração própria e pode acessar Supabase diretamente onde isso já é intencional.

# Multiempresa

- Dados operacionais pertencem sempre a uma empresa.
- `empresa_id` é obrigatório nas tabelas de negócio.
- `EmpresaContext` define a empresa ativa.
- Toda query de negócio precisa respeitar a empresa ativa.
- Query keys devem permanecer separadas por empresa.
- Nunca usar dados de uma empresa no contexto de outra.
- O vínculo usuário/empresa está em `empresa_usuarios`.
- Roles atuais por empresa: `admin` e `user`.
- Segurança não pode depender apenas da interface; RLS/RPC continuam sendo a fronteira de segurança.

# Banco e SQL

As alterações recentes de banco foram versionadas principalmente em `docs/sql` e executadas manualmente no Supabase.

Não assumir que apenas `supabase/migrations` representa todo o estado atual do banco.

Arquivos relevantes em `docs/sql` incluem alterações de:

- base multiempresa;
- helpers multiempresa;
- empresa inicial;
- `empresa_id` nos dados;
- RPCs multiempresa;
- RLS multiempresa;
- `empresa_id NOT NULL`;
- unicidade por empresa;
- garantia de produto pertencente à mesma empresa.

Antes de alterar regras de negócio financeiras ou de isolamento:

- inspecionar código;
- inspecionar RPC correspondente;
- inspecionar SQL relevante;
- não inferir comportamento do banco apenas pelo frontend.

Nunca:

- executar SQL destrutivo sem autorização explícita;
- apagar dados reais;
- criar migration apenas para “organizar” histórico;
- alterar RLS/RPC sem análise específica.

# Regras financeiras

`movimentacoes` é a fonte de verdade do caixa.

Compra:

- compra à vista gera saída de caixa;
- compra a prazo não afeta o caixa até o pagamento;
- pagar compra marca como paga e cria a movimentação correspondente;
- excluir compra desfaz seus efeitos de estoque e financeiro conforme as regras existentes;
- última compra pode atualizar o custo de compra do produto conforme comportamento existente.

Despesa:

- despesa pendente não afeta caixa;
- despesa paga afeta caixa;
- transições pago/pendente devem preservar as regras existentes de movimentação;
- não reinterpretar o campo `data` sem verificar RPC/banco.

Venda:

- reduz estoque;
- gera movimentação financeira;
- `preco_venda` representa o TOTAL da venda;
- `valor_unitario` representa o valor por unidade;
- `custo` representa o custo total;
- `lucro = total - custo - despesas`;
- `margem = lucro / total` quando `total > 0`.

Não fazer backfill arbitrário de custo para vendas históricas que não possuem custo conhecido.

# Importador

O importador possui uma regra deliberadamente diferente para NOVAS vendas importadas:

Se o custo informado da venda for `0`/ausente:

`custo = produto.custo_compra * quantidade`.

Essa regra já foi testada e deve ser preservada.

Produtos importados são isolados por empresa: `UNIQUE(empresa_id, codigo)`.

Não reintroduzir funcionalidade de apagar todos os dados antes de importar.

Não existe atualmente um marcador seguro de lote de importação para distinguir registros importados de registros manuais.

# React Query

- Usar `queryKeys` centralizadas.
- Chaves de dados operacionais devem incluir `empresaId`.
- Invalidar a menor família coerente possível sem deixar dados derivados obsoletos.
- Não criar chaves ad hoc quando já existir uma família em `queryKeys.ts`.

# Realtime

`useRealtime` invalida famílias de queries relacionadas às tabelas monitoradas.

Preservar cleanup dos canais ao desmontar.

# Testes

A suíte atual usa Vitest + React Testing Library.

Antes de concluir uma alteração relevante, executar:

```sh
npm test
npx tsc --noEmit
npm run build
```

Não afirmar que uma alteração está concluída se algum desses comandos falhar.

Para regras puras, preferir funções testáveis em vez de testes gigantes de componentes.

Mocks de Supabase não substituem testes reais de PostgreSQL/RPC/RLS.

Como não usamos Docker atualmente:

- testes automatizados do frontend/services continuam normalmente;
- RPC/RLS/PostgreSQL não devem ser “simulados” como se isso provasse o banco real;
- alterações de banco exigem validação específica e controlada.

# Git

Além das proteções ao histórico Git e à integração Lovable descritas acima:

- antes de mudanças importantes, executar `git status --short`;
- não fazer commit sem autorização explícita;
- não fazer push sem autorização explícita;
- não trocar branch sem necessidade e autorização.

Ao terminar uma tarefa:

- mostrar os arquivos alterados;
- resumir o que mudou;
- informar resultados de tests/typecheck/build;
- deixar o usuário revisar antes do commit.

# Forma de trabalho

Trabalhar em incrementos coerentes de tamanho médio.

Antes de modificar:

1. entender comportamento atual;
2. identificar arquivos e regras afetadas;
3. preservar comportamento já validado;
4. alterar somente o necessário.

Depois:

1. rodar testes relevantes;
2. rodar suíte completa quando apropriado;
3. rodar TypeScript;
4. rodar build;
5. revisar git diff/status.

Se houver ambiguidade em regra de negócio, não escolher arbitrariamente. Informar a dúvida e pedir decisão antes de alterar.

# Estado atual do roadmap

Concluído:

1. Revisão funcional
2. Consistência
3. Arquitetura
4. Multiempresa
5. Testes automatizados

Em andamento:

6. Gestão / Funcionalidades

Próximas fases planejadas:

7. Auditoria financeira
8. UX / Responsividade
9. Performance
10. Começar sem planilha
11. Gestão de usuários
12. Produção
13. Usuários reais
14. Validação comercial
