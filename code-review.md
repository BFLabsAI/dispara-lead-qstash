# Code Review - Production Readiness Assessment

## Executive Summary
- **Saúde Geral:** 🟡 **AMARELO** (Risco Moderado)
- **Top 3 Riscos Críticos:**
    1. **Segurança de Tenant (Impersonation):** A lógica de impersonation baseada em estado do cliente (`useAdminStore`) combinada com chamadas RPC pode ser vulnerável se não houver validação estrita no lado do servidor (RLS policies).
    2. **Hardcoded AI Prompts & Models:** A função `process-message-ai` tem prompts e listas de modelos hardcoded. Mudanças exigem deploy de código, e falhas em modelos específicos não são tratadas dinamicamente (circuit breaker real).
    3. **"God Object" Client:** O arquivo `src/services/supabaseClient.ts` (500+ linhas) mistura configuração, mapeamento de dados, cache, retries e lógica de negócio. Isso dificulta testes e manutenção.
- **Estimativa de Esforço:** Médio (1-2 Sprints para estabilização crítica).

## Issues por Categoria

### 🔴 CRITICAL (Bloqueia produção)
- **Arquivo:** `src/services/supabaseClient.ts` : 126
- **Tipo:** Security / Authorization
- **Descrição:** Confiança em estado do cliente para definição de Tenant.
- **Código Problemático:**
  ```typescript
  const getEffectiveTenantId = async () => {
    const impersonated = useAdminStore.getState().impersonatedTenantId; // Client-side state
    if (impersonated) return impersonated;
    // ...
  };
  ```
- **Contextualização:** Se um atacante modificar o estado local do `adminStore`, ele pode passar um `tenant_id` arbitrário para as funções subsequentes. Se as RLS policies ou RPCs confiarem cegamente neste ID passado (ou se o cliente usar esse ID para filtrar queries onde o RLS permite "tudo" para admins), há risco de vazamento de dados entre tenants.
- **Sugestão:** O impersonation deve ser validado no servidor via *Custom Claims* no JWT ou uma tabela de sessões segura, nunca confiar apenas no que o cliente envia como "ID efetivo" para operações sensíveis.
- **Prioridade:** **URGENTE**

### 🟠 HIGH (Risco significativo em produção)
- **Arquivo:** `supabase/functions/process-message-ai/index.ts` : 84-89
- **Tipo:** Reliability / Maintainability
- **Descrição:** Lista de modelos de IA hardcoded e estratégia de "shuffle" simples.
- **Contextualização:** Se um modelo for descontinuado ou tiver outage, o código continua tentando usá-lo aleatoriamente. Não há um "Circuit Breaker" real que pare de chamar um modelo falho temporariamente. Além disso, prompts hardcoded dificultam testes A/B de qualidade de resposta.
- **Sugestão:** Mover configurações de modelos e prompts para o Banco de Dados (tabela `app_config` ou similar) e implementar lógica de retry inteligente que penalize modelos que falham.
- **Prioridade:** SOON

### 🟡 MEDIUM (Deve ser corrigido antes de escalar)
- **Arquivo:** `src/services/supabaseClient.ts` : 405
- **Tipo:** Performance / Architecture
- **Descrição:** Implementação manual de Cache em memória (`Map`) no cliente.
- **Código Problemático:** `const statsCache = new Map<string, { data: any, timestamp: number }>();`
- **Contextualização:** O React Query (já instalado no projeto em `App.tsx`) é feito exatamente para gerenciar cache, deduplicação e *stale-while-revalidate*. Reinventar a roda com `Map` e TTL manual adiciona complexidade e bugs potenciais (ex: race conditions, falta de garbage collection, inconsistência com UI).
- **Sugestão:** Migrar chamadas manuais para `useQuery` do TanStack Query, removendo a lógica customizada de cache e retries (`retryWithBackoff`) pois o React Query já faz isso melhor.
- **Prioridade:** NEXT SPRINT

### 🔵 LOW (Debt técnico)
- **Arquivo:** `supabase/functions/process-message-ai/index.ts` : 58
- **Tipo:** Observabilidade
- **Descrição:** Uso excessivo de `console.log` para debug.
- **Contextualização:** Em produção, logs não estruturados ("[AI Debug] Params...") dificultam a criação de métricas e alertas automáticos em ferramentas como Datadog ou Logflare.
- **Sugestão:** Adotar uma lib de log estruturado (JSON) ou padronizar o formato dos logs para facilitar parsing.

## Análise por Camada

### Frontend (React/Vite)
- **Estado Global:** Uso misto de Zustand (`useAdminStore`) e gestão manual no `supabaseClient.ts`. Risco de estados dessincronizados.
- **Network:** `supabaseClient.ts` está sobrecarregado. Deveria ser quebrado em `services/auth.ts`, `services/messages.ts`, etc.
- **Segurança:** As chaves públicas (`VITE_SUPABASE_ANON_KEY`) estão expostas, o que é normal, mas exige que o RLS do banco esteja impecável.

### Backend (Supabase Edge Functions)
- **Robustez:** A função `process-message-ai` tem boa validação de assinatura (`Upstash-Signature`) e verificação de idempotência. Isso é excelente.
- **Dependências:** Imports via URL (`https://deno.land/...`) são frágeis. Recomenda-se usar `import_map.json` para fixar versões e garantir builds reprodutíveis.

### Infraestrutura
- **Environment:** Variáveis sensíveis (`OPENROUTER_API_KEY`) estão corretamente acessadas via `Deno.env`.

## Recomendações Estratégicas

1.  **Auditoria de RLS (Imediato):** Verificar se as policies do banco `message_logs_dispara_lead_saas_03` permitem que um usuário comum leia dados de outro tenant apenas passando o ID na query. O filtro `.eq('tenant_id', tenantId)` no cliente NÃO é segurança.
2.  **Refatoração do Client:** Eliminar o "God Object" `supabaseClient.ts`. Mover a lógica de cache para hooks do React Query (`useDisparadorData`, `useDashboardStats`).
3.  **Dynamic Config:** Criar tabela de configuração para Prompts e Modelos de IA, removendo hardcodes da Edge Function.

## Checklist de Go/No-Go para Vercel
- [ ] 🔴 **Audit de Segurança de Impersonation (Bloqueador)**
- [ ] 🔴 Validação de RLS em todas as tabelas acessadas pelo cliente
- [ ] 🟡 Migração de cache manual para React Query (Recomendado)
- [ ] 🟡 Externalização de Prompts de IA (Recomendado)
- [x] Timeouts configurados (Supabase functions tem limites próprios)
- [x] Environment vars corretos
- [x] Tratamento de erros básico