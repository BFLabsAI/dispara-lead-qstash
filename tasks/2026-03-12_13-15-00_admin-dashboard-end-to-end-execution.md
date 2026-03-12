# Admin Dashboard End-to-End Execution

## Metadata

- Timestamp: `2026-03-12 13:15:00`
- Projeto de testes: `Dispara Lead Prod`
- Responsavel: `Codex`
- Status: `done`
- Severidade: `medium`
- Skills aplicadas: `performance-optimization`, `supabase-postgres-best-practices`
- Ambientes afetados: `frontend admin`, `supabase postgres`, `supabase rest rpc`
- Links de apoio:
  - [src/pages/admin/AdminDashboard.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/AdminDashboard.tsx)
  - [supabase/migrations/20260312134000_admin_dashboard_rpcs_and_supporting_indexes.sql](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/migrations/20260312134000_admin_dashboard_rpcs_and_supporting_indexes.sql)
  - [supabase/migrations/20260312142000_admin_dashboard_perf_tuning.sql](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/migrations/20260312142000_admin_dashboard_perf_tuning.sql)
  - [tasks/2026-03-12_12-45-00_admin-dashboard-performance-plan.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_12-45-00_admin-dashboard-performance-plan.md)

## Contexto

O `/admin` tinha baixo valor operacional e exibia apenas tres contagens simples. O objetivo desta execucao foi transformar a tela em um painel administrativo com dados reais de saude da plataforma, mantendo o schema existente e aplicando otimizacoes de leitura.

## Sintoma principal

- Outro: dashboard administrativo pobre em dados e com leitura lenta apos enriquecimento inicial

## Impacto

- Quem e afetado: super admins e operacao
- Fluxo afetado: leitura do estado geral da plataforma no Manager Portal
- Consequencia para operacao: triagem manual lenta, pouca visibilidade e degradacao de UX no `/admin`

## Escopo da revisao

- O que esta dentro da investigacao:
  - RPCs administrativas
  - indices de apoio
  - enriquecimento do `/admin`
  - melhoria de performance percebida e de query
- O que esta fora da investigacao:
  - novas tabelas de negocio
  - deploy do frontend de producao
  - observabilidade externa/APM

## Hipoteses iniciais

1. O maior ganho funcional viria de consolidar leituras do `/admin` em RPCs.
2. O maior custo de banco ficaria na camada de alertas, principalmente em logs.
3. O maior custo percebido no frontend viria de bloquear a renderizacao esperando todas as queries.

## Skills escolhidas e motivo

- `performance-optimization`: reduzir roundtrips, melhorar carregamento percebido e evitar gargalos obvios no dashboard
- `supabase-postgres-best-practices`: desenhar RPCs e indices coerentes com filtros e agrupamentos administrativos
- `systematic-debugging`: usado implicitamente na analise do 404 para confirmar causa real antes de corrigir

## Passos de reproducao

1. Abrir `/admin`
2. Observar que a tela original exibia apenas totals simples
3. Implementar RPCs e adaptar o frontend para cards, rankings e alertas
4. Validar o comportamento no Supabase remoto
5. Refinar performance apos a primeira rodada

## Evidencias coletadas

### Frontend

- `AdminDashboard` original fazia apenas 3 contagens client-side
- apos a primeira implementacao, a tela ficou funcional mas ainda lenta porque:
  - bloqueava a renderizacao aguardando `summary`, `top_tenants` e `alerts`
  - a secao de alertas concentrava mais custo de banco

### Network / API

- os endpoints RPC passaram a existir e responder no projeto:
  - `admin_dashboard_summary`
  - `admin_dashboard_top_tenants`
  - `admin_dashboard_alerts`
- o erro `404` reportado depois do rollout foi revalidado e nao era mais estado atual do backend
- teste direto no endpoint mostrou `Forbidden`, nao `404`, quando o token nao era de super admin

### Banco / Supabase

- migration administrativa aplicada:
  - `20260312134000_admin_dashboard_rpcs_and_supporting_indexes`
- tuning adicional aplicado:
  - `20260312142000_admin_dashboard_perf_tuning`
- foco principal do tuning:
  - `admin_dashboard_alerts()`
  - indices parciais para instancias desconectadas e campanhas travadas
  - reescrita da deteccao de tenants inativos com `NOT EXISTS`

## Analise de causa raiz

O problema original do `/admin` era estrutural:

- faltava camada de consolidacao para leitura administrativa
- faltavam indices de apoio para filtros e ordenacoes operacionais
- o frontend tratava a tela inteira como uma unica carga sincrona, piorando o tempo percebido

Depois do enriquecimento inicial, a lentidao residual veio principalmente de:

- query de alertas mais cara
- bloqueio da tela inteira aguardando todas as RPCs

## Plano de acao executado

1. Criar migration administrativa com RPCs e indices
2. Reescrever `AdminDashboard` para consumir payload consolidado
3. Aplicar migration no Supabase remoto
4. Verificar endpoints RPC no projeto real
5. Afinar performance com tuning especifico para alertas
6. Desacoplar carregamento do resumo, ranking e alertas no frontend

## Tarefas detalhadas

- [x] Mapear os dados que o `/admin` podia mostrar sem criar tabela nova
- [x] Criar RPC `admin_dashboard_summary()`
- [x] Criar RPC `admin_dashboard_top_tenants()`
- [x] Criar RPC `admin_dashboard_alerts()`
- [x] Adicionar indices de apoio para users, instances, campaigns e tenants
- [x] Adaptar `AdminDashboard` para cards, ranking e alertas
- [x] Aplicar migration no remoto
- [x] Verificar a causa real do erro `404`
- [x] Aplicar tuning adicional de performance
- [x] Validar build local

## O que foi implementado

### Banco

- Migration [supabase/migrations/20260312134000_admin_dashboard_rpcs_and_supporting_indexes.sql](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/migrations/20260312134000_admin_dashboard_rpcs_and_supporting_indexes.sql)
  - RPC `admin_dashboard_summary(window_days integer default 30)`
  - RPC `admin_dashboard_top_tenants(window_days integer default 30, result_limit integer default 5)`
  - RPC `admin_dashboard_alerts(window_days integer default 30, result_limit integer default 10)`
  - indices:
    - `idx_users_super_admin`
    - `idx_users_tenant_role`
    - `idx_users_null_tenant_non_super`
    - `idx_instances_tenant_status`
    - `idx_campaigns_tenant_status_created`
    - `idx_campaigns_status_created`
    - `idx_tenants_status`

- Migration [supabase/migrations/20260312142000_admin_dashboard_perf_tuning.sql](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/migrations/20260312142000_admin_dashboard_perf_tuning.sql)
  - indice parcial `idx_instances_disconnected_updated_at_desc`
  - indice parcial `idx_campaigns_pending_processing_created_at`
  - reescrita da funcao `admin_dashboard_alerts()` para reduzir custo de leitura

### Frontend

- Tela [src/pages/admin/AdminDashboard.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/AdminDashboard.tsx)
  - cards de visao executiva
  - saude de usuarios
  - pipeline de campanhas
  - ranking de tenants por volume
  - alertas operacionais
  - loaders independentes por bloco

## Dados que o painel passou a mostrar

- totals de tenants, users, super admins, instances, campaigns e logs
- tenants por status
- users por role
- instances conectadas e desconectadas
- campaigns por status
- logs em `7d` e `30d`
- tenants ativos na janela
- top tenants por volume de mensagens
- alertas:
  - tenants sem owner
  - tenants sem users
  - tenants inativos
  - instances desconectadas
  - campanhas travadas
  - perfis invalidos sem tenant

## Validacao

- Testes executados:
  - `npm run build`
  - `supabase db push --linked --include-all --yes`
  - chamadas diretas aos endpoints REST RPC
  - `supabase migration list --linked`
- Resultado:
  - build aprovado
  - migrations aplicadas no remoto
  - RPCs disponiveis no projeto
  - erro atual do RPC para token sem permissao: `Forbidden`
- Cenarios cobertos:
  - existencia das RPCs
  - rollout do banco
  - compilacao do frontend
  - comportamento de permissao
- Cenarios nao cobertos:
  - benchmark formal com `EXPLAIN ANALYZE`
  - medicao automatizada de tempo no browser apos deploy do frontend

## Resultado final

- Decisao: manter leitura administrativa por RPCs agregadas e blocos independentes no frontend
- Fix aplicado: `sim`
- Pendencias:
  - publicar o frontend se ainda nao estiver atualizado no ambiente servido
  - fazer rodada de medicao real de tempo no browser
- Risco residual:
  - ainda pode haver custo relevante em ambientes com crescimento grande de logs
  - sem benchmark, o proximo gargalo residual ainda nao esta quantificado

## Proximos passos

1. Deployar o frontend para expor a versao nova do `/admin`
2. Medir tempo real das 3 RPCs no browser e no network
3. Se necessario, dividir `admin_dashboard_alerts()` em blocos ou materializar agregacoes futuras
