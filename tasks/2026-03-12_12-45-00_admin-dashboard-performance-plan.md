# Admin Dashboard Performance Plan

## Metadata

- Timestamp: `2026-03-12 12:45:00`
- Projeto de testes: `Dispara Lead Prod`
- Responsavel: `Codex`
- Status: `draft`
- Severidade: `medium`
- Skills aplicadas: `performance-optimization`, `supabase-postgres-best-practices`
- Ambientes afetados: `admin portal`, `supabase postgres`, `edge/runtime reads`
- Links de apoio:
  - [src/pages/admin/AdminDashboard.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/AdminDashboard.tsx)
  - [src/pages/admin/TenantList.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/TenantList.tsx)
  - [src/pages/admin/TenantDetails.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/TenantDetails.tsx)
  - [supabase/migrations/20260106120000_consolidated_dispara_schema.sql](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/migrations/20260106120000_consolidated_dispara_schema.sql)

## Contexto

O `/admin` hoje mostra apenas contagens brutas de tenants, instancias e usuarios. O schema atual ja permite expor saude operacional, distribuicao por status e rankings por tenant sem criar novas tabelas de negocio.

## Sintoma principal

- Outro: painel administrativo com baixa densidade de informacao e sem consolidacao otimizada

## Impacto

- Quem e afetado: operacao, suporte, produto e super admins
- Fluxo afetado: leitura do estado geral da plataforma e triagem de problemas
- Consequencia para operacao: necessidade de navegar por varias telas para obter contexto e maior risco de diagnostico manual lento

## Escopo da revisao

- O que esta dentro da investigacao:
  - enriquecimento do `/admin`
  - estrategia de consultas agregadas
  - indices para suportar cards, rankings e alertas
  - plano de rollout e validacao de performance
- O que esta fora da investigacao:
  - novas tabelas de negocio
  - ETL externo
  - BI separado
  - redesign visual amplo do Manager Portal

## Hipoteses iniciais

1. O maior ganho vem de mover leitura administrativa de multiplas queries client-side para poucas RPCs agregadas.
2. Os gargalos principais ficarao em `message_logs_dispara_lead_saas_03`, `users_dispara_lead_saas_02`, `instances_dispara_lead_saas_02` e `campaigns_dispara_lead_saas_02`.
3. Indices compostos por `tenant_id`, `status` e `created_at` resolvem a maior parte dos cenarios do painel sem custo excessivo de escrita.

## Skills escolhidas e motivo

- `performance-optimization`: definir estrategia de leitura agregada, reduzir roundtrips e evitar scans desnecessarios
- `supabase-postgres-best-practices`: escolher indices coerentes com filtros, agrupamentos e ordenacao
- `systematic-debugging`: nao aplicavel neste momento
- `debugging`: nao aplicavel neste momento

## Passos de reproducao

1. Abrir `/admin`
2. Observar cards atuais e requests emitidos
3. Comparar dados desejados vs dados hoje disponiveis no schema

## Evidencias coletadas

### Frontend

- `AdminDashboard` atual faz 3 contagens independentes client-side
- Nao existe bloco de alertas, rankings ou distribuicao operacional

### Network / API

- O frontend usa `supabase.from(...).select('*', { count: 'exact', head: true })`
- Isso funciona para pouco volume, mas nao escala bem para painel com mais cards e listas

### Banco / Supabase

- Tabelas uteis sem criar dado novo:
  - `tenants_dispara_lead_saas_02`
  - `users_dispara_lead_saas_02`
  - `instances_dispara_lead_saas_02`
  - `campaigns_dispara_lead_saas_02`
  - `message_logs_dispara_lead_saas_03`
- Ja existe volume alto de logs por tenant, entao agregacoes precisam ser pensadas para evitar scans totais repetidos

## Analise de causa raiz

O limite atual do `/admin` nao e falta de dados, e sim falta de camada de consolidacao. O painel esta acoplado a queries simples e nao a leituras agregadas otimizadas para operacao.

## Plano de acao

1. Definir quais blocos de negocio entram no `/admin` sem criar dado novo
2. Criar RPCs administrativas agregadas para reduzir roundtrips e centralizar regra
3. Adicionar indices estritamente ligados aos filtros, joins e ordenacoes dessas RPCs
4. Implementar frontend consumindo payload consolidado com cache curto
5. Validar planos de execucao e regressao funcional

## Dados que o `/admin` pode mostrar agora

### Cards principais

- Total de tenants
- Tenants ativos, inativos e suspensos
- Total de usuarios
- Total de super admins
- Usuarios por papel: `owner`, `admin`, `member`
- Total de instancias
- Instancias por status
- Total de campanhas
- Campanhas por status
- Total de logs
- Logs ultimos `7d` e `30d`

### Rankings

- Top 5 tenants por volume de logs em `30d`
- Top 5 tenants por numero de usuarios
- Top 5 tenants por numero de instancias
- Top 5 tenants por campanhas finalizadas

### Alertas operacionais

- Tenants sem `owner`
- Tenants sem usuarios
- Tenants sem atividade em `30d`
- Instancias desconectadas
- Campanhas presas em `pending` ou `processing`
- Perfis sem tenant que nao sao super admin

## Estrategia tecnica

### Fase 1: consolidacao por RPC

- Criar uma RPC `admin_dashboard_summary()`
- Retornar um JSON unico com:
  - `totals`
  - `tenant_status`
  - `user_roles`
  - `instance_status`
  - `campaign_status`
  - `activity_windows`
- Beneficio:
  - 1 roundtrip para cards principais
  - regra centralizada no banco
  - frontend mais simples e previsivel

### Fase 2: rankings e alertas via RPCs separadas

- `admin_dashboard_top_tenants(window_days integer default 30)`
- `admin_dashboard_alerts()`
- Separar porque:
  - rankings e alertas tem custo diferente
  - facilita cache diferente por bloco
  - permite lazy loading se necessario

### Fase 3: indices

- `message_logs_dispara_lead_saas_03`
  - indice composto em `(tenant_id, created_at desc)`
  - indice composto em `(created_at desc, tenant_id)` se a query administrativa filtrar muito por janela global antes de agrupar tenant
  - indice parcial para status de interesse so se os alertas usarem filtro recorrente por `status`
- `users_dispara_lead_saas_02`
  - indice em `(is_super_admin)`
  - indice em `(tenant_id, role)`
  - indice parcial `where tenant_id is null` para sanity checks de admins globais
- `instances_dispara_lead_saas_02`
  - indice em `(tenant_id, status)`
  - indice em `(status)` se dashboard global agrupar por status com frequencia
- `campaigns_dispara_lead_saas_02`
  - indice em `(tenant_id, status, created_at desc)`
  - indice em `(status, created_at desc)` para cards globais de backlog
- `tenants_dispara_lead_saas_02`
  - indice em `(status)`

### Fase 4: frontend

- Trocar queries brutas do `AdminDashboard` por `rpc(...)`
- Cache de `30s` a `60s`
- `React Query` com chaves separadas:
  - `adminSummary`
  - `adminTopTenants`
  - `adminAlerts`
- Mostrar loading parcial por bloco, nao trava a tela inteira

## Indices propostos

```sql
create index concurrently if not exists idx_users_super_admin
on public.users_dispara_lead_saas_02 (is_super_admin);

create index concurrently if not exists idx_users_tenant_role
on public.users_dispara_lead_saas_02 (tenant_id, role);

create index concurrently if not exists idx_users_null_tenant_non_super
on public.users_dispara_lead_saas_02 (id)
where tenant_id is null and coalesce(is_super_admin, false) = false;

create index concurrently if not exists idx_instances_tenant_status
on public.instances_dispara_lead_saas_02 (tenant_id, status);

create index concurrently if not exists idx_campaigns_tenant_status_created
on public.campaigns_dispara_lead_saas_02 (tenant_id, status, created_at desc);

create index concurrently if not exists idx_campaigns_status_created
on public.campaigns_dispara_lead_saas_02 (status, created_at desc);

create index concurrently if not exists idx_tenants_status
on public.tenants_dispara_lead_saas_02 (status);
```

## Observacoes sobre logs

- `message_logs_dispara_lead_saas_03` ja recebeu otimizacoes hoje, entao antes de adicionar novo indice global em logs:
  - revisar o indice existente
  - rodar `EXPLAIN ANALYZE` nas RPCs reais
  - evitar sobreposicao inutil
- Para painel admin, preferir janela temporal explicita (`7d`/`30d`) ao inves de contagem historica total em tempo real sempre

## Rollout sugerido

1. Implementar RPC `admin_dashboard_summary()`
2. Validar plano com `EXPLAIN`
3. Adicionar so os indices faltantes
4. Implementar cards novos no frontend
5. Implementar `top_tenants`
6. Implementar `alerts`
7. Medir latencia antes e depois

## Metricas de sucesso

- `/admin` com `TTFB` de dados abaixo de `500ms` em leitura quente
- no maximo `3` requests principais para montar a tela
- sem full scans recorrentes nas tabelas maiores
- dashboard com capacidade de responder:
  - quem esta ativo
  - quem esta parado
  - onde ha backlog
  - onde ha inconsistencia

## Tarefas detalhadas

- [ ] Mapear as queries administrativas desejadas bloco a bloco
- [ ] Inspecionar indices ja existentes em `message_logs_dispara_lead_saas_03`
- [ ] Definir RPC `admin_dashboard_summary()`
- [ ] Definir RPC `admin_dashboard_top_tenants()`
- [ ] Definir RPC `admin_dashboard_alerts()`
- [ ] Validar `EXPLAIN` antes de adicionar indices
- [ ] Adicionar apenas indices com ganho real esperado
- [ ] Atualizar `AdminDashboard` para payload consolidado
- [ ] Medir latencia e contagem de requests
- [ ] Validar regressao funcional no portal admin

## Validacao

- Testes executados: `planejamento apenas`
- Resultado: `plano pronto para execucao`
- Cenarios cobertos:
  - visao executiva
  - saude operacional
  - rankings
  - alertas
  - desempenho
- Cenarios nao cobertos:
  - benchmark real com `EXPLAIN ANALYZE`
  - comparacao de custo de escrita apos novos indices

## Resultado final

- Decisao: evoluir `/admin` por RPCs agregadas + indices orientados a consulta
- Fix aplicado: `nao`
- Pendencias:
  - implementar RPCs
  - medir queries reais
  - publicar frontend
- Risco residual:
  - adicionar indices redundantes se a analise de execucao for ignorada

## Proximos passos

1. Implementar a primeira RPC com cards principais
2. Rodar `EXPLAIN` e ajustar indices necessarios
3. Atualizar a tela `/admin` com cards, rankings e alertas
