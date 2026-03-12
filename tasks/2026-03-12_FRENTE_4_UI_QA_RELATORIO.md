# Frente 4: UI QA e Falhas Reais de Rota - Relatório Completo

**Data:** 2026-03-12
**Agente:** Validator Agent (UI QA & Playwright Testing)
**Status:** Concluído

---

## Resumo Executivo

Este relatório documenta a análise completa de UI QA e falhas reais de rota no aplicativo DisparaLead. Foram analisadas 6 rotas principais utilizando logs do Playwright e análise de código estático.

### Principais Achados

| Severidade | Quantidade | Categorias |
|------------|------------|------------|
| Alta | 2 | Requests falhos, Loading excessivo |
| Média | 3 | Warnings de biblioteca, Error Boundary gaps |
| Baixa | 2 | Console warnings, Otimizações |

---

## 1. Priorização de Rotas por Impacto Operacional

### Rotas Analisadas (ordem de impacto)

| Prioridade | Rota | Impacto | Justificativa |
|------------|------|---------|---------------|
| P0 | `/dashboard` | CRÍTICO | Tela principal de analytics, carrega 5000+ registros |
| P0 | `/logs` | CRÍTICO | Histórico completo, paginação essencial |
| P1 | `/chats` | ALTO | Atendimento em tempo real, impacto direto no cliente |
| P1 | `/instancias` | ALTO | Gerenciamento de conexões WhatsApp |
| P2 | `/audiences` | MÉDIO | Gestão de contatos, carga moderada |
| P2 | `/admin/plans` | MÉDIO | Apenas para super admins, uso interno |

---

## 2. Análise por Rota

### 2.1 /dashboard

**Status:** Funcional com problemas de performance

#### Problemas Encontrados

**1. Fetch Excessivo de Dados (ALTA SEVERIDADE)**
- **Evidência:** Logs mostram 6 requisições sequenciais para buscar 5519 registros
- **Detalhes:**
  ```
  Fetched page 0, items: 1000
  Fetched page 1, items: 1000
  Fetched page 2, items: 1000
  Fetched page 3, items: 1000
  Fetched page 4, items: 1000
  Fetched page 5, items: 519
  Total items fetched: 5519
  ```
- **Localização:** `src/services/supabaseClient.ts:201`
- **Impacto:** Tempo de carregamento prolongado, consumo de banda excessivo

**2. Request Abortado em Condições de Rede Instável (MÉDIA SEVERIDADE)**
- **Evidência:** Log de erro
  ```
  Error fetching recent disparador data: {message: TypeError: Failed to fetch, ...}
  ```
- **Localização:** `src/services/supabaseClient.ts:157`
- **Impacto:** Tela pode ficar em estado de loading infinito se o retry falhar

**3. React Router Future Warnings (BAIXA SEVERIDADE)**
- **Evidência:**
  ```
  ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7
  ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7
  ```
- **Impacto:** Preparação necessária para v7 do React Router

#### Requisições de Rede
```
[GET] message_logs_dispara_lead_saas_03?limit=1000 (6x sequenciais)
[GET] campaigns_dispara_lead_saas_02
[POST] rpc/is_super_admin
[GET] users_dispara_lead_saas_02
[GET] tenants_dispara_lead_saas_02
```

---

### 2.2 /logs

**Status:** Funcional

#### Observações
- Usa paginação server-side corretamente (pageSize: 50)
- Mesmos warnings do React Router que o dashboard
- Nenhum erro crítico identificado nos logs

---

### 2.3 /chats

**Status:** Funcional

#### Requisições de Rede
```
[GET] instances_dispara_lead_saas_02
[GET] user_tags_dispara_lead_saas_02
[POST] rpc/get_instance_contacts
[GET] tenants_dispara_lead_saas_02
[GET] users_dispara_lead_saas_02
```

#### Observações
- Implementa infinite scroll com paginação (PAGE_SIZE: 50)
- Possui fallback para RPC antiga (código 42883)
- Real-time subscription ativa para atualizações

---

### 2.4 /audiences

**Status:** Funcional

#### Requisições de Rede
```
[GET] audiences_dispara_lead_saas_02?select=*,audience_tags_dispara_lead_saas_02(...)
```

#### Observações
- Query otimizada com joins aninhados
- Filtros client-side para busca e tags
- Nenhum erro identificado

---

### 2.5 /instancias

**Status:** Funcional

#### Observações
- Componente simples que delega para `InstanceManager`
- Loading state implementado corretamente
- Integração com store Zustand

---

### 2.6 /admin/plans

**Status:** Funcional

#### Requisições de Rede
```
[GET] users_dispara_lead_saas_02?select=is_super_admin
[GET] plans_dispara_lead_saas_02?select=*&order=price.asc
```

#### Observações
- Rota protegida por `AdminRoute`
- Verificação de super admin antes de carregar dados
- Menor quantidade de requisições (apenas 3)

---

## 3. Comparação: Rotas Principais vs Admin

| Aspecto | Rotas Principais | Rotas Admin |
|---------|------------------|-------------|
| **Requisições médias** | 8-9 | 3 |
| **Dados carregados** | 5000+ registros | < 50 registros |
| **Complexidade de queries** | Alta (múltiplos filtros) | Baixa |
| **Real-time updates** | Sim (chats) | Não |
| **Paginação** | Client-side (dashboard) / Server-side (logs) | Não necessária |
| **Error Boundaries** | Parcial | Sim (RouteErrorBoundary específico) |

### Diferenças Críticas

1. **Volume de Dados:** Rotas principais carregam 100x mais dados
2. **Error Handling:** Rotas admin têm error boundaries mais específicos
3. **Autenticação:** Rotas admin têm verificação adicional de super admin

---

## 4. Erros de Render, Loading e Requests

### 4.1 Erros de Render

**Nenhum erro de renderização identificado** nas rotas analisadas.

Todos os componentes possuem:
- Estados de loading adequados
- Tratamento de erro em queries (React Query)
- Fallbacks para dados vazios

### 4.2 Loading Infinito

**Potenciais Cenários Identificados:**

1. **Dashboard:** Se `fetchRecentDisparadorData` falhar com network error e retry esgotar
2. **Chats:** Se RPC `get_instance_contacts` retornar erro 42883 e fallback também falhar
3. **AdminRoute:** Se verificação de super admin demorar ou falhar

**Código Problemático:**
```typescript
// AdminRoute.tsx - não há timeout na verificação
if (isAdmin === null) {
    return <div className="flex items-center justify-center h-screen">Verificando permissões...</div>;
}
```

### 4.3 Requests Falhos

| Endpoint | Status | Problema |
|----------|--------|----------|
| `message_logs_dispara_lead_saas_03` | net::ERR_ABORTED | Request cancelado pelo cliente (navegação rápida) |
| `message_logs_dispara_lead_saas_03` | Failed to fetch | Erro de rede não tratado no catch |

---

## 5. Sinais de Alerta Verificados

| Sinal | Status | Onde |
|-------|--------|------|
| Tela branca | Não encontrado | - |
| Conteúdo vazio sem erro | Potencial | Dashboard se todas as requisições falharem |
| Requests 200 com visual quebrado | Não encontrado | - |
| Console com exceção não tratada | Encontrado | `Failed to fetch` no dashboard |
| Comportamento intermitente | Potencial | Refresh vs navegação em /dashboard |

---

## 6. Suite de Regressão Mínima Consolidada

### 6.1 Smoke Tests (Obrigatórios)

```typescript
// 1. Dashboard carrega sem erros
test('dashboard loads without errors', async () => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="dashboard-kpis"]')).toBeVisible();
  await expect(page.locator('text=Erro ao carregar')).not.toBeVisible();
});

// 2. Logs com paginação funcionando
test('logs pagination works', async () => {
  await page.goto('/logs');
  await expect(page.locator('text=Página 1')).toBeVisible();
  await page.click('text=Próxima');
  await expect(page.locator('text=Página 2')).toBeVisible();
});

// 3. Chats carrega instâncias
test('chats loads instances', async () => {
  await page.goto('/chats');
  await expect(page.locator('[data-testid="instance-select"]')).toBeVisible();
});

// 4. Admin plans protegido
test('admin routes require super admin', async () => {
  await page.goto('/admin/plans');
  // Se não for admin, deve redirecionar
  await expect(page).toHaveURL(/dashboard/);
});
```

### 6.2 Testes de Resiliência

```typescript
// 5. Dashboard recupera de falha de rede
test('dashboard recovers from network error', async () => {
  await page.route('**/message_logs_dispara_lead_saas_03**', route => route.abort());
  await page.goto('/dashboard');
  await expect(page.locator('text=Tentar Novamente')).toBeVisible();

  // Restaura rede e tenta novamente
  await page.unroute('**/message_logs_dispara_lead_saas_03**');
  await page.click('text=Tentar Novamente');
  await expect(page.locator('[data-testid="dashboard-kpis"]')).toBeVisible();
});

// 6. Navegação entre rotas mantém estado
test('navigation between routes works', async () => {
  await page.goto('/dashboard');
  await page.click('a[href="/logs"]');
  await expect(page).toHaveURL(/logs/);
  await page.click('a[href="/chats"]');
  await expect(page).toHaveURL(/chats/);
});
```

### 6.3 Testes de Performance

```typescript
// 7. Dashboard carrega em menos de 5 segundos
test('dashboard loads within 5 seconds', async () => {
  const start = Date.now();
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="dashboard-kpis"]')).toBeVisible();
  expect(Date.now() - start).toBeLessThan(5000);
});

// 8. Chats não carrega mais de 50 contatos inicialmente
test('chats initial load limited to 50 contacts', async () => {
  await page.goto('/chats');
  const contacts = await page.locator('[data-testid="contact-item"]').count();
  expect(contacts).toBeLessThanOrEqual(50);
});
```

---

## 7. Recomendações

### 7.1 Imediatas (Alta Prioridade)

1. **Implementar limite máximo no dashboard**
   - Arquivo: `src/services/supabaseClient.ts`
   - Ação: Limitar fetchRecentDisparadorData a 1000 registros máximo
   - Motivo: 5519 registros é excessivo para UI

2. **Adicionar timeout na verificação de admin**
   - Arquivo: `src/components/auth/AdminRoute.tsx`
   - Ação: Adicionar timeout de 5 segundos com fallback

3. **Melhorar tratamento de erro de rede**
   - Arquivo: `src/services/supabaseClient.ts:157`
   - Ação: Adicionar mensagem amigável para usuário

### 7.2 Médio Prazo

4. **Migrar dashboard para paginação server-side**
   - Similar ao que foi feito em /logs
   - Reduzir carga inicial e melhorar tempo de resposta

5. **Atualizar React Router para v7**
   - Resolver warnings de future flags
   - Preparar para migração completa

### 7.3 Monitoramento

6. **Adicionar métricas de performance**
   - Tempo de carregamento por rota
   - Taxa de erro por endpoint
   - Tamanho de payload médio

---

## 8. Conclusão

### Estado Geral das Rotas

| Rota | Status | Nota |
|------|--------|------|
| /dashboard | Amarelo | Funcional mas com problemas de performance |
| /logs | Verde | Funcional corretamente |
| /chats | Verde | Funcional corretamente |
| /audiences | Verde | Funcional corretamente |
| /instancias | Verde | Funcional corretamente |
| /admin/plans | Verde | Funcional corretamente |

### Próximos Passos

1. Implementar recomendações de alta prioridade
2. Executar suite de regressão mínima após cada alteração
3. Monitorar métricas de performance após otimizações

---

## Anexos

### Arquivos Analisados
- `/src/App.tsx` - Definição de rotas
- `/src/pages/Dashboard.tsx` - Página de dashboard
- `/src/pages/Logs.tsx` - Página de logs
- `/src/pages/ChatsPage.tsx` - Página de chats
- `/src/pages/Audiences.tsx` - Página de audiências
- `/src/pages/Instancias.tsx` - Página de instâncias
- `/src/pages/admin/PlansList.tsx` - Página de planos admin
- `/src/components/auth/ProtectedRoute.tsx` - Proteção de rotas
- `/src/components/auth/AdminRoute.tsx` - Proteção de rotas admin
- `/src/components/errors/RouteErrorBoundary.tsx` - Error boundary
- `/src/services/dashboardService.ts` - Serviço de dashboard
- `/src/services/supabaseClient.ts` - Cliente Supabase
- `/src/services/audienceService.ts` - Serviço de audiências

### Logs Utilizados
- `playwright-console-dashboard.txt`
- `playwright-console-chats.txt`
- `playwright-console-audiences-final.txt`
- `playwright-console-admin-plans.txt`
- `playwright-console-postfix-dashboard.txt`
- `playwright-network-dashboard.txt`
- `playwright-network-chats.txt`
- `playwright-network-audiences-final.txt`
- `playwright-network-admin-plans.txt`
- `playwright-network-postfix-dashboard.txt`
