# Frente 1: Dashboard e Logs - Relatório de QA e Performance Analysis

**Data:** 2026-03-12
**Responsável:** Validator Agent (QA & Performance)
**Status:** Concluído

---

## 1. Cenários Prioritários Definidos

### Dashboard (`/dashboard`)
| Cenário | Prioridade | Tipo |
|---------|------------|------|
| Carregamento inicial com preview de 1000 registros | Alta | Smoke |
| Aplicação de filtros em tempo real | Alta | Regressão |
| Paginação da tabela (20 itens/página) | Média | Regressão |
| Cálculo de KPIs (envios, IA, fila, falhas) | Alta | Smoke |
| Atualização manual (botão refresh) | Média | Smoke |
| Filtros combinados (data + instância + campanha) | Alta | Regressão |

### Logs (`/logs`)
| Cenário | Prioridade | Tipo |
|---------|------------|------|
| Carregamento paginado (50 itens/página) | Alta | Smoke |
| Filtros server-side | Alta | Regressão |
| Navegação de páginas | Média | Regressão |
| Preview de 500 registros para filtros | Média | Smoke |

---

## 2. Separação Smoke Test vs Regressão Mínima

### Smoke Test (Deve passar sempre)
1. Dashboard carrega sem erros de console
2. Logs carrega sem erros de console
3. Dados iniciais aparecem em < 3s
4. Filtros básicos funcionam
5. Paginação responde

### Regressão Mínima (Verificações periódicas)
1. Filtros combinados complexos
2. Cálculos de KPIs com grandes volumes
3. Cache invalidation após refresh
4. Comportamento com dados vazios
5. Tratamento de erros de rede

---

## 3. Análise de Código - Queries e Leituras

### 3.1 Dashboard (`src/pages/Dashboard.tsx`)

**Query 1: Preview Data (linha 41-54)**
```typescript
const { data: dashboardData } = useQuery({
  queryKey: ['dashboardData', 'preview', DASHBOARD_PREVIEW_LIMIT, impersonatedTenantId],
  queryFn: () => getDashboardPreviewData(DASHBOARD_PREVIEW_LIMIT), // 1000 registros
  staleTime: 30000,
  gcTime: 300000,
});
```

**Query 2: Campaign Stats (linha 57-61)**
```typescript
const { data: campaignStats } = useQuery({
  queryKey: ['campaignStats', impersonatedTenantId],
  queryFn: () => getCampaignStats(),
  staleTime: 30000,
});
```

**Problemas Identificados:**
- ⚠️ **ALERTA:** Dashboard faz 2 queries paralelas no carregamento
- ⚠️ **ALERTA:** Preview de 1000 registros é carregado para memória e filtrado client-side
- ✅ Bom: Paginação na tabela (20 itens/página)
- ✅ Bom: Stale time de 30s evita requisições desnecessárias

### 3.2 Logs (`src/pages/Logs.tsx`)

**Query 1: Filter Preview (linha 32-40)**
```typescript
const { data: filterPreviewData } = useQuery({
  queryKey: ['logsFilterPreview', impersonatedTenantId],
  queryFn: () => getDashboardPreviewData(500), // 500 registros para filtros
  staleTime: 30000,
});
```

**Query 2: Paginated Data (linha 53-66)**
```typescript
const { data: paginatedData } = useQuery({
  queryKey: ['logsData', currentPage, pageSize, impersonatedTenantId, normalizedFilters],
  queryFn: () => getDashboardDataPaginated(currentPage, pageSize, normalizedFilters),
  staleTime: 30000,
});
```

**Problemas Identificados:**
- ⚠️ **ALERTA:** Logs também carrega preview de 500 registros além da página atual
- ✅ Bom: Server-side pagination implementada corretamente (50 itens/página)
- ✅ Bom: Filtros são aplicados server-side

### 3.3 Supabase Client (`src/services/supabaseClient.ts`)

**Função: `fetchRecentDisparadorData` (linha 231-279)**
```typescript
export async function fetchRecentDisparadorData(limit: number = 100) {
  // Cache de 30 segundos
  const CACHE_TTL = 30000;

  let query = supabase
    .from('message_logs_dispara_lead_saas_03')
    .select('*')  // ⚠️ Seleciona TODAS as colunas
    .order('created_at', { ascending: false })
    .limit(limit)
    .eq('tenant_id', tenantId);
}
```

**Função: `fetchDisparadorDataPaginated` (linha 143-225)**
```typescript
export async function fetchDisparadorDataPaginated(...) {
  let query = supabase
    .from('message_logs_dispara_lead_saas_03')
    .select('*', { count: 'exact', head: false })  // ⚠️ Seleciona TODAS as colunas
    .eq('tenant_id', tenantId);
  // ... filtros ...
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
}
```

**Função: `fetchAllDisparadorData` (linha 282-333)**
```typescript
export async function fetchAllDisparadorData(): Promise<DisparadorData[]> {
  // ⚠️⚠️⚠️ CRÍTICO: Busca TODOS os dados em loop recursivo!
  while (hasMore) {
    const { data } = await supabase
      .from('message_logs_dispara_lead_saas_03')
      .select('*')  // Todas as colunas
      .range(from, to)
      .eq('tenant_id', tenantId);
    // ...
    if (data.length < pageSize) hasMore = false;
    else page++;
  }
}
```

---

## 4. Sinais de Alerta Confirmados

### 🔴 ALERTA CRÍTICO 1: Leitura Integral de Logs
**Local:** `fetchAllDisparadorData` em `supabaseClient.ts:282-333`

**Problema:** A função busca TODOS os registros da tabela `message_logs_dispara_lead_saas_03` em um loop recursivo, página por página (1000 em 1000).

**Impacto:**
- Para um tenant com 100.000 logs: 100 requisições sequenciais
- Payload enorme transferido para o cliente
- Memória do navegador saturada

**Uso atual:** CONFIRMADO - A função é usada em:
- `dashboardService.ts:22` - `getDashboardData()` (legacy function)
- `dashboardService.ts:115` - `getDashboardDataAll()` (função exposta para exportação completa)

**Análise de risco:**
- `getDashboardData` é marcada como "Legacy" e parece não ser usada nas páginas atuais
- `getDashboardDataAll` permite filtros mas ainda assim carrega TODOS os dados do tenant
- Para um tenant com 1 ano de operação e 1000 envios/dia: ~365.000 registros = 365 requisições sequenciais

### 🔴 ALERTA CRÍTICO 2: Select * em Todas as Queries
**Local:** Todas as funções de fetch em `supabaseClient.ts`

**Problema:** Todas as queries usam `.select('*')` sem especificar colunas.

**Colunas na tabela `message_logs_dispara_lead_saas_03`:**
- id, tenant_id, campaign_id, instance_name, phone_number
- message_content (pode ser grande!)
- status, campaign_name, campaign_type
- error_message, provider_response (JSON grande!)
- metadata (JSON!)
- scheduled_for, created_at, queued_at, sent_at, responded_at

**Impacto:**
- Payloads desnecessariamente grandes
- Colunas JSON (`metadata`, `provider_response`) são pesadas

### 🟡 ALERTA MÉDIO 3: Filtros no Cliente (Dashboard)
**Local:** `Dashboard.tsx:78-111`

**Problema:** O Dashboard carrega 1000 registros e aplica filtros client-side:
```typescript
const filteredData = useMemo(() => {
  let filtered = [...allData];  // Copia array de 1000 itens
  if (filters.instance !== "all") {
    filtered = filtered.filter(item => item.instancia === filters.instance);
  }
  // ... mais filtros
}, [allData, filters]);
```

**Impacto:**
- Para 1000 registros: filtragem rápida
- Mas não escala para mais dados
- Filtros de data são processados em memória

### 🟡 ALERTA MÉDIO 4: Dupla Requisição de Preview
**Local:** Dashboard e Logs carregam previews separados

**Problema:** Ambas as páginas carregam previews (1000 e 500) para popular os filtros.

**Impacto:**
- 2 requisições paralelas no carregamento inicial
- Dados redundantes

### 🟢 OK: Paginação Server-Side
A página Logs implementa paginação server-side corretamente com `range()` e `count: 'exact'`.

---

## 5. Verificação de Índices no Banco

### Índices Encontrados para `message_logs_dispara_lead_saas_03`:
```sql
-- Índice para busca por phone + tenant (webhook)
CREATE INDEX idx_message_logs_03_phone_tenant_sent
ON message_logs_dispara_lead_saas_03 (tenant_id, phone_number, sent_at DESC);

-- Índice para QStash
CREATE INDEX idx_message_logs_qstash_id
ON message_logs_dispara_lead_saas_03(qstash_message_id);
```

### Índices AUSENTES (Necessários):
```sql
-- ⚠️ FALTANDO: Índice para ordenação por created_at (usado em TODAS as queries)
CREATE INDEX idx_message_logs_03_created_at
ON message_logs_dispara_lead_saas_03 (tenant_id, created_at DESC);

-- ⚠️ FALTANDO: Índice para filtros por status
CREATE INDEX idx_message_logs_03_status
ON message_logs_dispara_lead_saas_03 (tenant_id, status);

-- ⚠️ FALTANDO: Índice para filtros por instance_name
CREATE INDEX idx_message_logs_03_instance
ON message_logs_dispara_lead_saas_03 (tenant_id, instance_name);

-- ⚠️ FALTANDO: Índice para filtros por campaign_name
CREATE INDEX idx_message_logs_03_campaign
ON message_logs_dispara_lead_saas_03 (tenant_id, campaign_name);

-- ⚠️ FALTANDO: Índice para metadata->publico/criativo (usado em filtros)
CREATE INDEX idx_message_logs_03_metadata_publico
ON message_logs_dispara_lead_saas_03 ((metadata->>'publico'));

CREATE INDEX idx_message_logs_03_metadata_criativo
ON message_logs_dispara_lead_saas_03 ((metadata->>'criativo'));
```

---

## 6. Verificação: Lentidão no Supabase vs Cliente

### Análise de Causa:

| Problema | Origem | Severidade |
|----------|--------|------------|
| Select * | Cliente (query) | Alta |
| Falta de índices | Supabase (schema) | Alta |
| Filtros client-side | Cliente (lógica) | Média |
| Loop recursivo em fetchAll | Cliente (código) | Crítica |
| Dupla requisição | Cliente (arquitetura) | Média |
| Count exact | Supabase (query) | Média |

### Conclusão:
A lentidão **principal** está no **cliente** (queries ineficientes, select *, filtros em memória), mas há **contribuição do Supabase** (falta de índices otimizados para as queries de dashboard).

---

## 7. Ajuste de Performance: Maior Impacto, Menor Risco

### Recomendação #1: Selecionar Colunas Mínimas (ALTO IMPACTO / BAIXO RISCO)

**Arquivo:** `src/services/supabaseClient.ts`

**Mudança:**
```typescript
// ANTES:
.select('*')

// DEPOIS (para Dashboard/Logs):
.select('id,instance_name,phone_number,status,campaign_name,campaign_type,created_at,responded_at,metadata')
```

**Impacto esperado:** Redução de 50-70% no tamanho do payload (remove message_content, provider_response grandes).

**Risco:** Baixo - apenas remover colunas não utilizadas na UI.

---

### Recomendação #2: Adicionar Índices Críticos (ALTO IMPACTO / BAIXO RISCO)

**Arquivo:** Nova migration SQL

```sql
-- Índice principal para queries de dashboard
CREATE INDEX CONCURRENTLY idx_message_logs_03_tenant_created_at
ON message_logs_dispara_lead_saas_03 (tenant_id, created_at DESC);

-- Índice para filtros comuns
CREATE INDEX CONCURRENTLY idx_message_logs_03_tenant_status
ON message_logs_dispara_lead_saas_03 (tenant_id, status);
```

**Impacto esperado:** Redução significativa no tempo de execução das queries.

**Risco:** Baixo - índices não quebram funcionalidade existente.

---

### Recomendação #3: Remover fetchAllDisparadorData ou Limitar (ALTO IMPACTO / MÉDIO RISCO)

**Problema:** A função `fetchAllDisparadorData` é perigosa para tenants com muitos logs.

**Verificar uso:**
```bash
grep -r "fetchAllDisparadorData" src/
```

**Se não estiver sendo usada:** Remover.
**Se estiver sendo usada:** Adicionar limite máximo (ex: 5000 registros) ou implementar virtual scrolling.

---

### Recomendação #4: Consolidar Requisições de Preview (MÉDIO IMPACTO / BAIXO RISCO)

**Problema:** Dashboard e Logs fazem requisições separadas para previews similares.

**Solução:** Usar React Query cache compartilhado ou consolidar em uma única requisição.

---

## 8. Evidências Consolidadas

### Checklist Preenchido:

- [x] **Cenários prioritários definidos** - Dashboard: 6 cenários, Logs: 4 cenários
- [x] **Smoke test separado** - 5 testes críticos identificados
- [x] **Queries identificadas** - 2 no Dashboard, 2 no Logs, 3 funções no supabaseClient
- [x] **Paginação verificada** - Logs: server-side (50/pág), Dashboard: client-side (20/pág)
- [x] **Limites verificados** - Preview: 1000 (Dashboard), 500 (Logs preview)
- [x] **Origem da lentidão** - Principalmente cliente (select *, filtros client-side)
- [x] **Ajuste recomendado** - Selecionar colunas específicas (maior impacto/menor risco)

### Sinais de Alerta Encontrados:

| Sinal | Status | Local |
|-------|--------|-------|
| Leitura integral de logs | 🔴 CONFIRMADO | `fetchAllDisparadorData` |
| Requests em cascata | 🟡 PARCIAL | Dupla requisição de preview |
| Payloads grandes | 🔴 CONFIRMADO | `.select('*')` em todas queries |
| Filtros só no cliente | 🟡 CONFIRMADO | Dashboard linha 78-111 |
| Loading longo sem erro | 🟡 POSSÍVEL | Sem timeout configurado |

### 🟡 ALERTA MÉDIO 5: Processamento Pesado de Gráficos no Cliente
**Local:** `src/components/dashboard/Charts.tsx:66-175`

**Problema:** Os gráficos processam todos os dados filtrados em memória usando múltiplos `reduce`:
```typescript
const tipoData = filteredData.reduce((acc, item) => {...}, {});
const instanciaData = filteredData.reduce((acc, item) => {...}, {});
const campaignData = filteredData.reduce((acc, item) => {...}, {});
const publicoData = filteredData.reduce((acc, item) => {...}, {});
const criativoData = filteredData.reduce((acc, item) => {...}, {});
```

**Impacto:**
- Para 1000 registros: 5 iterações completas = 5000 operações
- Cada filtro aciona recálculo completo de todos os gráficos
- Memória temporária picos durante processamento

**Recomendação:** Consolidar em uma única passagem ou usar `useMemo` com estratégia de memoização mais granular.

---

## 9. Próximos Passos Recomendados

### Imediato (Esta semana):
1. **Criar migration** com índices faltantes (`idx_message_logs_03_tenant_created_at`)
2. **Refatorar queries** para selecionar apenas colunas necessárias
3. **Verificar uso** de `fetchAllDisparadorData` e deprecar se possível

### Curto prazo (Próximas 2 semanas):
4. **Implementar cache compartilhado** entre Dashboard e Logs
5. **Mover filtros do Dashboard** para server-side (como Logs)
6. **Adicionar métricas de performance** (timing das queries)

### Médio prazo:
7. **Implementar virtual scrolling** para tabelas grandes
8. **Considerar materialized views** para KPIs do dashboard
9. **Adicionar paginação server-side** no Dashboard (atualmente é client-side)

---

## 10. Skills Utilizadas

| Skill | Aplicação |
|-------|-----------|
| `qa-testing-strategy` | Definição de cenários, smoke vs regressão |
| `qa-testing-playwright` | Análise de carregamento e console (simulado via código) |
| `supabase-performance-tuning` | Identificação de queries ineficientes, análise de índices |
| `sql-query-optimizer` | Análise de índices faltantes, recomendações de schema |

---

## Resumo Executivo

**Gargalo Principal:** Queries utilizando `SELECT *` na tabela `message_logs_dispara_lead_saas_03`, transferindo colunas desnecessárias (especialmente JSONs grandes como `provider_response` e `metadata`) para o cliente.

**Skill que Gerou o Achado:** `supabase-performance-tuning` + `sql-query-optimizer`

**Próximo Ajuste Recomendado:**
1. **Colunas mínimas:** Alterar `.select('*')` para colunas específicas nas queries de Dashboard/Logs
2. **Índice crítico:** Criar `idx_message_logs_03_tenant_created_at` no banco

**Impacto Esperado:** Redução de 50-70% no tempo de carregamento e no uso de banda.
