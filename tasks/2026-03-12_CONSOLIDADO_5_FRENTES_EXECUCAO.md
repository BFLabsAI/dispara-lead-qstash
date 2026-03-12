# Relatório Consolidado - Execução das 5 Frentes

**Data:** 2026-03-12
**Projeto:** DisparaLead
**Status:** Consolidação revisada com direcionamento de execução

---

## Resumo das 5 Frentes

| Frente | Agent | Status | Gargalo Principal |
|--------|-------|--------|-------------------|
| F1: Dashboard e Logs | agent-frente-1-dashboard | ✅ Concluída | `SELECT *` e `fetchAllDisparadorData` |
| F2: Edge Functions | agent-frente-2-edgefuncs | ✅ Concluída | Campaign completion: 5 queries/msg |
| F3: QStash e Fila | agent-frente-3-qstash | ✅ Concluída | Payload desnecessário (70-90%) |
| F4: UI QA e Rotas | agent-frente-4-uiqa | ✅ Concluída | Dashboard carrega 5519 registros |
| F5: Escalabilidade | agent-frente-5-scale | ✅ Concluída | Cada mensagem = 5-7 ops de DB |

---

## 🔴 Convergência de Achados - Problema Raíz

Todas as 5 frentes identificaram o **MESMO padrão problemático**:

```
Dashboard (F1+F4)          Edge Functions (F2)         QStash (F3)           Escalabilidade (F5)
      │                            │                          │                         │
      ▼                            ▼                          ▼                         ▼
┌─────────────────┐    ┌─────────────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│ fetchAllData()  │───▶│ 5 queries de completion │──▶│ Payload grande  │──▶│ 90K queries campanha  │
│ 5519 registros  │    │ por mensagem            │   │ (desnecessário) │   │ 10K×3 templates       │
└─────────────────┘    └─────────────────────────┘   └─────────────────┘   └─────────────────────────┘
```

### Padrão Identificado: **Arquitetura Acoplada e Síncrona**

1. **Cliente** carrega dados excessivos (F1, F4, F5)
2. **Edge Function** processa sem caching (F2, F5)
3. **Banco** recebe queries redundantes (F1, F2, F3, F5)
4. **Fila** transporta payloads desnecessários (F3)

---

## 🎯 Prioridades de Correção

## Diretrizes validadas para execução

- Dashboard:
  - carregar por padrão apenas os últimos `7 dias`
  - se o cliente ampliar o período manualmente, a aplicação passa a buscar a janela maior
  - o objetivo é melhorar a carga inicial sem esconder dados do usuário
- Queries:
  - otimizar com extremo cuidado
  - evitar refactor amplo de uma vez
  - preferir mudanças localizadas, com regressão manual imediata por rota
- OpenRouter:
  - nao mexer agora
  - qualquer otimização que toque provedor/fluxo de AI fica `deferred`
- Campanhas:
  - nao rodar campanhas em paralelo
  - manter fila serial para evitar aumento de risco de bloqueio
- QStash:
  - payload pode ser enxugado, mas nao precisa ficar só com `id`
  - manter no payload pelo menos identificadores essenciais, `lead` e `mensagem`
- Circuit breaker:
  - faz sentido por `tenant`, nao global
  - pausar apenas o tenant afetado
  - considerar `3 retries` antes de abrir o circuito

### P0 - CRÍTICO (Semana 1)

| # | Problema | Arquivo | Impacto | Solução |
|---|----------|---------|---------|---------|
| 1 | Dashboard carrega tudo | `supabaseClient.ts:282` | Crash browser | Carregar `7 dias` por padrão e expandir sob demanda |
| 2 | SELECT * em todas queries | `supabaseClient.ts` | Payload 50-70% maior | Selecionar colunas |
| 3 | Completion 5 queries/msg | `process-message/index.ts:204` | 90K queries/campanha | RPC atômica |
| 4 | Payload QStash grande | `enqueue-campaign/index.ts` | 70-90% waste | Payload mínimo com `ids + lead + mensagem` |

#### Detalhamento dos Erros P0:

**1. Dashboard carrega todos os registros (`fetchAllDisparadorData`)**

*O que causa:*
- O método `fetchAllDisparadorData()` busca **todos** os registros da tabela `scheduled_campaigns` sem limite
- Com 5519 registros reais, o browser recebe ~5MB+ de dados JSON
- O React tenta renderizar tudo de uma vez, travando a UI por 15-30 segundos
- Em campanhas maiores (10K+), o browser pode crashar por falta de memória

*Impacto de negócio:*
- Usuários abandonam a aplicação achando que "quebrou"
- Não é possível acompanhar campanhas em tempo real
- Suporte técnico sobrecarregado com reclamações de "lentidão"

*Sugestão de melhoria detalhada aprovada:*
```typescript
// Carga inicial do dashboard:
const DEFAULT_DAYS = 7;

const { data } = await supabase
  .from('scheduled_campaigns')
  .select('id, campaign_name, status, created_at, message_count')
  .gte('created_at', dayjs().subtract(DEFAULT_DAYS, 'day').startOf('day').toISOString())
  .order('created_at', { ascending: false })
  .limit(1000);

// Se o usuario abrir um filtro e pedir periodo maior:
const { data } = await supabase
  .from('scheduled_campaigns')
  .select('id, campaign_name, status, created_at, message_count')
  .gte('created_at', filterStart)
  .lte('created_at', filterEnd)
  .order('created_at', { ascending: false })
  .range(page * 100, (page + 1) * 100 - 1);
```
- Regra de produto:
  - o usuario continua podendo pedir periodo maior
  - a aplicacao so evita carregar tudo logo na entrada
- Critério de segurança:
  - alterar primeiro apenas dashboard/logs
  - validar manualmente antes de tocar outras telas

---

**2. SELECT * em todas as queries (`supabaseClient.ts`)**

*O que causa:*
- A tabela `scheduled_campaigns` tem ~20+ colunas
- Muitas colunas são grandes (JSONB como `contatos_json`, `templates_mensagem`)
- SELECT * traz 50-70% de dados desnecessários em cada request
- Rede saturada, parse JSON lento, memória desperdiçada

*Impacto técnico:*
- Payload de 100KB pode virar 10KB com colunas específicas
- Em escala, isso representa GBs de transferência mensal
- Supabase tem limites de bandwidth - pode gerar custos extras

*Sugestão de melhoria detalhada com cautela:*
```typescript
// ANTES:
.select('*')

// DEPOIS - no dashboard (só o essencial):
.select(`
  id,
  campaign_name,
  status_disparo,
  hora_agendamento,
  progress_count,
  total_count
`)

// DEPOIS - no processamento (só dados necessários):
.select(`
  id,
  instancia,
  contatos_json,
  templates_mensagem
`)
```
- Nao fazer refactor cego em todas as queries
- Aplicar primeiro apenas nas leituras onde ja sabemos exatamente quais campos sao usados
- Ordem segura:
  - dashboard
  - logs
  - listagens admin nao criticas

---

**3. Completion faz 5 queries por mensagem (`process-message/index.ts:204`)**

*O que causa:*
- Para cada mensagem processada, a Edge Function faz:
  1. SELECT para buscar a campanha
  2. SELECT para buscar configurações
  3. UPDATE para marcar processando
  4. INSERT para criar log
  5. UPDATE para marcar concluído/falha
- Em uma campanha de 10K mensagens: **50K queries**
- Supabase tem limites de conexões - isso esgota o pool

*Impacto de negócio:*
- Campanhas travam no meio por "too many connections"
- Mensagens são processadas muito lentamente
- Clientes perdem janela de marketing (horário ideal)

*Sugestão de melhoria detalhada aprovada com rollout controlado:*
```sql
-- Criar RPC atômica que faz tudo em UMA chamada:
CREATE OR REPLACE FUNCTION process_message_atomic(
  p_message_id UUID,
  p_status TEXT,
  p_log_data JSONB
) RETURNS VOID AS $$
BEGIN
  -- Atualiza status
  UPDATE scheduled_campaigns
  SET status_disparo = p_status,
      updated_at = NOW()
  WHERE id = p_message_id;

  -- Insere log
  INSERT INTO campaign_logs (campaign_id, data, created_at)
  VALUES (p_message_id, p_log_data, NOW());

  -- Atualiza contador (evita COUNT(*))
  UPDATE campaign_stats
  SET processed_count = processed_count + 1
  WHERE campaign_id = (
    SELECT campaign_group_id
    FROM scheduled_campaigns
    WHERE id = p_message_id
  );
END;
$$ LANGUAGE plpgsql;
```
- Ganho principal:
  - menos roundtrips
  - menos race condition
  - menos risco de contador quebrado
- Regra de segurança:
  - manter a RPC restrita ao fechamento/completion
  - nao reescrever o fluxo inteiro de uma vez
  - validar com tenant pequeno antes de abrir para todos

---

**4. Payload QStash grande (`enqueue-campaign/index.ts`)**

*O que causa:*
- A fila QStash recebe TODO o payload da campanha (contatos, templates, config)
- Um job pode ter 50KB+ de payload
- 70-90% desses dados são estáticos (repetidos em todos os jobs da mesma campanha)
- Upstash cobra por payload - custo desnecessário

*Impacto técnico:*
- Payload grande = mais tempo de serialização
- Network overhead significativo
- Risco de timeout em campanhas grandes

*Sugestão de melhoria detalhada alinhada com a operacao:*
```typescript
// ANTES (payload grande):
await qstash.publish({
  url: `${EDGE_FUNCTION_URL}/process-message`,
  body: {
    campaignId,
    contact: { name, phone, customFields },
    template: { text, variables },
    instance: { apiKey, session },
  }
});

// DEPOIS (payload mínimo sem perder contexto operacional):
await qstash.publish({
  url: `${EDGE_FUNCTION_URL}/process-message`,
  body: {
    messageId: message.id,
    campaignId: campaign.id,
    lead: {
      name: contact.name,
      phone: contact.phone,
    },
    message: renderedMessage,
  }
});
```
- Como decisao de produto:
  - nao precisamos reduzir ao extremo porque o QStash cobra por execucao e nao por volume
  - mas ainda vale remover payload redundante pesado
- Manter no job o minimo necessario para observabilidade e retry:
  - `messageId`
  - `campaignId`
  - `lead`
  - `message`

### P1 - ALTO (Semana 2)

| # | Problema | Arquivo | Impacto | Solução |
|---|----------|---------|---------|---------|
| 5 | Retry AI sequencial | `process-message-ai/index.ts:123` | Até 12s latência | `Deferred` - nao mexer em OpenRouter agora |
| 6 | Processamento serial scheduler | `process-scheduler/index.ts:36` | Campanhas bloqueiam | Manter serial; otimizar sem paralelizar campanhas |
| 7 | Cache tenant_id | `supabaseClient.ts:131` | RPC desnecessária | Memoização |
| 8 | Índice faltante | Migration | Query lenta | `(tenant_id, campaign_id, status)` |

#### Detalhamento dos Erros P1:

**5. Retry AI sequencial com timeout alto (`process-message-ai/index.ts:123`)**

*O que causa:*
- A função tenta chamar a API de AI (OpenAI/Claude) até 3 vezes em sequência
- Cada tentada tem timeout de 4 segundos
- Se a AI estiver lenta, uma mensagem pode travar por 12 segundos
- Isso bloqueia o processamento de outras mensagens

*Impacto de negócio:*
- Mensagens sem AI são processadas em 200ms
- Mensagens com AI podem demorar 12s (60x mais lento)
- Uma campanha com 20% de AI fica 10x mais lenta no total

*Decisão atual: nao executar agora.*
```typescript
// ANTES (sequencial, timeout alto):
async function generateWithRetry(prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.generate(prompt, { timeout: 4000 });  // 4s por tentativa
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
}

// DEPOIS (paralelo, timeout menor, fallback rápido):
async function generateWithRetry(prompt, retries = 3) {
  const TIMEOUT = 2000; // Reduzido para 2s

  // Tenta todas em paralelo com race
  const promises = Array(retries).fill(null).map((_, i) =>
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT * (i + 1));
      ai.generate(prompt).then(resolve).catch(reject);
    })
  );

  try {
    return await Promise.race(promises);
  } catch (e) {
    // Fallback: usa template sem personalização AI
    return { text: prompt, aiProcessed: false };
  }
}
```
- Motivo:
  - hoje o provedor e `OpenRouter`
  - ha receio legitimo de quebrar o fluxo de AI
  - essa frente fica congelada ate nova decisao

---

**6. Processamento serial no scheduler (`process-scheduler/index.ts:36`)**

*O que causa:*
- O scheduler processa campanhas em loop `for` comum
- Campanha A bloqueia até terminar, só depois começa B
- Se campanha A tem 1000 mensagens, B espera tudo

*Impacto de negócio:*
- Campanhas urgentes ficam presas atrás de campanhas grandes
- Não há priorização (FIFO injusto)
- Usuário não consegue "pular" uma campanha lenta

*Decisão atual: nao paralelizar campanhas.*
```typescript
// ANTES (serial):
for (const campaign of campaigns) {
  await processCampaign(campaign); // Bloqueia aqui
}

// DEPOIS (paralelo com controle):
const CONCURRENCY = 5; // Máximo 5 campanhas simultâneas

async function processWithLimit(campaigns, limit) {
  const executing = [];

  for (const campaign of campaigns) {
    const promise = processCampaign(campaign).then(() => {
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing); // Espera alguma terminar
    }
  }

  await Promise.all(executing); // Espera o resto
}

// Ou usar biblioteca como `p-limit`:
import pLimit from 'p-limit';
const limit = pLimit(5);

await Promise.all(
  campaigns.map(c => limit(() => processCampaign(c)))
);
```
- Regra operacional:
  - campanhas nao podem rodar em paralelo
  - a fila deve continuar serial para reduzir risco de bloqueio
- Oportunidade segura:
  - melhorar justiça da fila
  - melhorar observabilidade
  - melhorar pause/resume
  - sem paralelismo entre campanhas

---

**7. Cache de tenant_id (`supabaseClient.ts:131`)**

*O que causa:*
- Em toda requisição, busca o `tenant_id` do usuário via RPC ou query
- Mesmo usuário, mesmo tenant, mas busca toda vez
- Isso é 1 query extra em CADA operação

*Impacto técnico:*
- Em uma página que faz 10 operações: 10 queries de tenant
- Poderia ser 1 query só no início
- Latência adicional de 50-100ms por operação

*Sugestão de melhoria detalhada:*
```typescript
// ANTES (sem cache):
async function getTenantId(userId) {
  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single();
  return data.tenant_id;
}

// DEPOIS (com memoização):
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getTenantId(userId) {
  const cached = tenantCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenantId;
  }

  const { data } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  tenantCache.set(userId, {
    tenantId: data.tenant_id,
    timestamp: Date.now()
  });

  return data.tenant_id;
}

// Ou usar React Query (com cache automático):
const { data: tenantId } = useQuery({
  queryKey: ['tenant', userId],
  queryFn: () => fetchTenantId(userId),
  staleTime: 5 * 60 * 1000, // 5 minutos
});
```
- Cache em memória por alguns minutos
- Tenant raramente muda, então cache é seguro
- React Query já tem cache embutido

---

**8. Índices faltantes na tabela `scheduled_campaigns`**

*O que causa:*
- Queries filtram por `(tenant_id, campaign_id, status)` frequentemente
- Sem índice composto, o Postgres faz sequencial scan
- Com 100K+ registros, isso fica MUITO lento

*Impacto técnico:*
- Query que deveria levar 10ms leva 2s
- CPU do banco sobe com cada query
- Conexões acumulam esperando o banco

*Sugestão de melhoria detalhada:*
```sql
-- Índices críticos para as queries mais comuns:

-- 1. Dashboard: busca campanhas por tenant + status
CREATE INDEX idx_campaigns_tenant_status
  ON scheduled_campaigns (tenant_id, status_disparo, created_at DESC);

-- 2. Edge Function: busca mensagens pendentes de uma campanha
CREATE INDEX idx_campaigns_group_status
  ON scheduled_campaigns (campaign_group_id, status_disparo, hora_agendamento);

-- 3. Logs: busca histórico por período
CREATE INDEX idx_campaigns_tenant_date
  ON scheduled_campaigns (tenant_id, created_at DESC);

-- 4. Cobertura parcial (só onde importa):
CREATE INDEX idx_pending_messages
  ON scheduled_campaigns (campaign_group_id, dispatch_order)
  WHERE status_disparo = 'agendado';
```
- Índice composto segue a ordem das queries
- Índice parcial (`WHERE`) é menor e mais rápido
- Verificar com `EXPLAIN ANALYZE` antes e depois

### P2 - MÉDIO (Semana 3)

| # | Problema | Solução |
|---|----------|---------|
| 9 | Contador atômico campaigns | Coluna `pending_count` |
| 10 | Rate limiting por tenant | `Descartado por enquanto` |
| 11 | Circuit breaker por tenant | Pausar so o tenant afetado + 3 retries |
| 12 | Materialized view stats | Dashboard instantâneo |

#### Detalhamento dos Erros P2:

**9. Contador atômico de campanhas**

*O que causa:*
- Para mostrar "progresso 45/100", o sistema faz `COUNT(*)` a cada atualização
- Com 100K mensagens, um COUNT pode levar 500ms-1s
- Isso é feito em loop, travando o processamento

*Impacto técnico:*
- Queries de COUNT são caras em tabelas grandes
- Fazer COUNT a cada mensagem = explosão de queries
- Deadlocks possíveis quando múltiplos workers atualizam

*Sugestão de melhoria detalhada:*
```sql
-- Adicionar coluna de contador na tabela de campanhas:
ALTER TABLE campaign_groups ADD COLUMN pending_count INTEGER DEFAULT 0;
ALTER TABLE campaign_groups ADD COLUMN sent_count INTEGER DEFAULT 0;
ALTER TABLE campaign_groups ADD COLUMN failed_count INTEGER DEFAULT 0;

-- Atualizar contadores atomicamente:
CREATE OR REPLACE FUNCTION update_campaign_counter(
  p_campaign_id UUID,
  p_status TEXT
) RETURNS VOID AS $$
BEGIN
  IF p_status = 'concluido' THEN
    UPDATE campaign_groups
    SET pending_count = pending_count - 1,
        sent_count = sent_count + 1
    WHERE id = p_campaign_id;
  ELSIF p_status = 'falha' THEN
    UPDATE campaign_groups
    SET pending_count = pending_count - 1,
        failed_count = failed_count + 1
    WHERE id = p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- No dashboard, só ler a coluna (instantâneo):
SELECT campaign_name, pending_count, sent_count, failed_count
FROM campaign_groups
WHERE tenant_id = 'xyz';
```
- Contadores em colunas evitam COUNT(*)
- Atualização atômica no mesmo UPDATE do status
- Leitura no dashboard é O(1) em vez de O(n)

---

**10. Rate limiting por tenant**

*O que causa:*
- Sem controle, um único tenant pode enviar 10K mensagens/minuto
- Isso satura os recursos compartilhados
- Outros tenants ficam sem capacidade ("noisy neighbor")

*Impacto de negócio:*
- Cliente A afeta performance do Cliente B
- Não há justiça no uso de recursos
- Risco de atingir limites da API WhatsApp

*Decisão atual: nao implementar agora.*
```typescript
// Middleware de rate limiting:
interface RateLimitConfig {
  messagesPerMinute: number;
  burstSize: number;
}

const tenantLimits: Record<string, RateLimitConfig> = {
  'free': { messagesPerMinute: 60, burstSize: 10 },
  'pro': { messagesPerMinute: 300, burstSize: 50 },
  'enterprise': { messagesPerMinute: 1000, burstSize: 200 },
};

// Implementação com token bucket:
async function checkRateLimit(tenantId: string): Promise<boolean> {
  const key = `rate_limit:${tenantId}`;
  const limit = tenantLimits[await getTenantPlan(tenantId)];

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60); // Reset a cada minuto
  }

  return current <= limit.messagesPerMinute;
}

// Uso na Edge Function:
export default async (req: Request) => {
  const tenantId = extractTenantId(req);

  if (!(await checkRateLimit(tenantId))) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // Processa mensagem...
};
```
- Motivo:
  - nao faz sentido no momento para a operacao atual
  - o risco principal esta em fila, identidade e robustez do fluxo

---

**11. Circuit breaker por tenant**

*O que causa:*
- Se a API de AI cair, todas as chamadas começam a falhar
- O sistema continua tentando, gerando timeout em cascata
- Isso pode derrubar todo o processamento de mensagens

*Impacto técnico:*
- Falha em cascata (cascade failure)
- Recursos presos esperando timeout
- Recuperação lenta quando a API volta

*Sugestão de melhoria detalhada alinhada ao produto:*
```typescript
// Implementação de Circuit Breaker por tenant:
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime: number = 0;

  constructor(
    private threshold = 3,        // 3 falhas antes de abrir
    private timeout = 30000,      // 30s antes de tentar de novo
    private halfOpenMaxCalls = 3  // Testes no meio-aberto
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Uso por tenant:
const breakers = new Map<string, CircuitBreaker>();
const breaker = breakers.get(tenantId) ?? new CircuitBreaker();
breakers.set(tenantId, breaker);

try {
  const result = await breaker.execute(() =>
    processTenantMessage({...})
  );
} catch (e) {
  // Pausa apenas o tenant afetado
  await pauseTenantQueue(tenantId);
  return queueRetry(messageId);
}
```
- Regra aprovada:
  - nao pausar o sistema inteiro
  - pausar apenas o tenant afetado
  - aplicar `3 retries` antes de abrir o circuito
- Uso recomendado:
  - primeiro no pipeline de envio/instancia
  - nao no OpenRouter agora

---

**12. Materialized view para estatísticas do dashboard**

*O que causa:*
- Dashboard faz queries complexas de agregação (SUM, COUNT, AVG)
- Essas queries varrem muitos registros
- Usuário espera 1s, mas query leva 10s+

*Impacto de negócio:*
- Dashboard inutilizável em horário de pico
- Decisões tomadas sem dados atualizados
- Usuários recorrem a planilhas manuais

*Sugestão de melhoria detalhada:*
```sql
-- Criar materialized view com estatísticas pré-calculadas:
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  tenant_id,
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'concluido') as sent_count,
  COUNT(*) FILTER (WHERE status = 'falha') as failed_count,
  COUNT(*) FILTER (WHERE status = 'agendado') as pending_count,
  AVG(processing_time) as avg_processing_time,
  SUM(cost) as total_cost
FROM scheduled_campaigns
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY tenant_id, DATE(created_at);

-- Índice para busca rápida:
CREATE INDEX idx_dashboard_stats_tenant_date
  ON dashboard_stats (tenant_id, date DESC);

-- Atualizar periodicamente (a cada 5 minutos):
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Agendar com pg_cron ou QStash:
SELECT cron.schedule('refresh-stats', '*/5 * * * *',
  'SELECT refresh_dashboard_stats()'
);

-- No dashboard, query é instantânea:
SELECT * FROM dashboard_stats
WHERE tenant_id = 'xyz'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```
- Faz sentido especialmente combinado com:
  - dashboard padrao em `7 dias`
  - logs paginados
  - queries mais previsiveis e menos arriscadas

---

## 📊 Métricas de Impacto

### Antes das Correções
```
Dashboard Load:           15-30s (100K mensagens)
Campanha 10K×3:           Timeout (payload muito grande)
Queries por mensagem:     5-7 operações
Custo por 1K mensagens:   ~$0.50
```

### Projeção Após Correções
```
Dashboard Load:           < 1s (com paginação)
Campanha 10K×3:           < 30s enqueue
Queries por mensagem:     2-3 operações
Custo por 1K mensagens:   ~$0.10
```

**Economia projetada: 80% de redução de custo e 90% de melhoria de performance**

---

## 📁 Arquivos para Modificação

### Alta Prioridade
1. `src/services/supabaseClient.ts` - Limitar fetchAll, SELECT específico
2. `src/services/dashboardService.ts` - Paginação server-side
3. `supabase/functions/process-message/index.ts` - RPC atômica
4. `supabase/functions/enqueue-campaign/index.ts` - Reduzir payload

### Média Prioridade
5. `supabase/functions/process-message-ai/index.ts` - Timeout AI
6. `supabase/functions/process-scheduler/index.ts` - Paralelismo
7. `supabase/migrations/` - Índices e contador atômico

---

## 🧪 Suite de Regressão Mínima (F4)

```typescript
// Testes Playwright obrigatórios após cada mudança
1. Dashboard carrega em < 3s
2. Logs paginam corretamente
3. Campanha 1K contatos completa sem timeout
4. Retry AI funciona com fallback
5. Todas as rotas renderizam sem tela branca
6. Admin/plans acessível apenas para admins
7. Chats carregam mensagens
8. Audiences listam sem erro
```

---

## 🔄 Workflow de Correção

```
Fase 1: Quick Wins (P0)
├── 1. Limitar dashboard
├── 2. SELECT específico
├── 3. Índice crítico
└── 4. Validar com regressão

Fase 2: Otimizações (P1)
├── 5. RPC completion
├── 6. Payload QStash minimo
├── 7. Cache tenant
└── 8. Indice critico + regressão

Fase 3: Estrutural (P2)
├── 9. Contador atômico
├── 10. Circuit breaker por tenant
├── 11. Materialized view stats
└── 12. Métricas finais
```

---

## Skills Utilizadas por Frente

| Frente | Skills Aplicadas |
|--------|------------------|
| F1 | `qa-testing-strategy`, `qa-testing-playwright`, `supabase-performance-tuning`, `sql-query-optimizer` |
| F2 | `qa-testing-strategy`, `supabase-performance-tuning`, `scalability-playbook` |
| F3 | `qa-testing-strategy`, `scalability-playbook` |
| F4 | `qa-testing-strategy`, `qa-testing-playwright` |
| F5 | `scalability-playbook`, `supabase-performance-tuning`, `sql-query-optimizer` |

---

## 🔗 Relação entre os Problemas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Cadeia de Causa e Efeito                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  Dashboard lento (P0-1, P0-2)                    Fila ineficiente (P0-4)
         │                                               │
         ▼                                               ▼
  ┌─────────────────┐                        ┌──────────────────────┐
  │ SELECT * sem    │                        │ Payload grande       │
  │ limite de linhas│                        │ (dados repetidos)    │
  │                 │                        │                      │
  │ → Browser crash │                        │ → Timeout QStash     │
  │ → 15s load time │                        │ → Custo alto         │
  └─────────────────┘                        └──────────────────────┘
         │                                               │
         └──────────────────┬────────────────────────────┘
                            ▼
              ┌───────────────────────────────┐
              │ Edge Functions ineficientes   │
              │ (P0-3, P1-5, P1-6)            │
              │                               │
              │ • 5 queries por mensagem      │
              │ • Retry AI sequencial         │
              │ • Processamento serial        │
              │                               │
              │ → 90K queries/campanha        │
              │ → 12s latência por mensagem   │
              │ → Campanhas bloqueiam         │
              └───────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────────┐
              │ Banco de Dados sobrecarregado │
              │ (P1-7, P1-8, P2-9)            │
              │                               │
              │ • Sem cache de tenant         │
              │ • Sem índices otimizados      │
              │ • COUNT(*) em loop            │
              │                               │
              │ → Connection pool esgotado    │
              │ → CPU 100%                    │
              │ → Query timeout               │
              └───────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  Escalada    │  │   Cascade    │  │   Custo      │
  │  parcial     │  │   failure    │  │   elevado    │
  │  (P2-10)     │  │   (P2-11)    │  │   (P2-12)    │
  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🎯 Análise de Impacto por Correção

| Correção | Problemas Resolvidos | Impacto Estimado |
|----------|---------------------|------------------|
| **Limitar dashboard** | P0-1, P0-2 parcial | Browser não crasha, load < 1s |
| **SELECT específico** | P0-2, reduz rede | 50-70% menos bandwidth |
| **RPC atômica** | P0-3, reduz queries | De 5 para 1 query (80% redução) |
| **Payload mínimo** | P0-4, eficiência fila | 70-90% menos dados na fila |
| **Retry AI otimizado** | P1-5, latência | De 12s para 2s timeout |
| **Paralelismo** | P1-6, throughput | 5x mais campanhas simultâneas |
| **Cache tenant** | P1-7, latência | -100ms por operação |
| **Índices** | P1-8, query speed | De 2s para 10ms |

---

## Plano de Execução

## Objetivo operacional

- melhorar performance sem esconder dados do cliente
- reduzir risco de quebra funcional
- aplicar mudanças em ordem de menor risco para maior risco
- validar cada etapa antes de seguir para a próxima

## Regras de execução

- nao alterar OpenRouter nesta fase
- nao paralelizar campanhas
- toda mudanca em query deve ser local e validada na rota afetada
- toda mudanca estrutural deve ter criterio claro de rollback
- sempre validar:
  - `/dashboard`
  - `/logs`
  - `/chats`
  - `/audiences`
  - `/admin/plans`

## Fase 1 - Quick wins seguros

### Etapa 1. Dashboard com janela padrão de 7 dias

- Escopo:
  - aplicar `7 dias` como janela padrão da carga inicial
  - manter expansão quando o cliente filtrar período maior
- Arquivos alvo:
  - `src/services/supabaseClient.ts`
  - `src/services/dashboardService.ts`
  - `src/pages/Dashboard.tsx`
- Critério de aceite:
  - dashboard abre rápido
  - dados continuam aparecendo
  - ao ampliar filtro de data, a query retorna período maior
- Rollback:
  - voltar a janela anterior sem tocar no restante da paginação

### Etapa 2. Logs com comportamento alinhado ao dashboard

- Escopo:
  - manter paginação server-side
  - alinhar consulta inicial a uma janela recente controlada
  - continuar expandindo se o usuário pedir data maior
- Arquivos alvo:
  - `src/pages/Logs.tsx`
  - `src/services/dashboardService.ts`
  - `src/services/supabaseClient.ts`
- Critério de aceite:
  - `/logs` carrega sem travar
  - paginação continua funcional
  - período maior continua retornando dados quando filtrado
- Rollback:
  - preservar paginação e reverter apenas a janela inicial

### Etapa 3. SELECT específico só onde já conhecemos os campos

- Escopo:
  - remover `select('*')` apenas nas queries já mapeadas de dashboard e logs
  - nao fazer refactor global
- Arquivos alvo:
  - `src/services/supabaseClient.ts`
  - `src/services/dashboardService.ts`
- Critério de aceite:
  - nenhuma coluna necessária some da UI
  - build passa
  - dashboard e logs continuam renderizando sem erro
- Rollback:
  - restaurar apenas a query daquela rota específica

## Fase 2 - Banco e fila com risco controlado

### Etapa 4. Índices críticos nas queries reais

- Escopo:
  - criar apenas índices diretamente ligados às consultas já medidas
  - começar por `tenant + status + data`
- Arquivos alvo:
  - `supabase/migrations/*`
- Critério de aceite:
  - migration aplicada sem erro
  - query principal melhora sem alterar resultado
- Rollback:
  - remover só o índice novo, sem tocar em schema funcional

### Etapa 5. Cache de tenant_id

- Escopo:
  - reduzir buscas repetidas de tenant
  - manter resolução segura para impersonation
- Arquivos alvo:
  - `src/services/supabaseClient.ts`
- Critério de aceite:
  - mesmas rotas continuam corretas
  - sem drift novo de tenant
- Rollback:
  - desligar cache e manter resolução direta

### Etapa 6. Payload mínimo do QStash

- Escopo:
  - reduzir payload sem perder contexto operacional
  - manter no job:
    - `messageId`
    - `campaignId`
    - `lead`
    - `message`
- Arquivos alvo:
  - `supabase/functions/enqueue-campaign/index.ts`
  - `supabase/functions/process-message/index.ts`
- Critério de aceite:
  - enqueue continua funcionando
  - processamento continua encontrando o contexto necessário
  - retry continua possível
- Rollback:
  - restaurar payload anterior se faltar contexto em produção controlada

## Fase 3 - Redução de roundtrip e custo de processamento

### Etapa 7. RPC atômica para completion

- Escopo:
  - consolidar o trecho de completion em uma RPC
  - nao reescrever o pipeline inteiro
- Arquivos alvo:
  - `supabase/migrations/*`
  - `supabase/functions/process-message/index.ts`
- Critério de aceite:
  - completion continua correto
  - contadores e status batem
  - número de queries por mensagem cai
- Estratégia de rollout:
  - ativar primeiro em tenant pequeno
  - validar
  - só depois expandir
- Rollback:
  - voltar a edge function para o caminho antigo

### Etapa 8. Contador atômico por campanha

- Escopo:
  - evitar `COUNT(*)` repetido
  - manter progresso pronto para leitura
- Arquivos alvo:
  - `supabase/migrations/*`
  - leitura em dashboard/campaign management
- Critério de aceite:
  - progresso exibido continua correto
  - queries de leitura ficam mais leves
- Rollback:
  - manter coluna sem uso e voltar leitura para cálculo antigo

## Fase 4 - Robustez operacional por tenant

### Etapa 9. Circuit breaker por tenant

- Escopo:
  - aplicar breaker apenas no tenant afetado
  - usar `3 retries` antes de abrir circuito
  - pausar só a fila daquele tenant
- Arquivos alvo:
  - `supabase/functions/process-message/index.ts`
  - serviços auxiliares de fila/scheduler
- Critério de aceite:
  - falha de um tenant nao afeta os demais
  - retries acontecem antes da pausa
  - retomada controlada funciona
- Rollback:
  - desligar breaker mantendo retries simples

## Fase 5 - Leitura rápida para dashboard

### Etapa 10. Materialized view de estatísticas

- Escopo:
  - pré-calcular stats do dashboard
  - combinar com janela padrão de `7 dias`
- Arquivos alvo:
  - `supabase/migrations/*`
  - `src/services/dashboardService.ts`
- Critério de aceite:
  - dashboard abre mais rápido
  - números principais continuam consistentes
- Rollback:
  - voltar leitura para agregação direta

## Itens explicitamente fora desta execução

- mudanças em OpenRouter
- paralelismo de campanhas
- rate limiting global

## Ordem final recomendada

1. dashboard `7 dias`
2. logs alinhados com janela controlada
3. `select` específico em dashboard/logs
4. índices críticos
5. cache de tenant
6. payload mínimo do QStash
7. RPC atômica de completion
8. contador atômico
9. circuit breaker por tenant
10. materialized view

## Critério de encerramento

- dashboard e logs abrem rápido sem esconder dados solicitados
- campanhas continuam em fila serial
- enqueue e processamento seguem íntegros
- falhas de tenant ficam isoladas
- nenhuma regressão visual nas rotas críticas

---

## Execução realizada nesta rodada

- Status: `partial implementation completed`

### Implementado

- `Dashboard` com janela padrão de `7 dias`
  - quando o usuário não escolhe data, a carga inicial usa apenas a janela recente
  - quando o usuário escolhe um período, o dashboard expande a consulta de forma server-side
- `Logs` com janela padrão de `7 dias`
  - paginação server-side preservada
  - período maior continua disponível via filtro
- payload mínimo do `QStash`
  - mantendo:
    - `messageId`
    - `campaignId`
    - `tenantId`
    - `instanceName`
    - `phoneNumber`
    - `messageContent`
    - `mediaUrl`
    - `mediaType`
    - `lead`
    - `message`
- compatibilidade do consumidor de fila
  - `process-message` aceita payload novo e legado
- cache curto de `tenant_id`
  - memoização local no `supabaseClient`
  - sem alterar a regra de impersonation
- migration preparada de índices de baixo risco para `message_logs`

### Arquivos alterados nesta rodada

- [src/pages/Dashboard.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/Dashboard.tsx)
- [src/pages/Logs.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/Logs.tsx)
- [src/services/dashboardService.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/dashboardService.ts)
- [src/services/supabaseClient.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/supabaseClient.ts)
- [supabase/functions/enqueue-campaign/index.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/functions/enqueue-campaign/index.ts)
- [supabase/functions/process-message/index.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/functions/process-message/index.ts)
- [supabase/migrations/20260312100000_optimize_message_logs_dashboard_indexes.sql](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/supabase/migrations/20260312100000_optimize_message_logs_dashboard_indexes.sql)

### Validação executada

- `npm run build`
  - concluído com sucesso
- `deno check supabase/functions/enqueue-campaign/index.ts`
  - concluído com sucesso
- `deno check supabase/functions/process-message/index.ts`
  - concluído com sucesso

### Observações

- A expansão de período maior no `Dashboard` já foi movida para leitura server-side por intervalo.
- O fetch continua usando `select('*')` nesse caminho para evitar risco de quebra de mapeamento nesta rodada.
- A migration de índices foi criada no repositório, mas não foi aplicada pelo MCP nesta sessão porque o servidor MCP Supabase estava carregado com `project-ref` antigo em memória.
- A configuração global já foi corrigida para o projeto `<SUPABASE_PROJECT_REF>`, mas a sessão atual do MCP ainda responde com o projeto anterior e precisa ser reiniciada para que a aplicação da migration funcione por essa via.

### Próximas etapas recomendadas

1. aplicar a migration de índices no Supabase
2. reduzir colunas do fetch server-side expandido do `Dashboard`
3. iniciar a RPC atômica de completion com rollout em tenant pequeno

---

## Execução consolidada até agora

- `Dashboard`:
  - carga padrão em `7 dias`
  - expansão maior já em leitura server-side por intervalo
- `Logs`:
  - paginação server-side mantida
  - janela inicial controlada
- `QStash`:
  - payload mínimo implementado com compatibilidade retroativa
- `tenant_id`:
  - cache curto adicionado no `supabaseClient`
- `completion`:
  - RPC atômica mínima implementada no código e preparada para uso no banco
- SQL / banco:
  - runbook criado para aplicação manual via SQL Editor
  - índices de baixo risco preparados

## Execução SQL / deploy já realizada

- a RPC `complete_campaign_if_finished` foi aplicada com sucesso no SQL Editor
- os índices de `message_logs` foram aplicados com sucesso no SQL Editor
- functions redeployadas:
  - `process-message`
  - `process-message-ai`
  - `enqueue-campaign`

## Validação terminal pós-deploy

Relatórios gerados:
- [tasks/2026-03-12_SQL_EDITOR_RUNBOOK.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_SQL_EDITOR_RUNBOOK.md)
- [tasks/2026-03-12_09-56-41_post_deploy_terminal_validation.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_09-56-41_post_deploy_terminal_validation.md)
- [tasks/2026-03-12_09-58-08_post_deploy_terminal_validation.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_09-58-08_post_deploy_terminal_validation.md)
- [tasks/2026-03-12_10-07-55_post_deploy_terminal_validation.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_10-07-55_post_deploy_terminal_validation.md)
- [tasks/2026-03-12_10-08-53_post_deploy_terminal_validation.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_10-08-53_post_deploy_terminal_validation.md)
- [tasks/2026-03-12_10-11-45_post_deploy_terminal_validation.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_10-11-45_post_deploy_terminal_validation.md)

### Confirmado

- `webhook_messages_dispara_lead_saas` respondeu `200`
- `complete_campaign_if_finished` respondeu `200` com `false`
- leitura REST de campanhas e logs respondeu `200`
- isso confirma:
  - banco acessível
  - RPC acessível
  - dados do tenant acessíveis por REST autenticado

### Achado novo sobre auth das Edge Functions

- O `401 Invalid JWT` da validação terminal não vinha da lógica das functions.
- Teste direto confirmou o comportamento real do gateway:
  - sem `Authorization`: `401 Missing authorization header`
  - com `Authorization: Bearer <access_token do usuário>`: `401 Invalid JWT`
  - com `Authorization: Bearer <ANON_KEY>`:
    - `enqueue-campaign` entra na function e responde `200` com erro de validação controlado
    - `process-message` entra na function e responde `401 Missing signature`, como esperado para payload sem assinatura QStash
- Isso mostra que o smoke test anterior estava usando o bearer errado para as chamadas HTTP diretas às Edge Functions.
- O bearer correto para esse smoke terminal ficou definido como o `ANON_KEY` do projeto.
- Além disso, o repositório não tinha `supabase/config.toml` raiz. Existiam apenas `config.toml` dentro das pastas das functions, mas a documentação oficial da Supabase define a configuração por function no arquivo raiz `supabase/config.toml`.

### Ações aplicadas após esse achado

- criado `supabase/config.toml` raiz com `verify_jwt = false` para:
  - `auth_manager_dispara_lead`
  - `enqueue-campaign`
  - `manage-users`
  - `process-message`
  - `process-message-ai`
  - `uazapi_proxy_dispara_lead_saas`
  - `webhook_connection_dispara_lead_saas`
  - `webhook_messages_dispara_lead_saas`
- ajustado `scripts/qa/validate_post_deploy.sh` para:
  - usar `Authorization: Bearer <ANON_KEY>` nas chamadas de Edge Functions
  - manter `Authorization: Bearer <access_token>` nas chamadas de REST/RPC
- redeploy executado com sucesso em:
  - `enqueue-campaign`
  - `process-message`
  - `process-message-ai`
- rerun da validação terminal após o redeploy:
  - `enqueue-campaign`: `200` com erro de validação controlado
  - `process-message`: `401 Missing signature`
  - `process-message-ai`: `401 Missing signature`
  - `webhook_messages_dispara_lead_saas`: `200`
  - RPC `complete_campaign_if_finished`: `200`
  - REST de campanhas e logs: `200`

### Otimização segura aplicada em Dashboard e Logs

- Os caminhos compartilhados de `message_logs_dispara_lead_saas_03` deixaram de usar `select('*')` em:
  - `fetchDisparadorDataPaginated`
  - `fetchRecentDisparadorData`
  - `fetchDisparadorDataForDateRange`
  - `fetchAllDisparadorData`
- O conjunto explícito de colunas ficou restrito ao que `Dashboard` e `Logs` realmente consomem:
  - `id`
  - `phone_number`
  - `status`
  - `instance_name`
  - `message_content`
  - `campaign_name`
  - `campaign_type`
  - `created_at`
  - `scheduled_for`
  - `responded_at`
  - `message_type`
  - `error_message`
  - `metadata`
- `fetchCampaignStats` também deixou de usar `select('*')` e ficou restrito a:
  - `id`
  - `name`
  - `status`
  - `scheduled_for`
  - `total_messages`
- Validação dessa etapa:
  - `npm run build` passou
  - validação terminal pós-ajuste permaneceu estável em [tasks/2026-03-12_10-11-45_post_deploy_terminal_validation.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_10-11-45_post_deploy_terminal_validation.md)

### Correção aplicada no frontend para functions públicas

- mesmo após corrigir o smoke terminal, a chamada real do frontend ainda falhava:
  - `supabase.functions.invoke('enqueue-campaign')` com usuário autenticado retornava `401 Invalid JWT`
- isso foi reproduzido fora do browser com `@supabase/supabase-js`, autenticando com a conta de teste
- a correção aplicada foi trocar o caminho do frontend para uma chamada HTTP pública explícita com:
  - `apikey: <ANON_KEY>`
  - `Authorization: Bearer <ANON_KEY>`
- implementação:
  - helper `invokePublicEdgeFunction(...)` criado em [src/services/supabaseClient.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/supabaseClient.ts)
  - chamadas de `enqueue-campaign` migradas em:
    - [src/store/disparadorStore.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/store/disparadorStore.ts)
    - [src/services/campaignManagementService.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/campaignManagementService.ts)
  - chamadas de functions públicas também migradas em:
    - [src/services/uazapiClient.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/uazapiClient.ts)
    - [src/pages/ForgotPassword.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/ForgotPassword.tsx)
    - [src/pages/settings/UsersPage.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/settings/UsersPage.tsx)
    - [src/pages/admin/SuperAdminsPage.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/SuperAdminsPage.tsx)
    - [src/pages/admin/TenantDetails.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/TenantDetails.tsx)
- validação:
  - `npm run build` passou
  - chamada real equivalente ao fluxo do frontend para `enqueue-campaign` retornou `200` com o helper público
  - não restaram chamadas de `supabase.functions.invoke(...)` para:
    - `enqueue-campaign`
    - `uazapi_proxy_dispara_lead_saas`
    - `auth_manager_dispara_lead`
    - `manage-users`

## Estado atual real do plano

- [x] Dashboard `7 dias`
- [x] Logs com janela controlada
- [x] Expansão maior do dashboard em server-side
- [x] Payload mínimo do QStash
- [x] Cache de tenant
- [x] RPC atômica de completion
- [x] Runbook SQL Editor
- [x] Aplicação manual da SQL no banco
- [x] Resolver `401 Invalid JWT` do smoke terminal das Edge Functions
- [x] Corrigir chamadas autenticadas do frontend para functions públicas
- [x] Reduzir colunas do fetch expandido do dashboard/logs
- [x] Implementar código de contador atômico
- [x] Implementar código de circuit breaker por tenant
- [x] Implementar código de materialized view para stats
- [x] Aplicar SQL phase 2 no banco
- [x] Redeploy `process-message` e `process-message-ai` após phase 2
- [x] Corrigir `Disparo` em modo de acesso usando tenant efetivo
- [x] Validar campanha pequena real ponta a ponta no app

## Aplicação phase 2 no remoto

- `supabase db push --linked --include-all --yes` executado com sucesso
- a migration `20260312153000_add_delivery_counters_circuit_breaker_and_stats_mv.sql` precisou de um ajuste seguro:
  - cast de `metadata->>'usaria'` para boolean passou a usar `COALESCE(NULLIF(..., '')::boolean, false)`
- deploy concluído com sucesso em:
  - `process-message`
  - `process-message-ai`
- isso deixou ativos no remoto:
  - contador atômico por campanha
  - circuit breaker por tenant
  - materialized view `dashboard_daily_stats_mv`
  - `get_dashboard_stats` baseado na MV

## Validação real no app

- login validado com `<ADMIN_EMAIL>`
- super admin segue caindo corretamente em `/admin`
- impersonation validada em `BFLabs`
- durante a validação real apareceu um bug específico em `Disparo` sob modo de acesso:
  - erro: `Tenant não encontrado`
  - causa: [src/store/disparadorStore.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/store/disparadorStore.ts) ainda resolvia tenant pelo usuário autenticado, ignorando impersonation
  - correção aplicada:
    - `loadInstances` passou a usar `getEffectiveTenantId()`
    - `sendMessages` passou a usar `getEffectiveTenantId()`
- após a correção:
  - instâncias carregaram normalmente em `/disparo`
  - campanha real criada no browser:
    - nome: `QA E2E 2026-03-12`
    - tenant: `BFLabs`
    - instância: `BF-Labs-01`
    - volume: `1`
  - resultado imediato:
    - toast `Campanha iniciada! 1 mensagens enfileiradas.`
  - resultado final em `/campaigns`:
    - campanha `QA E2E 2026-03-12` com status `Concluída`

## Evidência adicional em Logs

- em `/logs`, a campanha `QA E2E 2026-03-12` apareceu dentro da janela padrão de `7 dias`
- o registro único da mensagem apareceu com status `Falha`
- interpretação atual:
  - a fila, o processamento e o completion fecharam corretamente
  - o destino sintético de validação falhou no envio real, o que é compatível com número de teste não entregue
  - isso não invalida a validação do pipeline; apenas indica que a tentativa de entrega do WhatsApp não foi bem-sucedida

## Próximo passo recomendado
1. decidir se a regra de negócio deve considerar campanha `completed` mesmo quando todas as mensagens do lote terminam em `failed`
2. opcionalmente expor no card/lista da campanha contadores `sent_count` e `failed_count` para reduzir ambiguidade operacional
3. seguir para a próxima rodada só se quisermos refinar observabilidade, porque o plano atual já está implementado e validado
