# Plano de Implementação — ERP Elysiar (MVP)

Controle de estoque, custos de lote e precificação multi-marketplace para revenda de suplementos. Reaproveita o repositório/projeto Vercel do antigo `theofinance` (pasta renomeada para `elysiar`); banco Supabase será novo (o antigo foi deletado por inatividade).

## Decisões confirmadas com o Leandro
- Uso único (sem multi-usuário/equipe) → sem modelo de tenant, RLS simples por `authenticated`.
- Sugestão de preço quando margem baixa = preço que atinge a margem mínima configurada.
- Categorias de custo: as 6 padrão do wireframe + usuário pode criar novas.

## Inventário técnico (o que reaproveitar do repo atual)
Fonte: exploração completa do repositório em `~/projetos/elysiar` (ex-theofinance).

**Reaproveitar direto:**
- `src/lib/supabase/{client.ts,server.ts,middleware.ts}` — boilerplate oficial `@supabase/ssr`, sem alteração.
- `src/middleware.ts` — padrão de proteção de rotas (`supabase.auth.getUser()`), só ajustar os paths protegidos.
- Mecanismo de dark/light (`next-themes`, `ThemeProvider.tsx`, `ThemeToggle.tsx`) — só trocar a paleta.
- Estrutura `@theme inline` do Tailwind v4 em `globals.css` (CSS vars, sem `tailwind.config.ts`) — trocar valores de cor.
- Padrão de API routes REST (`route.ts` + `[id]/route.ts` por recurso).
- `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json` como base.
- Infra PWA (manifest, service worker) — opcional, mantar se não custar esforço extra.

**Descartar/reescrever:**
- Todo schema de domínio financeiro (`accounts`, `transactions`, `debts`, `investments`, `imoveis`, `couples`...) — mover migrations antigas para `supabase/migrations/_archive_theofinance/` (não apagar, só arquivar).
- Modelo de tenant "casal fixo 2 usuários" — não se aplica (uso único).
- Todos os componentes de domínio em `src/components/*.tsx` (cards financeiros) — não existe design system genérico hoje (sem shadcn/ui, sem Radix), então vamos introduzir shadcn/ui do zero (ganho real de velocidade pra telas com tabela/formulário/modal, que é a maior parte do ERP).
- Rotas `src/app/dashboard/*`, `src/app/auth/*` — reescrever conteúdo, manter só o padrão estrutural.
- `GEMINI_API_KEY`/chat — fora do escopo do MVP, remover.

## Schema do banco (novo Supabase)

```
produtos            id, nome, fabricante, sku, preco_venda, status, created_at, updated_at
locais_estoque      id, nome, tipo(proprio|marketplace), taxa_marketplace, ativo, ordem
estoque             id, produto_id, local_id, quantidade  [unique produto_id+local_id]
lotes               id, codigo, fornecedor, data, created_at
lote_itens          id, lote_id, produto_id, quantidade
categorias_custo    id, nome, ativo, padrao, created_at
lote_custos         id, lote_id, categoria_id, modo(total|por_unidade), valor, descricao
movimentacoes       id, produto_id, tipo(entrada_lote|envio|ajuste), quantidade(+/-),
                    origem_local_id, destino_local_id, lote_id, observacao, data, created_at
configuracoes       id (linha única), imposto_percentual, margem_minima_percentual, updated_at
```

Seeds iniciais: `categorias_custo` (Frete, Embalagem, Caixa, Etiqueta, Prep Center, Outros — todas `padrao=true`), `locais_estoque` (Casa=proprio; Amazon FBA 15%, Mercado Livre Full 16%, Shopee 20%, TikTok 18% — todas `tipo=marketplace`), `configuracoes` (imposto 4%, margem mínima 10%).

RLS: todas as tabelas com policy única `using (auth.uid() is not null)` para todas as operações — sem isolamento por tenant, já que é uso único. Mais simples que o modelo antigo de `couples`.

**Regra de custo do produto:** custo unitário = custo do lote mais recente que ainda tem estoque disponível daquele produto (não é média ponderada no MVP — mais simples de implementar e entender).

## Fases

### Fase 0 — Preparação (feito nesta sessão)
- [x] Pasta renomeada `theofinance` → `elysiar`
- [x] `package.json` name → `erp-elysiar`
- [ ] **Ação do Leandro:** criar novo projeto Supabase (dashboard) e me passar URL + anon key + service role key

### Fase 1 — Limpeza + boilerplate + shadcn/ui
- Arquivar migrations antigas em `supabase/migrations/_archive_theofinance/`
- Remover `src/app/dashboard/*`, `src/app/auth/*`, `src/components/*.tsx` de domínio financeiro, rotas `src/app/api/*` antigas, `GEMINI_API_KEY`
- Manter e ajustar: clients Supabase, middleware, next-themes, globals.css (nova paleta a definir)
- `npx shadcn@latest init` + componentes: button, input, table, dialog, select, badge, card, sonner, form
- Verificação: `npm run build` limpo, app sobe em branco sem erro

### Fase 2 — Schema + auth
- Migration `001_schema_elysiar.sql` com as 9 tabelas + RLS + seeds (SQL Editor, mesmo fluxo de hoje)
- Tela de login (email/senha Supabase Auth) + middleware protegendo tudo exceto `/login`
- Criar 1 usuário Auth manualmente (dashboard Supabase)
- Verificação: login funciona, rota protegida redireciona sem sessão

### Fase 3 — Produtos (CRUD)
- Lista (tabela shadcn): nome, fabricante, estoque total (soma de `estoque`), preço venda, margem, status
- Criar/editar produto
- Verificação: cadastrar produto, ver na lista, editar, estoque mostra 0

### Fase 4 — Lotes + Custos do lote
- Criar lote: fornecedor, data, adicionar produtos (autocomplete) + quantidade → grava `lotes` + `lote_itens`, cria `movimentacoes` tipo `entrada_lote`, incrementa `estoque` em local "Casa"
- Tela custos do lote: adicionar por categoria, modo total/por_unidade → grava `lote_custos`
- Cálculo custo unitário do lote (soma custos convertidos / total unidades) exibido no resumo
- Verificação: criar lote com 2 produtos, lançar 3 custos, custo unitário bate a mão

### Fase 5 — Precificação
- Tela por produto: seletor de marketplace/local, breakdown de custos + imposto% + taxa marketplace% → lucro, margem%, badge verde (≥ mínima) / vermelho (< mínima) com preço sugerido
- Verificação: produto com margem forçada abaixo do mínimo mostra sugestão correta (preço que bate exatamente a margem mínima)

### Fase 6 — Estoque + Movimentações
- Tela estoque: produto × local com totais
- Tela movimentações: histórico + criar manual (envio: decrementa origem/incrementa destino; ajuste: +/- livre com observação)
- Verificação: enviar unidades Casa→Amazon FBA reflete nos dois locais e no histórico

### Fase 7 — Dashboard
- KPIs: investimento total, estoque total, lucro projetado, margem média, produtos abaixo da margem, últimos lotes
- Verificação: números batem com os dados cadastrados nas fases anteriores

### Fase 8 — Relatórios + Configurações
- Relatórios: exportação CSV dos 9 relatórios listados no wireframe
- Configurações: imposto, margem mínima, taxas por marketplace, categorias de custo (ativar/desativar + criar nova)
- Verificação: mudar margem mínima em Configurações reflete na tela de Precificação

### Fase 9 — Deploy + QA final
- `npm run build` limpo, revisão geral, commit + push (mesmo repo/Vercel do theofinance)
- Teste do fluxo completo ponta a ponta (o "Fluxo de uso" do wireframe, 7 passos)
- Confirmar domínio/URL de produção com o Leandro

## Anti-patterns a evitar
- Não inventar tabelas/campos além do schema acima sem necessidade concreta de uma fase
- Não reintroduzir o modelo `couples`/multi-tenant — uso único, confirmado
- Não usar `getSession()` no server (usar sempre `getUser()`, como o middleware atual já faz corretamente)
- Não apagar migrations antigas — arquivar
- Não commitar sem rodar `npm run build` antes
